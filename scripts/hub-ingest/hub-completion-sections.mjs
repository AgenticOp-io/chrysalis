/**
 * Hub completion report sections (shared by hub-completion + operator UI).
 */
import { hubGoldStructuralSuiteIds } from "./hub-gold-manifest.mjs";
import { ORACLE_PRODUCT_PAIRS } from "./hub-capability-matrix.mjs";

/** @returns {string[]} */
export function hubGoldAssetExtendedOrigins() {
  return ["css", "scss", "markdown", "yaml", "c", "cpp"];
}

/** @param {string} origin @param {"hono"|"fastify"|"nextjs"} target */
export function hubGoldLiteralSuiteId(origin, target) {
  return `${origin}-literal-${target}`;
}

/** @returns {string[]} */
export function hubGoldAssetExtendedNextjsSuiteIds() {
  return hubGoldAssetExtendedOrigins().map((o) => hubGoldLiteralSuiteId(o, "nextjs"));
}

/** @returns {string[]} */
export function hubGoldAssetExtendedFrameworkSuiteIds() {
  const out = [];
  for (const o of hubGoldAssetExtendedOrigins()) {
    out.push(hubGoldLiteralSuiteId(o, "hono"), hubGoldLiteralSuiteId(o, "fastify"));
  }
  return out;
}

/** @returns {Record<string, unknown>} */
export function buildHubCompletionSections() {
  return {
    assetExtendedNextjsGold: { suiteIds: hubGoldAssetExtendedNextjsSuiteIds() },
    assetExtendedFrameworkGold: { suiteIds: hubGoldAssetExtendedFrameworkSuiteIds() },
    structuralSuiteCount: hubGoldStructuralSuiteIds().length,
    phpOracleLane: {
      fixture: "fixtures/tiny-blog",
      pairs: ["php:hono", "php:fastify", "php:nextjs", "php:typescript"],
      completionField: "phpOracleSmoke",
    },
    capabilityTiers: {
      oracleProductPairs: ORACLE_PRODUCT_PAIRS.map((p) => `${p.origin}:${p.output}`),
      structuralSuiteCount: hubGoldStructuralSuiteIds().length,
      doc: "docs/CAPABILITY-MATRIX.md",
    },
  };
}
