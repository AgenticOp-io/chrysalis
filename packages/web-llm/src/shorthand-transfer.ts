import type { IntelligenceShorthand, IntelligenceShorthandTier } from "./shorthand.js";
import { tierRank } from "./shorthand-tiers.js";
import {
  fingerprintFromOpenLegacyEntry,
  type OpenLegacyDomainEntry,
  type ShorthandTaskFingerprint,
} from "./shorthand-fingerprint.js";
import type { IsCacheOutcome } from "./shorthand-analytics.js";
import {
  CYNOENGINE_ATTRIBUTION,
  scoreNearMissCandidatesAuto,
  type NearMissCandidateScore,
  type NearMissSalienceFeatures,
} from "./shorthand-salience.js";
import { countOperatorEvidenceDomains } from "./shorthand-analytics.js";
import {
  loadIsUtilityStore,
  shouldDownRankByUtility,
  utilityScoreMultiplier,
  type IsUtilityStore,
} from "./shorthand-utility.js";

export type ResolveShorthandWithTransferInput = {
  domainId: string;
  needsNovelLanguage?: boolean;
  shorthands: IntelligenceShorthand[];
  /** Task fingerprint for near-miss (defaults to domainId-only). */
  taskFingerprint?: ShorthandTaskFingerprint;
  /** Open Legacy (or similar) domain catalog for transfer candidates. */
  domainCatalog?: OpenLegacyDomainEntry[];
  /** Prefer not replaying same donor (Cyno novelty). */
  lastDonorDomainId?: string;
  /** Optional utility store for score multiply / down-rank (G9530). */
  utilityStore?: IsUtilityStore;
  /** Path to load utility store when utilityStore omitted. */
  utilityStorePath?: string;
  /** Repo root for operator-evidence domain count (G9630 auto salience). */
  repoRoot?: string;
  /** Override operator domain count (tests). */
  operatorDomainCount?: number;
};

export type ResolveShorthandWithTransferResult = {
  domainId: string;
  tier: IntelligenceShorthandTier;
  shorthand: IntelligenceShorthand | null;
  retrievalHit: boolean;
  skipLlm: boolean;
  /** hit = exact domain corpus; near-miss = transfer candidate; miss = uncovered. */
  cacheOutcome: IsCacheOutcome;
  nearMissDomainId: string | null;
  nearMissShorthand: IntelligenceShorthand | null;
  /** When near-miss: replay policy + LLM only for hole deltas (propose-only). */
  holeDeltaLlmOnly: boolean;
  taskFingerprint: ShorthandTaskFingerprint;
  /** G9520 salience score for chosen donor. */
  nearMissScore?: number;
  nearMissFeatures?: NearMissSalienceFeatures;
  /** Transparent CynoEngine citation when near-miss path used. */
  collaborationAttribution?: string;
  /** Salience ranker version used when near-miss (1 or 2). */
  salienceVersion?: 1 | 2;
};

function bestForDomain(
  domainId: string,
  shorthands: IntelligenceShorthand[],
): IntelligenceShorthand | null {
  const matches = shorthands.filter((s) => s.domainId === domainId);
  if (!matches.length) return null;
  return matches.reduce((best, cur) => (tierRank(cur.tier) < tierRank(best.tier) ? cur : best));
}

function resolveUtilityStore(input: ResolveShorthandWithTransferInput): IsUtilityStore | undefined {
  if (input.utilityStore) return input.utilityStore;
  if (input.utilityStorePath) return loadIsUtilityStore(input.utilityStorePath);
  return undefined;
}

function rankNearMiss(
  input: ResolveShorthandWithTransferInput,
  taskFingerprint: ShorthandTaskFingerprint,
  utilityStore: IsUtilityStore | undefined,
): NearMissCandidateScore | null {
  const operatorCount =
    input.operatorDomainCount ??
    (input.repoRoot ? countOperatorEvidenceDomains(input.repoRoot) : 0);
  const scored = scoreNearMissCandidatesAuto(
    {
      taskFingerprint,
      domainCatalog: input.domainCatalog ?? [],
      shorthands: input.shorthands,
      ...(input.lastDonorDomainId ? { lastDonorDomainId: input.lastDonorDomainId } : {}),
    },
    operatorCount,
  );
  if (!scored.length) return null;

  const withUtility = scored
    .map((c) => ({
      ...c,
      score: c.score * utilityScoreMultiplier(utilityStore?.domains[c.domainId]),
    }))
    .filter((c) => !shouldDownRankByUtility(utilityStore?.domains[c.domainId]))
    .sort((a, b) => b.score - a.score);

  return withUtility[0] ?? null;
}

/**
 * Exact-domain resolve with near-miss transfer when corpus misses the domain.
 * Near-miss never sets skipLlm — verify still required; LLM only for hole deltas.
 *
 * Near-miss ranking uses CynoEngine-inspired salience (G9520) + optional utility (G9530).
 */
export function resolveShorthandWithTransfer(
  input: ResolveShorthandWithTransferInput,
): ResolveShorthandWithTransferResult {
  const needsNovel = input.needsNovelLanguage === true;
  const catalogEntry = input.domainCatalog?.find((e) => e.id === input.domainId);
  const taskFingerprint: ShorthandTaskFingerprint =
    input.taskFingerprint ??
    (catalogEntry
      ? fingerprintFromOpenLegacyEntry(catalogEntry)
      : { domainId: input.domainId, origin: "unknown" });

  const exact = bestForDomain(input.domainId, input.shorthands);
  if (!needsNovel && exact) {
    const skipLlm = tierRank(exact.tier) <= tierRank("IS-T3-skill-capsule");
    return {
      domainId: input.domainId,
      tier: exact.tier,
      shorthand: exact,
      retrievalHit: true,
      skipLlm,
      cacheOutcome: "hit",
      nearMissDomainId: null,
      nearMissShorthand: null,
      holeDeltaLlmOnly: false,
      taskFingerprint,
    };
  }

  if (!needsNovel && input.domainCatalog?.length) {
    const utilityStore = resolveUtilityStore(input);
    const ranked = rankNearMiss(input, taskFingerprint, utilityStore);
    if (ranked) {
      return {
        domainId: input.domainId,
        tier: ranked.shorthand.tier,
        shorthand: null,
        retrievalHit: false,
        skipLlm: false,
        cacheOutcome: "near-miss",
        nearMissDomainId: ranked.domainId,
        nearMissShorthand: ranked.shorthand,
        holeDeltaLlmOnly: true,
        taskFingerprint,
        nearMissScore: ranked.score,
        nearMissFeatures: ranked.features,
        collaborationAttribution: CYNOENGINE_ATTRIBUTION,
        salienceVersion: ranked.salienceVersion ?? 1,
      };
    }
  }

  return {
    domainId: input.domainId,
    tier: needsNovel ? "IS-T2-lora-delta" : "IS-T0-weights",
    shorthand: null,
    retrievalHit: false,
    skipLlm: false,
    cacheOutcome: "miss",
    nearMissDomainId: null,
    nearMissShorthand: null,
    holeDeltaLlmOnly: false,
    taskFingerprint,
  };
}
