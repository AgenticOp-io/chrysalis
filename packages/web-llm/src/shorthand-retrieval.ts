import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { IntelligenceShorthand, IntelligenceShorthandTier } from "./shorthand.js";
import { preferredShorthandTierForTask, tierSpec } from "./shorthand.js";
import type { IsCacheOutcome } from "./shorthand-analytics.js";
import type { OpenLegacyDomainEntry, ShorthandTaskFingerprint } from "./shorthand-fingerprint.js";
import type { NearMissSalienceFeatures } from "./shorthand-salience.js";
import { resolveShorthandWithTransfer } from "./shorthand-transfer.js";
import type { IsUtilityStore } from "./shorthand-utility.js";
import { isHigherTier, tierRank, TIER_ORDER } from "./shorthand-tiers.js";

export { isHigherTier, tierRank, TIER_ORDER } from "./shorthand-tiers.js";

export function shorthandsForDomain(domainId: string, shorthands: IntelligenceShorthand[]): IntelligenceShorthand[] {
  return shorthands.filter((s) => s.domainId === domainId);
}

export function bestShorthandForDomain(
  domainId: string,
  shorthands: IntelligenceShorthand[],
): IntelligenceShorthand | null {
  const matches = shorthandsForDomain(domainId, shorthands);
  if (!matches.length) return null;
  return matches.reduce((best, cur) => (isHigherTier(cur.tier, best.tier) ? cur : best));
}

export function domainShorthandFlags(domainId: string, shorthands: IntelligenceShorthand[]) {
  const matches = shorthandsForDomain(domainId, shorthands);
  return {
    hasOracleReplay: matches.some((s) => s.tier === "IS-T5-oracle-ref"),
    hasPolicyGraph: matches.some(
      (s) => s.tier === "IS-T4-policy-graph" || s.tier === "IS-T5-oracle-ref",
    ),
    hasSkillCapsule: matches.some((s) => s.tier === "IS-T3-skill-capsule"),
  };
}

export type ResolveShorthandInput = {
  domainId: string;
  needsNovelLanguage?: boolean;
  shorthands: IntelligenceShorthand[];
  /** When set with domainCatalog, enables near-miss transfer (D6372). */
  taskFingerprint?: ShorthandTaskFingerprint;
  domainCatalog?: OpenLegacyDomainEntry[];
  /** Prefer not replaying same donor (G9520 / Cyno novelty). */
  lastDonorDomainId?: string;
  /** Optional utility store for near-miss score multiply / down-rank (G9530). */
  utilityStore?: IsUtilityStore;
  utilityStorePath?: string;
};

export type ResolveShorthandResult = {
  domainId: string;
  tier: IntelligenceShorthandTier;
  tierSpec: ReturnType<typeof tierSpec>;
  shorthand: IntelligenceShorthand | null;
  retrievalHit: boolean;
  skipLlm: boolean;
  hasOracleReplay: boolean;
  hasPolicyGraph: boolean;
  hasSkillCapsule: boolean;
  /** Exact hit / near-miss transfer / miss (D6372). */
  cacheOutcome: IsCacheOutcome;
  nearMissDomainId: string | null;
  holeDeltaLlmOnly: boolean;
  /** G9520 salience score when near-miss. */
  nearMissScore?: number;
  nearMissFeatures?: NearMissSalienceFeatures;
  /** Transparent CynoEngine citation when near-miss path used. */
  collaborationAttribution?: string;
};

