#!/usr/bin/env node
/** Phase 15 program entry smoke (G7101) — RFC-0017 + complete-language doc alignment. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlSurfaceTaxonomyDocGate } from "./hub-cwl-surface-taxonomy-smoke.mjs";
import { runCwlUiV0RfcDocGate } from "./hub-cwl-ui-v0-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE15_ENTRY_SMOKE_KIND = "chrysalis.cwl.phase15-entry-smoke";
export const CWL_PHASE15_ENTRY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G7101 — Phase 15 entry doc gate. */
export function runCwlPhase15EntryDocGate() {
  const programPath = join(scriptRoot, "docs/CWL-LANGUAGE-PROGRAM.md");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  if (!existsSync(programPath) || !existsSync(strategicPath)) {
    return { ok: false, skip: "missing-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const ok =
    program.includes("Complete language program") &&
    program.includes("Phase 15") &&
    program.includes("G7110") &&
    strategic.includes("Phase 15 — CWL UI v0") &&
    strategic.includes("D6206") &&
    design.includes("D6206");
  return { ok, programEntryOk: ok };
}

/** G7101 — Phase 15 program entry composite. */
export async function runCwlPhase15EntryGate(_opts = {}) {
  const program = runCwlPhase15EntryDocGate();
  const rfc = runCwlUiV0RfcDocGate();
  const taxonomy = runCwlSurfaceTaxonomyDocGate();
  const ok = program.ok === true && rfc.ok === true && taxonomy.ok === true;
  return {
    kind: CWL_PHASE15_ENTRY_SMOKE_KIND,
    schemaVersion: CWL_PHASE15_ENTRY_SMOKE_SCHEMA_VERSION,
    ok,
    program,
    rfc,
    taxonomy,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlPhase15EntrySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase15-entry");
  const t0 = progress.start("CWL Phase 15 entry (G7101)");
  const gate = await runCwlPhase15EntryGate(opts);
  progress.end("CWL Phase 15 entry (G7101)", gate.ok === true, t0);
  return {
    kind: CWL_PHASE15_ENTRY_SMOKE_KIND,
    schemaVersion: CWL_PHASE15_ENTRY_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlPhase15EntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase15-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
