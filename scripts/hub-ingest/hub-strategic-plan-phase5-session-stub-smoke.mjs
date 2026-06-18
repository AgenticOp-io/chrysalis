#!/usr/bin/env node
/** Phase 5 session stub (G5950–G5953). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStrategicPlanPhase5SessionStubGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_STRATEGIC_PLAN_PHASE5_SESSION_STUB_KIND =
  "chrysalis.hub.strategic-plan-phase5-session-stub-smoke";
export const HUB_STRATEGIC_PLAN_PHASE5_SESSION_STUB_SCHEMA_VERSION = 1;

export async function runStrategicPlanPhase5SessionStubSmoke(opts = {}) {
  const progress = createSmokeProgress("strategic-plan-phase5-session-stub");
  const t0 = progress.start("Session stub Phase 5");
  const session = await runStrategicPlanPhase5SessionStubGate(opts);
  progress.end("Session stub Phase 5", session.ok === true, t0);
  return {
    kind: HUB_STRATEGIC_PLAN_PHASE5_SESSION_STUB_KIND,
    schemaVersion: HUB_STRATEGIC_PLAN_PHASE5_SESSION_STUB_SCHEMA_VERSION,
    ok: session.ok === true,
    session,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runStrategicPlanPhase5SessionStubSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
