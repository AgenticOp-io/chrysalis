#!/usr/bin/env node
/** Phase 27f close smoke (G7706) — cutover native. */
import { runWispFullSiteCutoverGate } from "./hub-wisp-full-site-cutover-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PHASE27F_CLOSE_SMOKE_KIND = "chrysalis.wisp.phase27f-close-smoke";

export async function runWispPhase27fCloseGate(opts = {}) {
  const cutover = runWispFullSiteCutoverGate(opts);
  const ok = cutover.ok === true && cutover.nativeOk === true;
  return { kind: WISP_PHASE27F_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, cutover };
}

export async function runWispPhase27fCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-phase27f-close");
  const t0 = progress.start("WISP Phase 27f close (G7706)");
  const gate = await runWispPhase27fCloseGate(opts);
  progress.end("WISP Phase 27f close (G7706)", gate.ok === true, t0);
  return { kind: WISP_PHASE27F_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runWispPhase27fCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-phase27f-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
