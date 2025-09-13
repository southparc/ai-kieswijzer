import { Party, PartyResult, QuestionBreakdown } from "@/types/party";
import { Answer } from "@/components/QuizInterface";

export const calculateResults = (
  answers: Record<number, Answer>, 
  parties: Party[]
): PartyResult[] => {
  if (!parties || parties.length === 0) {
    return [];
  }

  return parties.map(party => {
    let matches = 0;
    let agreements = 0;
    let disagreements = 0;
    let totalComparisons = 0;
    const breakdown: QuestionBreakdown[] = [];

    Object.entries(answers).forEach(([questionId, userAnswer]) => {
      const qId = parseInt(questionId);
      const partyAnswer = party.positions[qId];
      
      if (userAnswer && partyAnswer) {
        totalComparisons++;
        
        if (userAnswer === partyAnswer) {
          // Exact matches
          if (userAnswer === "agree") {
            matches++;
            agreements++;
            breakdown.push({
              questionId: qId,
              userAnswer,
              partyAnswer,
              result: "agreement"
            });
          } else if (userAnswer === "disagree") {
            matches++;
            disagreements++;
            breakdown.push({
              questionId: qId,
              userAnswer,
              partyAnswer,
              result: "agreement"
            });
          } else {
            // Both neutral - minimal credit
            matches += 0.3;
            breakdown.push({
              questionId: qId,
              userAnswer,
              partyAnswer,
              result: "neutral_match"
            });
          }
        } else {
          // Different positions
          if ((userAnswer === "agree" && partyAnswer === "disagree") || 
              (userAnswer === "disagree" && partyAnswer === "agree")) {
            disagreements++;
            breakdown.push({
              questionId: qId,
              userAnswer,
              partyAnswer,
              result: "disagreement"
            });
          } else {
            // One is neutral, other has position - very small credit
            matches += 0.1;
            breakdown.push({
              questionId: qId,
              userAnswer,
              partyAnswer,
              result: "neutral_partial"
            });
          }
        }
      }
    });

    const matchPercentage = totalComparisons > 0 
      ? Math.round((matches / totalComparisons) * 100) 
      : 0;

    return {
      party,
      score: matches,
      percentage: matchPercentage,
      agreements,
      disagreements,
      breakdown
    };
  }).sort((a, b) => b.percentage - a.percentage);
};