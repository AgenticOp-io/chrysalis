#!/usr/bin/env node
/**
 * Matrix depth wave 1 — java/go/csharp/ruby → hono/fastify have structured+middleware suites.
 * Gate: hub:matrix-depth-wave1-smoke
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const ORIGINS = ["java", "go", "csharp", "ruby"];
const OUTPUTS = ["hono", "fastify", "typescript"]; // typescript aliases to hono emit
const FIXTURES = [
  "fixtures/hub-gold-java-structured",
  "fixtures/hub-gold-java-middleware",
  "fixtures/hub-gold-go-structured",
  "fixtures/hub-gold-go-middleware",
  "fixtures/hub-gold-csharp-structured",
  "fixtures/hub-gold-csharp-middleware",
  "fixtures/hub-gold-ruby-structured",
  "fixtures/hub-gold-ruby-middleware",
];

export async function runMatrixDepthWave1Smoke() {
  const progress = createSmokeProgress("matrix-depth-wave1");
  const t0 = progress.start("Matrix depth wave 1");

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

  // Doc present
  const docOk = existsSync(join(ROOT, "docs/MATRIX-DEPTH-PROGRAM.md"));
  if (!docOk) ok = false;

  progress.end("Matrix depth wave 1", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-wave1-smoke",
    schemaVersion: 1,
    ok,
    docOk,
    missingFixtures,
    pairs,
    note: "Wave 1: java/go/csharp/ruby web outputs at literal+structured+middleware depth",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthWave1Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-wave1-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
