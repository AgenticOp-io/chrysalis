#!/usr/bin/env node
/** Combined build slice: Phase 41a (G8711–G8714, G8713) + LLM corpus/WVB refresh (G8610). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runJsSemanticReqResB1Gate } from "./hub-js-semantic-req-res-smoke.mjs";
import { runJsSemanticMiddlewareB2Gate } from "./hub-js-semantic-middleware-smoke.mjs";
import { runJsSemanticCallsB4Gate } from "./hub-js-semantic-calls-smoke.mjs";
import { runJsSemanticSqlB3Gate } from "./hub-js-semantic-sql-smoke.mjs";
import { runIsT2LoraPrepSmoke } from "./hub-is-t2-lora-prep-smoke.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { runWebLlmBuildBenchmark } from "../web-llm-build-benchmark.mjs";
import { logHubWebLlmGate } from "./hub-web-llm-gate-log.mjs";

export const PHASE41_LLM_BUILD_SLICE_SMOKE_KIND = "chrysalis.phase41-llm-build-slice-smoke";
export const PHASE41_LLM_BUILD_SLICE_SMOKE_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runPhase41LlmBuildSliceGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const jsReqRes = runJsSemanticReqResB1Gate();
  const jsMiddleware = runJsSemanticMiddlewareB2Gate();
  const jsCalls = runJsSemanticCallsB4Gate();
  const jsSql = runJsSemanticSqlB3Gate();
  const loraPrep = await runIsT2LoraPrepSmoke({ ...opts, repoRoot });
  const wvb = await runWebLlmBuildBenchmark({ repoRoot });
  const matrixProgress = runFullMatrixOracleProgressGate();

  const ok =
    jsReqRes.ok === true &&
    jsMiddleware.ok === true &&
    jsCalls.ok === true &&
    jsSql.ok === true &&
    loraPrep.ok === true &&
    wvb.ok === true &&
    matrixProgress.ok === true;

  return {
    kind: PHASE41_LLM_BUILD_SLICE_SMOKE_KIND,
    schemaVersion: PHASE41_LLM_BUILD_SLICE_SMOKE_SCHEMA_VERSION,
    ok,
    jsReqRes: { ok: jsReqRes.ok === true, gate: "G8711", ...jsReqRes },
    jsMiddleware: { ok: jsMiddleware.ok === true, gate: "G8712", ...jsMiddleware },
    jsSql: { ok: jsSql.ok === true, gate: "G8713", ...jsSql },
    jsCalls: { ok: jsCalls.ok === true, gate: "G8714", ...jsCalls },
    loraPrep: { ok: loraPrep.ok === true, gate: "G8610", checks: loraPrep.checks },
    wvb: { ok: wvb.ok === true, gate: "G8240-wvb", caseCount: wvb.summary?.caseCount },
    matrixProgress: {
      ok: matrixProgress.ok === true,
      gate: "G8701",
      programComplete: matrixProgress.programComplete,
      belowTarget: matrixProgress.belowTarget,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase41LlmBuildSliceSmoke(opts = {}) {
  const progress = createSmokeProgress("phase41-llm-build-slice");
  const t0 = progress.start("Phase 41 + LLM build slice");
  const gate = await runPhase41LlmBuildSliceGate(opts);
  progress.end("Phase 41 + LLM build slice", gate.ok === true, t0);

  for (const [gateName, section] of [
    ["G8711", gate.jsReqRes],
    ["G8712", gate.jsMiddleware],
    ["G8713", gate.jsSql],
    ["G8714", gate.jsCalls],
    ["G8610", gate.loraPrep],
    ["G8240-wvb", gate.wvb],
    ["G8701", gate.matrixProgress],
  ]) {
    await logHubWebLlmGate({
      gateName,
      ok: section?.ok === true,
      detail: section,
      repoRoot: opts.repoRoot,
    });
  }

  return {
    kind: PHASE41_LLM_BUILD_SLICE_SMOKE_KIND,
    schemaVersion: PHASE41_LLM_BUILD_SLICE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runPhase41LlmBuildSliceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase41-llm-build-slice-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
