#!/usr/bin/env node
/** Phase 27c close smoke (G7703) — native UI depth. */
import { runWispFullSiteUiBaselineGate } from "./hub-wisp-full-site-ui-baseline-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PHASE27C_CLOSE_SMOKE_KIND = "chrysalis.wisp.phase27c-close-smoke";

export async function runWispPhase27cCloseGate(opts = {}) {
  const ui = runWispFullSiteUiBaselineGate(opts);
  const ok = ui.ok === true && ui.nativeOk === true;
  return { kind: WISP_PHASE27C_CLOSE_SMOKE_KIND, schemaVersion: 1, ok, ui };
}

export async function runWispPhase27cCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-phase27c-close");
  const t0 = progress.start("WISP Phase 27c close (G7703)");
  const gate = await runWispPhase27cCloseGate(opts);
  progress.end("WISP Phase 27c close (G7703)", gate.ok === true, t0);
  return { kind: WISP_PHASE27C_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runWispPhase27cCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-phase27c-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
