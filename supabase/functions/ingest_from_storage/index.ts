import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// PDF parsing (runs in Deno with a web worker)
import { getDocument, GlobalWorkerOptions } from "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.js";

// Configure pdf.js worker
GlobalWorkerOptions.workerSrc =
  "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const BUCKET = "programs";

interface IngestRequest {
  files?: string[]; // optional specific file names to process
  reingest?: boolean; // if true, process even if document/url exists
  defaultYear?: number | null;
  defaultVersion?: string | null;
}

function parsePartyAndTitle(filename: string) {
  // remove extension
  const base = filename.replace(/\.[^/.]+$/, "");
  const humanTitle = base.replace(/[._-]+/g, " ").trim();
  const lower = humanTitle.toLowerCase();

  // crude mapping based on common substrings
  const mappings: Record<string, string> = {
    groenlinks: "GroenLinks-PvdA",
    pvdagl: "GroenLinks-PvdA",
    "pvd a": "GroenLinks-PvdA",
    pvda: "GroenLinks-PvdA",
    vvd: "VVD",
    d66: "D66",
    cda: "CDA",
    pvv: "PVV",
    nsc: "NSC",
    "nieuw sociaal contract": "NSC",
    bbb: "BBB",
    sp: "SP",
    "partij voor de dieren": "Partij voor de Dieren",
    "partij van de dieren": "Partij voor de Dieren",
    pvdd: "Partij voor de Dieren",
    christenunie: "ChristenUnie",
    "christen unie": "ChristenUnie",
    "cu ": "ChristenUnie",
    volt: "Volt",
    ja21: "JA21",
    bvnl: "BVNL",
    fvd: "FvD",
  };

  let party = "Onbekend";
  for (const key of Object.keys(mappings)) {
    if (lower.includes(key)) {
      party = mappings[key];
      break;
    }
  }

  return { party, title: humanTitle };
}

async function createEmbedding(input: string) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

// --- PDF helpers ------------------------------------------------------------
async function fetchPdf(publicUrl: string): Promise<Uint8Array> {
  const pdfRes = await fetch(publicUrl);
  if (!pdfRes.ok) {
    const t = await pdfRes.text().catch(() => "");
    throw new Error(`Failed to fetch PDF (${pdfRes.status}): ${t}`);
  }
  const buf = await pdfRes.arrayBuffer();
  return new Uint8Array(buf);
}

async function extractPdfPagesText(pdfBytes: Uint8Array): Promise<string[]> {
  const loadingTask = getDocument({ data: pdfBytes });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  const total = doc.numPages;

  for (let p = 1; p <= total; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const text = (textContent.items as any[])
      .map((it) => (typeof it?.str === "string" ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }

  try {
    await doc.destroy();
  } catch (_) {
    // ignore
  }

  return pages;
}

function chunkText(text: string, chunkSize = 1200, overlap = 100): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.slice(i, end));
    if (end === text.length) break;
    i = end - overlap;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as IngestRequest;
    const reingest = body.reingest ?? false;
    const defaultYear = body.defaultYear ?? null;
    const defaultVersion = body.defaultVersion ?? null;

    console.log("Starting ingest_from_storage with body:", body);

    // Collect target files
    let files: string[] = [];
    if (body.files && body.files.length > 0) {
      files = body.files;
    } else {
      // List all files in bucket (paginate by 100)
      let page = 0;
      const limit = 100;
      while (true) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .list("", { limit, offset: page * limit });
        if (error) throw error;
        if (!data || data.length === 0) break;
        files.push(...data.filter((o) => o.name).map((o) => o.name));
        if (data.length < limit) break;
        page++;
      }
    }

    console.log(`Found ${files.length} files to process`);

    const results: Array<{
      file: string;
      status: "processed" | "skipped" | "error";
      message?: string;
      document_id?: string;
      chunks?: number;
    }> = [];

    for (const name of files) {
      try {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(name);
        const publicUrl = pub.publicUrl;
        const { party, title } = parsePartyAndTitle(name);

        // Skip if exists unless reingest
        const { data: existing, error: existErr } = await supabase
          .from("documents")
          .select("id")
          .eq("url", publicUrl)
          .maybeSingle();
        if (existErr) throw existErr;

        let documentId = existing?.id as string | undefined;
        if (!documentId) {
          const { data: document, error: docError } = await supabase
            .from("documents")
            .insert({ party, title, url: publicUrl, year: defaultYear, version: defaultVersion })
            .select()
            .single();
          if (docError) throw docError;
          documentId = document.id;
        } else if (reingest) {
          // Clean old chunks for this doc
          const { error: delErr } = await supabase
            .from("chunks")
            .delete()
            .eq("document_id", documentId);
          if (delErr) throw delErr;
        } else if (existing && !reingest) {
          results.push({ file: name, status: "skipped", message: "already ingested", document_id: documentId });
          continue;
        }

        // Fetch and parse PDF
        let pages: string[] = [];
        try {
          const bytes = await fetchPdf(publicUrl);
          pages = await extractPdfPagesText(bytes);
        } catch (pdfErr) {
          console.error("PDF parse failed for", name, pdfErr);
        }

        // Fallback to placeholder when extraction failed
        if (pages.length === 0) {
          const placeholderContent = `Dit is een placeholder voor ${title} van ${party}.`;
          const embedding = await createEmbedding(placeholderContent);
          const { error: chunkError } = await supabase
            .from("chunks")
            .insert({
              document_id: documentId,
              content: placeholderContent,
              page: 1,
              tokens: placeholderContent.split(" ").length,
              embedding,
            });
          if (chunkError) throw chunkError;
          results.push({ file: name, status: "processed", document_id: documentId, chunks: 1, message: "fallback: placeholder" });
          continue;
        }

        // Build chunks per page and insert in batches
        const rows: Array<{
          document_id: string;
          content: string;
          page: number;
          tokens: number;
          embedding: number[];
        }> = [];

        // Limit pages to avoid cost; adjust if needed
        const MAX_PAGES = 40;
        for (let p = 0; p < Math.min(pages.length, MAX_PAGES); p++) {
          const pageText = pages[p];
          const parts = chunkText(pageText);
          for (const part of parts) {
            const embedding = await createEmbedding(part);
            rows.push({
              document_id: documentId!,
              content: part,
              page: p + 1,
              tokens: part.split(/\s+/).length,
              embedding,
            });
          }
        }

        if (rows.length === 0) {
          // Should never happen, but keep a minimal record
          const placeholder = `Geen tekst geëxtraheerd uit ${title}.`;
          const embedding = await createEmbedding(placeholder);
          rows.push({
            document_id: documentId!,
            content: placeholder,
            page: 1,
            tokens: placeholder.split(/\s+/).length,
            embedding,
          });
        }

        // Insert in smaller batches to avoid payload limits
        const BATCH = 50;
        for (let i = 0; i < rows.length; i += BATCH) {
          const slice = rows.slice(i, i + BATCH);
          const { error: insErr } = await supabase.from("chunks").insert(slice);
          if (insErr) throw insErr;
        }

        results.push({ file: name, status: "processed", document_id: documentId, chunks: rows.length });
      } catch (e) {
        console.error("Error processing file", name, e);
        results.push({ file: name, status: "error", message: (e as Error).message });
      }
    }

    const summary = {
      total: results.length,
      processed: results.filter((r) => r.status === "processed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };

    console.log("Ingest summary:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ingest_from_storage:", error);
    return new Response(
      JSON.stringify({ error: "Failed to ingest from storage", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
