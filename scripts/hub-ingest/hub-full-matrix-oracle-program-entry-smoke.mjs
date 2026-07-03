#!/usr/bin/env node
/** Full matrix oracle program entry smoke (G8700). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const FULL_MATRIX_ORACLE_PROGRAM_ENTRY_SMOKE_KIND =
  "chrysalis.full-matrix-oracle-program-entry-smoke";
export const FULL_MATRIX_ORACLE_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const programDocPath = join(scriptRoot, "docs/FULL-MATRIX-ORACLE-PROGRAM.md");

/** @returns {boolean} Phase 41 full matrix oracle program closed (G8790). */
export function isFullMatrixOracleProgramClosed() {
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("Program closed") && text.includes("G8790");
}

/** @returns {boolean} Phase 41 full matrix oracle program active (G8700). */
export function isFullMatrixOracleProgramActive() {
  if (isFullMatrixOracleProgramClosed()) return false;
  if (!existsSync(programDocPath)) return false;
  const text = readFileSync(programDocPath, "utf8");
  return text.includes("**Status:** **active**") && text.includes("G8700");
}

/** G8700 — program docs + charter aligned (active or closed). */
export function runFullMatrixOracleProgramDocGate() {
  const programPath = programDocPath;
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  const charterPath = join(
    scriptRoot,
    "fixtures/hub-full-matrix-oracle/chrysalis.matrix-oracle-composer.v1.json",
  );
  if (!existsSync(programPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-full-matrix-oracle-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const closed = isFullMatrixOracleProgramClosed();
  const active = isFullMatrixOracleProgramActive();
  const statusOk =
    (closed && program.includes("Program closed") && program.includes("G8790")) ||
    (active && program.includes("**Status:** **active**"));
  const strategicOk = closed
    ? strategic.includes("G8790") &&
      strategic.includes("hub:full-matrix-oracle-close-smoke") &&
      strategic.includes("D6301") &&
      strategic.includes("PAUSED-AND-MAINTENANCE.md")
    : strategic.includes("Phase 41") &&
      strategic.includes("G8700") &&
      strategic.includes("D6300");
  const ok =
    statusOk &&
    program.includes("Phase 41") &&
    program.includes("G8700") &&
    program.includes("G8790") &&
    program.includes("D6300") &&
    program.includes("72 pairs") &&
    program.includes("oracle product") &&
    strategicOk &&
    roadmap.includes("Phase 41") &&
    roadmap.includes("G8700") &&
    design.includes("D6300") &&
    existsSync(charterPath);
  return { ok, programEntryOk: ok, closed, active };
}

export async function runFullMatrixOracleProgramEntryGate(_opts = {}) {
  const program = runFullMatrixOracleProgramDocGate();
  return {
    kind: FULL_MATRIX_ORACLE_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: FULL_MATRIX_ORACLE_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION,
    ok: program.ok === true,
    program,
    generatedAt: new Date().toISOString(),
  };
}

export async function runFullMatrixOracleProgramEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("full-matrix-oracle-program-entry");
  const t0 = progress.start("Full matrix oracle program entry (G8700)");
  const gate = await runFullMatrixOracleProgramEntryGate(opts);
  progress.end("Full matrix oracle program entry (G8700)", gate.ok === true, t0);
  return {
    kind: FULL_MATRIX_ORACLE_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: FULL_MATRIX_ORACLE_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runFullMatrixOracleProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-full-matrix-oracle-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
