#!/usr/bin/env node
/** Phase 20 close smoke (G7320). */
import { runCwlDataV2Gate } from "./hub-cwl-data-v2-smoke.mjs";
import { runCwlPhase19CloseGate } from "./hub-cwl-phase19-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE20_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase20-close-smoke";

export async function runCwlPhase20CloseGate(opts = {}) {
  const phase19 = await runCwlPhase19CloseGate(opts);
  const dataV2 = await runCwlDataV2Gate(opts);
  const ok = phase19.ok === true && dataV2.ok === true;
  return { kind: CWL_PHASE20_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase19, dataV2 };
}

export async function runCwlPhase20CloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase20-close");
  const t0 = progress.start("CWL Phase 20 close (G7320)");
  const gate = await runCwlPhase20CloseGate(opts);
  progress.end("CWL Phase 20 close (G7320)", gate.ok === true, t0);
  return { kind: CWL_PHASE20_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase20CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase20-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
