#!/usr/bin/env node
/** Phase 24a close smoke (G7401). */
import { runCwlPilotCharterGate } from "./hub-cwl-pilot-charter-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE24A_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase24a-close-smoke";

export async function runCwlPhase24aCloseGate(opts = {}) {
  const charter = runCwlPilotCharterGate(opts);
  const ok = charter.ok === true;
  return { kind: CWL_PHASE24A_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, charter };
}

export async function runCwlPhase24aCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase24a-close");
  const t0 = progress.start("CWL Phase 24a close (G7401)");
  const gate = await runCwlPhase24aCloseGate(opts);
  progress.end("CWL Phase 24a close (G7401)", gate.ok === true, t0);
  return { kind: CWL_PHASE24A_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase24aCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase24a-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
