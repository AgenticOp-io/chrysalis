#!/usr/bin/env node
/**
 * Full gold — every directed pair has structured + middleware suites (≥3 total).
 * Gate: hub:matrix-depth-full-gold-smoke
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";
import { buildLanguageReadinessReport } from "../chrysalis-hub-store.mjs";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_FIXTURES = [
  "fixtures/hub-gold-js-middleware-plain",
  "fixtures/hub-gold-ts-middleware-plain",
  "fixtures/hub-gold-vue-structured",
  "fixtures/hub-gold-vue-middleware",
  "fixtures/hub-gold-svelte-structured",
  "fixtures/hub-gold-svelte-middleware",
  "fixtures/hub-gold-cwl-structured",
  "fixtures/hub-gold-json-structured",
  "fixtures/hub-gold-json-middleware",
  "fixtures/hub-gold-sql-structured",
  "fixtures/hub-gold-c-structured",
];

export async function runMatrixDepthFullGoldSmoke() {
  const progress = createSmokeProgress("matrix-depth-full-gold");
  const t0 = progress.start("Matrix depth full gold");

  const missingFixtures = REQUIRED_FIXTURES.filter((f) => !existsSync(join(ROOT, f)));
  const report = buildLanguageReadinessReport();
  const notFull = [];
  let full = 0;

  for (const p of report.pairs) {
    const ids = describeHubGoldPairCoverage(p.origin, p.output).traceReplaySuiteIds ?? [];
    const hasStructured = ids.some((id) => id.includes("-structured-"));
    const hasMiddleware = ids.some((id) => id.includes("-middleware-"));
    const ok = hasStructured && hasMiddleware && ids.length >= 3;
    if (ok) full += 1;
    else notFull.push({ origin: p.origin, output: p.output, suiteCount: ids.length, hasStructured, hasMiddleware });
  }

  const docOk = existsSync(join(ROOT, "docs/MATRIX-DEPTH-PROGRAM.md"));
  const ok = notFull.length === 0 && missingFixtures.length === 0 && docOk && report.pairs.length === 601;

  progress.end("Matrix depth full gold", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-full-gold-smoke",
    schemaVersion: 1,
    ok,
    docOk,
    missingFixtures,
    fullCount: full,
    notFullCount: notFull.length,
    totalPairs: report.pairs.length,
    suiteCount: HUB_GOLD_SUITES.length,
    notFull: notFull.slice(0, 40),
    note: "Full gold: every directed pair has structured + middleware suites (≥3)",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthFullGoldSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-full-gold-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
