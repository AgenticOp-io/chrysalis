/**
 * Near-miss salience scoring for Intelligence Shorthand (G9520 / D6375).
 *
 * Inspired by CynoEngine (https://github.com/nimbus7772017/CynoEngine) —
 * z-scored mix of likeness + novelty + authority; surface ≠ skip-LLM.
 * Adapted to WebIR/oracle dispose. Not a code port.
 */
import type { IntelligenceShorthand } from "./shorthand.js";
import { tierRank } from "./shorthand-tiers.js";
import {
  fingerprintFromOpenLegacyEntry,
  isNearMissFingerprint,
  transferTags,
  type OpenLegacyDomainEntry,
  type ShorthandTaskFingerprint,
} from "./shorthand-fingerprint.js";

/** Transparent upstream citation for collaboration (D6374 / D6375). */
export const CYNOENGINE_ATTRIBUTION =
  "Inspired by CynoEngine (https://github.com/nimbus7772017/CynoEngine) — adapted to WebIR/oracle dispose. Not a code port.";

export type NearMissSalienceFeatures = {
  /** Overlap of transfer tags (0–1). */
  tagOverlap: number;
  /** Route-count band similarity (0–1). */
  routeBand: number;
  /** Exact route/source digest match bonus (0 or 1). */
  digestMatch: number;
  /** Authority from IS tier (T5=1 … T3≈0.6 … lower smaller). */
  authority: number;
  /** Novelty vs last donor (1 = different donor, 0 = same as last). */
  novelty: number;
};

export type NearMissCandidateScore = {
  domainId: string;
  score: number;
  features: NearMissSalienceFeatures;
  shorthand: IntelligenceShorthand;
  attribution: typeof CYNOENGINE_ATTRIBUTION;
  /** 1 = raw weighted mix (G9520); 2 = catalog z-score (G9630). */
  salienceVersion?: 1 | 2;
};

export type ScoreNearMissInput = {
  taskFingerprint: ShorthandTaskFingerprint;
  domainCatalog: OpenLegacyDomainEntry[];
  shorthands: IntelligenceShorthand[];
  /** Prefer not replaying the same donor every time (Cyno tug/novelty). */
  lastDonorDomainId?: string;
  /** Weights — renormalized to sum 1 internally. */
  weights?: Partial<{
    tagOverlap: number;
    routeBand: number;
    digestMatch: number;
    authority: number;
    novelty: number;
  }>;
  /** Force G9630 z-score path in tests/smoke (production uses operator domain count). */
  forceSalienceV2?: boolean;
};

const DEFAULT_WEIGHTS = {
  tagOverlap: 0.3,
  routeBand: 0.2,
  digestMatch: 0.2,
  authority: 0.2,
  novelty: 0.1,
} as const;

function bestForDomain(
  domainId: string,
  shorthands: IntelligenceShorthand[],
): IntelligenceShorthand | null {
  const matches = shorthands.filter((s) => s.domainId === domainId);
  if (!matches.length) return null;
  return matches.reduce((best, cur) => (tierRank(cur.tier) < tierRank(best.tier) ? cur : best));
}

function authorityFromTier(tier: IntelligenceShorthand["tier"]): number {
  const rank = tierRank(tier);
  // T5=0 → 1.0; T4=1 → 0.85; T3=2 → 0.7; lower tiers weaker
  return Math.max(0, 1 - rank * 0.15);
}

function tagOverlapScore(task: ShorthandTaskFingerprint, cand: ShorthandTaskFingerprint): number {
  const a = new Set(transferTags(task.tags).map((t) => t.toLowerCase()));
  const b = transferTags(cand.tags).map((t) => t.toLowerCase());
  if (!a.size || !b.length) return 0;
  const hits = b.filter((t) => a.has(t)).length;
  return hits / Math.max(a.size, b.length);
}

