#!/usr/bin/env node
/** Phase 25b close smoke (G7502). */
import { runCwlPhase25aCloseGate } from "./hub-cwl-phase25a-close-smoke.mjs";
import { runCwlAuthoredCompleteGate } from "./hub-cwl-authored-complete-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE25B_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase25b-close-smoke";

export async function runCwlPhase25bCloseGate(opts = {}) {
  const phase25a = await runCwlPhase25aCloseGate(opts);
  const authored = await runCwlAuthoredCompleteGate(opts);
  const ok = phase25a.ok === true && authored.ok === true;
  return { kind: CWL_PHASE25B_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase25a, authored };
}

export async function runCwlPhase25bCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase25b-close");
  const t0 = progress.start("CWL Phase 25b close (G7502)");
  const gate = await runCwlPhase25bCloseGate(opts);
  progress.end("CWL Phase 25b close (G7502)", gate.ok === true, t0);
  return { kind: CWL_PHASE25B_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase25bCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase25b-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
