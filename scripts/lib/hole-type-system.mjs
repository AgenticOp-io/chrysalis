/**
 * Hole Type System (G10116 / D6541) — classify hole reasons; refuse invent prefixes.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TAXONOMY_PATH = join(ROOT, "fixtures/ci/hole-type-taxonomy.json");

/**
 * @typedef {{ kind: string, schemaVersion: number, categories: Record<string, { prefix: string[], meaning: string }>, forbiddenInventPatterns: string[], refuseSilentCompletion: boolean, catalogFixtures?: string[] }} HoleTypeTaxonomy
 */

/** @returns {HoleTypeTaxonomy} */
export function loadHoleTypeTaxonomy(path = TAXONOMY_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Load `honestHoles[].reason` from a dialect honesty catalog JSON.
 * @param {string} relOrAbs
 * @returns {string[]}
 */
export function loadHonestHoleReasonsFromCatalog(relOrAbs) {
  const path = resolve(ROOT, relOrAbs);
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const holes = Array.isArray(raw.honestHoles) ? raw.honestHoles : [];
  return holes
    .map((h) => (typeof h === "string" ? h : h?.reason))
    .filter((r) => typeof r === "string" && r.length > 0);
}

/**
 * @param {string} reason
 * @param {HoleTypeTaxonomy} [taxonomy]
 * @returns {{ ok: boolean, category: string | null, invent: boolean, reason: string }}
 */
export function classifyHoleReason(reason, taxonomy = loadHoleTypeTaxonomy()) {
  const r = String(reason ?? "").trim();
  if (!r) {
    return { ok: false, category: null, invent: false, reason: "empty-reason" };
  }
  for (const pat of taxonomy.forbiddenInventPatterns ?? []) {
    if (r.toLowerCase().includes(String(pat).toLowerCase())) {
      return { ok: false, category: null, invent: true, reason: r };
    }
  }
  for (const [cat, meta] of Object.entries(taxonomy.categories ?? {})) {
    for (const p of meta.prefix ?? []) {
      if (r.startsWith(p) || (p.endsWith("-") && r.startsWith(p.slice(0, -1)))) {
        // hub- prefix: match hub-svelte:, hub-go:, etc.
        if (p === "hub-" && !r.startsWith("hub-")) continue;
        return { ok: true, category: cat, invent: false, reason: r };
      }
    }
  }
  // hub-* without listed as hub- prefix edge: any hub-X:
  if (/^hub-[a-z0-9]+:/i.test(r) || /^hub-[a-z0-9]+$/i.test(r)) {
    return { ok: true, category: "hub", invent: false, reason: r };
  }
  return { ok: false, category: null, invent: false, reason: r };
}

/**
 * @param {string[]} reasons
 * @param {HoleTypeTaxonomy} [taxonomy]
 */
export function classifyHoleReasons(reasons, taxonomy = loadHoleTypeTaxonomy()) {
  const results = reasons.map((r) => classifyHoleReason(r, taxonomy));
  const inventHits = results.filter((x) => x.invent);
  const unknown = results.filter((x) => !x.ok && !x.invent);
  return {
    ok: inventHits.length === 0 && unknown.length === 0,
    inventHits,
    unknown,
    classified: results.filter((x) => x.ok),
    taxonomyKind: taxonomy.kind,
  };
}

/**
 * Classify every honesty-catalog reason listed on the taxonomy (G10116 deepen).
 * @param {HoleTypeTaxonomy} [taxonomy]
 */
export function classifyTaxonomyCatalogFixtures(taxonomy = loadHoleTypeTaxonomy()) {
  const fixtures = taxonomy.catalogFixtures ?? [];
  /** @type {Array<{ fixture: string, ok: boolean, inventHits: unknown[], unknown: unknown[], reasons: string[] }>} */
  const results = [];
  for (const rel of fixtures) {
    const reasons = loadHonestHoleReasonsFromCatalog(rel);
    const classified = classifyHoleReasons(reasons, taxonomy);
    results.push({
      fixture: rel,
      ok: classified.ok,
      inventHits: classified.inventHits,
      unknown: classified.unknown,
      reasons,
    });
  }
  return {
    ok: results.every((r) => r.ok),
    results,
  };
}