function routeBandScore(task: ShorthandTaskFingerprint, cand: ShorthandTaskFingerprint): number {
  if (task.minRoutes == null || cand.minRoutes == null) return 0;
  const lo = Math.min(task.minRoutes, cand.minRoutes);
  const hi = Math.max(task.minRoutes, cand.minRoutes);
  if (lo <= 0) return 0;
  const ratio = hi / lo;
  if (ratio <= 1) return 1;
  if (ratio <= 2) return 1 - (ratio - 1);
  return 0;
}

function digestMatchScore(task: ShorthandTaskFingerprint, cand: ShorthandTaskFingerprint): number {
  if (task.sourceDigest && cand.sourceDigest && task.sourceDigest === cand.sourceDigest) return 1;
  if (task.routeFingerprint && cand.routeFingerprint && task.routeFingerprint === cand.routeFingerprint) {
    return 1;
  }
  return 0;
}

const FEATURE_KEYS: (keyof NearMissSalienceFeatures)[] = [
  "tagOverlap",
  "routeBand",
  "digestMatch",
  "authority",
  "novelty",
];

/** Minimum distinct operator-evidence domains before v2 ranks in production (G9630). */
export const SALIENCE_V2_MIN_OPERATOR_DOMAINS = 20;

/** Minimum live analytics jobs before product hit-rate claims are READY (G9670) — sample floor (may include seed). */
export const PRODUCT_HIT_RATE_MIN_JOBS = 50;

/** Minimum hub-convert-verify jobs before live hit-rate READY (G9760) — seed does not count. */
export const PRODUCT_HIT_RATE_LIVE_MIN_JOBS = 50;

function normalizeWeights(w: {
  tagOverlap: number;
  routeBand: number;
  digestMatch: number;
  authority: number;
  novelty: number;
}) {
  const wSum = w.tagOverlap + w.routeBand + w.digestMatch + w.authority + w.novelty;
  return {
    tagOverlap: w.tagOverlap / wSum,
    routeBand: w.routeBand / wSum,
    digestMatch: w.digestMatch / wSum,
    authority: w.authority / wSum,
    novelty: w.novelty / wSum,
  };
}

function weightedScore(
  features: NearMissSalienceFeatures,
  nw: ReturnType<typeof normalizeWeights>,
): number {
  return (
    nw.tagOverlap * features.tagOverlap +
    nw.routeBand * features.routeBand +
    nw.digestMatch * features.digestMatch +
    nw.authority * features.authority +
    nw.novelty * features.novelty
  );
}

type FeatureStats = Record<keyof NearMissSalienceFeatures, { mean: number; std: number }>;

