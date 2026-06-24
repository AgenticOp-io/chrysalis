/**
 * Canonical hub origin fixtures for lift → WebIR → CWL export (G441).
 * Every {@link HUB_WEB_ORIGIN_LANGUAGE_IDS} entry maps to an in-repo probe tree.
 */
import { join } from "node:path";
import { HUB_WEB_ORIGIN_LANGUAGE_IDS } from "./language-catalog.mjs";

/** @typedef {{ id: string, rel: string, origin: string, requireHoleFree?: boolean, minRoutes?: number }} CwlOriginFixture */

const scriptRoot = join(import.meta.dirname, "..", "..");
const patternLiftRoot = "fixtures/hub-pattern-lift";

/** Special flagships beyond pattern-lift probes. */
const SPECIAL_ORIGIN_FIXTURES = {
  php: {
    id: "php",
    rel: "fixtures/hub-flagship-plain-php",
    origin: "php",
    requireHoleFree: false,
    minRoutes: 1,
  },
  svelte: {
    id: "svelte",
    rel: "fixtures/hub-gold-svelte-kit",
    origin: "svelte",
    requireHoleFree: false,
    minRoutes: 1,
  },
};

/**
 * @param {string} lang
 * @returns {CwlOriginFixture}
 */
function patternLiftFixture(lang) {
  return {
    id: lang,
    rel: join(patternLiftRoot, lang),
    origin: lang,
    requireHoleFree: false,
    minRoutes: 1,
  };
}

/** @type {CwlOriginFixture[]} */
export const CWL_ORIGIN_FIXTURES = HUB_WEB_ORIGIN_LANGUAGE_IDS.map((lang) =>
  SPECIAL_ORIGIN_FIXTURES[lang] ?? patternLiftFixture(lang),
);

/**
 * @param {string} [rootDir]
 */
export function resolveCwlOriginFixturePath(fixture, rootDir = scriptRoot) {
  return join(rootDir, fixture.rel);
}

export { scriptRoot as CWL_ORIGIN_FIXTURES_ROOT };
