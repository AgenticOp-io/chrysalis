#!/usr/bin/env node
/** CWL customer pilot program entry smoke (G7400). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlUniversalLanguageDocGate } from "./hub-cwl-universal-language-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_CUSTOMER_PILOT_PROGRAM_ENTRY_SMOKE_KIND =
  "chrysalis.cwl-customer-pilot-program-entry-smoke";
export const CWL_CUSTOMER_PILOT_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G7400 — Customer pilot program entry doc gate. */
export function runCwlCustomerPilotProgramDocGate() {
  const programPath = join(scriptRoot, "docs/CWL-CUSTOMER-PILOT-PROGRAM.md");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  const charterPath = join(scriptRoot, "fixtures/hub-pilot-customer-slice/chrysalis.pilot-charter.v1.json");
  if (!existsSync(programPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-pilot-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const ok =
    program.includes("**Status:** **active**") &&
    program.includes("Phase 24a") &&
    program.includes("Phase 24d") &&
    program.includes("G7400") &&
    program.includes("G7401") &&
    program.includes("G7490") &&
    program.includes("D6262") &&
    program.includes("customer pilot at scale") &&
    strategic.includes("Phase 24") &&
    strategic.includes("G7490") &&
    strategic.includes("D6262") &&
    roadmap.includes("Phase 24") &&
    roadmap.includes("G7400") &&
    design.includes("D6262") &&
    existsSync(charterPath);
  return { ok, programEntryOk: ok };
}

/** G7400 — Customer pilot program entry composite. */
export async function runCwlCustomerPilotProgramEntryGate(_opts = {}) {
  const program = runCwlCustomerPilotProgramDocGate();
  const universalClosed = runCwlUniversalLanguageDocGate();
  const ok = program.ok === true && universalClosed.ok === true;
  return {
    kind: CWL_CUSTOMER_PILOT_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: CWL_CUSTOMER_PILOT_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION,
    ok,
    program,
    universalClosed,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlCustomerPilotProgramEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-customer-pilot-program-entry");
  const t0 = progress.start("CWL customer pilot program entry (G7400)");
  const gate = await runCwlCustomerPilotProgramEntryGate(opts);
  progress.end("CWL customer pilot program entry (G7400)", gate.ok === true, t0);
  return {
    kind: CWL_CUSTOMER_PILOT_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: CWL_CUSTOMER_PILOT_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlCustomerPilotProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-customer-pilot-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
