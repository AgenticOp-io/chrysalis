#!/usr/bin/env node
/**
 * Wave 7 — flagship outbound sample (express / plain-php → secondary native + nextjs).
 * Gate: hub:matrix-depth-flagship-outbound-smoke
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const SUITES = [
  "express-flagship-rust-native",
  "express-flagship-kotlin-native",
  "express-flagship-scala-native",
  "express-flagship-swift-native",
  "plain-php-flagship-rust-native",
  "plain-php-flagship-swift-native",
  "plain-php-flagship-scala-native",
  "symfony-flagship-swift-native",
  "express-flagship-asset-html",
  "plain-php-flagship-asset-json",
  "express-flagship-asset-css",
  "plain-php-flagship-nextjs",
  "express-flagship-nextjs",
];

const PAIRS = [
  ["javascript", "rust"],
  ["javascript", "swift"],
  ["javascript", "html"],
  ["php", "rust"],
  ["php", "swift"],
  ["php", "json"],
];

function verifySuite(id) {
  const r = spawnSync(process.execPath, ["scripts/hub-ingest/hub-gold-verify.mjs", "--suite", id], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const oks = [...out.matchAll(/"ok":\s*(true|false)/g)].map((m) => m[1]);
  const passed = r.status === 0 && oks.length > 0 && oks[oks.length - 1] === "true";
  const reason = out.match(/"reason":\s*"([^"]+)"/)?.[1] ?? null;
  return { id, ok: passed, reason, status: r.status };
}

export async function runMatrixDepthFlagshipOutboundSmoke() {
  const progress = createSmokeProgress("matrix-depth-flagship-outbound");
  const t0 = progress.start("Matrix depth flagship outbound");

  const fixturesOk =
    existsSync(join(ROOT, "fixtures/hub-flagship-express")) &&
    existsSync(join(ROOT, "fixtures/hub-flagship-plain-php"));

  const pairRows = PAIRS.map(([origin, output]) => {
    const ids = describeHubGoldPairCoverage(origin, output).traceReplaySuiteIds ?? [];
    const hasFlagship = ids.some((id) => id.includes("flagship"));
    return { origin, output, hasFlagship, suites: ids.filter((id) => id.includes("flagship")) };
  });

  const results = SUITES.map(verifySuite);
  const ok = fixturesOk && pairRows.every((p) => p.hasFlagship) && results.every((r) => r.ok);

  progress.end("Matrix depth flagship outbound", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-flagship-outbound-smoke",
    schemaVersion: 1,
    ok,
    fixturesOk,
    pairs: pairRows,
    passCount: results.filter((r) => r.ok).length,
    results,
    note: "Wave 7: flagship outbound to secondary natives/assets + nextjs verify",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthFlagshipOutboundSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-flagship-outbound-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
