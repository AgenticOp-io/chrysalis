#!/usr/bin/env node
/** Phase 26b close smoke (G7602). */
import { runCwlPhase26aCloseGate } from "./hub-cwl-phase26a-close-smoke.mjs";
import { runCwlOutboundEmitGate } from "./hub-cwl-cwl-outbound-emit-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE26B_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase26b-close-smoke";

export async function runCwlPhase26bCloseGate(opts = {}) {
  const phase26a = await runCwlPhase26aCloseGate(opts);
  const outbound = await runCwlOutboundEmitGate(opts);
  return {
    kind: CWL_PHASE26B_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok: phase26a.ok === true && outbound.ok === true,
    phase26a,
    outbound,
  };
}

export async function runCwlPhase26bCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase26b-close");
  const t0 = progress.start("CWL Phase 26b close (G7602)");
  const gate = await runCwlPhase26bCloseGate(opts);
  progress.end("CWL Phase 26b close (G7602)", gate.ok === true, t0);
  return { kind: CWL_PHASE26B_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase26bCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase26b-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
