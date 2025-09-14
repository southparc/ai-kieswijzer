import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "https://esm.sh/pdfjs-serverless@1.0.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
  maxFiles?: number | null; // limit number of files per run to avoid timeouts
}

function parsePartyAndTitle(filename: string) {
  // remove extension
  const base = filename.replace(/\.[^/.]+$/, "");
  const humanTitle = base.replace(/[._-]+/g, " ").trim();
  const lower = humanTitle.toLowerCase();

  // Robust regex-based matching with word boundaries; order matters (specific before generic)
  const patterns: Array<{ regex: RegExp; party: string }> = [
    { regex: /(groenlinks|pvdagl|gl[\s_-]?pvda|pvda[\s_-]?gl)/i, party: "GroenLinks-PvdA" },
    { regex: /(^|[\s_-])vvd([\s_-]|$)/i, party: "VVD" },
    { regex: /(^|[\s_-])d66([\s_-]|$)/i, party: "D66" },
    { regex: /(^|[\s_-])cda([\s_-]|$)/i, party: "CDA" },
    { regex: /(^|[\s_-])pvv([\s_-]|$)/i, party: "PVV" },
    { regex: /(nieuw\s+sociaal\s+contract)|(^|[\s_-])nsc([\s_-]|$)/i, party: "NSC" },
    { regex: /(^|[\s_-])bbb([\s_-]|$)/i, party: "BBB" },
    { regex: /(partij\s+(voor|van)\s+de\s+dieren)|(^|[\s_-])pvddv?([\s_-]|$)/i, party: "Partij voor de Dieren" },
    { regex: /(christen\s*unie)|(^|[\s_-])cu([\s_-]|$)/i, party: "ChristenUnie" },
    { regex: /(^|[\s_-])volt([\s_-]|$)/i, party: "Volt" },
    { regex: /(^|[\s_-])ja21([\s_-]|$)/i, party: "JA21" },
    { regex: /(^|[\s_-])bvnl([\s_-]|$)/i, party: "BVNL" },
    { regex: /(^|[\s_-])fvd([\s_-]|$)/i, party: "FvD" },
    { regex: /(vrij\s*verbond)|(^|[\s_-])vv([\s_-]|$)/i, party: "Vrij Verbond" },
    // Place SP last so 'verkiezingsprogramma' doesn't trigger it
    { regex: /(^|[\s_-])sp([\s_-]|$)/i, party: "SP" },
  ];

  let party = "Onbekend";
  for (const p of patterns) {
    if (p.regex.test(lower)) {
      party = p.party;
      break;
    }
  }

  return { party, title: humanTitle };
}

async function createEmbeddings(inputs: string[]) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: inputs,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data.data || []).map((d: any) => d.embedding as number[]);
}

async function createEmbedding(input: string) {
  const [embedding] = await createEmbeddings([input]);
  return embedding;
}

// Extract text from PDF using pdfjs-serverless for edge environments
async function extractPdfText(publicUrl: string, filename: string): Promise<string> {
  try {
    console.log(`Processing PDF: ${filename}`);

    // 1) Fetch the PDF bytes from public storage URL
    const res = await fetch(publicUrl);
    if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
    const buffer = await res.arrayBuffer();
    const data = new Uint8Array(buffer);
    console.log(`Fetched PDF ${filename}: ${data.length} bytes`);

    // 2) Use preloaded pdfjs-serverless (imported at top-level)
    const document = await getDocument({
      data,
      useSystemFonts: true,
    }).promise;
    console.log(`PDF loaded for ${filename}: ${document.numPages} pages`);

    // 3) Extract plain text for each page and concatenate
    const pages: string[] = [];
    for (let pageNum = 1; pageNum <= document.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${document.numPages} of ${filename}`);
      const page = await document.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText) {
        pages.push(`[Pagina ${pageNum}]\n${pageText}`);
        console.log(`Page ${pageNum} of ${filename}: ${pageText.length} chars`);
      }
    }

    const full = pages.join("\n\n");
    if (!full.trim()) throw new Error("Empty text after extraction");
    console.log(`Extracted ~${full.length} characters from ${filename}`);
    return full;
  } catch (error) {
    console.error(`PDF processing failed for ${filename}:`, error);
    // Log the specific error details
    console.error(`Error type: ${error.constructor.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    
    // Fallback: keep a minimal placeholder so ingestion continues,
    // but clearly mark that the source had no extractable text
    const { party, title } = parsePartyAndTitle(filename);
    return `Geen tekst geëxtraheerd uit ${title} (${party}). Error: ${error.message}`;
  }
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

    // Keep only PDFs, order deterministically and cap per run
    files = files.filter((name) => name.toLowerCase().endsWith(".pdf"));
    const maxFiles = Math.min(Math.max(Number((body as any).maxFiles ?? 20), 1), 100);
    files.sort((a, b) => a.localeCompare(b));
    const selected = files.slice(0, maxFiles);

    console.log(`Found ${files.length} PDFs, processing ${selected.length} this run (maxFiles=${maxFiles})`);

    const results: Array<{
      file: string;
      status: "processed" | "skipped" | "error";
      message?: string;
      document_id?: string;
      chunks?: number;
    }> = [];

    for (const name of selected) {
      try {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(name);
        const publicUrl = pub.publicUrl;
        const { party, title } = parsePartyAndTitle(name);
        const logBase = { path: name, party, title } as any;

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
          // Update document metadata (party/title) in case parsing improves
          const { error: updErr } = await supabase
            .from("documents")
            .update({ party, title, year: defaultYear, version: defaultVersion })
            .eq("id", documentId);
          if (updErr) throw updErr;

          // Clean old chunks for this doc
          const { error: delErr } = await supabase
            .from("chunks")
            .delete()
            .eq("document_id", documentId);
          if (delErr) throw delErr;
        } else if (existing && !reingest) {
          results.push({ file: name, status: "skipped", message: "already ingested", document_id: documentId });
          await supabase.from("ingest_log").insert({ ...logBase, status: "skipped", message: "already ingested", doc_id: documentId });
          continue;
        }

        // Extract text from PDF (simplified approach for now)
        const fullText = await extractPdfText(publicUrl, name);
        const parts = chunkText(fullText);
        
        // Create chunks and embeddings
        const rows: Array<{
          document_id: string;
          content: string;
          page: number;
          tokens: number;
          embedding: number[];
        }> = [];

        // Batch embeddings for speed and fewer HTTP calls
        const EMBED_BATCH = 96;
        const embeddings: number[][] = [];
        for (let i = 0; i < parts.length; i += EMBED_BATCH) {
          const batch = parts.slice(i, i + EMBED_BATCH);
          const e = await createEmbeddings(batch);
          embeddings.push(...e);
        }

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const embedding = embeddings[i];
          rows.push({
            document_id: documentId!,
            content: part,
            page: 1, // Single page for simplified approach
            tokens: part.split(/\s+/).length,
            embedding,
          });
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
        await supabase.from("ingest_log").insert({ ...logBase, status: "processed", doc_id: documentId, message: `chunks:${rows.length}` });
      } catch (e) {
        console.error("Error processing file", name, e);
        results.push({ file: name, status: "error", message: (e as Error).message });
        await supabase.from("ingest_log").insert({ path: name, status: "error", message: (e as Error).message });
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
