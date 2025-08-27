import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Download and process PDF (simplified example)
    // In a real implementation, you would:
    // 1. Download the PDF from the URL
    // 2. Extract text content
    // 3. Split into chunks
    // 4. Generate embeddings for each chunk
    // 5. Store chunks with embeddings

    // For now, we'll create a placeholder chunk
    const placeholderContent = `Dit is een placeholder voor ${title} van ${party}. In een volledige implementatie zou hier de werkelijke content van het PDF staan.`;
    
    // Generate embedding
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: placeholderContent,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Store chunk
    const { error: chunkError } = await supabase
      .from('chunks')
      .insert({
        document_id: document.id,
        content: placeholderContent,
        page: 1,
        tokens: placeholderContent.split(' ').length,
        embedding: embedding
      });

    if (chunkError) {
      console.error('Error storing chunk:', chunkError);
      throw chunkError;
    }

    console.log('Document processed successfully');

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