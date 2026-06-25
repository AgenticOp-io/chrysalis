#!/usr/bin/env node
/** Phase 27a close smoke (G7701). */
import { runWispFullSiteCharterGate } from "./hub-wisp-full-site-charter-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PHASE27A_CLOSE_SMOKE_KIND = "chrysalis.wisp.phase27a-close-smoke";

export async function runWispPhase27aCloseGate(opts = {}) {
  const charter = runWispFullSiteCharterGate(opts);
  return { kind: WISP_PHASE27A_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: charter.ok === true, charter };
}

export async function runWispPhase27aCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-phase27a-close");
  const t0 = progress.start("WISP Phase 27a close (G7701)");
  const gate = await runWispPhase27aCloseGate(opts);
  progress.end("WISP Phase 27a close (G7701)", gate.ok === true, t0);
  return { kind: WISP_PHASE27A_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runWispPhase27aCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-phase27a-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
