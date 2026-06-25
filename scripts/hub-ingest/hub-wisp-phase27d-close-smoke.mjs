#!/usr/bin/env node
/** Phase 27d close smoke (G7704) — auth native. */
import { runWispFullSiteAuthPolicyGate } from "./hub-wisp-full-site-auth-policy-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PHASE27D_CLOSE_SMOKE_KIND = "chrysalis.wisp.phase27d-close-smoke";

export async function runWispPhase27dCloseGate(opts = {}) {
  const auth = runWispFullSiteAuthPolicyGate(opts);
  const ok = auth.ok === true && auth.nativeOk === true;
  return { kind: WISP_PHASE27D_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, auth };
}

export async function runWispPhase27dCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-phase27d-close");
  const t0 = progress.start("WISP Phase 27d close (G7704)");
  const gate = await runWispPhase27dCloseGate(opts);
  progress.end("WISP Phase 27d close (G7704)", gate.ok === true, t0);
  return { kind: WISP_PHASE27D_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runWispPhase27dCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-phase27d-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
