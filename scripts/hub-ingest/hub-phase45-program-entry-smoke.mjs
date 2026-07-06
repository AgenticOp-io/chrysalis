#!/usr/bin/env node
/** Phase 45 program entry (G9150). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const PHASE45_PROGRAM_ENTRY_KIND = "chrysalis.phase45-program-entry-smoke";
export const PHASE45_PROGRAM_ENTRY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const programDocPath = join(scriptRoot, "docs/PHASE-45-PROGRAM.md");
const charterPath = join(
  scriptRoot,
  "fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json",
);

export function isPhase45ProgramClosed() {
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("Program closed") && text.includes("G9190");
}

export function isPhase45ProgramActive() {
  if (isPhase45ProgramClosed()) return false;
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("**Status:** **active**") && text.includes("G9150");
}

export function runPhase45ProgramDocGate() {
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  const wispPath = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(programDocPath) || !existsSync(strategicPath) || !existsSync(charterPath)) {
    return { ok: false, skip: "missing-phase45-program-or-charter" };
  }
  const program = readFileSync(programDocPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const wisp = existsSync(wispPath) ? readFileSync(wispPath, "utf8") : "";
  const charter = readFileSync(charterPath, "utf8");
  const closed = isPhase45ProgramClosed();
  const active = isPhase45ProgramActive();
  const statusOk =
    (closed && program.includes("Program closed") && program.includes("G9190")) ||
    (active && program.includes("**Status:** **active**"));
  const strategicGateOk = active
    ? strategic.includes("G9150") &&
      strategic.includes("PHASE-45-PROGRAM.md") &&
      strategic.includes("D6336") &&
      strategic.includes("G9170")
    : strategic.includes("G9190") && strategic.includes("D6336");
  const wispShowcaseOk =
    !active ||
    (wisp.includes("default CI showcase") &&
      wisp.includes("D6336") &&
      !wisp.includes("Build:** **decoupled**"));
  const ok =
    statusOk &&
    program.includes("Phase 45") &&
    program.includes("G9150") &&
    program.includes("G9190") &&
    program.includes("D6336") &&
    program.includes("G9160") &&
    program.includes("G9165") &&
    program.includes("G9166") &&
    program.includes("G9170") &&
    program.includes("G9180") &&
    program.includes("432/601") &&
    program.includes("CWL is authoritative") &&
    strategicGateOk &&
    strategic.includes("PHASE-45-PROGRAM.md") &&
    roadmap.includes("Phase 45") &&
    design.includes("D6336") &&
    wispShowcaseOk &&
    charter.includes("extended-matrix-oracle-charter") &&
    charter.includes("wave4");
  return { ok, active, closed };
}

export async function runPhase45ProgramEntrySmoke() {
  const progress = createSmokeProgress("phase45-program-entry");
  const t0 = progress.start("Phase 45 program entry (G9150)");
  const gate = runPhase45ProgramDocGate();
  progress.end("Phase 45 program entry (G9150)", gate.ok === true, t0);
  return {
    kind: PHASE45_PROGRAM_ENTRY_KIND,
    schemaVersion: PHASE45_PROGRAM_ENTRY_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runPhase45ProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase45-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
