#!/usr/bin/env node
/** Phase 23 close smoke (G7350). */
import { runCwlGreenfieldCutoverGate } from "./hub-cwl-greenfield-cutover-smoke.mjs";
import { runCwlPhase22CloseGate } from "./hub-cwl-phase22-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE23_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase23-close-smoke";

export async function runCwlPhase23CloseGate(opts = {}) {
  const phase22 = await runCwlPhase22CloseGate(opts);
  const greenfield = await runCwlGreenfieldCutoverGate(opts);
  const ok = phase22.ok === true && greenfield.ok === true;
  return { kind: CWL_PHASE23_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase22, greenfield };
}

export async function runCwlPhase23CloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase23-close");
  const t0 = progress.start("CWL Phase 23 close (G7350)");
  const gate = await runCwlPhase23CloseGate(opts);
  progress.end("CWL Phase 23 close (G7350)", gate.ok === true, t0);
  return { kind: CWL_PHASE23_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase23CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase23-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
