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

// Guess party from text/title/url when DB label is wrong
function guessParty(text: string, fallback: string) {
  const t = (text || '').toLowerCase();
  const patterns: Array<{ re: RegExp; name: string }> = [
    { re: /(groenlinks|pvdagl|gl[\s_-]?pvda|pvda[\s_-]?gl)/i, name: 'GroenLinks-PvdA' },
    { re: /(^|[\s_-])vvd([\s_-]|$)/i, name: 'VVD' },
    { re: /(^|[\s_-])d66([\s_-]|$)/i, name: 'D66' },
    { re: /(^|[\s_-])cda([\s_-]|$)/i, name: 'CDA' },
    { re: /(^|[\s_-])pvv([\s_-]|$)/i, name: 'PVV' },
    { re: /(nieuw\s+sociaal\s+contract)|(^|[\s_-])nsc([\s_-]|$)/i, name: 'NSC' },
    { re: /(^|[\s_-])bbb([\s_-]|$)/i, name: 'BBB' },
    { re: /(partij\s+(voor|van)\s+de\s+dieren)|(^|[\s_-])pvddv?([\s_-]|$)/i, name: 'Partij voor de Dieren' },
    { re: /(christen\s*unie)|(^|[\s_-])cu([\s_-]|$)/i, name: 'ChristenUnie' },
    { re: /(^|[\s_-])volt([\s_-]|$)/i, name: 'Volt' },
    { re: /(^|[\s_-])ja21([\s_-]|$)/i, name: 'JA21' },
    { re: /(^|[\s_-])bvnl([\s_-]|$)/i, name: 'BVNL' },
    { re: /(^|[\s_-])fvd([\s_-]|$)/i, name: 'FvD' },
    { re: /(^|[\s_-])sp([\s_-]|$)/i, name: 'SP' },
  ];
  for (const p of patterns) {
    if (p.re.test(t)) return p.name;
  }
  return fallback || 'Onbekend';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, themes, weights, ip } = await req.json();
    
    console.log('Received request:', { question, themes, weights, ip });

    // Check if user is authenticated
    const authHeader = req.headers.get('Authorization');
    let user_id = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          user_id = user.id;
        }
      } catch (authError) {
        console.log('Auth check failed, proceeding as anonymous:', authError);
      }
    }

    // Store the query with optional user_id
    const queryPayload = {
      question,
      themes,
      weights,
      ip_hash: ip,
      ...(user_id && { user_id }) // Only include user_id if authenticated
    };

    const { data: queryData, error: queryError } = await supabase
      .from('queries')
      .insert(queryPayload)
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

    // Search for relevant chunks using the RAG function (fetch more and deduplicate by party)
    const { data: ragResults, error: ragError } = await supabase
      .rpc('rag_topk', {
        q_embedding: questionEmbedding,
        k: 64
      });

    if (ragError) {
      console.error('Error in RAG search:', ragError);
      throw ragError;
    }

    // Normalize party names and deduplicate by party (max 16)
    const normalized = (ragResults || []).map((r: any) => ({
      ...r,
      party_norm: guessParty(`${r.party} ${r.title} ${r.url}`, r.party)
    }));

    const seen = new Set<string>();
    const uniqueByParty: any[] = [];
    for (const r of normalized) {
      if (!seen.has(r.party_norm)) {
        seen.add(r.party_norm);
        uniqueByParty.push(r);
        if (uniqueByParty.length >= 16) break;
      }
    }

    console.log('Unique parties in results:', Array.from(seen).join(', '));

    // Prepare context from unique results
    const context = uniqueByParty.length > 0
      ? uniqueByParty.map((result: any) => `**${result.party_norm}** (pagina ${result.page}): ${result.content}`).join('\n\n')
      : 'Geen relevante informatie gevonden.';

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
            content: `Je bent een Nederlandse politieke adviseur die gedetailleerde, grondige analyses geeft van partijstandpunten. 

BELANGRIJK: Geef uitgebreide, betekenisvolle antwoorden met concrete details en voorbeelden.

Regels:
- Gebruik alleen informatie uit de gegeven context
- Geef per partij een **uitgebreide paragraaf** (minimaal 3-4 zinnen) met:
  * Specifieke beleidsvoorstellen 
  * Concrete doelstellingen en cijfers waar mogelijk
  * Onderliggende filosofie/motivatie
  * Praktische implementatie of gevolgen
- **Gebruik altijd deze structuur**: ## Partijnaam, gevolgd door een uitgebreide paragraaf
- Vermeld specifieke citaten uit documenten waar relevant
- Leg verbanden tussen verschillende aspecten van het beleid
- Blijf objectief maar geef voldoende detail om de standpunten echt te begrijpen
- Gebruik markdown voor duidelijke opmaak
- Maximaal 16 partijen, maar geef voor elke partij substantiële informatie

Voorbeeld van gewenste detailniveau:
## Partijnaam
De partij wil [specifiek voorstel] door middel van [concrete maatregelen]. Dit betekent in de praktijk dat [uitleg gevolgen]. Hun motivatie hiervoor is [onderliggende filosofie] en ze stellen voor om dit te financieren via [financieringsvoorstel]. Volgens hun programma willen ze [specifiek doel met cijfer] bereiken binnen [tijdsbestek].

Context van partijprogramma's:
${context}`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 2500,
        temperature: 0.2,
      }),
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API error: ${completion.status}`);
    }

    const completionData = await completion.json();
    const answer = completionData.choices[0].message.content;

    console.log('Generated AI response');

    // Prepare sources (unique parties)
    const sources = uniqueByParty.map((result: any) => ({
      party: result.party_norm,
      page: result.page,
      url: result.url
    }));

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