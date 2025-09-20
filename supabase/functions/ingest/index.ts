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

// 2) Load pdfjs-serverless and extract text per page with section detection
  const { getDocument } = await import('https://esm.sh/pdfjs-serverless@1.0.1');
  const document = await getDocument({ data: pdfBytes, useSystemFonts: true }).promise;

  // Function to normalize text (handle ligatures, hyphenation)
  function normalizeText(text: string): string {
    return text
      .replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')  // Common ligatures
      .replace(/\u00AD/g, '')  // Soft hyphens
      .replace(/(\w)-\s+(\w)/g, '$1$2')  // Broken words across lines
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Function to detect section headers (heuristic)
  function isLikelyHeader(text: string, fontSize?: number): boolean {
    const normalized = text.trim();
    if (normalized.length < 3 || normalized.length > 100) return false;
    
    // Common section patterns in Dutch political programs
    const headerPatterns = [
      /^\d+\.?\s+[A-Z]/,  // "1. Hoofdstuk", "1 Economie"
      /^[IVX]+\.?\s+[A-Z]/,  // Roman numerals
      /^[A-Z][^.!?]*$/,  // All caps short text
      /^(hoofdstuk|paragraaf|sectie|deel)\s+/i,
      /^(economie|onderwijs|zorg|klimaat|veiligheid|europa|defensie|migratie|wonen|werk|digitalisering)/i
    ];
    
    return headerPatterns.some(pattern => pattern.test(normalized)) ||
           (fontSize && fontSize > 12);  // Larger font likely header
  }

  const pageTexts: { text: string; sections: string[] }[] = [];
  let currentSections: string[] = [];
  
  for (let p = 1; p <= document.numPages; p++) {
    const page = await document.getPage(p);
    const textContent = await page.getTextContent();
    
    let pageText = '';
    const pageSections: string[] = [];
    
    for (const item of textContent.items as any[]) {
      if (typeof item?.str !== 'string') continue;
      
      const text = normalizeText(item.str);
      if (!text) continue;
      
      const fontSize = item.height || 0;
      
      if (isLikelyHeader(text, fontSize)) {
        pageSections.push(text);
        currentSections = [...pageSections];
        pageText += `\n## ${text}\n`;
      } else {
        pageText += text + ' ';
      }
    }
    
    if (pageText.trim()) {
      pageTexts.push({
        text: `[Pagina ${p}]\n${pageText.trim()}`,
        sections: currentSections.length > 0 ? currentSections : ['Algemeen']
      });
    }
  }
  
  fullText = pageTexts.map(p => p.text).join('\n\n');
  console.log(`Extracted ~${fullText.length} characters from ${title}`);
} catch (pdfErr) {
  console.error('PDF extraction failed:', pdfErr);
  // Continue with a placeholder so the ingestion never hard-fails on PDF issues
  fullText = `Geen tekst geëxtraheerd uit ${title} (${party}). Error: ${pdfErr instanceof Error ? pdfErr.message : String(pdfErr)}`;
}

// 3) Split into section-aware overlapping chunks
function sectionAwareChunk(pageTexts: { text: string; sections: string[] }[], size = 1000, overlap = 200) {
  const chunks: { content: string; page: number; section: string; quality: number }[] = [];
  
  for (let pageIdx = 0; pageIdx < pageTexts.length; pageIdx++) {
    const { text, sections } = pageTexts[pageIdx];
    const pageNum = pageIdx + 1;
    const currentSection = sections[sections.length - 1] || 'Algemeen';
    
    // Calculate quality score (OCR artifacts detection)
    const nonAlphaRatio = (text.match(/[^\p{L}\p{N}\s\.,;:!?()\[\]""''–—-]/gu) || []).length / text.length;
    const quality = Math.max(0, 1 - (nonAlphaRatio * 3)); // Penalty for non-standard chars
    
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + size, text.length);
      const chunkText = text.slice(i, end).trim();
      
      if (chunkText.length > 50) { // Skip very short chunks
        chunks.push({
          content: chunkText,
          page: pageNum,
          section: currentSection,
          quality
        });
      }
      
      if (end === text.length) break;
      i = end - overlap;
    }
  }
  
  return chunks.filter(c => c.quality > 0.3); // Filter very low quality chunks
}

const chunkData = fullText.trim() && pageTexts.length > 0 ? 
  sectionAwareChunk(pageTexts) : 
  [{ content: `Geen tekst geëxtraheerd uit ${title} (${party}).`, page: 1, section: 'Error', quality: 0 }];

// 4) Generate embeddings and store enhanced chunks
const rows: any[] = [];
for (let i = 0; i < chunkData.length; i++) {
  const chunk = chunkData[i];
  let embedding: number[] | null = null;
  
  try {
    // Enhanced input for embeddings: include section context
    const embeddingInput = `Sectie: ${chunk.section}\n\n${chunk.content}`;
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'text-embedding-3-small', 
        input: embeddingInput.slice(0, 8000) // Truncate if too long
      }),
    });
    
    if (!embeddingResponse.ok) throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    const embeddingData = await embeddingResponse.json();
    embedding = embeddingData.data?.[0]?.embedding ?? null;
  } catch (embErr) {
    console.error(`Embedding failed for chunk ${i + 1}/${chunkData.length}:`, embErr);
  }
  
  rows.push({
    document_id: document.id,
    content: chunk.content,
    page: chunk.page,
    tokens: chunk.content.split(/\s+/).length,
    embedding,
    // Add metadata as JSONB (you'll need to add this column later)
    metadata: {
      section: chunk.section,
      quality: chunk.quality,
      party: party,
      theme: inferThemeFromContent(chunk.content, chunk.section)
    }
  });
}

// Helper function to infer theme from content
function inferThemeFromContent(content: string, section: string): string {
  const text = `${section} ${content}`.toLowerCase();
  
  const themes = [
    { name: 'economie', patterns: ['economie', 'financ', 'belasting', 'werk', 'baan', 'inkomen', 'ondernemen'] },
    { name: 'onderwijs', patterns: ['onderwijs', 'school', 'universiteit', 'student', 'leraar', 'opleiding'] },
    { name: 'zorg', patterns: ['zorg', 'gezondheid', 'medisch', 'dokter', 'ziekenhuis', 'psychisch'] },
    { name: 'klimaat', patterns: ['klimaat', 'milieu', 'energie', 'duurzaam', 'co2', 'uitstoot', 'groen'] },
    { name: 'veiligheid', patterns: ['veiligheid', 'politie', 'criminaliteit', 'terrorisme', 'defensie'] },
    { name: 'migratie', patterns: ['migratie', 'asiel', 'vluchtelingen', 'immigratie', 'integratie'] },
    { name: 'europa', patterns: ['europa', 'eu ', 'europese unie', 'brussel', 'europeaan'] },
    { name: 'wonen', patterns: ['wonen', 'woningbouw', 'huren', 'hypotheek', 'vastgoed'] },
    { name: 'digitalisering', patterns: ['digitaal', 'internet', 'ai ', 'technologie', 'cyber', 'data'] }
  ];
  
  for (const theme of themes) {
    if (theme.patterns.some(pattern => text.includes(pattern))) {
      return theme.name;
    }
  }
  
  return 'algemeen';
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