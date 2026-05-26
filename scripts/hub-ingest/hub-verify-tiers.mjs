/**
 * Hub matrix verify-tier summary (grade vs proof depth).
 */
import { HUB_ROUTES, INPUT_LANGUAGES, OUTPUT_LANGUAGES } from "../chrysalis-hub-store.mjs";
import { buildHubGoldCoverageReport } from "./hub-gold-coverage.mjs";

export const HUB_VERIFY_TIERS_KIND = "chrysalis.hub.verify-tiers";

/**
 * @returns {import('./hub-gold-coverage.mjs').ReturnType<typeof buildHubGoldCoverageReport> & { kind: string, schemaVersion: number, tierCounts: Record<string, number> }}
 */
export function buildHubVerifyTiersReport() {
  const coverage = buildHubGoldCoverageReport();
  /** @type {Record<string, number>} */
  const tierCounts = {
    oracle: 0,
    structural: 0,
    "scaffold-framework": 0,
    "scaffold-native": 0,
    "scaffold-asset": 0,
  };
  for (const row of coverage.pairs) {
    const t = row.verifyTier ?? "scaffold-asset";
    tierCounts[t] = (tierCounts[t] ?? 0) + 1;
  }
  return {
    kind: HUB_VERIFY_TIERS_KIND,
    schemaVersion: 1,
    tierCounts,
    summary: {
      ...coverage.summary,
      pairCount: coverage.summary.pairCount,
      goldMatrix: coverage.summary.goldMatrix,
    },
    pairs: coverage.pairs,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {string} verifyTier
 */
export function hubPairsForVerifyTier(verifyTier) {
  const rows = [];
  for (const src of INPUT_LANGUAGES) {
    for (const out of OUTPUT_LANGUAGES) {
      if (src.id === out.id) continue;
      const spec = HUB_ROUTES[`${src.id}:${out.id}`];
      if ((spec?.verifyTier ?? "") === verifyTier) {
        rows.push({ origin: src.id, output: out.id, grade: spec.grade, verifyTier: spec.verifyTier });
      }
    }
  }
  return rows;
}
