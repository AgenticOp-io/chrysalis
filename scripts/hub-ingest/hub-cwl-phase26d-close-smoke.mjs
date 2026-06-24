#!/usr/bin/env node
/** Phase 26d close smoke (G7604). */
import { runCwlPhase26cCloseGate } from "./hub-cwl-phase26c-close-smoke.mjs";
import { runCwlTranslatorCrossEdgeGate } from "./hub-cwl-translator-cross-edge-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE26D_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase26d-close-smoke";

export async function runCwlPhase26dCloseGate(opts = {}) {
  const phase26c = await runCwlPhase26cCloseGate(opts);
  const crossEdge = await runCwlTranslatorCrossEdgeGate(opts);
  return {
    kind: CWL_PHASE26D_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok: phase26c.ok === true && crossEdge.ok === true,
    phase26c,
    crossEdge,
  };
}

export async function runCwlPhase26dCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase26d-close");
  const t0 = progress.start("CWL Phase 26d close (G7604)");
  const gate = await runCwlPhase26dCloseGate(opts);
  progress.end("CWL Phase 26d close (G7604)", gate.ok === true, t0);
  return { kind: CWL_PHASE26D_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase26dCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase26d-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
