import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { inferThemeFromQuestion, deduplicateResults, crossEncoderRerank, classifyPartyStance } from './helpers.ts';

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

// 

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
    { re: /(vrij\s*verbond)|(^|[\s_-])vv([\s_-]|$)/i, name: 'Vrij Verbond' },
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

    // First, get all distinct parties from the database
    // First, get all parties from the database and build a normalized mapping
    const { data: allDocs, error: partiesError } = await supabase
      .from('documents')
      .select('party, title, url')
      .order('party');

    if (partiesError) {
      console.error('Error fetching parties:', partiesError);
      throw partiesError;
    }

    // Map normalizedParty -> set of original party labels present in DB
    const normToOriginal = new Map<string, Set<string>>();
    (allDocs || []).forEach((d: any) => {
      const norm = guessParty(`${d.party} ${d.title} ${d.url}`, d.party);
      if (!normToOriginal.has(norm)) normToOriginal.set(norm, new Set<string>());
      normToOriginal.get(norm)!.add(d.party);
    });

    let uniquePartiesNorm = Array.from(normToOriginal.keys());
    console.log('Parties (normalized):', uniquePartiesNorm.join(', '));

    // If user asks about Vrij Verbond but it's missing, try ingesting from storage on the fly
    const wantsVV = /vrij\s*verbond|(^|\W)vv(\W|$)/i.test(question || '');
    if (wantsVV && !normToOriginal.has('Vrij Verbond')) {
      console.log('Vrij Verbond requested but not in documents. Attempting targeted ingest from storage...');
      const BUCKET = 'programs';
      const names: string[] = [];
      try {
        let page = 0; const limit = 100;
        while (true) {
          const { data, error } = await supabase.storage.from(BUCKET).list('', { limit, offset: page * limit });
          if (error) { console.log('Storage list error', error); break; }
          if (!data || data.length === 0) break;
          names.push(...data.map(o => o.name));
          if (data.length < limit) break; page++;
        }
        const candidate = names.find(n => /(vrij[\s_-]*verbond)|(^|[\s_-])vv([\s_-]|$)/i.test(n));
        if (candidate) {
          console.log('Found Vrij Verbond file in storage:', candidate, '— invoking ingest_from_storage');
          const { data: ingestResp, error: ingestErr } = await supabase.functions.invoke('ingest_from_storage', {
            body: { files: [candidate], reingest: false, defaultYear: 2025 }
          });
          if (ingestErr) { console.log('Ingest invoke error', ingestErr); }
          else { console.log('Ingest response:', ingestResp); }

          // Refresh documents and mapping
          const { data: allDocs2 } = await supabase
            .from('documents')
            .select('party, title, url')
            .order('party');

          normToOriginal.clear();
          (allDocs2 || []).forEach((d: any) => {
            const norm = guessParty(`${d.party} ${d.title} ${d.url}`, d.party);
            if (!normToOriginal.has(norm)) normToOriginal.set(norm, new Set<string>());
            normToOriginal.get(norm)!.add(d.party);
          });
          uniquePartiesNorm = Array.from(normToOriginal.keys());
          console.log('Parties after ingest (normalized):', uniquePartiesNorm.join(', '));
        } else {
          console.log('No Vrij Verbond file found in storage bucket');
        }
      } catch (e) {
        console.log('Error during on-the-fly ingest attempt:', e);
      }
    }

    // Enhanced retrieval with theme filtering and higher top-k per party
    const inferredTheme = inferThemeFromQuestion(question);
    console.log('Inferred theme:', inferredTheme);
    
    let ragResults: any[] = [];
    
    // First pass: theme-filtered retrieval if we can infer a theme
    if (inferredTheme !== 'algemeen') {
      const { data: themeResults, error: themeError } = await supabase
        .rpc('rag_topk_themed', {
          q_embedding: qVec,
          theme_filter: inferredTheme,
          k: 60
        });
      
      if (!themeError && themeResults && themeResults.length > 0) {
        ragResults = themeResults;
        console.log('Theme-filtered results:', ragResults.length);
      }
    }
    
    // Fallback: standard semantic search with higher k
    if (ragResults.length < 30) {
      const { data: semanticResults, error: ragError } = await supabase
        .rpc('rag_topk', {
          q_embedding: qVec,
          k: 200 // Much higher to ensure coverage
        });
        
      if (ragError) {
        console.error('Error in RAG search:', ragError);
        throw ragError;
      }
      
      ragResults = [...ragResults, ...(semanticResults || [])];
    }
    
    // Deduplicate and rerank results
    ragResults = deduplicateResults(ragResults);
    ragResults = crossEncoderRerank(ragResults, question).slice(0, 100);

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
      const text = String(result.content || '').toLowerCase();
      const isPlaceholder = text.includes('geen tekst geëxtraheerd');
      if (!isPlaceholder && !partyContent.has(normalizedParty)) {
        partyContent.set(normalizedParty, {
          ...result,
          party_norm: normalizedParty
        });
      }
    });

    // For any missing parties, fetch their content directly (query using original labels for each normalized name)
    for (const normalizedParty of uniquePartiesNorm) {
      if (!partyContent.has(normalizedParty)) {
        const originals = Array.from(normToOriginal.get(normalizedParty) || []);
        if (originals.length === 0) continue;

        const { data: partyChunks, error: partyChunksError } = await supabase
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
          .in('documents.party', originals)
          .limit(5);

        if (partyChunksError) {
          console.log('Error fetching fallback chunk for', normalizedParty, partyChunksError);
        }

        const firstReal = (partyChunks || []).find((c: any) => !String(c.content || '').toLowerCase().includes('geen tekst geëxtraheerd'));

        if (firstReal) {
          const chunk = firstReal;
          partyContent.set(normalizedParty, {
            content: chunk.content,
            page: chunk.page,
            party: chunk.documents.party,
            party_norm: normalizedParty,
            title: chunk.documents.title,
            url: chunk.documents.url
          });
        } else {
          console.log(`No real content found for party (normalized): ${normalizedParty} | originals tried: ${originals.join(', ')}`);
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

    // Enhanced AI response with 4-class classification per party
    const partyAnalyses = await Promise.all(
      allPartyResults.map(async (result: any) => {
        const classification = await classifyPartyStance(result.content, question);
        return {
          ...result,
          stance: classification.stance,
          confidence: classification.confidence,
          reasoning: classification.reasoning
        };
      })
    );
    
    // Filter parties with sufficient evidence (not "unknown")
    const partiesWithStance = partyAnalyses.filter(p => 
      p.stance !== 'unknown' && p.confidence > 0.3
    );
    
    console.log('Parties with clear stance:', partiesWithStance.map(p => 
      `${p.party_norm}: ${p.stance} (${Math.round(p.confidence * 100)}%)`
    ).join(', '));
    
    // Generate contextualized response
    const enhancedContext = partiesWithStance.map((result: any) => 
      `**${result.party_norm}** [${result.stance.toUpperCase()}, vertrouwen: ${Math.round(result.confidence * 100)}%] (pagina ${result.page}): ${result.content}`
    ).join('\n\n');
    
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `Je bent een Nederlandse politieke adviseur die werkt met geclassificeerde standpunten uit verkiezingsprogramma's 2025.

CLASSIFICATIE-SYSTEEM:
- PRO: Partij steunt het onderwerp/voorstel expliciet
- CONTRA: Partij wijst het af of wil het tegendeel
- NEUTRAL: Partij neemt bewust geen duidelijk standpunt
- UNKNOWN: Onvoldoende bewijs in het programma (wordt weggelaten)

ANTWOORDREGELS:
- Behandel alleen partijen met duidelijke standpunten (${partiesWithStance.length} van ${allPartyResults.length} partijen)
- Groepeer per standpunt: ## Voor, ## Tegen, ## Neutraal/Gemengd
- Geef concrete voorstellen, cijfers en motivaties per partij
- Vermeld aan het eind welke partijen onvoldoende informatie hadden

Geclassificeerde context (${partiesWithStance.length} partijen met duidelijke standpunten):
${enhancedContext}`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_completion_tokens: 2500,
      }),
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API error: ${completion.status}`);
    }

    const completionData = await completion.json();
    const answer = completionData.choices[0].message.content;

    console.log('Generated AI response');

    // Prepare sources with enhanced metadata
    const sources = allPartyResults.map((result: any) => ({
      party: result.party_norm,
      page: result.page,
      url: result.url,
      stance: result.stance || 'unknown',
      confidence: result.confidence || 0,
      theme: result.theme || 'algemeen'
    }));

    // Store the answer with enhanced metadata
    const { error: answerError } = await supabase
      .from('answers')
      .insert({
        query_id: queryData.id,
        answer_md: answer,
        sources: sources,
        model: 'gpt-5-mini-2025-08-07',
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