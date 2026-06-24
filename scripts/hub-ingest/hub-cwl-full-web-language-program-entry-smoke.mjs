#!/usr/bin/env node
/** CWL full web language program entry smoke (G7500). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlCustomerPilotDocGate } from "./hub-cwl-customer-pilot-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_FULL_WEB_LANGUAGE_PROGRAM_ENTRY_SMOKE_KIND =
  "chrysalis.cwl-full-web-language-program-entry-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlFullWebLanguageProgramDocGate() {
  const programPath = join(scriptRoot, "docs/CWL-FULL-WEB-LANGUAGE-PROGRAM.md");
  const translatorPath = join(scriptRoot, "docs/CWL-UNIVERSAL-TRANSLATOR-PARITY.md");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  const charterPath = join(
    scriptRoot,
    "fixtures/hub-full-web-language-slice/chrysalis.full-language-charter.v1.json",
  );
  if (!existsSync(programPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-full-web-language-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const translator = existsSync(translatorPath) ? readFileSync(translatorPath, "utf8") : "";
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const ok =
    program.includes("**Status:** **active**") &&
    program.includes("Phase 25a") &&
    program.includes("Phase 25d") &&
    program.includes("G7500") &&
    program.includes("G7590") &&
    program.includes("D6264") &&
    program.toLowerCase().includes("fully complete web language") &&
    translator.includes("D6265") &&
    translator.toLowerCase().includes("translator parity") &&
    strategic.includes("Phase 25") &&
    strategic.includes("G7590") &&
    strategic.includes("D6264") &&
    roadmap.includes("Phase 25") &&
    roadmap.includes("G7500") &&
    design.includes("D6264") &&
    existsSync(charterPath);
  return { ok, programEntryOk: ok };
}

export async function runCwlFullWebLanguageProgramEntryGate(_opts = {}) {
  const program = runCwlFullWebLanguageProgramDocGate();
  const pilotClosed = runCwlCustomerPilotDocGate();
  const ok = program.ok === true && pilotClosed.ok === true;
  return {
    kind: CWL_FULL_WEB_LANGUAGE_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    program,
    pilotClosed,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlFullWebLanguageProgramEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-full-web-language-program-entry");
  const t0 = progress.start("CWL full web language program entry (G7500)");
  const gate = await runCwlFullWebLanguageProgramEntryGate(opts);
  progress.end("CWL full web language program entry (G7500)", gate.ok === true, t0);
  return { kind: CWL_FULL_WEB_LANGUAGE_PROGRAM_ENTRY_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlFullWebLanguageProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-full-web-language-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
