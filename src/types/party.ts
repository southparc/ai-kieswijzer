export interface Party {
  id: string;
  name: string;
  color: string;
  description: string;
  positions: Record<number, "agree" | "neutral" | "disagree">;
}

export interface DatabaseParty {
  id: string;
  party: string;
  title: string;
  url: string;
  year?: number;
  version?: string;
  inserted_at: string;
}

export interface QuestionBreakdown {
  questionId: number;
  userAnswer: "agree" | "neutral" | "disagree";
  partyAnswer: "agree" | "neutral" | "disagree";
  result: "perfect_match" | "conflict" | "neutral_alignment" | "partial_match";
}

export interface PartyResult {
  party: Party;
  score: number;
  percentage: number;
  agreements: number;
  disagreements: number;
  breakdown: QuestionBreakdown[];
  coalitionChance?: number;
  coverage?: number;
  perfectMatches?: number;
  conflicts?: number;
  neutralAlignments?: number;
  partialMatches?: number;
}

export interface CoalitionResult {
  partyName: string;
  chancePercentage: number;
  mostLikelyCoalitions: Array<{
    partners: string[];
    seats: number;
    probability: number;
  }>;
  explanation: string;
}