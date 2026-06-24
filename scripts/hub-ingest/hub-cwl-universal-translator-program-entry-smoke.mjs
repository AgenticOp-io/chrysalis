#!/usr/bin/env node
/** Universal translator program entry smoke (G7600). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlFullWebLanguageDocGate } from "./hub-cwl-full-web-language-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_UNIVERSAL_TRANSLATOR_PROGRAM_ENTRY_SMOKE_KIND =
  "chrysalis.cwl-universal-translator-program-entry-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlUniversalTranslatorProgramDocGate() {
  const programPath = join(scriptRoot, "docs/CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md");
  const parityPath = join(scriptRoot, "docs/CWL-UNIVERSAL-TRANSLATOR-PARITY.md");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  const charterPath = join(
    scriptRoot,
    "fixtures/hub-universal-translator-slice/chrysalis.translator-composer.v1.json",
  );
  if (!existsSync(programPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-universal-translator-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const parity = existsSync(parityPath) ? readFileSync(parityPath, "utf8") : "";
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const ok =
    program.includes("**Status:** **active**") &&
    program.includes("Phase 26a") &&
    program.includes("Phase 26d") &&
    program.includes("G7600") &&
    program.includes("G7690") &&
    program.includes("D6267") &&
    program.toLowerCase().includes("n×n through cwl") &&
    parity.includes("D6265") &&
    strategic.includes("Phase 26") &&
    strategic.includes("G7690") &&
    strategic.includes("D6267") &&
    roadmap.includes("Phase 26") &&
    roadmap.includes("G7600") &&
    design.includes("D6267") &&
    existsSync(charterPath);
  return { ok, programEntryOk: ok };
}

export async function runCwlUniversalTranslatorProgramEntryGate(_opts = {}) {
  const program = runCwlUniversalTranslatorProgramDocGate();
  const fullLanguageClosed = runCwlFullWebLanguageDocGate();
  const ok = program.ok === true && fullLanguageClosed.ok === true;
  return {
    kind: CWL_UNIVERSAL_TRANSLATOR_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    program,
    fullLanguageClosed,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlUniversalTranslatorProgramEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-universal-translator-program-entry");
  const t0 = progress.start("CWL universal translator program entry (G7600)");
  const gate = await runCwlUniversalTranslatorProgramEntryGate(opts);
  progress.end("CWL universal translator program entry (G7600)", gate.ok === true, t0);
  return {
    kind: CWL_UNIVERSAL_TRANSLATOR_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runCwlUniversalTranslatorProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-universal-translator-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
