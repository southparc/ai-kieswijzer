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

// Available parties - must match the 16 parties in the frontend
const AVAILABLE_PARTIES = [
  'VVD','D66','PVV','CDA','GroenLinks-PvdA','SP','FvD','Partij voor de Dieren',
  'ChristenUnie','NSC','BBB','Volt','JA21','BVNL','SGP','DENK'
];

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

    // Check if the question is about a party not in our available list
    const questionLower = question.toLowerCase();
    const unavailablePartyMentioned = ['vrij verbond', '50plus', 'lijst', 'lokale partij'].some(party => 
      questionLower.includes(party)
    );

    if (unavailablePartyMentioned) {
      // Return early for unavailable parties
      const unavailableResponse = `Deze vraag gaat over een partij die niet beschikbaar is in onze database. Ik kan alleen informatie geven over de volgende ${AVAILABLE_PARTIES.length} partijen die deelnemen aan de verkiezingen van 2025:

${AVAILABLE_PARTIES.map(party => `• ${party}`).join('\n')}

Stel je vraag opnieuw over een van deze partijen en ik geef je een uitgebreide analyse op basis van hun officiële verkiezingsprogramma's.`;

      return new Response(
        JSON.stringify({
          answer: unavailableResponse,
          sources: [],
          query_id: queryData.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Only work with available parties from the database
    const { data: allParties, error: partiesError } = await supabase
      .from('documents')
      .select('party')
      .in('party', AVAILABLE_PARTIES)
      .order('party');

    if (partiesError) {
      console.error('Error fetching parties:', partiesError);
      throw partiesError;
    }

    const availableParties = [...new Set(allParties?.map(p => p.party) || [])];
    console.log('Available parties in database:', availableParties.join(', '));

    // Search for relevant chunks using the RAG function (fetch many more)
    const { data: ragResults, error: ragError } = await supabase
      .rpc('rag_topk', {
        q_embedding: questionEmbedding,
        k: 128 // Fetch even more to ensure we get content for all parties
      });

    if (ragError) {
      console.error('Error in RAG search:', ragError);
      throw ragError;
    }

    console.log('Found RAG results:', ragResults?.length || 0);

    // Ensure we have content for ALL parties
    const partyContent = new Map<string, any>();
    
    // First, add the best matching content for each party
    (ragResults || []).forEach((result: any) => {
      const normalizedParty = guessParty(`${result.party} ${result.title} ${result.url}`, result.party);
      if (!partyContent.has(normalizedParty)) {
        partyContent.set(normalizedParty, {
          ...result,
          party_norm: normalizedParty
        });
      }
    });

    // For any missing parties from available list, fetch their content directly
    for (const party of availableParties) {
      const normalizedParty = guessParty(party, party);
      if (!partyContent.has(normalizedParty)) {
        // Get any content for this party
        const { data: partyChunks } = await supabase
          .from('chunks')
          .select(`
            content,
            page,
            documents!inner (
              party,
              title,
              url
            )
          `)
          .eq('documents.party', party)
          .limit(1);

        if (partyChunks && partyChunks.length > 0) {
          const chunk = partyChunks[0];
          partyContent.set(normalizedParty, {
            content: chunk.content,
            page: chunk.page,
            party: party,
            party_norm: normalizedParty,
            title: chunk.documents.title,
            url: chunk.documents.url
          });
        } else {
          // Don't create fallback content - only use real program data
          console.log(`No content found for party: ${normalizedParty}`);
        }
      }
    }

    const allPartyResults = Array.from(partyContent.values());
    console.log('Final parties with content:', allPartyResults.map(r => r.party_norm).join(', '));

    if (allPartyResults.length === 0) {
      return new Response(
        JSON.stringify({
          answer: 'Er is geen relevante informatie gevonden in de beschikbare verkiezingsprogramma\'s. Probeer je vraag anders te formuleren.',
          sources: [],
          query_id: queryData.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare context from parties with actual content
    const context = allPartyResults.map((result: any) => 
      `**${result.party_norm}** (pagina ${result.page}): ${result.content}`
    ).join('\n\n');

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
            content: `Je bent een Nederlandse politieke adviseur die uitsluitend werkt met de officiële verkiezingsprogramma's van 2025. 

**KRITIEKE REGEL: Gebruik ALLEEN informatie uit de gegeven context van de ${AVAILABLE_PARTIES.length} beschikbare partijen.**

Beschikbare partijen: ${AVAILABLE_PARTIES.join(', ')}

Antwoordregels:
- Gebruik UITSLUITEND informatie uit de gegeven context
- Als een partij niet in de context staat, vermeld je deze NIET
- Geef per aanwezige partij een uitgebreide paragraaf met:
  * Specifieke beleidsvoorstellen uit hun programma
  * Concrete doelstellingen en cijfers waar mogelijk
  * Onderliggende motivatie
- **Gebruik deze structuur**: ## Partijnaam, gevolgd door een uitgebreide paragraaf
- Als er onvoldoende informatie is, zeg dan eerlijk dat er meer details nodig zijn
- Blijf binnen de grenzen van de beschikbare programma-informatie
- VERZIN GEEN informatie die niet in de context staat

Voorbeeld structuur:
## Partijnaam
Volgens hun verkiezingsprogramma wil [partij] [specifiek voorstel uit context]. [Verdere details uit de context].

WAARSCHUWING: Antwoord NOOIT over partijen die niet in de context staan!

Context van officiële verkiezingsprogramma's 2025:
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

    // Prepare sources (ALL parties)
    const sources = allPartyResults.map((result: any) => ({
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