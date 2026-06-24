#!/usr/bin/env node
/** Phase 26a close smoke (G7601). */
import { runCwlTranslatorComposerCharterGate } from "./hub-cwl-translator-composer-charter-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE26A_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase26a-close-smoke";

export async function runCwlPhase26aCloseGate(opts = {}) {
  const charter = runCwlTranslatorComposerCharterGate(opts);
  return { kind: CWL_PHASE26A_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: charter.ok === true, charter };
}

export async function runCwlPhase26aCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase26a-close");
  const t0 = progress.start("CWL Phase 26a close (G7601)");
  const gate = await runCwlPhase26aCloseGate(opts);
  progress.end("CWL Phase 26a close (G7601)", gate.ok === true, t0);
  return { kind: CWL_PHASE26A_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase26aCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase26a-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
