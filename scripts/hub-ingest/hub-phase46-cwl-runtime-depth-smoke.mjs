#!/usr/bin/env node
/** Phase 46b CWL runtime depth entry (G9210). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase46ProgramDocGate } from "./hub-phase46-program-entry-smoke.mjs";
import { runEmitRuntimeCwlSmoke } from "./hub-emit-runtime-cwl-smoke.mjs";
import { runCwlRuntimeDeployGate } from "./hub-cwl-runtime-deploy-smoke.mjs";
import {
  runRuntimeCwlSessionResolveProbeGate,
  runRuntimeCwlParityPlanGate,
} from "./hub-cwl-fullstack-gates.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runPhase46CwlRuntimeDepthDocGate() {
  const path = join(scriptRoot, "docs/CWL-RUNTIME-DEPTH-PHASE-46.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-cwl-runtime-depth-phase46-doc" };
  const text = readFileSync(path, "utf8");
  const browserPkg = join(scriptRoot, "packages/runtime-cwl-browser/README.md");
  const workerPkg = join(scriptRoot, "packages/runtime-cwl-worker/README.md");
  const ok =
    text.includes("@chrysalis/emit-runtime-cwl") &&
    text.includes("@chrysalis/runtime-cwl-browser") &&
    text.includes("@chrysalis/runtime-cwl-worker") &&
    text.includes("G9200") &&
    text.includes("G9220") &&
    text.includes("G9240") &&
    text.includes("verify-gated") &&
    existsSync(browserPkg) &&
    existsSync(workerPkg);
  return { ok };
}

export async function runPhase46CwlRuntimeDepthGate(opts = {}) {
  const program = runPhase46ProgramDocGate();
  const doc = runPhase46CwlRuntimeDepthDocGate();
  const emit = await runEmitRuntimeCwlSmoke();
  const deploy = await runCwlRuntimeDeployGate();
  const sessionProbe = runRuntimeCwlSessionResolveProbeGate();
  const parity = await runRuntimeCwlParityPlanGate(opts);
  const ok =
    program.ok === true &&
    doc.ok === true &&
    emit.ok === true &&
    deploy.ok === true &&
    sessionProbe.ok === true &&
    parity.ok === true;
  return {
    kind: "chrysalis.phase46-cwl-runtime-depth-smoke",
    schemaVersion: 1,
    ok,
    program,
    doc,
    emit,
    deploy,
    sessionProbe,
    parity,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase46CwlRuntimeDepthSmoke(opts = {}) {
  const progress = createSmokeProgress("phase46-cwl-runtime-depth");
  const t0 = progress.start("Phase 46 CWL runtime depth (G9210)");
  const gate = await runPhase46CwlRuntimeDepthGate(opts);
  progress.end("Phase 46 CWL runtime depth (G9210)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase46CwlRuntimeDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase46-cwl-runtime-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
