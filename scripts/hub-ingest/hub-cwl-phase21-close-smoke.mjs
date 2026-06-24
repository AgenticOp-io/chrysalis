#!/usr/bin/env node
/** Phase 21 close smoke (G7330). */
import { runCwlEffectsMiddlewareGate } from "./hub-cwl-effects-middleware-smoke.mjs";
import { runCwlPhase20CloseGate } from "./hub-cwl-phase20-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE21_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase21-close-smoke";

export async function runCwlPhase21CloseGate(opts = {}) {
  const phase20 = await runCwlPhase20CloseGate(opts);
  const middleware = await runCwlEffectsMiddlewareGate(opts);
  const ok = phase20.ok === true && middleware.ok === true;
  return { kind: CWL_PHASE21_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, phase20, middleware };
}

export async function runCwlPhase21CloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase21-close");
  const t0 = progress.start("CWL Phase 21 close (G7330)");
  const gate = await runCwlPhase21CloseGate(opts);
  progress.end("CWL Phase 21 close (G7330)", gate.ok === true, t0);
  return { kind: CWL_PHASE21_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase21CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase21-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
