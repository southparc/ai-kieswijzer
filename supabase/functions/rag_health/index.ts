import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get documents (parties)
    const { data: docs, error: docsErr } = await supabase
      .from("documents")
      .select("id, party")
      .order("party");
    if (docsErr) throw docsErr;

    // Get chunks joined with documents to know party
    const { data: chunks, error: chErr } = await supabase
      .from("chunks")
      .select(
        `id, content, document_id, documents!inner(id, party)`
      )
      .limit(20000);
    if (chErr) throw chErr;

    const totalChunks = chunks?.length ?? 0;
    const isPlaceholder = (t: string) => t.toLowerCase().includes("geen tekst geëxtraheerd");

    const parties = Array.from(new Set((docs || []).map((d: any) => d.party)));
    const byPartyMap = new Map<string, { party: string; chunks: number; placeholders: number; sample?: string }>();

    for (const p of parties) {
      byPartyMap.set(p, { party: p, chunks: 0, placeholders: 0 });
    }

    for (const row of chunks || []) {
      const party = (row as any).documents?.party || "Onbekend";
      if (!byPartyMap.has(party)) byPartyMap.set(party, { party, chunks: 0, placeholders: 0 });
      const agg = byPartyMap.get(party)!;
      agg.chunks += 1;
      const content: string = (row as any).content || "";
      if (isPlaceholder(content)) agg.placeholders += 1;
      if (!agg.sample && content && !isPlaceholder(content)) {
        agg.sample = content.slice(0, 240);
      }
    }

    const by_party = Array.from(byPartyMap.values()).sort((a, b) => a.party.localeCompare(b.party));
    const placeholders = by_party.reduce((s, p) => s + p.placeholders, 0);

    const payload = {
      parties,
      total_chunks: totalChunks,
      placeholders,
      by_party,
      ts: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("rag_health error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to compute RAG health", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
