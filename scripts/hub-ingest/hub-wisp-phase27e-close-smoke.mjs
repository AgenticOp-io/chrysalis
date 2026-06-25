#!/usr/bin/env node
/** Phase 27e close smoke (G7705) — integrations chartered + verify backlog. */
import { runWispFullSiteIntegrationsGate } from "./hub-wisp-full-site-integrations-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PHASE27E_CLOSE_SMOKE_KIND = "chrysalis.wisp.phase27e-close-smoke";

export async function runWispPhase27eCloseGate(opts = {}) {
  const integrations = runWispFullSiteIntegrationsGate(opts);
  return {
    kind: WISP_PHASE27E_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok: integrations.ok === true,
    integrations,
  };
}

export async function runWispPhase27eCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-phase27e-close");
  const t0 = progress.start("WISP Phase 27e close (G7705)");
  const gate = await runWispPhase27eCloseGate(opts);
  progress.end("WISP Phase 27e close (G7705)", gate.ok === true, t0);
  return { kind: WISP_PHASE27E_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runWispPhase27eCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-phase27e-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
