#!/usr/bin/env node
/** Phase 44 program entry (G9000). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const PHASE44_PROGRAM_ENTRY_KIND = "chrysalis.phase44-program-entry-smoke";
export const PHASE44_PROGRAM_ENTRY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const programDocPath = join(scriptRoot, "docs/PHASE-44-PROGRAM.md");
const charterPath = join(
  scriptRoot,
  "fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json",
);

export function isPhase44ProgramClosed() {
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("Program closed") && text.includes("G9140");
}

export function isPhase44ProgramActive() {
  if (isPhase44ProgramClosed()) return false;
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("**Status:** **active**") && text.includes("G9000");
}

export function runPhase44ProgramDocGate() {
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  const capabilityPath = join(scriptRoot, "docs/CAPABILITY-MATRIX.md");
  if (!existsSync(programDocPath) || !existsSync(strategicPath) || !existsSync(charterPath)) {
    return { ok: false, skip: "missing-phase44-program-or-charter" };
  }
  const program = readFileSync(programDocPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const capability = existsSync(capabilityPath) ? readFileSync(capabilityPath, "utf8") : "";
  const charter = readFileSync(charterPath, "utf8");
  const closed = isPhase44ProgramClosed();
  const active = isPhase44ProgramActive();
  const statusOk =
    (closed && program.includes("Program closed") && program.includes("G9140")) ||
    (active && program.includes("**Status:** **active**"));
  const strategicGateOk = closed
    ? strategic.includes("G9140") && strategic.includes("D6310")
    : strategic.includes("G9000") && strategic.includes("D6310");
  const capabilityPhase44Ok =
    capability.includes("Phase 44") ||
    capability.includes("| 44 |") ||
    capability.includes("G9140");
  const ok =
    statusOk &&
    program.includes("Phase 44") &&
    program.includes("G9000") &&
    program.includes("G9140") &&
    program.includes("D6310") &&
    program.includes("601-pair") &&
    program.includes("Horizon C") &&
    strategicGateOk &&
    strategic.includes("PHASE-44-PROGRAM.md") &&
    roadmap.includes("Phase 44") &&
    design.includes("D6310") &&
    capabilityPhase44Ok &&
    charter.includes("extended-matrix-oracle-charter") &&
    charter.includes("wave1") &&
    charter.includes("wave2") &&
    charter.includes("wave3");
  return { ok, active, closed };
}

export async function runPhase44ProgramEntrySmoke() {
  const progress = createSmokeProgress("phase44-program-entry");
  const t0 = progress.start("Phase 44 program entry (G9000)");
  const gate = runPhase44ProgramDocGate();
  progress.end("Phase 44 program entry (G9000)", gate.ok === true, t0);
  return {
    kind: PHASE44_PROGRAM_ENTRY_KIND,
    schemaVersion: PHASE44_PROGRAM_ENTRY_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runPhase44ProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase44-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
