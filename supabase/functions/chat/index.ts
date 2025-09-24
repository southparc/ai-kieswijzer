import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    console.log('[Chat] Received message:', message);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch system prompt from database using direct fetch
    let systemPrompt = `Je bent een Nederlandse politieke assistent die alleen praat over Nederlandse politiek en vooral over de verkiezingen die plaatsvinden aanstaande oktober 2025.

BELANGRIJKE REGELS:
- Beantwoord ALLEEN vragen over Nederlandse politiek, partijen, partijstandpunten, de 2025 verkiezingen voor de tweede kamer, beleid, etc.
- Als iemand over andere onderwerpen vraagt, leid het gesprek terug naar Nederlandse politiek
- Gebruik de context uit eerdere berichten om relevante antwoorden te geven
- Blijf objectief en informatief
- Verwijs naar concrete partijstandpunten waar mogelijk
- Antwoord in het Nederlands

ACTUELE LIJSTTREKKERS 2025:
- VVD: Dilan Yeşilgöz
- PVV: Geert Wilders
- CDA: Henri Bontenbal
- D66: Rob Jetten
- GL-PvdA: Frans Timmermans
- SP: Jimmy Dijk
- PvdD: Esther Ouwehand
- ChristenUnie: Mirjam Bikker
- SGP: Chris Stoffer
- DENK: Stephan van Baarle
- FVD: Thierry Baudet
- JA21: Joost Eerdmans
- Volt: Laurens Dassen
- BIJ1: Sylvana Simons
- 50PLUS: Liane den Haan
- BBB: Caroline van der Plas

Als iemand vraagt over onderwerpen buiten de Nederlandse politiek, zeg dan: "Ik kan alleen vragen beantwoorden over Nederlandse politiek. Heb je vragen over partijen, verkiezingen of politiek beleid in Nederland?"`;

    // Try to fetch updated prompt from database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        const response = await fetch(`${supabaseUrl}/rest/v1/chat_prompts?name=eq.system_prompt&active=eq.true&select=content`, {
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0 && data[0].content) {
            systemPrompt = data[0].content;
            console.log('[Chat] Using database prompt');
          }
        }
      }
    } catch (error) {
      console.error('[Chat] Error fetching prompt from database:', error);
      // Continue with default prompt
    }

    // Build messages array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log('[Chat] Sending to OpenAI with', messages.length, 'messages');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_completion_tokens: 1500,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chat] OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    console.log('[Chat] Generated response');

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Chat] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});