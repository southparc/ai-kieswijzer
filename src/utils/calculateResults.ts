import { Party, PartyResult, QuestionBreakdown } from "@/types/party";
import { Answer, Question } from "@/components/QuizInterface";
import { ThemeWeights } from "@/components/ThemeWeightSetup";
import { calculateCoalitionChances } from "./calculateCoalitionChances";

type Pos = -1 | 0 | 1;

// Convert answer to numerical position
const answerToPos = (answer: Answer): Pos | null => {
  switch (answer) {
    case "agree": return 1;
    case "neutral": return 0;
    case "disagree": return -1;
    default: return null;
  }
};

// Compatibility function g(u,p) with parameters a and b
const compatibilityScore = (userPos: Pos, partyPos: Pos, a = 0.25, b = 0.75): number => {
  if (userPos === 0 && partyPos === 0) return b;  // Both neutral
  if (userPos === 0 && partyPos !== 0) return a;  // User neutral, party has position
  if (userPos !== 0 && partyPos === 0) return a;  // User has position, party neutral
  if (userPos === partyPos) return 1;             // Perfect match
  return 0;                                       // Conflict
};

// Get breakdown result type based on compatibility score
const getBreakdownResult = (g: number, a = 0.25, b = 0.75): QuestionBreakdown['result'] => {
  if (g === 1) return "perfect_match";
  if (g === 0) return "conflict";
  if (g === b) return "neutral_alignment";
  if (g === a) return "partial_match";
  return "partial_match"; // fallback
};

// Calculate party coverage (percentage of non-neutral positions)
const calculatePartyCoverage = (party: Party, answeredQuestions: number[]): number => {
  const relevantPositions = answeredQuestions
    .map(qId => party.positions[qId])
    .filter(pos => pos !== undefined);
  
  if (relevantPositions.length === 0) return 0;
  
  const nonNeutralCount = relevantPositions.filter(pos => pos !== "neutral").length;
  return Math.round((nonNeutralCount / relevantPositions.length) * 100);
};

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

  const answeredQuestionIds = Object.keys(answers).map(id => parseInt(id));

  const results = parties.map(party => {
    let numerator = 0;
    let denominator = 0;
    let perfectMatches = 0;
    let conflicts = 0;
    let neutralAlignments = 0;
    let partialMatches = 0;
    const breakdown: QuestionBreakdown[] = [];

    Object.entries(answers).forEach(([questionId, userAnswer]) => {
      const qId = parseInt(questionId);
      const partyAnswer = party.positions[qId];
      const questionCategory = questionCategories[qId];
      
      if (userAnswer && partyAnswer && questionCategory) {
        const weight = themeWeights[questionCategory] / 100;
        const userPos = answerToPos(userAnswer);
        const partyPos = answerToPos(partyAnswer);
        
        if (userPos !== null && partyPos !== null) {
          const g = compatibilityScore(userPos, partyPos);
          numerator += weight * g;
          denominator += weight;
          
          // Count different types of matches
          if (g === 1) perfectMatches++;
          else if (g === 0) conflicts++;
          else if (g === 0.75) neutralAlignments++;
          else if (g === 0.25) partialMatches++;
          
          breakdown.push({
            questionId: qId,
            userAnswer,
            partyAnswer,
            result: getBreakdownResult(g)
          });
        }
      }
    });

    const percentage = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
    const coverage = calculatePartyCoverage(party, answeredQuestionIds);

    return {
      party,
      score: numerator,
      percentage,
      agreements: perfectMatches + neutralAlignments, // High compatibility matches
      disagreements: conflicts,
      breakdown,
      coverage,
      perfectMatches,
      conflicts,
      neutralAlignments,
      partialMatches
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