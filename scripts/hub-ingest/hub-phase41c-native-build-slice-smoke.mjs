#!/usr/bin/env node
/** Phase 41c — Java / Go / C# / Ruby native ingest composite (G8730). */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runHubNativeBridgeAdapterGate, runHubNativeLiftGate } from "./hub-native-lift-gate.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { runJavaSemanticReqResC5Gate } from "./hub-java-semantic-req-res-smoke.mjs";
import { runJavaSemanticSqlC6Gate } from "./hub-java-semantic-sql-smoke.mjs";
import { runGoSemanticReqResC7Gate } from "./hub-go-semantic-req-res-smoke.mjs";
import { runGoSemanticSqlC8Gate } from "./hub-go-semantic-sql-smoke.mjs";
import { runCsharpSemanticReqResC9Gate } from "./hub-csharp-semantic-req-res-smoke.mjs";
import { runRubySemanticReqResC10Gate } from "./hub-ruby-semantic-req-res-smoke.mjs";
import { runRubySemanticSqlC11Gate } from "./hub-ruby-semantic-sql-smoke.mjs";
import { runCsharpSemanticSqlC12Gate } from "./hub-csharp-semantic-sql-smoke.mjs";

export const PHASE41C_NATIVE_BUILD_SLICE_SMOKE_KIND = "chrysalis.phase41c-native-build-slice-smoke";
export const PHASE41C_NATIVE_BUILD_SLICE_SMOKE_SCHEMA_VERSION = 6;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const NATIVE_LANGS = [
  {
    gate: "G8731",
    language: "java",
    fixtureRel: "fixtures/hub-gold-java-literal",
    sourceFile: "src/Health.java",
    parseExportName: "parseJavaRoutes",
    oracleSuite: "java-literal-hono",
    parseSample: (bridge, src) => bridge.parseJavaRoutes(src, "Health.java"),
  },
  {
    gate: "G8732",
    language: "go",
    fixtureRel: "fixtures/hub-gold-go-literal",
    sourceFile: "main.go",
    parseExportName: "parseGoRoutes",
    oracleSuite: "go-literal-hono",
    parseSample: (bridge, src) => bridge.parseGoRoutes(src),
  },
  {
    gate: "G8733",
    language: "csharp",
    fixtureRel: "fixtures/hub-gold-csharp-literal",
    sourceFile: "Program.cs",
    parseExportName: "parseCsharpRoutes",
    oracleSuite: "csharp-literal-hono",
    parseSample: (bridge, src) => bridge.parseCsharpRoutes(src),
  },
  {
    gate: "G8734",
    language: "ruby",
    fixtureRel: "fixtures/hub-gold-ruby-literal",
    sourceFile: "app.rb",
    parseExportName: "parseRubyRoutes",
    oracleSuite: "ruby-literal-hono",
    parseSample: (bridge, src) => bridge.parseRubyRoutes(src),
  },
];

async function runLangGate(spec) {
  const bridgeMod = await import(pathToFileURL(join(scriptRoot, "packages/hub-native-bridge/dist/index.js")).href);
  const src = readFileSync(join(scriptRoot, spec.fixtureRel, spec.sourceFile), "utf8");
  const bridgeAdapter = await runHubNativeBridgeAdapterGate({
    gateId: spec.gate,
    parseExportName: spec.parseExportName,
    parseSample: () => spec.parseSample(bridgeMod, src),
  });
  const lift = await runHubNativeLiftGate({
    fixtureRel: spec.fixtureRel,
    language: spec.language,
    sourceFile: spec.sourceFile,
  });

  const suite = {
    id: spec.oracleSuite,
    fixture: join(scriptRoot, spec.fixtureRel),
    origin: spec.language,
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  };
  const verify = await runGoldVerifySuite(suite);
  let replayOk = true;
  try {
    const replay = await runTraceReplaySuite(suite);
    replayOk = replay.ok === true;
  } catch {
    replayOk = false;
  }

  const ok =
    bridgeAdapter.bridgeOk &&
    bridgeAdapter.adapterOk &&
    lift.ok === true &&
    verify.ok === true &&
    replayOk;
  return {
    ok,
    gate: spec.gate,
    language: spec.language,
    bridgeAdapter,
    lift,
    verifyOk: verify.ok === true,
    replayOk,
    fixtureRel: spec.fixtureRel,
  };
}

export async function runPhase41cNativeBuildSliceGate() {
  const results = {};
  let allOk = true;
  for (const spec of NATIVE_LANGS) {
    const r = await runLangGate(spec);
    results[spec.gate] = r;
    if (!r.ok) allOk = false;
  }
  const javaReqRes = runJavaSemanticReqResC5Gate();
  results.G8735 = { ok: javaReqRes.ok === true, gate: "G8735", ...javaReqRes };
  if (!javaReqRes.ok) allOk = false;
  const javaSql = runJavaSemanticSqlC6Gate();
  results.G8736 = { ok: javaSql.ok === true, gate: "G8736", ...javaSql };
  if (!javaSql.ok) allOk = false;
  const goReqRes = runGoSemanticReqResC7Gate();
  results.G8737 = { ok: goReqRes.ok === true, gate: "G8737", ...goReqRes };
  if (!goReqRes.ok) allOk = false;
  const goSql = runGoSemanticSqlC8Gate();
  results.G8738 = { ok: goSql.ok === true, gate: "G8738", ...goSql };
  if (!goSql.ok) allOk = false;
  const csharpReqRes = runCsharpSemanticReqResC9Gate();
  results.G8739 = { ok: csharpReqRes.ok === true, gate: "G8739", ...csharpReqRes };
  if (!csharpReqRes.ok) allOk = false;
  const rubyReqRes = runRubySemanticReqResC10Gate();
  results.G8744 = { ok: rubyReqRes.ok === true, gate: "G8744", ...rubyReqRes };
  if (!rubyReqRes.ok) allOk = false;
  const rubySql = runRubySemanticSqlC11Gate();
  results.G8745 = { ok: rubySql.ok === true, gate: "G8745", ...rubySql };
  if (!rubySql.ok) allOk = false;
  const csharpSql = runCsharpSemanticSqlC12Gate();
  results.G8746 = { ok: csharpSql.ok === true, gate: "G8746", ...csharpSql };
  if (!csharpSql.ok) allOk = false;
  const matrixProgress = runFullMatrixOracleProgressGate();
  return {
    kind: PHASE41C_NATIVE_BUILD_SLICE_SMOKE_KIND,
    schemaVersion: PHASE41C_NATIVE_BUILD_SLICE_SMOKE_SCHEMA_VERSION,
    ok: allOk && matrixProgress.ok === true,
    languages: results,
    matrixProgress: {
      ok: matrixProgress.ok === true,
      gate: "G8701",
      programComplete: matrixProgress.programComplete,
      belowTarget: matrixProgress.belowTarget,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase41cNativeBuildSliceSmoke() {
  const progress = createSmokeProgress("phase41c-native-build-slice");
  const t0 = progress.start("Phase 41c native ingest build slice");
  const gate = await runPhase41cNativeBuildSliceGate();
  progress.end("Phase 41c native ingest build slice", gate.ok === true, t0);
  return { kind: PHASE41C_NATIVE_BUILD_SLICE_SMOKE_KIND, schemaVersion: PHASE41C_NATIVE_BUILD_SLICE_SMOKE_SCHEMA_VERSION, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase41cNativeBuildSliceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase41c-native-build-slice-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
