#!/usr/bin/env node
/** Full language completion charter smoke (G7501). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFullLanguageCharter } from "./hub-cwl-full-language-charter.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_FULL_LANGUAGE_CHARTER_SMOKE_KIND = "chrysalis.cwl.full-language-charter-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlFullLanguageCharterDocGate() {
  const programPath = join(scriptRoot, "docs/CWL-FULL-WEB-LANGUAGE-PROGRAM.md");
  const translatorPath = join(scriptRoot, "docs/CWL-UNIVERSAL-TRANSLATOR-PARITY.md");
  const taxonomyPath = join(scriptRoot, "docs/CWL-SURFACE-TAXONOMY.md");
  if (!existsSync(programPath) || !existsSync(translatorPath) || !existsSync(taxonomyPath)) {
    return { ok: false, skip: "missing-charter-docs" };
  }
  const program = readFileSync(programPath, "utf8");
  const translator = readFileSync(translatorPath, "utf8");
  const taxonomy = readFileSync(taxonomyPath, "utf8");
  const ok =
    program.includes("G7501") &&
    translator.includes("G7503") &&
    taxonomy.includes("G7590") &&
    taxonomy.includes("Fully complete");
  return { ok, docOk: ok };
}

export function runCwlFullLanguageCharterGate(_opts = {}) {
  const doc = runCwlFullLanguageCharterDocGate();
  const loaded = loadFullLanguageCharter();
  if (!loaded.ok) {
    return { ok: false, doc, charter: loaded, generatedAt: new Date().toISOString() };
  }
  const charter = loaded.charter;
  let modulesOk = true;
  for (const rel of charter.cwlAuthoredModules ?? []) {
    if (!existsSync(join(scriptRoot, rel, "routes.cwl"))) modulesOk = false;
  }
  const charterOk =
    modulesOk &&
    Array.isArray(charter.translatorOracleOrigins) &&
    charter.translatorOracleOrigins.length >= 3 &&
    (charter.minCwlNativeRatio ?? 1) >= 1;
  const ok = doc.ok === true && charterOk;
  return {
    kind: CWL_FULL_LANGUAGE_CHARTER_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    charter: { ok: true, charterId: charter.charterId, moduleCount: charter.cwlAuthoredModules?.length ?? 0 },
    modulesOk,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlFullLanguageCharterSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-full-language-charter");
  const t0 = progress.start("CWL full language charter (G7501)");
  const gate = runCwlFullLanguageCharterGate(opts);
  progress.end("CWL full language charter (G7501)", gate.ok === true, t0);
  return { kind: CWL_FULL_LANGUAGE_CHARTER_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlFullLanguageCharterSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-full-language-charter-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
