#!/usr/bin/env node
/** Phase 46 program entry (G9250). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { isPhase45ProgramClosed } from "./hub-phase45-program-entry-smoke.mjs";

export const PHASE46_PROGRAM_ENTRY_KIND = "chrysalis.phase46-program-entry-smoke";
export const PHASE46_PROGRAM_ENTRY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const programDocPath = join(scriptRoot, "docs/PHASE-46-PROGRAM.md");
const runtimeDepthPath = join(scriptRoot, "docs/CWL-RUNTIME-DEPTH-PHASE-46.md");
const charterPath = join(
  scriptRoot,
  "fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json",
);

export function isPhase46ProgramClosed() {
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("Program closed") && text.includes("G9290");
}

export function isPhase46ProgramActive() {
  if (isPhase46ProgramClosed()) return false;
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("**Status:** **active**") && text.includes("G9250");
}

export function runPhase46ProgramDocGate() {
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  if (!existsSync(programDocPath) || !existsSync(strategicPath) || !existsSync(charterPath)) {
    return { ok: false, skip: "missing-phase46-program-or-charter" };
  }
  const program = readFileSync(programDocPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const runtimeDepth = existsSync(runtimeDepthPath) ? readFileSync(runtimeDepthPath, "utf8") : "";
  const charter = readFileSync(charterPath, "utf8");
  const closed = isPhase46ProgramClosed();
  const active = isPhase46ProgramActive();
  const phase45Closed = isPhase45ProgramClosed();
  const statusOk =
    (closed && program.includes("Program closed") && program.includes("G9290")) ||
    (active && program.includes("**Status:** **active**"));
  const strategicGateOk = closed
    ? strategic.includes("G9290") &&
      strategic.includes("hub:phase46-program-close-smoke") &&
      strategic.includes("D6343") &&
      strategic.includes("D6341")
    : active
      ? strategic.includes("G9250") &&
        strategic.includes("PHASE-46-PROGRAM.md") &&
        strategic.includes("D6341") &&
        strategic.includes("G9280")
      : strategic.includes("G9250") && strategic.includes("D6341");
  const ok =
    statusOk &&
    phase45Closed &&
    program.includes("Phase 46") &&
    program.includes("G9250") &&
    program.includes("G9290") &&
    program.includes("D6341") &&
    program.includes("G9275") &&
    program.includes("G9276") &&
    program.includes("G9285") &&
    program.includes("G9286") &&
    program.includes("G9210") &&
    program.includes("G9280") &&
    program.includes("180/601") &&
    program.includes("G9240") &&
    program.includes("46a") &&
    program.includes("46b") &&
    strategicGateOk &&
    strategic.includes("PHASE-46-PROGRAM.md") &&
    roadmap.includes("Phase 46") &&
    design.includes("D6341") &&
    runtimeDepth.includes("runtime-cwl-browser") &&
    runtimeDepth.includes("runtime-cwl-worker") &&
    charter.includes("wave6") &&
    charter.includes("wave7");
  return { ok, active, closed, phase45Closed };
}

export async function runPhase46ProgramEntrySmoke() {
  const progress = createSmokeProgress("phase46-program-entry");
  const t0 = progress.start("Phase 46 program entry (G9250)");
  const gate = runPhase46ProgramDocGate();
  progress.end("Phase 46 program entry (G9250)", gate.ok === true, t0);
  return {
    kind: PHASE46_PROGRAM_ENTRY_KIND,
    schemaVersion: PHASE46_PROGRAM_ENTRY_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runPhase46ProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase46-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
