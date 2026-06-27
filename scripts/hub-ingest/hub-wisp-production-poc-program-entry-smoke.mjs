#!/usr/bin/env node
/** WISP production POC program entry smoke (G7800). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispFullSiteDocGate } from "./hub-wisp-full-site-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PRODUCTION_POC_PROGRAM_ENTRY_SMOKE_KIND = "chrysalis.wisp.production-poc-program-entry-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionPocProgramDocGate() {
  const programPath = join(scriptRoot, "docs/WISP-PRODUCTION-POC-PROGRAM.md");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  if (!existsSync(programPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-wisp-production-poc-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const active =
    program.includes("**Status:** **active**") &&
    program.includes("Phase 28a") &&
    program.includes("Phase 28d") &&
    program.includes("G7800") &&
    program.includes("G7890") &&
    program.includes("D6270") &&
    program.includes("G7790") &&
    strategic.includes("Phase 28") &&
    strategic.includes("G7890") &&
    strategic.includes("D6270") &&
    roadmap.includes("Phase 28") &&
    roadmap.includes("G7800") &&
    design.includes("D6270");
  const closed =
    program.includes("Program closed") &&
    program.includes("G7890") &&
    program.includes("D6270") &&
    program.includes("G7790") &&
    strategic.includes("G7890") &&
    roadmap.includes("G7890");
  const ok = active || closed;
  return { ok, programEntryOk: ok, mode: closed ? "closed" : "active" };
}

export async function runWispProductionPocProgramEntryGate(_opts = {}) {
  const program = runWispProductionPocProgramDocGate();
  const fullSiteClosed = runWispFullSiteDocGate();
  const ok = program.ok === true && fullSiteClosed.ok === true;
  return {
    kind: WISP_PRODUCTION_POC_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    program,
    fullSiteClosed,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispProductionPocProgramEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-production-poc-program-entry");
  const t0 = progress.start("WISP production POC program entry (G7800)");
  const gate = await runWispProductionPocProgramEntryGate(opts);
  progress.end("WISP production POC program entry (G7800)", gate.ok === true, t0);
  return {
    kind: WISP_PRODUCTION_POC_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runWispProductionPocProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-poc-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
