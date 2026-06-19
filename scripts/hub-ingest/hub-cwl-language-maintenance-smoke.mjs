#!/usr/bin/env node
/** CWL language maintenance smoke (G6731) — default build queue for language depth. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runIrHelperLiftingB7EmptyInlineGate,
  runIrHelperLiftingB8IssetInlineGate,
} from "./hub-cwl-fullstack-gates.mjs";
import { runCwlSurfaceTaxonomyDocGate } from "./hub-cwl-surface-taxonomy-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_LANGUAGE_MAINTENANCE_SMOKE_KIND = "chrysalis.cwl-language-maintenance-smoke";
export const CWL_LANGUAGE_MAINTENANCE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6732 — paused doc indexes CWL language maintenance gate. */
export function runCwlLanguageMaintenanceDocGate() {
  const path = join(scriptRoot, "docs/PAUSED-AND-MAINTENANCE.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-paused-and-maintenance-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6731") &&
    text.includes("hub:cwl-language-maintenance-smoke") &&
    text.includes("CWL language maintenance") &&
    text.includes("G6750") &&
    text.includes("isset");
  return { ok, languageMaintenanceDocOk: ok };
}

/** G6731 — CWL language maintenance composite. */
export async function runCwlLanguageMaintenanceGate(_opts = {}) {
  const doc = runCwlLanguageMaintenanceDocGate();
  const taxonomy = runCwlSurfaceTaxonomyDocGate();
  const b7 = runIrHelperLiftingB7EmptyInlineGate();
  const b8 = runIrHelperLiftingB8IssetInlineGate();
  const ok = doc.ok === true && taxonomy.ok === true && b7.ok === true && b8.ok === true;
  return {
    kind: CWL_LANGUAGE_MAINTENANCE_SMOKE_KIND,
    schemaVersion: CWL_LANGUAGE_MAINTENANCE_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    taxonomy,
    b7,
    b8,
    generatedAt: new Date().toISOString(),
  };
}

/** @param {Record<string, unknown>} [opts] */
export async function runCwlLanguageMaintenanceSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-language-maintenance");
  const t0 = progress.start("CWL language maintenance");
  const gate = await runCwlLanguageMaintenanceGate(opts);
  progress.end("CWL language maintenance", gate.ok === true, t0);
  return {
    kind: CWL_LANGUAGE_MAINTENANCE_SMOKE_KIND,
    schemaVersion: CWL_LANGUAGE_MAINTENANCE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlLanguageMaintenanceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-language-maintenance-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
