#!/usr/bin/env node
/** Phase 22 close smoke (G7340). */
import { runCwlUniversalIngestGate } from "./hub-cwl-universal-ingest-smoke.mjs";
import { runCwlPhase21CloseGate } from "./hub-cwl-phase21-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE22_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase22-close-smoke";

export async function runCwlPhase22CloseGate(opts = {}) {
  const phase21 = await runCwlPhase21CloseGate(opts);
  const ingest = await runCwlUniversalIngestGate(opts);
  const ok = phase21.ok === true && ingest.ok === true;
  return { kind: CWL_PHASE22_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase21, ingest };
}

export async function runCwlPhase22CloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase22-close");
  const t0 = progress.start("CWL Phase 22 close (G7340)");
  const gate = await runCwlPhase22CloseGate(opts);
  progress.end("CWL Phase 22 close (G7340)", gate.ok === true, t0);
  return { kind: CWL_PHASE22_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase22CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase22-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
