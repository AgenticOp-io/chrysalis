#!/usr/bin/env node
/** WISP full-site program entry smoke (G7700). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlUniversalTranslatorDocGate } from "./hub-cwl-universal-translator-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_FULL_SITE_PROGRAM_ENTRY_SMOKE_KIND = "chrysalis.wisp-full-site-program-entry-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispFullSiteProgramDocGate() {
  const programPath = join(scriptRoot, "docs/WISP-FULL-SITE-CWL-PROGRAM.md");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const roadmapPath = join(scriptRoot, "ROADMAP.md");
  const designPath = join(scriptRoot, "DESIGN.md");
  const charterPath = join(
    scriptRoot,
    "fixtures/hub-wisp-full-site-slice/chrysalis.wisp-full-site.v1.json",
  );
  if (!existsSync(programPath) || !existsSync(strategicPath) || !existsSync(roadmapPath)) {
    return { ok: false, skip: "missing-wisp-full-site-program-or-strategic-doc" };
  }
  const program = readFileSync(programPath, "utf8");
  const strategic = readFileSync(strategicPath, "utf8");
  const roadmap = readFileSync(roadmapPath, "utf8");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";
  const ok =
    program.includes("**Status:** **active**") &&
    program.includes("Phase 27a") &&
    program.includes("Phase 27f") &&
    program.includes("G7700") &&
    program.includes("G7790") &&
    program.includes("D6268") &&
    program.includes("replace any website") &&
    strategic.includes("Phase 27") &&
    strategic.includes("G7790") &&
    strategic.includes("D6268") &&
    roadmap.includes("Phase 27") &&
    roadmap.includes("G7700") &&
    design.includes("D6268") &&
    existsSync(charterPath);
  return { ok, programEntryOk: ok };
}

export async function runWispFullSiteProgramEntryGate(_opts = {}) {
  const program = runWispFullSiteProgramDocGate();
  const translatorClosed = runCwlUniversalTranslatorDocGate();
  const ok = program.ok === true && translatorClosed.ok === true;
  return {
    kind: WISP_FULL_SITE_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    program,
    translatorClosed,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispFullSiteProgramEntrySmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-full-site-program-entry");
  const t0 = progress.start("WISP full-site program entry (G7700)");
  const gate = await runWispFullSiteProgramEntryGate(opts);
  progress.end("WISP full-site program entry (G7700)", gate.ok === true, t0);
  return {
    kind: WISP_FULL_SITE_PROGRAM_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runWispFullSiteProgramEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-full-site-program-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
