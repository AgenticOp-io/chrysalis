#!/usr/bin/env node
/** Phase 24b close smoke (G7402). */
import { runCwlPhase24aCloseGate } from "./hub-cwl-phase24a-close-smoke.mjs";
import { runCwlPilotIngestGate } from "./hub-cwl-pilot-ingest-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE24B_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase24b-close-smoke";

export async function runCwlPhase24bCloseGate(opts = {}) {
  const phase24a = await runCwlPhase24aCloseGate(opts);
  const ingest = await runCwlPilotIngestGate(opts);
  const ok = phase24a.ok === true && ingest.ok === true;
  return { kind: CWL_PHASE24B_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase24a, ingest };
}

export async function runCwlPhase24bCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase24b-close");
  const t0 = progress.start("CWL Phase 24b close (G7402)");
  const gate = await runCwlPhase24bCloseGate(opts);
  progress.end("CWL Phase 24b close (G7402)", gate.ok === true, t0);
  return { kind: CWL_PHASE24B_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase24bCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase24b-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
