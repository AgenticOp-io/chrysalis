#!/usr/bin/env node
/** Phase 46b CWL runtime depth close (G9220). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase46CwlRuntimeDepthGate } from "./hub-phase46-cwl-runtime-depth-smoke.mjs";

export async function runPhase46CwlRuntimeDepthCloseGate(opts = {}) {
  const depth = await runPhase46CwlRuntimeDepthGate(opts);
  return {
    kind: "chrysalis.phase46-cwl-runtime-depth-close-smoke",
    schemaVersion: 1,
    ok: depth.ok === true,
    depth,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase46CwlRuntimeDepthCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("phase46-cwl-runtime-depth-close");
  const t0 = progress.start("Phase 46 CWL runtime depth close (G9220)");
  const gate = await runPhase46CwlRuntimeDepthCloseGate(opts);
  progress.end("Phase 46 CWL runtime depth close (G9220)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase46CwlRuntimeDepthCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase46-cwl-runtime-depth-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
