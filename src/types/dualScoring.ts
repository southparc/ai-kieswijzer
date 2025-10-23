// Dual scoring system types for program vs voting behavior comparison

export type Pos = -1 | 0 | 1;
export type Weight = 1 | 2 | 3;
export type StanceSource = 'manual' | 'ai' | 'fused';

// AI classification signal for enhanced scoring
export interface AiSignal {
  stance: Pos;
  confidence: number;
  sourceDoc?: string;
  page?: number;
}

// Enhanced question/answer item for v2 scoring
export interface QAItem {
  questionId: string;
  topicPercentage: number;
  importance?: number;
  userPos: Pos;
  partyPos?: Pos | null;
  ai?: AiSignal | null;
}

// Enhanced scoring options for v2
export interface ScoreOptions {
  a?: number;
  b?: number;
  lambda?: number;
  aiFuseEnabled?: boolean;
  aiMinConf?: number;
  featureSoftConflict?: boolean;
  softConflictFloor?: number;
}

export interface Statement {
  id: string;
  theme: "economie" | "zorg" | "klimaat" | "wonen" | "bestuur" | "onderwijs" | "veiligheid" | "migratie" | "europa" | "digitalisering";
  weight?: Weight; // default 1
  text: string;
}

export interface PartyProgramStance {
  statementId: string;
  pos: Pos | 0;
  confidence?: number;
  evidenceRefs?: string[];
}

export interface PartyVoteStance {
  statementId: string;
  pos: Pos | 0;
  evidenceRefs?: string[]; // kamernummer, datum, link
}

export interface PartyData {
  id: string;
  name: string;
  color: string;
  description: string;
  program: PartyProgramStance[];
  votes: PartyVoteStance[];
  cpbAnalysisUrl?: string;
}

export interface UserAnswer {
  statementId: string;
  ans: Pos | 0; // 0 = neutral
  weight?: Weight;
}

export interface ScoreBreakdown {
  score: number;        // 0..100 (after penalty)
  rawScore: number;     // 0..100 (before penalty)
  coverage: number;     // 0..1
  penalty: number;      // 0..100
  matches: number;
  conflicts: number;
  neutralAlign: number; // u=0,p=0
  partialAlign: number; // u=0,p≠0 or u≠0,p=0
  answered: number;
}

export interface DualPartyResult {
  party: PartyData;
  program: ScoreBreakdown;
  votes: ScoreBreakdown;
  combined: number; // weighted combination score (0-100)
  hasLimitedVotingData?: boolean; // for smaller parties
}

export interface CompatibilityParams {
  a?: number; // partial match score (default 0.30)
  b?: number; // neutral alignment score (default 0.60)
  lambda?: number; // coverage penalty factor (default 0.12)
}

// Mapping data for connecting statements to voting behavior
export interface VotingReference {
  id: string;
  statementId: string;
  title: string;
  date: string;
  kamernummer?: string;
  link?: string;
  description: string;
}

// Result of a specific vote
export interface VoteResult {
  partyId: string;
  position: Pos; // -1 = against, 0 = abstain/absent, 1 = for
  note?: string;
}