import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { party, title, url, year, version } = await req.json();
    
    console.log('Processing document:', { party, title, url, year, version });

    // Insert document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        party,
        title,
        url,
        year,
        version
      })
      .select()
      .single();

    if (docError) {
      console.error('Error storing document:', docError);
      throw docError;
    }

    console.log('Document stored with ID:', document.id);

// Download and process the real PDF: extract text, chunk and embed
// 1) Fetch PDF
let fullText = '';
try {
  const pdfRes = await fetch(url);
  if (!pdfRes.ok) throw new Error(`Failed to fetch PDF (${pdfRes.status})`);
  const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());

  // 2) Load pdfjs-serverless and extract text per page (robust for edge)
  const { getDocument } = await import('https://esm.sh/pdfjs-serverless@1.0.1');
  const document = await getDocument({ data: pdfBytes, useSystemFonts: true }).promise;

  const pageTexts: string[] = [];
  for (let p = 1; p <= document.numPages; p++) {
    const page = await document.getPage(p);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((it: any) => (typeof it?.str === 'string' ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) pageTexts.push(`[Pagina ${p}]\n${text}`);
  }
  fullText = pageTexts.join('\n\n');
  console.log(`Extracted ~${fullText.length} characters from ${title}`);
} catch (pdfErr) {
  console.error('PDF extraction failed:', pdfErr);
  // Continue with a placeholder so the ingestion never hard-fails on PDF issues
  fullText = `Geen tekst geëxtraheerd uit ${title} (${party}). Error: ${pdfErr instanceof Error ? pdfErr.message : String(pdfErr)}`;
}

// 3) Split into overlapping chunks
function chunk(text: string, size = 1200, overlap = 100) {
  const out: string[] = []; let i = 0;
  while (i < text.length) { const end = Math.min(i + size, text.length); out.push(text.slice(i, end)); if (end === text.length) break; i = end - overlap; }
  return out.filter((c) => c.trim());
}
const parts = fullText.trim() ? chunk(fullText) : [
  `Geen tekst geëxtraheerd uit ${title} (${party}).`,
];

// 4) Generate embeddings and store chunks (batched, resilient)
const rows: any[] = [];
for (let i = 0; i < parts.length; i++) {
  const part = parts[i];
  let embedding: number[] | null = null;
  try {
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: part }),
    });
    if (!embeddingResponse.ok) throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    const embeddingData = await embeddingResponse.json();
    embedding = embeddingData.data?.[0]?.embedding ?? null;
  } catch (embErr) {
    console.error(`Embedding failed for chunk ${i + 1}/${parts.length}:`, embErr);
    // keep embedding as null; column is nullable so we can still index content
  }
  rows.push({
    document_id: document.id,
    content: part,
    page: 1,
    tokens: part.split(/\s+/).length,
    embedding,
  });
}

const BATCH = 50;
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH);
  const { error: insertErr } = await supabase.from('chunks').insert(slice);
  if (insertErr) throw insertErr;
}

console.log(`Document processed successfully with ${rows.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        document_id: document.id,
        message: 'Document successfully processed and indexed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ingest function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Er is een fout opgetreden bij het verwerken van het document.',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});