function computeFeatureStats(rows: NearMissSalienceFeatures[]): FeatureStats {
  const stats = {} as FeatureStats;
  for (const key of FEATURE_KEYS) {
    const vals = rows.map((r) => r[key]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    stats[key] = { mean, std: Math.sqrt(variance) };
  }
  return stats;
}

function zNormalizeFeatures(features: NearMissSalienceFeatures, stats: FeatureStats): NearMissSalienceFeatures {
  const z = (key: keyof NearMissSalienceFeatures) => {
    const { mean, std } = stats[key];
    const v = features[key];
    return std > 1e-9 ? (v - mean) / std : v - mean;
  };
  return {
    tagOverlap: z("tagOverlap"),
    routeBand: z("routeBand"),
    digestMatch: z("digestMatch"),
    authority: z("authority"),
    novelty: z("novelty"),
  };
}

export function salienceV2ProductionReady(operatorDomainCount: number): boolean {
  return operatorDomainCount >= SALIENCE_V2_MIN_OPERATOR_DOMAINS;
}

export function productHitRateSampleReady(jobCount: number): boolean {
  return jobCount >= PRODUCT_HIT_RATE_MIN_JOBS;
}

/** Production hit-rate READY — only verify-sourced jobs (D6397). */
export function productHitRateLiveReady(liveVerifiedJobCount: number): boolean {
  return liveVerifiedJobCount >= PRODUCT_HIT_RATE_LIVE_MIN_JOBS;
}

function enumerateNearMissCandidates(input: ScoreNearMissInput): Array<{
  domainId: string;
  features: NearMissSalienceFeatures;
  shorthand: IntelligenceShorthand;
}> {
  const out: Array<{
    domainId: string;
    features: NearMissSalienceFeatures;
    shorthand: IntelligenceShorthand;
  }> = [];
  for (const entry of input.domainCatalog) {
    if (entry.id === input.taskFingerprint.domainId) continue;
    const candFp = fingerprintFromOpenLegacyEntry(entry);
    if (!isNearMissFingerprint(input.taskFingerprint, candFp)) continue;
    const sh = bestForDomain(entry.id, input.shorthands);
    if (!sh) continue;
    out.push({
      domainId: entry.id,
      shorthand: sh,
      features: {
        tagOverlap: tagOverlapScore(input.taskFingerprint, candFp),
        routeBand: routeBandScore(input.taskFingerprint, candFp),
        digestMatch: digestMatchScore(input.taskFingerprint, candFp),
        authority: authorityFromTier(sh.tier),
        novelty: input.lastDonorDomainId && input.lastDonorDomainId === entry.id ? 0 : 1,
      },
    });
  }
  return out;
}

/**
 * Score near-miss donors for a task. Exact domainId matches are excluded.
 * Higher score = better transfer candidate. Never implies skipLlm.
 */
export function scoreNearMissCandidates(input: ScoreNearMissInput): NearMissCandidateScore[] {
  const w = { ...DEFAULT_WEIGHTS, ...input.weights };
  const nw = normalizeWeights(w);
  const out: NearMissCandidateScore[] = [];
  for (const row of enumerateNearMissCandidates(input)) {
    out.push({
      domainId: row.domainId,
      score: weightedScore(row.features, nw),
      features: row.features,
      shorthand: row.shorthand,
      attribution: CYNOENGINE_ATTRIBUTION,
      salienceVersion: 1,
    });
  }
  return out.sort((a, b) => b.score - a.score || a.domainId.localeCompare(b.domainId));
}

/**
 * G9630 — z-score each salience feature across the near-miss candidate pool,
 * then apply weights. Requires ≥2 candidates for meaningful normalization.
 */
export function scoreNearMissCandidatesV2(input: ScoreNearMissInput): NearMissCandidateScore[] {
  const w = { ...DEFAULT_WEIGHTS, ...input.weights };
  const nw = normalizeWeights(w);
  const rows = enumerateNearMissCandidates(input);
  if (!rows.length) return [];
  const stats = computeFeatureStats(rows.map((r) => r.features));
  const out: NearMissCandidateScore[] = rows.map((row) => {
    const zFeatures = zNormalizeFeatures(row.features, stats);
    return {
      domainId: row.domainId,
      score: weightedScore(zFeatures, nw),
      features: row.features,
      shorthand: row.shorthand,
      attribution: CYNOENGINE_ATTRIBUTION,
      salienceVersion: 2,
    };
  });
  return out.sort((a, b) => b.score - a.score || a.domainId.localeCompare(b.domainId));
}

/** Pick v1 or v2 scorer based on operator evidence depth (honest production gate). */
export function scoreNearMissCandidatesAuto(
  input: ScoreNearMissInput,
  operatorDomainCount: number,
): NearMissCandidateScore[] {
  if (input.forceSalienceV2 === true || salienceV2ProductionReady(operatorDomainCount)) {
    return scoreNearMissCandidatesV2(input);
  }
  return scoreNearMissCandidates(input);
}

/** Pick the best near-miss donor, or null if none. */
export function pickBestNearMissDonor(input: ScoreNearMissInput): NearMissCandidateScore | null {
  const ranked = scoreNearMissCandidates(input);
  return ranked[0] ?? null;
}

export function pickBestNearMissDonorAuto(
  input: ScoreNearMissInput,
  operatorDomainCount: number,
): NearMissCandidateScore | null {
  const ranked = scoreNearMissCandidatesAuto(input, operatorDomainCount);
  return ranked[0] ?? null;
}
