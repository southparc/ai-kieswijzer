import { Answer } from "@/components/QuizInterface";
import { Party } from "@/components/ResultsPage";

export interface PartyResult {
  party: Party;
  matchPercentage: number;
  agreementCount: number;
  disagreementCount: number;
}

export const calculateResults = (
  answers: Record<number, Answer>, 
  parties: Party[]
): PartyResult[] => {
  return parties.map(party => {
    let matches = 0;
    let agreements = 0;
    let disagreements = 0;
    let totalComparisons = 0;

    Object.entries(answers).forEach(([questionId, userAnswer]) => {
      const qId = parseInt(questionId);
      const partyAnswer = party.positions[qId];
      
      if (userAnswer && partyAnswer) {
        totalComparisons++;
        
        if (userAnswer === partyAnswer) {
          matches++;
          if (userAnswer === "agree") agreements++;
          else if (userAnswer === "disagree") disagreements++;
        } else {
          // Partial credit for neutral answers
          if (userAnswer === "neutral" || partyAnswer === "neutral") {
            matches += 0.5;
          }
          
          if (userAnswer === "agree" && partyAnswer === "disagree") {
            disagreements++;
          } else if (userAnswer === "disagree" && partyAnswer === "agree") {
            disagreements++;
          }
        }
      }
    });

    const matchPercentage = totalComparisons > 0 
      ? Math.round((matches / totalComparisons) * 100) 
      : 0;

    return {
      party,
      matchPercentage,
      agreementCount: agreements,
      disagreementCount: disagreements
    };
  });
};