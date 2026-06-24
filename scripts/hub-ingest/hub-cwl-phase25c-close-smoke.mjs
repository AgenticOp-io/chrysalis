#!/usr/bin/env node
/** Phase 25c close smoke (G7503). */
import { runCwlPhase25bCloseGate } from "./hub-cwl-phase25b-close-smoke.mjs";
import { runCwlTranslatorParityGate } from "./hub-cwl-translator-parity-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE25C_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase25c-close-smoke";

export async function runCwlPhase25cCloseGate(opts = {}) {
  const phase25b = await runCwlPhase25bCloseGate(opts);
  const translator = await runCwlTranslatorParityGate(opts);
  const ok = phase25b.ok === true && translator.ok === true;
  return { kind: CWL_PHASE25C_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase25b, translator };
}

export async function runCwlPhase25cCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase25c-close");
  const t0 = progress.start("CWL Phase 25c close (G7503)");
  const gate = await runCwlPhase25cCloseGate(opts);
  progress.end("CWL Phase 25c close (G7503)", gate.ok === true, t0);
  return { kind: CWL_PHASE25C_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase25cCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase25c-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
