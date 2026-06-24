#!/usr/bin/env node
/** Phase 25a close smoke (G7501). */
import { runCwlFullLanguageCharterGate } from "./hub-cwl-full-language-charter-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE25A_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase25a-close-smoke";

export async function runCwlPhase25aCloseGate(opts = {}) {
  const charter = runCwlFullLanguageCharterGate(opts);
  const ok = charter.ok === true;
  return { kind: CWL_PHASE25A_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, charter };
}

export async function runCwlPhase25aCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase25a-close");
  const t0 = progress.start("CWL Phase 25a close (G7501)");
  const gate = await runCwlPhase25aCloseGate(opts);
  progress.end("CWL Phase 25a close (G7501)", gate.ok === true, t0);
  return { kind: CWL_PHASE25A_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase25aCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase25a-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
