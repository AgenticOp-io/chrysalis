#!/usr/bin/env node
/** WISP production POC program close (G7890) — Phase 28a–28d + G7790 regression. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispProductionPocOperatorContractGate } from "./hub-wisp-production-poc-operator-contract-smoke.mjs";
import { runWispProductionPocScenarioGate } from "./hub-wisp-production-poc-scenario-smoke.mjs";
import { runWispProductionPocPipelineGate } from "./hub-wisp-production-poc-pipeline-smoke.mjs";
import { runWispProductionPocIntegrationsGate } from "./hub-wisp-production-poc-integrations-smoke.mjs";
import { runWispProductionPocVerifyReplayGate } from "./hub-wisp-production-poc-verify-replay-smoke.mjs";
import { runWispFullSiteCloseGate } from "./hub-wisp-full-site-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PRODUCTION_POC_CLOSE_KIND = "chrysalis.wisp.production-poc-close-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionPocDocGate() {
  const path = join(scriptRoot, "docs/WISP-PRODUCTION-POC-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Program closed") ||
    (text.includes("**Status:** **active**") && text.includes("G7800") && text.includes("G7890"));
  return { ok, programDocOk: ok };
}

export async function runWispProductionPocCloseGate(opts = {}) {
  const progress = createSmokeProgress("wisp-production-poc-close-gates");
  const doc = runWispProductionPocDocGate();
  progress.info(`doc ${doc.ok === true ? "ok" : "FAIL"}`);
  let t0 = progress.start("phase28a");
  const phase28a = runWispProductionPocOperatorContractGate();
  progress.end("phase28a", phase28a.ok === true, t0);
  t0 = progress.start("phase28b-scenario");
  const phase28bScenario = runWispProductionPocScenarioGate();
  progress.end("phase28b-scenario", phase28bScenario.ok === true, t0);
  t0 = progress.start("phase28b-pipeline");
  const phase28bPipeline = runWispProductionPocPipelineGate();
  progress.end("phase28b-pipeline", phase28bPipeline.ok === true, t0);
  t0 = progress.start("phase28c");
  const phase28c = runWispProductionPocIntegrationsGate();
  progress.end("phase28c", phase28c.ok === true, t0);
  t0 = progress.start("phase28d");
  const phase28d = runWispProductionPocVerifyReplayGate();
  progress.end("phase28d", phase28d.ok === true, t0);
  const skipGoldVerify =
    opts.skipGoldVerify === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD === "1";
  t0 = progress.start("g7790-regression");
  const g7790 = await runWispFullSiteCloseGate({ ...opts, skipGoldVerify, skipMaintenance: true });
  progress.end("g7790-regression", g7790.ok === true, t0);
  const ok =
    doc.ok === true &&
    phase28a.ok === true &&
    phase28bScenario.ok === true &&
    phase28bPipeline.ok === true &&
    phase28c.ok === true &&
    phase28d.ok === true &&
    g7790.ok === true;
  return {
    kind: WISP_PRODUCTION_POC_CLOSE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    phase28a,
    phase28bScenario,
    phase28bPipeline,
    phase28c,
    phase28d,
    g7790,
    skipGoldVerify,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispProductionPocCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-production-poc-close");
  const t0 = progress.start("WISP production POC close (G7890)");
  const gate = await runWispProductionPocCloseGate(opts);
  progress.end("WISP production POC close (G7890)", gate.ok === true, t0);
  return {
    kind: WISP_PRODUCTION_POC_CLOSE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispProductionPocCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-poc-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
