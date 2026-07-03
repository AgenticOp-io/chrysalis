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

/** G8700 — program docs + charter aligned. */
export function runFullMatrixOracleProgramDocGate() {
  const programPath = join(scriptRoot, "docs/FULL-MATRIX-ORACLE-PROGRAM.md");
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
  const ok =
    program.includes("**Status:** **active**") &&
    program.includes("Phase 41") &&
    program.includes("G8700") &&
    program.includes("G8790") &&
    program.includes("D6300") &&
    program.includes("72 pairs") &&
    program.includes("oracle product") &&
    strategic.includes("Phase 41") &&
    strategic.includes("G8700") &&
    strategic.includes("D6300") &&
    roadmap.includes("Phase 41") &&
    roadmap.includes("G8700") &&
    design.includes("D6300") &&
    existsSync(charterPath);
  return { ok, programEntryOk: ok };
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
