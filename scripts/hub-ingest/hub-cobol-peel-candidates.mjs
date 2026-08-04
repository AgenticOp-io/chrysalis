#!/usr/bin/env node
/**
 * COBOL corpus peel-candidate report (G10120 deepen).
 * Reads reports/cobol/corpus-feature-index.json and ranks copybooks/programs
 * for layout / EXEC surface peels. Does not invent EXTFMAP; charter before Tier B.
 *
 * Prefer GCE-built index (pnpm run test:gce:cobol:fetch).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryCobolFeatureIndex } from "./hub-cobol-corpus-census.mjs";

export const COBOL_PEEL_CANDIDATES_KIND = "chrysalis.hub.cobol-peel-candidates";
export const COBOL_PEEL_CANDIDATES_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_INDEX = join(ROOT, "reports/cobol/corpus-feature-index.json");

/**
 * @param {string[]} features
 */
function scoreArtifact(features) {
  const f = new Set(features);
  let score = 0;
  if (f.has("odo")) score += 5;
  if (f.has("redefines") && f.has("comp3")) score += 4;
  if (f.has("redefines")) score += 2;
  if (f.has("comp3")) score += 2;
  if (f.has("occurs")) score += 1;
  if (f.has("renames")) score += 3;
  if (f.has("copyReplacing")) score += 3;
  if (f.has("national")) score += 2;
  if (f.has("dfhmsd")) score += 2;
  if (f.has("execCics")) score += 1; // inventory only — no runtime invent
  if (f.has("execSql")) score += 1;
  if (f.has("execDli")) score += 1;
  return score;
}

/**
 * @param {object} index
 * @param {{ limit?: number }} [opts]
 */
export function buildPeelCandidates(index, opts = {}) {
  const limit = opts.limit ?? 40;
  const ranked = (index.artifacts || [])
    .map((a) => ({
      ...a,
      score: scoreArtifact(a.features || []),
      why: (a.features || []).filter((x) =>
        ["odo", "redefines", "comp3", "renames", "copyReplacing", "national", "dfhmsd"].includes(x),
      ),
    }))
    .filter((a) => a.score >= 4)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const buckets = {
    layoutOdo: queryCobolFeatureIndex(index, { all: ["odo"], limit: 30 }),
    layoutRedefinesComp3: queryCobolFeatureIndex(index, { all: ["redefines", "comp3"], limit: 30 }),
    bmsMaps: queryCobolFeatureIndex(index, { all: ["dfhmsd"], limit: 30 }),
    copyReplacing: queryCobolFeatureIndex(index, { all: ["copyReplacing"], limit: 20 }),
    execCicsInventory: queryCobolFeatureIndex(index, { all: ["execCics"], limit: 20 }),
    execSqlInventory: queryCobolFeatureIndex(index, { all: ["execSql"], limit: 20 }),
  };

  return {
    kind: COBOL_PEEL_CANDIDATES_KIND,
    schemaVersion: COBOL_PEEL_CANDIDATES_SCHEMA_VERSION,
    ok: true,
    gate: "G10120",
    indexArtifacts: index.artifactCount ?? (index.artifacts || []).length,
    top: ranked.slice(0, limit),
    buckets: Object.fromEntries(
      Object.entries(buckets).map(([k, v]) => [k, { count: v.length, sample: v.slice(0, 8) }]),
    ),
    refuse: [
      "Do not invent EXTFMAP / DFHAID from candidates",
      "EXEC CICS/SQL/DLI rows are inventory — not runtime peels without charter",
      "Tier B behavioral extracts require explicit charter + gnu-honest subjects",
    ],
    note: "Candidates only — does not close copy:EXTFMAP; not an LCB claim",
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const indexPath = process.argv.includes("--index")
    ? resolve(process.argv[process.argv.indexOf("--index") + 1])
    : DEFAULT_INDEX;
  if (!existsSync(indexPath)) {
    console.error(
      JSON.stringify({
        ok: false,
        error: `missing index: ${indexPath}`,
        hint: "pnpm run test:gce:cobol && pnpm run test:gce:cobol:fetch",
      }),
    );
    process.exit(1);
  }
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  if (index.kind !== "chrysalis.hub.cobol-corpus-feature-index") {
    console.error(JSON.stringify({ ok: false, error: "bad index kind", kind: index.kind }));
    process.exit(1);
  }
  const report = buildPeelCandidates(index);
  const outDir = join(ROOT, "reports/cobol");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "peel-candidates.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && /hub-cobol-peel-candidates\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main();
}
