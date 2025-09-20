// Helper functions for enhanced retrieval and classification

export function inferThemeFromQuestion(question: string): string {
  const text = question.toLowerCase();
  
  const themes = [
    { name: 'economie', patterns: ['economie', 'financ', 'belasting', 'werk', 'baan', 'inkomen', 'ondernemen', 'budget', 'geld'] },
    { name: 'onderwijs', patterns: ['onderwijs', 'school', 'universiteit', 'student', 'leraar', 'opleiding', 'studie'] },
    { name: 'zorg', patterns: ['zorg', 'gezondheid', 'medisch', 'dokter', 'ziekenhuis', 'psychisch', 'medicare'] },
    { name: 'klimaat', patterns: ['klimaat', 'milieu', 'energie', 'duurzaam', 'co2', 'uitstoot', 'groen', 'natuur'] },
    { name: 'veiligheid', patterns: ['veiligheid', 'politie', 'criminaliteit', 'terrorisme', 'defensie', 'leger'] },
    { name: 'migratie', patterns: ['migratie', 'asiel', 'vluchtelingen', 'immigratie', 'integratie', 'grenzen'] },
    { name: 'europa', patterns: ['europa', 'eu ', 'europese unie', 'brussel', 'europeaan', 'brexit'] },
    { name: 'wonen', patterns: ['wonen', 'woningbouw', 'huren', 'hypotheek', 'vastgoed', 'huizen'] },
    { name: 'digitalisering', patterns: ['digitaal', 'internet', 'ai ', 'technologie', 'cyber', 'data', 'privacy'] }
  ];
  
  for (const theme of themes) {
    if (theme.patterns.some(pattern => text.includes(pattern))) {
      return theme.name;
    }
  }
  
  return 'algemeen';
}

export function deduplicateResults(results: any[]): any[] {
  const seen = new Set<string>();
  const deduped: any[] = [];
  
  for (const result of results) {
    // Create hash from content (first 200 chars)
    const hash = result.content?.slice(0, 200).replace(/\s+/g, ' ').trim();
    if (hash && !seen.has(hash)) {
      seen.add(hash);
      deduped.push(result);
    }
  }
  
  return deduped;
}

export function crossEncoderRerank(results: any[], question: string): any[] {
  // Simple heuristic reranking (in a real implementation, use a cross-encoder model)
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  return results
    .map((result: any) => {
      const content = result.content?.toLowerCase() || '';
      
      // Calculate relevance score based on word overlap
      let score = 0;
      for (const word of questionWords) {
        const count = (content.match(new RegExp(word, 'g')) || []).length;
        score += count * (word.length / 10); // Longer words get more weight
      }
      
      // Boost recent/quality content
      score *= (result.quality || 1);
      
      return { ...result, relevanceScore: score };
    })
    .sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

export async function classifyPartyStance(
  content: string, 
  question: string
): Promise<{ stance: 'pro' | 'contra' | 'neutral' | 'unknown'; confidence: number; reasoning: string }> {
  
  // Simple heuristic classification (in production, use NLI model)
  const text = content.toLowerCase();
  const questionLower = question.toLowerCase();
  
  // Extract key terms from question
  const questionTerms = questionLower
    .split(/\s+/)
    .filter(term => term.length > 3 && !['moet', 'kunnen', 'willen', 'zijn', 'hebben'].includes(term));
  
  if (questionTerms.length === 0) {
    return { stance: 'unknown', confidence: 0, reasoning: 'Geen herkenbare termen in vraag' };
  }
  
  // Check if content mentions the topic
  const topicMentioned = questionTerms.some(term => text.includes(term));
  if (!topicMentioned) {
    return { stance: 'unknown', confidence: 0, reasoning: 'Onderwerp niet gevonden in tekst' };
  }
  
  // Define positive and negative indicators
  const positiveIndicators = [
    'steun', 'voor', 'bevorderen', 'versterken', 'uitbreiden', 'investeren', 'verbeteren', 
    'stimuleren', 'ondersteunen', 'verhogen', 'meer', 'extra', 'aanmoedigen', 'faciliteren'
  ];
  
  const negativeIndicators = [
    'tegen', 'stoppen', 'verminderen', 'afschaffen', 'beperken', 'verlagen', 'minder', 
    'terugdringen', 'wegsnijden', 'schrappen', 'voorkomen', 'tegengaan', 'verbieden'
  ];
  
  const neutralIndicators = [
    'onderzoeken', 'overwegen', 'evalueren', 'bekijken', 'analyseren', 'afwegen', 
    'mogelijk', 'eventueel', 'afhankelijk', 'onder voorwaarden'
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  let neutralScore = 0;
  
  // Count indicators near question terms
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    const hasQuestionTerm = questionTerms.some(term => sentence.includes(term));
    if (!hasQuestionTerm) continue;
    
    for (const indicator of positiveIndicators) {
      if (sentence.includes(indicator)) positiveScore++;
    }
    for (const indicator of negativeIndicators) {
      if (sentence.includes(indicator)) negativeScore++;
    }
    for (const indicator of neutralIndicators) {
      if (sentence.includes(indicator)) neutralScore++;
    }
  }
  
  const totalScore = positiveScore + negativeScore + neutralScore;
  if (totalScore === 0) {
    return { stance: 'unknown', confidence: 0, reasoning: 'Geen duidelijke standpunt-indicatoren gevonden' };
  }
  
  const confidence = Math.min(totalScore / 3, 1); // Max confidence at 3+ indicators
  
  if (positiveScore > negativeScore && positiveScore > neutralScore) {
    return { 
      stance: 'pro', 
      confidence, 
      reasoning: `${positiveScore} positieve indicatoren vs ${negativeScore} negatieve, ${neutralScore} neutrale` 
    };
  } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
    return { 
      stance: 'contra', 
      confidence, 
      reasoning: `${negativeScore} negatieve indicatoren vs ${positiveScore} positieve, ${neutralScore} neutrale` 
    };
  } else if (neutralScore > 0 || (positiveScore === negativeScore && positiveScore > 0)) {
    return { 
      stance: 'neutral', 
      confidence: confidence * 0.8, 
      reasoning: `Gemengde signalen: ${positiveScore} positief, ${negativeScore} negatief, ${neutralScore} neutraal` 
    };
  }
  
  return { stance: 'unknown', confidence: 0, reasoning: 'Onduidelijke classificatie' };
}