/** Pick lowest-storage tier with corpus binding for a chartered domain task. */
export function resolveShorthandForTask(input: ResolveShorthandInput): ResolveShorthandResult {
  const needsNovel = input.needsNovelLanguage === true;
  const flags = domainShorthandFlags(input.domainId, input.shorthands);

  if (input.domainCatalog?.length || input.taskFingerprint) {
    const transfer = resolveShorthandWithTransfer({
      domainId: input.domainId,
      needsNovelLanguage: needsNovel,
      shorthands: input.shorthands,
      ...(input.taskFingerprint ? { taskFingerprint: input.taskFingerprint } : {}),
      ...(input.domainCatalog?.length ? { domainCatalog: input.domainCatalog } : {}),
      ...(input.lastDonorDomainId ? { lastDonorDomainId: input.lastDonorDomainId } : {}),
      ...(input.utilityStore ? { utilityStore: input.utilityStore } : {}),
      ...(input.utilityStorePath ? { utilityStorePath: input.utilityStorePath } : {}),
    });
    return {
      domainId: transfer.domainId,
      tier: transfer.tier,
      tierSpec: tierSpec(transfer.tier),
      shorthand: transfer.shorthand,
      retrievalHit: transfer.retrievalHit,
      skipLlm: transfer.skipLlm,
      hasOracleReplay: flags.hasOracleReplay,
      hasPolicyGraph: flags.hasPolicyGraph,
      hasSkillCapsule: flags.hasSkillCapsule,
      cacheOutcome: transfer.cacheOutcome,
      nearMissDomainId: transfer.nearMissDomainId,
      holeDeltaLlmOnly: transfer.holeDeltaLlmOnly,
      ...(transfer.nearMissScore != null ? { nearMissScore: transfer.nearMissScore } : {}),
      ...(transfer.nearMissFeatures ? { nearMissFeatures: transfer.nearMissFeatures } : {}),
      ...(transfer.collaborationAttribution
        ? { collaborationAttribution: transfer.collaborationAttribution }
        : {}),
    };
  }

  const best = bestShorthandForDomain(input.domainId, input.shorthands);

  let tier = preferredShorthandTierForTask({
    hasOracleReplay: flags.hasOracleReplay,
    hasPolicyGraph: flags.hasPolicyGraph,
    needsNovelLanguage: needsNovel,
  });
  let shorthand: IntelligenceShorthand | null = null;

  if (!needsNovel && best) {
    tier = best.tier;
    shorthand = best;
  } else if (!needsNovel) {
    for (const candidate of TIER_ORDER.slice(0, 3)) {
      const hit = input.shorthands.find((s) => s.domainId === input.domainId && s.tier === candidate);
      if (hit) {
        tier = candidate;
        shorthand = hit;
        break;
      }
    }
  }

  const retrievalHit = shorthand !== null;
  const skipLlm =
    !needsNovel && retrievalHit && tierRank(tier) <= tierRank("IS-T3-skill-capsule");
  const cacheOutcome: IsCacheOutcome = retrievalHit ? "hit" : "miss";

  return {
    domainId: input.domainId,
    tier,
    tierSpec: tierSpec(tier),
    shorthand,
    retrievalHit,
    skipLlm,
    hasOracleReplay: flags.hasOracleReplay,
    hasPolicyGraph: flags.hasPolicyGraph,
    hasSkillCapsule: flags.hasSkillCapsule,
    cacheOutcome,
    nearMissDomainId: null,
    holeDeltaLlmOnly: false,
  };
}

/** One promoted entry per domain — highest externalized tier wins. */
export function promoteShorthandsByDomain(shorthands: IntelligenceShorthand[]): IntelligenceShorthand[] {
  /** @type {Map<string, IntelligenceShorthand>} */
  const byDomain = new Map();
  for (const sh of shorthands) {
    const prev = byDomain.get(sh.domainId);
    if (!prev || isHigherTier(sh.tier, prev.tier)) byDomain.set(sh.domainId, sh);
  }
  return [...byDomain.values()].sort((a, b) => a.domainId.localeCompare(b.domainId));
}

export type IntelligenceShorthandBundle = {
  kind?: string;
  shorthands?: IntelligenceShorthand[];
  promotedShorthands?: IntelligenceShorthand[];
  count?: number;
  summary?: Record<string, unknown>;
};

export function loadIntelligenceShorthandsFromFile(indexPath: string): IntelligenceShorthand[] {
  if (!existsSync(indexPath)) return [];
  const doc = JSON.parse(readFileSync(indexPath, "utf8")) as IntelligenceShorthandBundle;
  if (Array.isArray(doc.shorthands)) return doc.shorthands;
  if (Array.isArray(doc.promotedShorthands)) return doc.promotedShorthands;
  return [];
}

export function defaultIntelligenceShorthandIndexPath(repoRoot: string): string {
  return join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json");
}

export function loadIntelligenceShorthandsFromRepo(repoRoot: string): IntelligenceShorthand[] {
  return loadIntelligenceShorthandsFromFile(defaultIntelligenceShorthandIndexPath(repoRoot));
}

export type TierRoutingSummary = {
  domainCount: number;
  skipLlmCount: number;
  retrievalHitCount: number;
  noCorpusCount: number;
  skipLlmRate: number;
};

/** Summarize tier routing for open-legacy domains (chartered index ids). */
export function summarizeTierRoutingForDomains(
  domainIds: string[],
  shorthands: IntelligenceShorthand[],
): TierRoutingSummary {
  let skipLlmCount = 0;
  let retrievalHitCount = 0;
  let noCorpusCount = 0;
  for (const domainId of domainIds) {
    const resolved = resolveShorthandForTask({ domainId, shorthands, needsNovelLanguage: false });
    if (resolved.retrievalHit) retrievalHitCount += 1;
    else noCorpusCount += 1;
    if (resolved.skipLlm) skipLlmCount += 1;
  }
  const domainCount = domainIds.length;
  return {
    domainCount,
    skipLlmCount,
    retrievalHitCount,
    noCorpusCount,
    skipLlmRate: domainCount ? skipLlmCount / domainCount : 0,
  };
}
