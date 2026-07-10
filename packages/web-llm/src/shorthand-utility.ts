/**
 * Outcome → utility prior for IS capsules (G9530 / D6375).
 *
 * Inspired by CynoEngine (https://github.com/nimbus7772017/CynoEngine) —
 * "outcome closes the loop, never attribution"; utility from graded outcomes only
 * (not LLM self-report / cross-encoder relevance). Adapted to verify dispose.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CYNOENGINE_ATTRIBUTION } from "./shorthand-salience.js";

export const IS_UTILITY_KIND = "chrysalis.web-llm.is-utility";
/** v2 adds evidence-used credit (G9560 / D6377) — only used domains get useful. */
export const IS_UTILITY_SCHEMA_VERSION = 2;

/** Beta-style prior: alpha = useful outcomes, beta = noise/fail outcomes. */
export type IsDomainUtility = {
  domainId: string;
  alpha: number;
  beta: number;
  /** Mean utility α/(α+β). */
  mean: number;
  sampleCount: number;
  /** Times this domain was credited as evidence-used (G9560). */
  evidenceUsedCount?: number;
  updatedAt: string;
};

export type IsUtilityStore = {
  kind: typeof IS_UTILITY_KIND;
  schemaVersion: typeof IS_UTILITY_SCHEMA_VERSION;
  generatedAt: string;
  attribution: typeof CYNOENGINE_ATTRIBUTION;
  domains: Record<string, IsDomainUtility>;
};

export type RecordUtilityOutcomeInput = {
  domainId: string;
  /** Graded outcome only — verify correctness / apply accept. */
  outcome: "useful" | "noise";
  /** Optional verify correctness [0,1] — useful if >= 1, noise if < 1 when provided. */
  verifyCorrectness?: number;
};

export type RecordEvidenceUsedUtilityInput = {
  /** Graded outcome for the job (verify dispose). */
  outcome: "useful" | "noise";
  verifyCorrectness?: number;
  /**
   * Domains actually used in the successful/failed path (near-miss donor, applied capsule).
   * Inspired by CynoEngine evidence-used utility — never credit mere surface/relevance.
   */
  usedDomainIds: string[];
  /** Surfaced candidates that were not used — never receive useful credit. */
  surfacedButUnusedDomainIds?: string[];
};

export function emptyIsUtilityStore(): IsUtilityStore {
  return {
    kind: IS_UTILITY_KIND,
    schemaVersion: IS_UTILITY_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    attribution: CYNOENGINE_ATTRIBUTION,
    domains: {},
  };
}

export function defaultIsUtilityPath(repoRoot: string): string {
  return join(repoRoot, "reports/web-llm/shorthand/is-utility.v1.json");
}

export function loadIsUtilityStore(path: string): IsUtilityStore {
  if (!existsSync(path)) return emptyIsUtilityStore();
  try {
    const doc = JSON.parse(readFileSync(path, "utf8")) as IsUtilityStore;
    if (doc.kind !== IS_UTILITY_KIND) return emptyIsUtilityStore();
    return {
      ...doc,
      schemaVersion: IS_UTILITY_SCHEMA_VERSION,
      attribution: CYNOENGINE_ATTRIBUTION,
      domains: doc.domains ?? {},
    };
  } catch {
    return emptyIsUtilityStore();
  }
}

export function writeIsUtilityStore(path: string, store: IsUtilityStore): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function meanOf(alpha: number, beta: number): number {
  const d = alpha + beta;
  return d > 0 ? alpha / d : 0.5;
}

/**
 * Record a graded outcome. Prefer verifyCorrectness when set (dispose layer).
 * Never accepts LLM prose as evidence.
 */
export function recordUtilityOutcome(
  store: IsUtilityStore,
  input: RecordUtilityOutcomeInput,
): IsUtilityStore {
  let outcome = input.outcome;
  if (typeof input.verifyCorrectness === "number") {
    outcome = input.verifyCorrectness >= 1 ? "useful" : "noise";
  }
  const prev = store.domains[input.domainId] ?? {
    domainId: input.domainId,
    alpha: 1,
    beta: 1,
    mean: 0.5,
    sampleCount: 0,
    evidenceUsedCount: 0,
    updatedAt: new Date().toISOString(),
  };
  const alpha = prev.alpha + (outcome === "useful" ? 1 : 0);
  const beta = prev.beta + (outcome === "noise" ? 1 : 0);
  const next: IsDomainUtility = {
    domainId: input.domainId,
    alpha,
    beta,
    mean: meanOf(alpha, beta),
    sampleCount: prev.sampleCount + 1,
    evidenceUsedCount: prev.evidenceUsedCount ?? 0,
    updatedAt: new Date().toISOString(),
  };
  return {
    ...store,
    schemaVersion: IS_UTILITY_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    attribution: CYNOENGINE_ATTRIBUTION,
    domains: { ...store.domains, [input.domainId]: next },
  };
}

/**
 * Evidence-used utility (G9560 / D6377).
 * Inspired by CynoEngine — outcome closes the loop; credit only domains that
 * were actually used, never mere surface/relevance. Not a code port.
 */
export function recordEvidenceUsedUtility(
  store: IsUtilityStore,
  input: RecordEvidenceUsedUtilityInput,
): IsUtilityStore {
  let outcome = input.outcome;
  if (typeof input.verifyCorrectness === "number") {
    outcome = input.verifyCorrectness >= 1 ? "useful" : "noise";
  }
  const used = [...new Set(input.usedDomainIds.map((d) => d.trim()).filter(Boolean))];
  const unused = [
    ...new Set((input.surfacedButUnusedDomainIds ?? []).map((d) => d.trim()).filter(Boolean)),
  ].filter((d) => !used.includes(d));

  let next = store;
  for (const domainId of used) {
    next = recordUtilityOutcome(next, { domainId, outcome });
    const row = next.domains[domainId];
    if (row && outcome === "useful") {
      next = {
        ...next,
        domains: {
          ...next.domains,
          [domainId]: {
            ...row,
            evidenceUsedCount: (row.evidenceUsedCount ?? 0) + 1,
          },
        },
      };
    }
  }
  // Surfaced-but-unused: never useful; optional soft noise only on job failure
  if (outcome === "noise") {
    for (const domainId of unused) {
      next = recordUtilityOutcome(next, { domainId, outcome: "noise" });
    }
  }
  return {
    ...next,
    schemaVersion: IS_UTILITY_SCHEMA_VERSION,
    attribution: CYNOENGINE_ATTRIBUTION,
  };
}

/** True when mean utility is below floor (default 0.35) and enough samples. */
export function shouldDownRankByUtility(
  util: IsDomainUtility | undefined,
  opts: { floor?: number; minSamples?: number } = {},
): boolean {
  if (!util) return false;
  const floor = opts.floor ?? 0.35;
  const minSamples = opts.minSamples ?? 3;
  return util.sampleCount >= minSamples && util.mean < floor;
}

/** Multiplier for near-miss score (0.5–1.5) from utility mean; neutral 1.0 if unknown. */
export function utilityScoreMultiplier(util: IsDomainUtility | undefined): number {
  if (!util || util.sampleCount < 1) return 1;
  // Map mean 0→0.5, 0.5→1.0, 1→1.5
  return 0.5 + util.mean;
}
