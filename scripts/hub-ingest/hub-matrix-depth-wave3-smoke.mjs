#!/usr/bin/env node
/**
 * Matrix depth wave 3 — kotlin/rust → hono/fastify/typescript at structured+middleware.
 * Gate: hub:matrix-depth-wave3-smoke
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const ORIGINS = ["kotlin", "rust", "scala", "swift"];
const OUTPUTS = ["hono", "fastify", "typescript"];
const FIXTURES = [
  "fixtures/hub-gold-kotlin-structured",
  "fixtures/hub-gold-kotlin-middleware",
  "fixtures/hub-gold-rust-structured",
  "fixtures/hub-gold-rust-middleware",
  "fixtures/hub-gold-scala-structured",
  "fixtures/hub-gold-scala-middleware",
  "fixtures/hub-gold-swift-structured",
  "fixtures/hub-gold-swift-middleware",
];

export async function runMatrixDepthWave3Smoke() {
  const progress = createSmokeProgress("matrix-depth-wave3");
  const t0 = progress.start("Matrix depth wave 3");

  const missingFixtures = FIXTURES.filter((f) => !existsSync(join(ROOT, f)));
  const pairs = [];
  let ok = missingFixtures.length === 0;

  for (const origin of ORIGINS) {
    for (const output of OUTPUTS) {
      const cov = describeHubGoldPairCoverage(origin, output);
      const ids = cov.traceReplaySuiteIds ?? [];
      const hasLiteral = ids.some((id) => id.includes("-literal-"));
      const hasStructured = ids.some((id) => id.includes("-structured-"));
      const hasMiddleware = ids.some((id) => id.includes("-middleware-"));
      const pairOk = hasLiteral && hasStructured && hasMiddleware && ids.length >= 3;
      if (!pairOk) ok = false;
      pairs.push({
        origin,
        output,
        suiteCount: ids.length,
        hasLiteral,
        hasStructured,
        hasMiddleware,
        ok: pairOk,
        suites: ids,
      });
    }
  }

  const docOk = existsSync(join(ROOT, "docs/MATRIX-DEPTH-PROGRAM.md"));
  if (!docOk) ok = false;

  progress.end("Matrix depth wave 3", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-wave3-smoke",
    schemaVersion: 1,
    ok,
    docOk,
    missingFixtures,
    pairs,
    note: "Wave 3: kotlin/rust/scala/swift web outputs at literal+structured+middleware depth",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthWave3Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-wave3-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
