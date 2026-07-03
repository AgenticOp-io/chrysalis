#!/usr/bin/env node
/** LLM-assisted convert program entry smoke (G8800). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const LLM_ASSISTED_CONVERT_PROGRAM_ENTRY_SMOKE_KIND =
  "chrysalis.llm-assisted-convert-program-entry-smoke";
export const LLM_ASSISTED_CONVERT_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const programDocPath = join(scriptRoot, "docs/LLM-ASSISTED-CONVERT-PROGRAM.md");

/** @returns {boolean} */
export function isLlmAssistedConvertProgramClosed() {
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("Program closed") && text.includes("G8830");
}

/** @returns {boolean} */
export function isLlmAssistedConvertProgramActive() {
  if (isLlmAssistedConvertProgramClosed()) return false;
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("**Status:** **active**") && text.includes("G8800");
}

/** G8800 — program docs + strategic plan aligned. */
export function runLlmAssistedConvertProgramDocGate() {
  const programPath = programDocPath;
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  const capabilityPath = join(scriptRoot, "docs/CAPABILITY-MATRIX.md");
  if (!existsSync(programPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-llm-assisted-convert-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const capability = existsSync(capabilityPath) ? readFileSync(capabilityPath, "utf8") : "";
  const closed = isLlmAssistedConvertProgramClosed();
  const active = isLlmAssistedConvertProgramActive();
  const statusOk =
    (closed && program.includes("Program closed") && program.includes("G8830")) ||
    (active && program.includes("**Status:** **active**"));
  const strategicGateOk = closed
    ? strategic.includes("G8830") && strategic.includes("D6302")
    : strategic.includes("G8800") && strategic.includes("D6302");
  const ok =
    statusOk &&
    program.includes("Phase 42") &&
    program.includes("G8800") &&
    program.includes("G8830") &&
    program.includes("D6302") &&
    program.includes("verify-gated") &&
    program.includes("Models propose") &&
    strategicGateOk &&
    strategic.includes("LLM-ASSISTED-CONVERT-PROGRAM.md") &&
    roadmap.includes("Phase 42") &&
    (roadmap.includes("G8800") || roadmap.includes("G8830")) &&
    design.includes("D6302") &&
    capability.includes("Phase 42");
  return { ok, programEntryOk: ok, closed, active };
}

export async function runLlmAssistedConvertProgramEntryGate(_opts = {}) {
  const program = runLlmAssistedConvertProgramDocGate();
  return {
    kind: LLM_ASSISTED_CONVERT_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: LLM_ASSISTED_CONVERT_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION,
    ok: program.ok === true,
    program,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmAssistedConvertProgramEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("llm-assisted-convert-program-entry");
  const t0 = progress.start("LLM-assisted convert program entry (G8800)");
  const gate = await runLlmAssistedConvertProgramEntryGate(opts);
  progress.end("LLM-assisted convert program entry (G8800)", gate.ok === true, t0);
  return {
    kind: LLM_ASSISTED_CONVERT_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: LLM_ASSISTED_CONVERT_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmAssistedConvertProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-llm-assisted-convert-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
