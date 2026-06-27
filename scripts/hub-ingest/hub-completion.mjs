#!/usr/bin/env node
/**
 * Hub matrix completion gate: matrix smoke + gold verify + route grade summary.
 * Usage: node scripts/hub-ingest/hub-completion.mjs [--json-out reports/ci/hub-completion.json] [--list-smokes]
 */
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildHubGoldCoverageReport } from "./hub-gold-coverage.mjs";
import { hubGoldStructuralSuiteIds, hubGoldTraceReplaySuiteIds } from "./hub-gold-manifest.mjs";
import { resolveHubPython } from "./shared.mjs";
import { buildHubLicenseStatusReport } from "./hub-license-status.mjs";
import { runMultiLaneSmoke } from "./hub-multi-lane-smoke.mjs";
import { buildGceFastHeavySmokeState, isGceHubCompletionFast } from "./hub-completion-gce-fast.mjs";
import {
  scriptRoot,
  parseArgs,
  runJson,
  loadGoldAndTraceReplay,
  summarizeRouteGrades,
} from "./hub-completion-utils.mjs";
import { runHubCompletionHeavySmokes } from "./hub-completion-heavy-smokes.mjs";
import { evaluateHubCompletionOkFlags } from "./hub-completion-ok-flags.mjs";
import { buildHubCompletionReport } from "./hub-completion-report.mjs";

function logPhase(msg) {
  console.error(`[hub-completion] phase: ${msg}`);
}

async function main() {
  const { jsonOut, listSmokes } = parseArgs(process.argv);
  if (listSmokes) {
    const ids = Object.keys(buildGceFastHeavySmokeState()).sort();
    console.log(JSON.stringify({ kind: "chrysalis.hub.completion.smoke-ids", count: ids.length, ids }, null, 2));
    return;
  }
  const gceHubCompletionFast = isGceHubCompletionFast();
  logPhase("hub-matrix-smoke");
  const matrix = runJson(join(scriptRoot, "scripts/hub-ingest/hub-matrix-smoke.mjs"), []);
  const { gold, traceReplay, traceParsed } = await loadGoldAndTraceReplay(gceHubCompletionFast);
  logPhase("hub-native-emit-smoke");
  const nativeEmit = runJson(join(scriptRoot, "scripts/hub-ingest/hub-native-emit-smoke.mjs"), []);
  logPhase("hub-cross-language-synthesis");
  const synthesis = runJson(join(scriptRoot, "scripts/hub-ingest/hub-cross-language-synthesis.mjs"), []);
  logPhase("hub-oracle-python-smoke");
  const oraclePy = spawnSync(resolveHubPython(), [
    join(scriptRoot, "packages/oracle-python/record_smoke.py"),
    join(scriptRoot, "reports/ci/hub-oracle-python-smoke.ndjson"),
  ], { cwd: scriptRoot, encoding: "utf8" });
  logPhase("hub-oracle-node-smoke");
  const oracleNode = spawnSync(process.execPath, [
    join(scriptRoot, "packages/oracle-node/record-smoke.mjs"),
    join(scriptRoot, "reports/ci/hub-oracle-node-smoke.ndjson"),
  ], { cwd: scriptRoot, encoding: "utf8" });

  const routeGrades = summarizeRouteGrades();
  const expectedPairCount = routeGrades.gold + routeGrades.silver + routeGrades.open;
  const synthesisOk =
    synthesis.status === 0 &&
    synthesis.parsed.kind === "chrysalis.hub.cross-language-synthesis" &&
    synthesis.parsed.universe?.pairCount === expectedPairCount &&
    (synthesis.parsed.gradeSummary?.gold ?? 0) >= routeGrades.gold;

  const structuralSuiteIds = hubGoldStructuralSuiteIds();
  const traceSuiteIds = hubGoldTraceReplaySuiteIds();
  const goldSuiteCountOk =
    gold.parsed.ok === true && (gold.parsed.suiteCount ?? 0) === structuralSuiteIds.length;
  const traceSuiteCountOk =
    traceParsed.ok === true && (traceParsed.suiteCount ?? 0) === traceSuiteIds.length;
  logPhase("hub-gold-coverage");
  const goldCoverage = buildHubGoldCoverageReport();
  const goldCoverageOk = goldCoverage.summary.coverageGaps === 0;
  logPhase("hub-multi-lane-smoke");
  const multiLaneReport = runMultiLaneSmoke();
  const multiLaneOk = multiLaneReport.ok === true;
  if (gceHubCompletionFast) {
    console.error(
      "[hub-completion] GCE fast path: deferring duplicate smokes (vitest + dedicated GCE phases)",
    );
  }

  logPhase(gceHubCompletionFast ? "heavy-smokes (gce-fast deferred)" : "heavy-smokes (full)");
  const smokes = await runHubCompletionHeavySmokes(gceHubCompletionFast);
  logPhase("evaluate ok flags");
  const gate = evaluateHubCompletionOkFlags(smokes, {
    matrix,
    gold,
    goldSuiteCountOk,
    traceReplay,
    traceSuiteCountOk,
    nativeEmit,
    synthesisOk,
    goldCoverageOk,
    multiLaneOk,
    routeGrades,
    gceHubCompletionFast,
  });

  logPhase("hub-license-status");
  const licenseStatus = await buildHubLicenseStatusReport();
  logPhase("build completion report");
  const report = buildHubCompletionReport({
    ok: gate.ok,
    gceHubCompletionFast,
    matrix,
    gold,
    goldSuiteCountOk,
    structuralSuiteIds,
    traceReplay,
    traceParsed,
    traceSuiteIds,
    traceSuiteCountOk,
    nativeEmit,
    synthesis,
    synthesisOk,
    routeGrades,
    goldCoverage,
    goldCoverageOk,
    multiLaneReport,
    multiLaneOk,
    smokes,
    licenseStatus,
    okFlags: gate.okFlags,
    completionSections: gate.completionSections,
    capabilityMatrix: gate.capabilityMatrix,
    webDbCount: gate.webDbCount,
    laravelGaps: smokes.laravelGaps,
    laravelGapsAction: smokes.laravelGapsAction,
    laravelVerifyLive: gate.laravelVerifyLive,
    oraclePy,
    oracleNode,
  });

  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (!gate.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
