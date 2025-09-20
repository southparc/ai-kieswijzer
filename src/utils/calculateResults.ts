import { Party, PartyResult, QuestionBreakdown } from "@/types/party";
import { Answer, Question } from "@/components/QuizInterface";
import { ThemeWeights } from "@/components/ThemeWeightSetup";
import { calculateCoalitionChances } from "./calculateCoalitionChances";

export const calculateResults = (
  answers: Record<number, Answer>, 
  parties: Party[],
  questions: Question[],
  themeWeights: ThemeWeights
): PartyResult[] => {
  if (!parties || parties.length === 0) {
    return [];
  }

  // Create a map of question IDs to their categories for easy lookup
  const questionCategories = questions.reduce((acc, question) => {
    acc[question.id] = question.category as keyof ThemeWeights;
    return acc;
  }, {} as Record<number, keyof ThemeWeights>);

  const results = parties.map(party => {
    let weightedMatches = 0;
    let totalPossibleWeight = 0;
    let agreements = 0;
    let disagreements = 0;
    const breakdown: QuestionBreakdown[] = [];

    Object.entries(answers).forEach(([questionId, userAnswer]) => {
      const qId = parseInt(questionId);
      const partyAnswer = party.positions[qId];
      const questionCategory = questionCategories[qId];
      
      if (userAnswer && partyAnswer && questionCategory) {
        const weight = themeWeights[questionCategory] / 100; // Convert percentage to weight
        totalPossibleWeight += weight;
        
        if (userAnswer === partyAnswer) {
          // Exact matches
          if (userAnswer === "agree") {
            weightedMatches += weight;
            agreements++;
            breakdown.push({
              questionId: qId,
              userAnswer,
              partyAnswer,
              result: "agreement"
            });
          } else if (userAnswer === "disagree") {
            weightedMatches += weight;
            agreements++; // Disagreeing together is also an agreement
            breakdown.push({
              questionId: qId,
              userAnswer,
              partyAnswer,
              result: "agreement"
            });
          } else {
            // Both neutral - partial credit
            weightedMatches += weight * 0.3;
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
          } else if ((userAnswer === "neutral" && partyAnswer !== "neutral") || 
                     (userAnswer !== "neutral" && partyAnswer === "neutral")) {
            // One is neutral, other has position - partial credit, don't count as disagreement
            weightedMatches += weight * 0.4;
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

    const matchPercentage = totalPossibleWeight > 0 
      ? Math.round((weightedMatches / totalPossibleWeight) * 100) 
      : 0;

    return {
      party,
      score: weightedMatches,
      percentage: matchPercentage,
      agreements,
      disagreements,
      breakdown
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Calculate coalition chances for all parties
  const coalitionChances = calculateCoalitionChances(results);
  
  // Add coalition chances to results
  return results.map(result => {
    const coalitionData = coalitionChances.find(c => c.partyName === result.party.name);
    return {
      ...result,
      coalitionChance: coalitionData?.chancePercentage || 0
    };
  });
};