#!/usr/bin/env node
/** Phase 26c close smoke (G7603). */
import { runCwlPhase26bCloseGate } from "./hub-cwl-phase26b-close-smoke.mjs";
import { runCwlTranslatorRoundtripMandatoryGate } from "./hub-cwl-translator-roundtrip-mandatory-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE26C_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase26c-close-smoke";

export async function runCwlPhase26cCloseGate(opts = {}) {
  const phase26b = await runCwlPhase26bCloseGate(opts);
  const roundtrip = await runCwlTranslatorRoundtripMandatoryGate(opts);
  return {
    kind: CWL_PHASE26C_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok: phase26b.ok === true && roundtrip.ok === true,
    phase26b,
    roundtrip,
  };
}

export async function runCwlPhase26cCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase26c-close");
  const t0 = progress.start("CWL Phase 26c close (G7603)");
  const gate = await runCwlPhase26cCloseGate(opts);
  progress.end("CWL Phase 26c close (G7603)", gate.ok === true, t0);
  return { kind: CWL_PHASE26C_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase26cCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase26c-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
