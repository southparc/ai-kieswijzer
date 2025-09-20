import type { 
  Pos, 
  UserAnswer, 
  ScoreBreakdown, 
  DualPartyResult, 
  PartyData, 
  CompatibilityParams 
} from "@/types/dualScoring";

/**
 * Compatibility function g(u,p) with improved parameters
 */
export function calculateCompatibility(
  userPos: Pos, 
  partyPos: Pos, 
  a: number = 0.30, 
  b: number = 0.60
): number {
  if (userPos === 0 && partyPos === 0) return b;  // Both neutral
  if (userPos === 0 && partyPos !== 0) return a;  // User neutral, party has position
  if (userPos !== 0 && partyPos === 0) return a;  // User has position, party neutral
  if (userPos === partyPos) return 1;             // Perfect match
  return 0;                                       // Conflict
}

/**
 * Score a set of positions against user answers
 */
export function scorePositionSet(
  userAnswers: UserAnswer[],
  partyStances: { statementId: string; pos: Pos }[],
  params: CompatibilityParams = {}
): ScoreBreakdown {
  const { a = 0.30, b = 0.60, lambda = 0.12 } = params;
  
  const posById = new Map(partyStances.map(s => [s.statementId, s.pos]));
  
  let numerator = 0;
  let denominator = 0;
  let coverageWeighted = 0; // Sum of weights where party has non-neutral position
  let matches = 0;
  let conflicts = 0;
  let neutralAlign = 0;
  let partialAlign = 0;
  let answered = 0;

  for (const userAnswer of userAnswers) {
    const partyPos = posById.get(userAnswer.statementId);
    if (partyPos === undefined) continue;
    
    const userPos = userAnswer.ans as Pos;
    const weight = userAnswer.weight ?? 1;
    const compatibility = calculateCompatibility(userPos, partyPos, a, b);
    
    numerator += weight * compatibility;
    denominator += weight;
    answered++;
    
    // Track coverage (non-neutral party positions)
    if (partyPos !== 0) {
      coverageWeighted += weight;
    }
    
    // Count different types of alignments
    if (userPos === 0 && partyPos === 0) {
      neutralAlign++;
    } else if ((userPos === 0 && partyPos !== 0) || (userPos !== 0 && partyPos === 0)) {
      partialAlign++;
    } else if (userPos === partyPos) {
      matches++;
    } else if (userPos === -partyPos) {
      conflicts++;
    }
  }
  
  // Calculate raw score (0-1)
  const rawScore = denominator > 0 ? (numerator / denominator) : 0;
  
  // Calculate coverage (percentage of non-neutral positions)
  const coverage = denominator > 0 ? (coverageWeighted / denominator) : 0;
  
  // Apply regularization penalty for low coverage
  const penalty = lambda * (1 - coverage);
  const finalScore = Math.max(0, Math.min(1, rawScore - penalty));
  
  return {
    score: Math.round(finalScore * 100),
    rawScore: Math.round(rawScore * 100),
    coverage,
    penalty: Math.round(penalty * 100),
    matches,
    conflicts,
    neutralAlign,
    partialAlign,
    answered
  };
}

/**
 * Calculate dual scores (program + voting behavior) for a single party
 */
export function calculatePartyDualScore(
  party: PartyData,
  userAnswers: UserAnswer[],
  params: CompatibilityParams = {}
): DualPartyResult {
  // Score based on program positions
  const programBreakdown = scorePositionSet(
    userAnswers,
    party.program.map(s => ({ statementId: s.statementId, pos: s.pos })),
    params
  );
  
  // Score based on voting behavior
  const votesBreakdown = scorePositionSet(
    userAnswers,
    party.votes.map(s => ({ statementId: s.statementId, pos: s.pos })),
    params
  );
  
  // Calculate combined score (70% program, 30% voting behavior)
  const combinedScore = 0.7 * (programBreakdown.score / 100) + 0.3 * (votesBreakdown.score / 100);
  
  // Check if party has limited voting data (small parties, new parties)
  const hasLimitedVotingData = party.votes.length < 10 || votesBreakdown.coverage < 0.3;
  
  return {
    party,
    program: programBreakdown,
    votes: votesBreakdown,
    combined: Math.round(combinedScore * 100),
    hasLimitedVotingData
  };
}

/**
 * Calculate dual scores for all parties and sort by combined score
 */
export function calculateAllDualScores(
  parties: PartyData[],
  userAnswers: UserAnswer[],
  params: CompatibilityParams = {}
): DualPartyResult[] {
  if (!parties || parties.length === 0 || !userAnswers || userAnswers.length === 0) {
    return [];
  }
  
  const results = parties.map(party => 
    calculatePartyDualScore(party, userAnswers, params)
  );
  
  // Sort by combined score (descending), with tie-breaker on program score
  return results.sort((a, b) => {
    if (b.combined !== a.combined) {
      return b.combined - a.combined;
    }
    // Tie-breaker: prefer higher program score
    return b.program.score - a.program.score;
  });
}

/**
 * Get explanation text for the scoring methodology
 */
export function getScoringExplanation(): string {
  return `Je ziet hier twee scores per partij. De programma-score vergelijkt jouw antwoorden met wat partijen in hun programma schrijven. De praktijk-score kijkt naar hoe partijen in de Tweede Kamer hebben gestemd bij onderwerpen die passen bij de stellingen. 

Neutrale antwoorden en ontbrekende standpunten tellen mee, maar minder zwaar dan duidelijke overeenkomsten of tegenstellingen. Als er weinig informatie is (lage dekking), wordt de score automatisch iets naar beneden bijgesteld. 

Zo krijg je een evenwichtige uitkomst die zowel plannen als daadwerkelijk stemgedrag meeneemt.`;
}

/**
 * Validate user answers format
 */
export function validateUserAnswers(answers: any[]): UserAnswer[] {
  return answers.filter(answer => 
    answer && 
    typeof answer.statementId === 'string' && 
    (answer.ans === -1 || answer.ans === 0 || answer.ans === 1)
  );
}

/**
 * Convert legacy quiz answers to dual scoring format
 */
export function convertLegacyAnswers(
  answers: Record<number, "agree" | "neutral" | "disagree">,
  questions: { id: number }[]
): UserAnswer[] {
  return Object.entries(answers).map(([questionId, answer]) => ({
    statementId: questionId,
    ans: answer === "agree" ? 1 : answer === "disagree" ? -1 : 0,
    weight: 1
  }));
}