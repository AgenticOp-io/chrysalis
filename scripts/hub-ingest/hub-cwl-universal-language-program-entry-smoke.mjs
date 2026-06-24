#!/usr/bin/env node
/** CWL universal web language program entry smoke (G7300). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlSurfaceTaxonomyDocGate } from "./hub-cwl-surface-taxonomy-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_UNIVERSAL_LANGUAGE_PROGRAM_ENTRY_SMOKE_KIND =
  "chrysalis.cwl-universal-language-program-entry-smoke";
export const CWL_UNIVERSAL_LANGUAGE_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G7300 — Universal language program entry doc gate. */
export function runCwlUniversalLanguageProgramDocGate() {
  const programPath = join(scriptRoot, "docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  if (!existsSync(programPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-universal-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const ok =
    program.includes("**Status:** **active**") &&
    program.includes("Phase 19") &&
    program.includes("Phase 23") &&
    program.includes("G7300") &&
    program.includes("G7310") &&
    program.includes("G7390") &&
    program.includes("D6260") &&
    program.includes("CWL-UNIVERSAL-LANGUAGE-PROGRAM.md") &&
    strategic.includes("Phase 19 — CWL UI v1") &&
    strategic.includes("G7390") &&
    strategic.includes("D6260") &&
    roadmap.includes("Phase 19 — CWL UI v1") &&
    roadmap.includes("G7300") &&
    design.includes("D6260");
  return { ok, programEntryOk: ok };
}

/** G7300 — Universal language program entry composite. */
export async function runCwlUniversalLanguageProgramEntryGate(_opts = {}) {
  const program = runCwlUniversalLanguageProgramDocGate();
  const taxonomy = runCwlSurfaceTaxonomyDocGate();
  const ok = program.ok === true && taxonomy.ok === true;
  return {
    kind: CWL_UNIVERSAL_LANGUAGE_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: CWL_UNIVERSAL_LANGUAGE_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION,
    ok,
    program,
    taxonomy,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlUniversalLanguageProgramEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-universal-language-program-entry");
  const t0 = progress.start("CWL universal language program entry (G7300)");
  const gate = await runCwlUniversalLanguageProgramEntryGate(opts);
  progress.end("CWL universal language program entry (G7300)", gate.ok === true, t0);
  return {
    kind: CWL_UNIVERSAL_LANGUAGE_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: CWL_UNIVERSAL_LANGUAGE_PROGRAM_ENTRY_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlUniversalLanguageProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-universal-language-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
