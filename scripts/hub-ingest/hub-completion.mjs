#!/usr/bin/env node
/**
 * Hub matrix completion gate: matrix smoke + gold verify + route grade summary.
 * Usage: node scripts/hub-ingest/hub-completion.mjs [--json-out reports/ci/hub-completion.json]
 */
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_ROUTES, INPUT_LANGUAGES, OUTPUT_LANGUAGES } from "../chrysalis-hub-store.mjs";
import { buildHubGoldCoverageReport } from "./hub-gold-coverage.mjs";
import { hubGoldStructuralSuiteIds, hubGoldTraceReplaySuiteIds } from "./hub-gold-manifest.mjs";
import { hubNativeEmitTargetIds } from "./hub-gold-native-emit.mjs";
import { resolveHubPython } from "./shared.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  return { jsonOut };
}

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("no JSON object in subprocess stdout");
  }
}

function runJson(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  let parsed = {};
  try {
    parsed = parseStdoutJson(r.stdout);
  } catch {
    parsed = {};
  }
  return { status: r.status ?? 1, parsed, stderr: r.stderr };
}

function summarizeRouteGrades() {
  const counts = { gold: 0, silver: 0, open: 0 };
  for (const src of INPUT_LANGUAGES) {
    for (const out of OUTPUT_LANGUAGES) {
      if (src.id === out.id) continue;
      const g = HUB_ROUTES[`${src.id}:${out.id}`]?.grade ?? "open";
      if (g === "gold") counts.gold += 1;
      else if (g === "silver") counts.silver += 1;
      else counts.open += 1;
    }
  }
  return counts;
}

async function main() {
  const { jsonOut } = parseArgs(process.argv);
  const matrix = runJson(join(scriptRoot, "scripts/hub-ingest/hub-matrix-smoke.mjs"), []);
  const gold = runJson(join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs"), []);
  const traceReplay = spawnSync(
    process.execPath,
    ["--import", "tsx", join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs")],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  let traceParsed = {};
  try {
    traceParsed = parseStdoutJson(traceReplay.stdout);
  } catch {
    traceParsed = {};
  }
  const nativeEmit = runJson(join(scriptRoot, "scripts/hub-ingest/hub-native-emit-smoke.mjs"), []);
  const synthesis = runJson(join(scriptRoot, "scripts/hub-ingest/hub-cross-language-synthesis.mjs"), []);
  const oraclePy = spawnSync(resolveHubPython(), [
    join(scriptRoot, "packages/oracle-python/record_smoke.py"),
    join(scriptRoot, "reports/ci/hub-oracle-python-smoke.ndjson"),
  ], { cwd: scriptRoot, encoding: "utf8" });
  const oracleNode = spawnSync(process.execPath, [
    join(scriptRoot, "packages/oracle-node/record-smoke.mjs"),
    join(scriptRoot, "reports/ci/hub-oracle-node-smoke.ndjson"),
  ], { cwd: scriptRoot, encoding: "utf8" });

  const routeGrades = summarizeRouteGrades();
  const synthesisOk =
    synthesis.status === 0 &&
    synthesis.parsed.kind === "chrysalis.hub.cross-language-synthesis" &&
    synthesis.parsed.universe?.pairCount === 575 &&
    (synthesis.parsed.gradeSummary?.gold ?? 0) >= routeGrades.gold;

  const structuralSuiteIds = hubGoldStructuralSuiteIds();
  const traceSuiteIds = hubGoldTraceReplaySuiteIds();
  const goldSuiteCountOk =
    gold.parsed.ok === true && (gold.parsed.suiteCount ?? 0) === structuralSuiteIds.length;
  const traceSuiteCountOk =
    traceParsed.ok === true && (traceParsed.suiteCount ?? 0) === traceSuiteIds.length;
  const goldCoverage = buildHubGoldCoverageReport();
  const goldCoverageOk = goldCoverage.summary.coverageGaps === 0;

  const ok =
    matrix.status === 0 &&
    (matrix.parsed.failed ?? 1) === 0 &&
    gold.status === 0 &&
    goldSuiteCountOk &&
    traceReplay.status === 0 &&
    traceSuiteCountOk &&
    nativeEmit.status === 0 &&
    (nativeEmit.parsed.failed ?? 1) === 0 &&
    synthesisOk &&
    goldCoverageOk;

  const report = {
    kind: "chrysalis.hub.completion",
    schemaVersion: 10,
    ok,
    matrixSmoke: {
      passed: matrix.parsed.passed ?? 0,
      failed: matrix.parsed.failed ?? 0,
      skipped: matrix.parsed.skipped ?? 0,
    },
    goldVerify: {
      ok: goldSuiteCountOk,
      suiteCount: gold.parsed.suiteCount ?? structuralSuiteIds.length,
      expectedSuiteCount: structuralSuiteIds.length,
      suiteIds: structuralSuiteIds,
    },
    traceReplay: {
      ok: traceSuiteCountOk,
      correctness: traceParsed.correctness ?? 0,
      suiteCount: traceParsed.suiteCount ?? traceSuiteIds.length,
      expectedSuiteCount: traceSuiteIds.length,
      suiteIds: traceSuiteIds,
      targets: ["hono", "fastify"],
    },
    nativeEmitSmoke: {
      ok: nativeEmit.status === 0 && (nativeEmit.parsed.failed ?? 1) === 0,
      passed: nativeEmit.parsed.passed ?? 0,
      failed: nativeEmit.parsed.failed ?? 0,
    },
    oracleRecorders: {
      python: oraclePy.status === 0,
      node: oracleNode.status === 0,
    },
    crossLanguageSynthesis: {
      ok: synthesisOk,
      pairCount: synthesis.parsed.universe?.pairCount ?? 0,
      goldPairs: synthesis.parsed.gradeSummary?.gold ?? 0,
      originCount: synthesis.parsed.universe?.originCount ?? 0,
    },
    goldCoverage: {
      ok: goldCoverageOk,
      goldMatrix: goldCoverage.summary.goldMatrix,
      oracleTier: goldCoverage.summary.oracleTier,
      structuralTier: goldCoverage.summary.structuralTier,
      hubCiStructuralPairs: goldCoverage.summary.hubCiStructuralPairs,
      chrysalisCiGoldPairs: goldCoverage.summary.chrysalisCiGoldPairs,
      coverageGaps: goldCoverage.summary.coverageGaps,
    },
    nativeStructuralGold: {
      targets: hubNativeEmitTargetIds(),
      suiteIds: hubGoldStructuralSuiteIds().filter((id) => id.includes("-native-")),
    },
    middlewareTraceReplay: {
      jsonPostProbe: true,
      suites: ["js-middleware-hono"],
    },
    routeGrades,
    generatedAt: new Date().toISOString(),
  };

  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
