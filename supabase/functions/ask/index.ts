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
    const { question, themes, weights, ip } = await req.json();
    
    console.log('Received request:', { question, themes, weights, ip });

    // Store the query
    const { data: queryData, error: queryError } = await supabase
      .from('queries')
      .insert({
        question,
        themes,
        weights,
        ip_hash: ip
      })
      .select()
      .single();

    if (queryError) {
      console.error('Error storing query:', queryError);
      throw queryError;
    }

    console.log('Stored query:', queryData);

    // Generate embeddings for the question
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: question,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const questionEmbedding = embeddingData.data[0].embedding;

    console.log('Generated embedding');

    // Search for relevant chunks using the RAG function
    const { data: ragResults, error: ragError } = await supabase
      .rpc('rag_topk', {
        q_embedding: questionEmbedding,
        k: 8
      });

    if (ragError) {
      console.error('Error in RAG search:', ragError);
      throw ragError;
    }

    console.log('Found RAG results:', ragResults?.length || 0);

    // Prepare context from search results
    const context = ragResults?.map((result: any) => 
      `**${result.party}** (pagina ${result.page}): ${result.content}`
    ).join('\n\n') || 'Geen relevante informatie gevonden.';

    // Generate AI response
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Je bent een Nederlandse politieke adviseur. Beantwoord vragen over partijstandpunten op basis van de gegeven context. 
            
Regels:
- Gebruik alleen informatie uit de gegeven context
- Geef een duidelijk, objectief antwoord in het Nederlands
- Vermeld specifieke partijen en hun standpunten
- Als er geen informatie is, zeg dat expliciet
- Gebruik markdown voor opmaak (koppen, lijsten, etc.)
- Blijf neutraal en objectief

Context van partijprogramma's:
${context}`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API error: ${completion.status}`);
    }

    const completionData = await completion.json();
    const answer = completionData.choices[0].message.content;

    console.log('Generated AI response');

    // Prepare sources
    const sources = ragResults?.map((result: any) => ({
      party: result.party,
      page: result.page,
      url: result.url
    })) || [];

    // Store the answer
    const { error: answerError } = await supabase
      .from('answers')
      .insert({
        query_id: queryData.id,
        answer_md: answer,
        sources: sources,
        model: 'gpt-4o-mini',
        latency_ms: Date.now() - new Date(queryData.created_at).getTime()
      });

    if (answerError) {
      console.error('Error storing answer:', answerError);
      // Continue anyway, don't fail the request
    }

    return new Response(
      JSON.stringify({
        answer,
        sources,
        query_id: queryData.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ask function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Er is een fout opgetreden bij het verwerken van je vraag.',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});