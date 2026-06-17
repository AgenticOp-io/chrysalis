#!/usr/bin/env node
/**
 * STRATEGIC-PLAN §12 Month 1–2 — runtime-cwl parity + production-readiness gates (G5690–G5693).
 * See docs/RUNTIME-CWL-PARITY-PLAN.md.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanMonth12RuntimeParityGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_MONTH12_RUNTIME_PARITY_KIND =
  "chrysalis.hub.strategic-plan-month12-runtime-parity-smoke";
export const HUB_STRATEGIC_PLAN_MONTH12_RUNTIME_PARITY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @param {{ repoRoot?: string, skipEmitHttp?: boolean }} [opts] */
export async function runStrategicPlanMonth12RuntimeParitySmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const progress = createSmokeProgress("strategic-plan-month12");

  const t0 = progress.start("runtime-cwl parity reinforcement");
  const parity = await runStrategicPlanMonth12RuntimeParityGate({ repoRoot, ...opts });
  progress.end("runtime-cwl parity reinforcement", parity.ok === true, t0);

  return {
    kind: HUB_STRATEGIC_PLAN_MONTH12_RUNTIME_PARITY_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_MONTH12_RUNTIME_PARITY_SCHEMA_VERSION,
    ok: parity.ok === true,
    parity,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanMonth12RuntimeParitySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
