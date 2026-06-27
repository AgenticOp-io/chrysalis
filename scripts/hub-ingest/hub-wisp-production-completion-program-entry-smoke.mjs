#!/usr/bin/env node
/** WISP production completion program entry smoke (G7900). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispProductionPocProgramDocGate } from "./hub-wisp-production-poc-program-entry-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PRODUCTION_COMPLETION_PROGRAM_ENTRY_SMOKE_KIND =
  "chrysalis.wisp.production-completion-program-entry-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionCompletionProgramDocGate() {
  const programPath = join(scriptRoot, "docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  if (!existsSync(programPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-wisp-production-completion-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const active =
    program.includes("**Status:** **active**") &&
    program.includes("Phase 29a") &&
    program.includes("Phase 29c") &&
    program.includes("G7900") &&
    program.includes("G7990") &&
    program.includes("D6272") &&
    program.includes("G7890") &&
    strategic.includes("Phase 29") &&
    strategic.includes("G7990") &&
    strategic.includes("D6272") &&
    roadmap.includes("Phase 29") &&
    roadmap.includes("G7900") &&
    design.includes("D6272");
  const closed =
    program.includes("Program closed") &&
    program.includes("G7990") &&
    program.includes("D6272") &&
    program.includes("G7890") &&
    strategic.includes("G7990") &&
    roadmap.includes("G7990");
  const ok = active || closed;
  return { ok, programEntryOk: ok, mode: closed ? "closed" : "active" };
}

export async function runWispProductionCompletionProgramEntryGate(_opts = {}) {
  const program = runWispProductionCompletionProgramDocGate();
  const pocClosed = runWispProductionPocProgramDocGate();
  const ok = program.ok === true && pocClosed.ok === true;
  return {
    kind: WISP_PRODUCTION_COMPLETION_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    program,
    pocClosed,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispProductionCompletionProgramEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-production-completion-program-entry");
  const t0 = progress.start("WISP production completion program entry (G7900)");
  const gate = await runWispProductionCompletionProgramEntryGate(opts);
  progress.end("WISP production completion program entry (G7900)", gate.ok === true, t0);
  return {
    kind: WISP_PRODUCTION_COMPLETION_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runWispProductionCompletionProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-completion-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
