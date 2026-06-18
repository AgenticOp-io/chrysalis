#!/usr/bin/env node
/** Phase 8 product proof close (G6110–G6113). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase8ProductProofCloseGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { isStrategicPlanStrict } from "./strategic-plan-skips.mjs";

export const HUB_STRATEGIC_PLAN_PHASE8_PRODUCT_PROOF_CLOSE_KIND =
  "chrysalis.hub.strategic-plan-phase8-product-proof-close-smoke";
export const HUB_STRATEGIC_PLAN_PHASE8_PRODUCT_PROOF_CLOSE_SCHEMA_VERSION = 1;

/** @param {Record<string, boolean>} [opts] */
export async function runStrategicPlanPhase8ProductProofCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase8-product-proof-close");
  const strict = isStrategicPlanStrict(opts);
  const t0 = progress.start(`Product proof Phase 8 close${strict ? " (strict)" : ""}`);
  const close = await runStrategicPlanPhase8ProductProofCloseGate(opts);
  progress.end("Product proof Phase 8 close", close.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE8_PRODUCT_PROOF_CLOSE_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE8_PRODUCT_PROOF_CLOSE_SCHEMA_VERSION,
    ok: close.ok === true,
    strict,
    close,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  if (
    isStrategicPlanStrict() &&
    process.platform === "win32" &&
    process.env.CHRYSALIS_ALLOW_STRICT_LOCAL !== "1"
  ) {
    console.error(
      "Strict Phase 8 product proof must run on GCE (Linux). Use: pnpm run test:gce:phase8-strict",
    );
    process.exit(2);
  }
  runStrategicPlanPhase8ProductProofCloseSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
