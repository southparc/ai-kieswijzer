import { useMemo } from 'react';
import type { Party } from '@/types/party';
import type { Answer } from '@/components/QuizInterface';
import type { Question } from '@/components/QuizInterface';
import type { ThemeWeights } from '@/components/ThemeWeightSetup';
import type { PartyData, UserAnswer, DualPartyResult } from '@/types/dualScoring';
import { calculateAllDualScores, convertLegacyAnswers } from '@/utils/dualScoreCalculator';
import { getPartyVotingBehavior } from '@/data/votingBehavior';

/**
 * Convert legacy party data to dual scoring format
 */
function convertPartyToDualFormat(party: Party): PartyData {
  const votingBehavior = getPartyVotingBehavior(party.name);
  
  // Convert party positions to program stances
  const programStances = Object.entries(party.positions).map(([questionId, position]) => ({
    statementId: questionId,
    pos: position === "agree" ? 1 : position === "disagree" ? -1 : 0,
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

    // Convert legacy answers to dual scoring format
    const userAnswers: UserAnswer[] = convertLegacyAnswers(answers, questions);
    
    // Apply theme weights to user answers
    const weightedUserAnswers: UserAnswer[] = userAnswers.map(answer => {
      const question = questions.find(q => q.id.toString() === answer.statementId);
      if (!question) return answer;
      
      const categoryWeight = themeWeights[question.category as keyof ThemeWeights] || 100;
      // Convert percentage weight (0-100) to multiplier (1-3)
      const weight = Math.max(1, Math.min(3, Math.round(categoryWeight / 33.33))) as 1 | 2 | 3;
      
      return {
        ...answer,
        weight
      };
    });

    // Convert parties to dual scoring format
    const dualParties: PartyData[] = parties.map(convertPartyToDualFormat);

    // Calculate dual scores
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