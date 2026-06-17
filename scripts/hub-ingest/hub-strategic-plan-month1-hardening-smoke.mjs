#!/usr/bin/env node
/**
 * STRATEGIC-PLAN §12 Month 1 — CWL authoring bootstrap hardening (G5680–G5683).
 * See docs/RUNTIME-CWL-PARITY-PLAN.md for Month 1–2 runtime parity track.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runCwlAuthoringBootstrapHardeningGate,
  runRuntimeCwlParityPlanGate,
} from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_MONTH1_HARDENING_KIND =
  "chrysalis.hub.strategic-plan-month1-hardening-smoke";
export const HUB_STRATEGIC_PLAN_MONTH1_HARDENING_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @param {{ repoRoot?: string, skipParityPlan?: boolean }} [opts] */
export async function runStrategicPlanMonth1HardeningSmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipParityPlan = opts.skipParityPlan === true;
  const progress = createSmokeProgress("strategic-plan-month1");

  let t0 = progress.start("bootstrap hardening");
  const bootstrap = await runCwlAuthoringBootstrapHardeningGate({ repoRoot });
  progress.end("bootstrap hardening", bootstrap.ok === true, t0);

  let parityPlan = { ok: true, skip: "parity-plan-skipped" };
  if (!skipParityPlan) {
    t0 = progress.start("runtime-cwl parity plan");
    parityPlan = await runRuntimeCwlParityPlanGate({ repoRoot });
    progress.end("runtime-cwl parity plan", parityPlan.ok === true, t0);
  } else {
    progress.defer("runtime-cwl parity plan", "skipParityPlan");
  }

  const ok = bootstrap.ok === true && parityPlan.ok === true;
  return {
    kind: HUB_STRATEGIC_PLAN_MONTH1_HARDENING_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_MONTH1_HARDENING_SCHEMA_VERSION,
    ok,
    bootstrap,
    parityPlan,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanMonth1HardeningSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
