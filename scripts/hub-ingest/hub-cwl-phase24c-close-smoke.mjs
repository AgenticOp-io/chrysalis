#!/usr/bin/env node
/** Phase 24c close smoke (G7403). */
import { runCwlPhase24bCloseGate } from "./hub-cwl-phase24b-close-smoke.mjs";
import { runCwlPilotVerifyGate } from "./hub-cwl-pilot-verify-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE24C_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase24c-close-smoke";

export async function runCwlPhase24cCloseGate(opts = {}) {
  const phase24b = await runCwlPhase24bCloseGate(opts);
  const verify = await runCwlPilotVerifyGate(opts);
  const ok = phase24b.ok === true && verify.ok === true;
  return { kind: CWL_PHASE24C_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase24b, verify };
}

export async function runCwlPhase24cCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase24c-close");
  const t0 = progress.start("CWL Phase 24c close (G7403)");
  const gate = await runCwlPhase24cCloseGate(opts);
  progress.end("CWL Phase 24c close (G7403)", gate.ok === true, t0);
  return { kind: CWL_PHASE24C_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase24cCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase24c-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
