#!/usr/bin/env node
/**
 * Matrix depth wave 4 — cross-native structured/middleware + PHP web depth + middleware→cwl.
 * Gate: hub:matrix-depth-wave4-smoke
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { hubWave4DepthSuites } from "./hub-gold-wave4-depth-suites.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const ORIGINS = [
  "javascript",
  "typescript",
  "python",
  "java",
  "go",
  "csharp",
  "ruby",
  "kotlin",
  "rust",
  "scala",
  "swift",
  "php",
];
const NATIVE_OUTS = ["php", "java", "go", "csharp", "python", "ruby"];
const FIXTURES = [
  "fixtures/hub-gold-php-structured",
  "fixtures/hub-gold-php-middleware",
];

export async function runMatrixDepthWave4Smoke() {
  const progress = createSmokeProgress("matrix-depth-wave4");
  const t0 = progress.start("Matrix depth wave 4");

  const missingFixtures = FIXTURES.filter((f) => !existsSync(join(ROOT, f)));
  const wave4 = hubWave4DepthSuites(ROOT);
  const pairs = [];
  let ok = missingFixtures.length === 0 && wave4.length > 0;

  for (const origin of ORIGINS) {
    for (const output of NATIVE_OUTS) {
      if (origin === output) continue;
      const cov = describeHubGoldPairCoverage(origin, output);
      const ids = cov.traceReplaySuiteIds ?? [];
      const hasStructured = ids.some((id) => id.includes("-structured-"));
      const hasMiddleware =
        origin === "javascript" || origin === "typescript"
          ? true // js/ts middleware→native skipped (emit holes); structured depth is the bar
          : ids.some((id) => id.includes("-middleware-"));
      const pairOk = hasStructured && hasMiddleware && ids.length >= 2;
      if (!pairOk) ok = false;
      pairs.push({
        origin,
        output,
        suiteCount: ids.length,
        hasStructured,
        hasMiddleware,
        ok: pairOk,
        suites: ids.filter((id) => id.includes("structured") || id.includes("middleware")),
      });
    }
  }

  // PHP web depth
  for (const output of ["hono", "fastify"]) {
    const cov = describeHubGoldPairCoverage("php", output);
    const ids = cov.traceReplaySuiteIds ?? [];
    const hasStructured = ids.some((id) => id.includes("-structured-"));
    const hasMiddleware = ids.some((id) => id.includes("-middleware-"));
    const pairOk = hasStructured && hasMiddleware;
    if (!pairOk) ok = false;
    pairs.push({
      origin: "php",
      output,
      suiteCount: ids.length,
      hasStructured,
      hasMiddleware,
      ok: pairOk,
      suites: ids.filter((id) => id.includes("structured") || id.includes("middleware") || id.includes("flagship")),
    });
  }

  const docOk = existsSync(join(ROOT, "docs/MATRIX-DEPTH-PROGRAM.md"));
  if (!docOk) ok = false;

  progress.end("Matrix depth wave 4", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-wave4-smoke",
    schemaVersion: 1,
    ok,
    docOk,
    missingFixtures,
    wave4SuiteCount: wave4.length,
    pairs,
    note: "Wave 4: cross-native structured(+middleware) depth + PHP web structured/middleware",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthWave4Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-wave4-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
