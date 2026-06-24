#!/usr/bin/env node
/** Phase 25d close smoke (G7504). */
import { runCwlPhase25cCloseGate } from "./hub-cwl-phase25c-close-smoke.mjs";
import { runCwlTranslatorVerifyGate } from "./hub-cwl-translator-verify-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE25D_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase25d-close-smoke";

export async function runCwlPhase25dCloseGate(opts = {}) {
  const phase25c = await runCwlPhase25cCloseGate(opts);
  const verify = await runCwlTranslatorVerifyGate(opts);
  const ok = phase25c.ok === true && verify.ok === true;
  return { kind: CWL_PHASE25D_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase25c, verify };
}

export async function runCwlPhase25dCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase25d-close");
  const t0 = progress.start("CWL Phase 25d close (G7504)");
  const gate = await runCwlPhase25dCloseGate(opts);
  progress.end("CWL Phase 25d close (G7504)", gate.ok === true, t0);
  return { kind: CWL_PHASE25D_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase25dCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase25d-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
