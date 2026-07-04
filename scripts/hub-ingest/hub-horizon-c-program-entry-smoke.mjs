#!/usr/bin/env node
/** Horizon C program entry (G9100). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HORIZON_C_PROGRAM_ENTRY_KIND = "chrysalis.horizon-c-program-entry-smoke";
export const HORIZON_C_PROGRAM_ENTRY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runHorizonCProgramDocGate() {
  const programPath = join(scriptRoot, "docs/PHASE-44-PROGRAM.md");
  const gpuDoc = join(scriptRoot, "docs/GCE-GPU-LAB.md");
  const trainPy = join(scriptRoot, "scripts/chrysalis-lora-qlora-train.py");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  if (!existsSync(programPath) || !existsSync(gpuDoc)) {
    return { ok: false, skip: "missing-horizon-c-docs" };
  }
  const program = readFileSync(programPath, "utf8");
  const gpu = readFileSync(gpuDoc, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const ok =
    program.includes("Horizon C") &&
    program.includes("G9110") &&
    program.includes("G9130") &&
    gpu.includes("chrysalis-gpu-lab") &&
    strategic.includes("Horizon C") &&
    existsSync(trainPy);
  return { ok };
}

export async function runHorizonCProgramEntrySmoke() {
  const progress = createSmokeProgress("horizon-c-program-entry");
  const t0 = progress.start("Horizon C program entry (G9100)");
  const gate = runHorizonCProgramDocGate();
  progress.end("Horizon C program entry (G9100)", gate.ok === true, t0);
  return {
    kind: HORIZON_C_PROGRAM_ENTRY_KIND,
    schemaVersion: HORIZON_C_PROGRAM_ENTRY_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runHorizonCProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-horizon-c-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
