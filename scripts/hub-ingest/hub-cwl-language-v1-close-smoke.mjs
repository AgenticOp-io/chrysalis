#!/usr/bin/env node
/** CWL language v1 program close smoke (G6750) — honest language v1 complete. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runIrHelperLiftingB6StrlenInlineGate,
  runIrHelperLiftingB7EmptyInlineGate,
  runIrHelperLiftingB8IssetInlineGate,
} from "./hub-cwl-fullstack-gates.mjs";
import { runCwlSurfaceTaxonomyDocGate } from "./hub-cwl-surface-taxonomy-smoke.mjs";
import { runCwlLanguageMaintenanceGate } from "./hub-cwl-language-maintenance-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_LANGUAGE_V1_CLOSE_SMOKE_KIND = "chrysalis.cwl-language-v1-close-smoke";
export const CWL_LANGUAGE_V1_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6751 — program doc records language v1 close. */
export function runCwlLanguageV1CloseDocGate() {
  const path = join(scriptRoot, "docs/CWL-LANGUAGE-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-cwl-language-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Language v1 closed") &&
    text.includes("G6750") &&
    text.includes("CWL UI") &&
    text.includes("Explicit holes") &&
    text.includes("G6740");
  return { ok, languageV1CloseDocOk: ok };
}

/** G6752 — RFC index covers accepted v1 RFCs. */
export function runCwlLanguageV1RfcIndexGate() {
  const path = join(scriptRoot, "docs/CWL-RFC.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-cwl-rfc-index" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("0013") &&
    text.includes("0014") &&
    text.includes("0015") &&
    text.includes("0016") &&
    text.includes("accepted");
  return { ok, rfcIndexOk: ok };
}

/** G6753 — surface taxonomy records v1 close + UI hole honesty. */
export function runCwlLanguageV1TaxonomyGate() {
  const path = join(scriptRoot, "docs/CWL-SURFACE-TAXONOMY.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-cwl-surface-taxonomy" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Language v1 closed") &&
    text.includes("G6750") &&
    text.includes("Hole") &&
    text.includes("RFC-0012");
  return { ok, taxonomyOk: ok };
}

/** G6750 — CWL language v1 program close composite. */
export async function runCwlLanguageV1CloseGate(_opts = {}) {
  const doc = runCwlLanguageV1CloseDocGate();
  const rfcIndex = runCwlLanguageV1RfcIndexGate();
  const taxonomy = runCwlLanguageV1TaxonomyGate();
  const surfaceTaxonomy = runCwlSurfaceTaxonomyDocGate();
  const b6 = runIrHelperLiftingB6StrlenInlineGate();
  const b7 = runIrHelperLiftingB7EmptyInlineGate();
  const b8 = runIrHelperLiftingB8IssetInlineGate();
  const maintenance = await runCwlLanguageMaintenanceGate(_opts);
  const ok =
    doc.ok === true &&
    rfcIndex.ok === true &&
    taxonomy.ok === true &&
    surfaceTaxonomy.ok === true &&
    b6.ok === true &&
    b7.ok === true &&
    b8.ok === true &&
    maintenance.ok === true;
  return {
    kind: CWL_LANGUAGE_V1_CLOSE_SMOKE_KIND,
    schemaVersion: CWL_LANGUAGE_V1_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    rfcIndex,
    taxonomy,
    surfaceTaxonomy,
    b6,
    b7,
    b8,
    maintenance,
    generatedAt: new Date().toISOString(),
  };
}

/** @param {Record<string, unknown>} [opts] */
export async function runCwlLanguageV1CloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-language-v1-close");
  const t0 = progress.start("CWL language v1 close");
  const gate = await runCwlLanguageV1CloseGate(opts);
  progress.end("CWL language v1 close", gate.ok === true, t0);
  return {
    kind: CWL_LANGUAGE_V1_CLOSE_SMOKE_KIND,
    schemaVersion: CWL_LANGUAGE_V1_CLOSE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlLanguageV1CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-language-v1-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
