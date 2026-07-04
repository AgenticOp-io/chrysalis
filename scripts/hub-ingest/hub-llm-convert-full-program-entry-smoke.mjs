#!/usr/bin/env node
/** Phase 43 program entry (G8900). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const LLM_CONVERT_FULL_PROGRAM_ENTRY_KIND = "chrysalis.llm-convert-full-program-entry-smoke";
export const LLM_CONVERT_FULL_PROGRAM_ENTRY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const programDocPath = join(scriptRoot, "docs/LLM-CONVERT-FULL-PROGRAM.md");

/** @returns {boolean} */
export function isLlmConvertFullProgramClosed() {
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("Program closed") && text.includes("G8940");
}

/** @returns {boolean} */
export function isLlmConvertFullProgramActive() {
  if (isLlmConvertFullProgramClosed()) return false;
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("**Status:** **active**") && text.includes("G8900");
}

export function runLlmConvertFullProgramDocGate() {
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  const capabilityPath = join(scriptRoot, "docs/CAPABILITY-MATRIX.md");
  if (!existsSync(programDocPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-program-or-strategic-doc" };
  }
  const program = readFileSync(programDocPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const capability = existsSync(capabilityPath) ? readFileSync(capabilityPath, "utf8") : "";
  const closed = isLlmConvertFullProgramClosed();
  const active = isLlmConvertFullProgramActive();
  const statusOk =
    (closed && program.includes("Program closed") && program.includes("G8940")) ||
    (active && program.includes("**Status:** **active**"));
  const strategicGateOk = closed
    ? strategic.includes("G8940") && strategic.includes("D6303")
    : strategic.includes("G8900") && strategic.includes("D6303");
  const ok =
    statusOk &&
    program.includes("Phase 43") &&
    program.includes("G8900") &&
    program.includes("G8940") &&
    (program.includes("verify-gated") || program.includes("Verify-gated")) &&
    program.includes("D6303") &&
    strategicGateOk &&
    strategic.includes("LLM-CONVERT-FULL-PROGRAM.md") &&
    roadmap.includes("Phase 43") &&
    design.includes("D6303") &&
    capability.includes("Phase 43");
  return { ok, active, closed };
}

export async function runLlmConvertFullProgramEntrySmoke() {
  const progress = createSmokeProgress("llm-convert-full-program-entry");
  const t0 = progress.start("LLM convert full program entry (G8900)");
  const gate = runLlmConvertFullProgramDocGate();
  progress.end("LLM convert full program entry (G8900)", gate.ok === true, t0);
  return {
    kind: LLM_CONVERT_FULL_PROGRAM_ENTRY_KIND,
    schemaVersion: LLM_CONVERT_FULL_PROGRAM_ENTRY_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmConvertFullProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-full-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
