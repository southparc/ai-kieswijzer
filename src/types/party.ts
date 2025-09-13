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

export interface PartyResult {
  party: Party;
  score: number;
  percentage: number;
  agreements: number;
  disagreements: number;
}