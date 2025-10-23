// scoringAdapter.ts
// Adapter layer between legacy quiz format and enhanced scoring v2

import type { Question } from '@/components/QuizInterface';
import type { ThemeWeights } from '@/components/ThemeWeightSetup';
import type { Party } from '@/types/party';
import type { Answer } from '@/components/QuizInterface';
import type { ScoreBreakdown } from '@/types/dualScoring';
import { QAItem, PartyScore, Pos } from './scoringEnhanced';

export function mapToQAItems(
  answers: Record<number, Answer>,
  questions: Question[],
  themeWeights: ThemeWeights,
  party: Party
): QAItem[] {
  return questions
    .filter(q => answers[q.id] !== undefined)
    .map(q => {
      const userAnswer = answers[q.id];
      const partyPosition = party.positions[q.id];

      const userPos: Pos = 
        userAnswer === 'agree' ? 1 : 
        userAnswer === 'disagree' ? -1 : 0;
      
      const partyPos: Pos | null = 
        partyPosition === 'agree' ? 1 : 
        partyPosition === 'disagree' ? -1 : 
        partyPosition === 'neutral' ? 0 : null;

      const topicPercentage = themeWeights[q.category as keyof ThemeWeights] ?? 50;

      return {
        questionId: q.id.toString(),
        topicPercentage,
        importance: 1.0,
        userPos,
        partyPos,
        ai: null
      };
    });
}

export function mapScoreToBreakdown(partyScore: PartyScore): ScoreBreakdown {
  return {
    score: Math.round(partyScore.score * 100),
    rawScore: Math.round(partyScore.score * 100),
    coverage: partyScore.coverage,
    penalty: 0,
    matches: partyScore.audit.exactMatches,
    conflicts: partyScore.audit.conflicts,
    neutralAlign: partyScore.audit.bothNeutral,
    partialAlign: partyScore.audit.partialMatches,
    answered: partyScore.results.length
  };
}
