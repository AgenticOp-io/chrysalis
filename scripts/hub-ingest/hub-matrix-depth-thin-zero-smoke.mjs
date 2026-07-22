#!/usr/bin/env node
/**
 * Matrix depth — thin pairs must be 0 (every directed pair has ≥2 trace-replay suites).
 * Gate: hub:matrix-depth-thin-zero-smoke
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";
import { buildLanguageReadinessReport, hubDirectedPairCount } from "../chrysalis-hub-store.mjs";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function runMatrixDepthThinZeroSmoke() {
  const progress = createSmokeProgress("matrix-depth-thin-zero");
  const t0 = progress.start("Matrix depth thin-zero");

  const report = buildLanguageReadinessReport();
  const thin = [];
  let few = 0;
  let multi = 0;

  for (const p of report.pairs) {
    const ids = describeHubGoldPairCoverage(p.origin, p.output).traceReplaySuiteIds ?? [];
    const n = ids.length;
    if (n <= 1) thin.push({ origin: p.origin, output: p.output, suiteCount: n, suites: ids });
    else if (n < 3) few += 1;
    else multi += 1;
  }

  const docOk = existsSync(join(ROOT, "docs/MATRIX-DEPTH-PROGRAM.md"));
  const ok = thin.length === 0 && docOk && report.pairs.length === hubDirectedPairCount();

  progress.end("Matrix depth thin-zero", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-thin-zero-smoke",
    schemaVersion: 1,
    ok,
    docOk,
    thinCount: thin.length,
    fewCount: few,
    multiCount: multi,
    totalPairs: report.pairs.length,
    suiteCount: HUB_GOLD_SUITES.length,
    thin: thin.slice(0, 50),
    note: "Every directed hub pair has ≥2 trace-replay gold suites (thin=0)",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthThinZeroSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-thin-zero-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
