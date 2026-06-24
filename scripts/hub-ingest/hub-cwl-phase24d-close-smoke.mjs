#!/usr/bin/env node
/** Phase 24d close smoke (G7404). */
import { runCwlPhase24cCloseGate } from "./hub-cwl-phase24c-close-smoke.mjs";
import { runCwlPilotCutoverGate } from "./hub-cwl-pilot-cutover-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE24D_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase24d-close-smoke";

export async function runCwlPhase24dCloseGate(opts = {}) {
  const phase24c = await runCwlPhase24cCloseGate(opts);
  const cutover = await runCwlPilotCutoverGate(opts);
  const ok = phase24c.ok === true && cutover.ok === true;
  return { kind: CWL_PHASE24D_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase24c, cutover };
}

export async function runCwlPhase24dCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase24d-close");
  const t0 = progress.start("CWL Phase 24d close (G7404)");
  const gate = await runCwlPhase24dCloseGate(opts);
  progress.end("CWL Phase 24d close (G7404)", gate.ok === true, t0);
  return { kind: CWL_PHASE24D_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase24dCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase24d-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
