import { useMemo } from 'react';
import type { Party } from '@/types/party';
import type { Answer } from '@/components/QuizInterface';
import type { Question } from '@/components/QuizInterface';
import type { ThemeWeights } from '@/components/ThemeWeightSetup';
import type { PartyData, UserAnswer, DualPartyResult, Pos } from '@/types/dualScoring';
import { calculateAllDualScores, convertLegacyAnswers } from '@/utils/dualScoreCalculator';
import { getPartyVotingBehavior } from '@/data/votingBehavior';
import { scoreParty } from '@/utils/scoringEnhanced';
import { mapToQAItems, mapScoreToBreakdown } from '@/utils/scoringAdapter';

// Feature flag for enhanced scoring v2
const USE_ENHANCED_SCORING = false;

/**
 * Convert legacy party data to dual scoring format
 */
function convertPartyToDualFormat(party: Party): PartyData {
  const votingBehavior = getPartyVotingBehavior(party.name);
  
  // Convert party positions to program stances
  const programStances = Object.entries(party.positions).map(([questionId, position]) => ({
    statementId: questionId,
    pos: (position === "agree" ? 1 : position === "disagree" ? -1 : 0) as Pos,
    confidence: 0.8, // Default confidence for program positions
    evidenceRefs: [`program_${party.id}_${questionId}`]
  }));

  return {
    id: party.id,
    name: party.name,
    color: party.color,
    description: party.description,
    program: programStances,
    votes: votingBehavior
  };
}

/**
 * Hook for calculating dual scores (program + voting behavior)
 */
export function useDualScoring(
  answers: Record<number, Answer>,
  parties: Party[],
  questions: Question[],
  themeWeights: ThemeWeights
): {
  results: DualPartyResult[];
  hasVotingData: boolean;
  explanation: string;
} {
  const dualResults = useMemo(() => {
    if (!parties || parties.length === 0 || !questions || questions.length === 0) {
      return [];
    }

    if (USE_ENHANCED_SCORING) {
      // Enhanced scoring v2 with sigmoid curve + normalization
      const results: DualPartyResult[] = parties.map(party => {
        const qaItems = mapToQAItems(answers, questions, themeWeights, party);
        
        const programScore = scoreParty(qaItems, {
          a: 0.28,
          b: 0.55,
          lambda: 0.14,
          featureSoftConflict: true,
          softConflictFloor: 0.12
        });

        const programBreakdown = mapScoreToBreakdown(programScore);

        // Voting behavior (using legacy calculation for now)
        const votingBehavior = getPartyVotingBehavior(party.name);
        const dualParty = convertPartyToDualFormat(party);
        const userAnswers = convertLegacyAnswers(answers, questions);
        
        // For voting, we still use legacy for now (can be migrated later)
        const votesBreakdown = {
          score: 0,
          rawScore: 0,
          coverage: 0,
          penalty: 0,
          matches: 0,
          conflicts: 0,
          neutralAlign: 0,
          partialAlign: 0,
          answered: votingBehavior.length
        };

        const combined = programBreakdown.score * 0.7 + votesBreakdown.score * 0.3;

        return {
          party: dualParty,
          program: programBreakdown,
          votes: votesBreakdown,
          combined,
          hasLimitedVotingData: votingBehavior.length < 5
        };
      });

      // Sort by combined score, then strongMatches, then coverage
      return results.sort((a, b) => {
        if (b.combined !== a.combined) return b.combined - a.combined;
        if (b.program.matches !== a.program.matches) return b.program.matches - a.program.matches;
        return b.program.coverage - a.program.coverage;
      });
    }

    // Legacy scoring v1 (fallback)
    const userAnswers: UserAnswer[] = convertLegacyAnswers(answers, questions);
    
    const weightedUserAnswers: UserAnswer[] = userAnswers.map(answer => {
      const question = questions.find(q => q.id.toString() === answer.statementId);
      if (!question) return answer;
      
      const categoryWeight = themeWeights[question.category as keyof ThemeWeights] || 100;
      const weight = Math.max(1, Math.min(3, Math.round(categoryWeight / 33.33))) as 1 | 2 | 3;
      
      return {
        ...answer,
        weight
      };
    });

    const dualParties: PartyData[] = parties.map(convertPartyToDualFormat);

    return calculateAllDualScores(dualParties, weightedUserAnswers);
  }, [answers, parties, questions, themeWeights]);

  const hasVotingData = useMemo(() => {
    return dualResults.some(result => result.votes.answered > 0);
  }, [dualResults]);

  const explanation = useMemo(() => {
    return `Je ziet hier twee scores per partij. De programma-score vergelijkt jouw antwoorden met wat partijen in hun programma schrijven. De praktijk-score kijkt naar hoe partijen in de Tweede Kamer hebben gestemd bij onderwerpen die passen bij de stellingen.

Neutrale antwoorden en ontbrekende standpunten tellen mee, maar minder zwaar dan duidelijke overeenkomsten of tegenstellingen. Als er weinig informatie is (lage dekking), wordt de score automatisch iets naar beneden bijgesteld.

Zo krijg je een evenwichtige uitkomst die zowel plannen als daadwerkelijk stemgedrag meeneemt.`;
  }, []);

  return {
    results: dualResults,
    hasVotingData,
    explanation
  };
}