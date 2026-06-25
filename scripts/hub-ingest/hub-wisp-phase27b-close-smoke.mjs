#!/usr/bin/env node
/** Phase 27b close smoke (G7702) — API inventory baseline; native handlers required for program close. */
import { runWispFullSiteApiInventoryGate } from "./hub-wisp-full-site-api-inventory-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PHASE27B_CLOSE_SMOKE_KIND = "chrysalis.wisp.phase27b-close-smoke";

export async function runWispPhase27bCloseGate(opts = {}) {
  const inventory = runWispFullSiteApiInventoryGate(opts);
  const ok = inventory.ok === true && inventory.nativeOk === true;
  return { kind: WISP_PHASE27B_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, inventory };
}

export async function runWispPhase27bCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-phase27b-close");
  const t0 = progress.start("WISP Phase 27b close (G7702)");
  const gate = await runWispPhase27bCloseGate(opts);
  progress.end("WISP Phase 27b close (G7702)", gate.ok === true, t0);
  return { kind: WISP_PHASE27B_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runWispPhase27bCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-phase27b-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
