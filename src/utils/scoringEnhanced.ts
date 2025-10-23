// scoringEnhanced.ts
// Enhanced scoring v2: sigmoid theme weights, soft conflict floor, quadratic coverage penalty, optional AI-fuse

export type Pos = -1 | 0 | 1;
export type StanceSource = 'manual' | 'ai' | 'fused';

export interface AiSignal {
  stance: Pos;
  confidence: number;
  sourceDoc?: string;
  page?: number;
}

export interface QAItem {
  questionId: string;
  topicPercentage: number;
  importance?: number;
  userPos: Pos;
  partyPos?: Pos | null;
  ai?: AiSignal | null;
}

export interface ScoreOptions {
  a?: number;
  b?: number;
  lambda?: number;
  aiFuseEnabled?: boolean;
  aiMinConf?: number;
  featureSoftConflict?: boolean;
  softConflictFloor?: number;
}

export interface QuestionResult {
  questionId: string;
  userPos: Pos;
  partyPosUsed: Pos;
  source: StanceSource;
  importance: number;
  topicWeight: number;
  rawCompatibility: number;
  weightedCompatibility: number;
  ai?: AiSignal | null;
}

export interface PartyScore {
  score: number;
  coverage: number;
  strongMatches: number;
  results: QuestionResult[];
  audit: {
    exactMatches: number;
    partialMatches: number;
    bothNeutral: number;
    conflicts: number;
    fusedFromAI: number;
  };
}

export const DEFAULTS = {
  a: 0.28,
  b: 0.55,
  lambda: 0.14,
  aiMinConf: 0.85,
  featureSoftConflict: true,
  softConflictFloor: 0.12,
};

export function topicWeightSigmoid(percentage: number): number {
  const x = Math.max(0, Math.min(100, percentage)) / 100;
  const base = 1.0;
  const amp = 0.6;
  const k = 8;
  const x0 = 0.7;
  return base + amp * (1 / (1 + Math.exp(-k * (x - x0))) - 0.5);
}

export function normalizeWeights(ws: number[]): number[] {
  const s = ws.reduce((a, b) => a + b, 0) || 1;
  const scale = ws.length / s;
  return ws.map((w) => w * scale);
}

export function fuseStance(
  manual: Pos | null | undefined,
  ai: AiSignal | null | undefined,
  aiMinConf = DEFAULTS.aiMinConf
): { stance: Pos; source: StanceSource } {
  const hm = typeof manual === 'number' ? (manual as Pos) : 0;
  if (!ai || ai.confidence < aiMinConf) return { stance: hm, source: 'manual' };

  const t = Math.max(0, Math.min(1, (ai.confidence - aiMinConf) / (1 - aiMinConf)));
  const wAi = 0.5 + 0.5 * t;
  const wHm = 1 - wAi;

  const fused = wHm * hm + wAi * ai.stance;
  const stance: Pos = fused > 0.33 ? 1 : fused < -0.33 ? -1 : 0;
  return { stance, source: 'fused' };
}

export function compatibility(
  userPos: Pos,
  partyPos: Pos,
  importance = 1,
  a = DEFAULTS.a,
  b = DEFAULTS.b,
  softConflict = DEFAULTS.featureSoftConflict,
  softFloor = DEFAULTS.softConflictFloor
): number {
  if (userPos === 0 && partyPos === 0) return b;
  if (userPos === 0 || partyPos === 0) return a;
  if (userPos === partyPos) return 1;

  if (softConflict && importance < 0.7) return softFloor;
  return 0;
}

export function applyCoverage(
  total: number,
  coverage: number,
  lambda = DEFAULTS.lambda
): number {
  const miss = Math.max(0, 1 - coverage);
  return total * (1 - lambda * miss * miss);
}

export function scoreParty(
  answers: QAItem[],
  opts: ScoreOptions = {}
): PartyScore {
  const a = opts.a ?? DEFAULTS.a;
  const b = opts.b ?? DEFAULTS.b;
  const lambda = opts.lambda ?? DEFAULTS.lambda;
  const aiMinConf = opts.aiMinConf ?? DEFAULTS.aiMinConf;
  const softC = opts.featureSoftConflict ?? DEFAULTS.featureSoftConflict;
  const softFloor = opts.softConflictFloor ?? DEFAULTS.softConflictFloor;

  const rawWeights = answers.map((q) => topicWeightSigmoid(q.topicPercentage));
  const normWeights = normalizeWeights(rawWeights);

  const results: QuestionResult[] = [];
  let denom = 0;
  let numer = 0;
  let strongMatches = 0;
  let exactMatches = 0;
  let partialMatches = 0;
  let bothNeutral = 0;
  let conflicts = 0;
  let fusedFromAI = 0;

  answers.forEach((q, idx) => {
    const importance = q.importance == null ? 1 : Math.max(0, Math.min(1, q.importance));
    const topicW = normWeights[idx];

    let partyPosUsed: Pos;
    let source: StanceSource = 'manual';

    if (opts.aiFuseEnabled && q.ai) {
      const fused = fuseStance(q.partyPos ?? 0, q.ai, aiMinConf);
      partyPosUsed = fused.stance;
      source = fused.source;
      if (source === 'fused') fusedFromAI++;
    } else {
      partyPosUsed = (typeof q.partyPos === 'number' ? q.partyPos : 0) as Pos;
    }

    const raw = compatibility(q.userPos, partyPosUsed, importance, a, b, softC, softFloor);
    const weighted = raw * topicW;

    if (q.userPos === 0 && partyPosUsed === 0) bothNeutral++;
    else if (q.userPos === 0 || partyPosUsed === 0) partialMatches++;
    else if (q.userPos === partyPosUsed) {
      exactMatches++;
      if (raw >= 0.9) strongMatches++;
    } else {
      conflicts++;
    }

    results.push({
      questionId: q.questionId,
      userPos: q.userPos,
      partyPosUsed,
      source,
      importance,
      topicWeight: topicW,
      rawCompatibility: raw,
      weightedCompatibility: weighted,
      ai: q.ai ?? null,
    });

    numer += weighted;
    denom += topicW;
  });

  const baseScore = denom > 0 ? numer / denom : 0;

  const covered = answers.filter((q) =>
    typeof (opts.aiFuseEnabled && q.ai ? q.ai.stance : q.partyPos) === 'number'
  ).length;
  const coverage = answers.length > 0 ? covered / answers.length : 0;

  const finalScore = applyCoverage(baseScore, coverage, lambda);

  return {
    score: finalScore,
    coverage,
    strongMatches,
    results,
    audit: {
      exactMatches,
      partialMatches,
      bothNeutral,
      conflicts,
      fusedFromAI,
    },
  };
}
