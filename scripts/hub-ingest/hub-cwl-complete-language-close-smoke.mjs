#!/usr/bin/env node
/** CWL complete language program close (G7150) — Phases 15–18 composite. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPhase15CloseGate } from "./hub-cwl-phase15-close-smoke.mjs";
import { runCwlDataCompleteGate } from "./hub-cwl-data-complete-smoke.mjs";
import { runCwlEffectsExecutableGate } from "./hub-cwl-effects-executable-smoke.mjs";
import { runCwlCutoverGate } from "./hub-cwl-cutover-smoke.mjs";
import { runCwlLanguageMaintenanceGate } from "./hub-cwl-language-maintenance-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_COMPLETE_LANGUAGE_CLOSE_SMOKE_KIND = "chrysalis.cwl.complete-language-close-smoke";
export const CWL_COMPLETE_LANGUAGE_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G7151 — program doc marks phases 15–18 closed. */
export function runCwlCompleteLanguageDocGate() {
  const path = join(scriptRoot, "docs/CWL-LANGUAGE-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G7150") &&
    text.includes("G7110") &&
    text.includes("G7120") &&
    text.includes("G7130") &&
    text.includes("G7140");
  return { ok, programDocOk: ok };
}

/** G7150 — complete language program close. */
export async function runCwlCompleteLanguageCloseGate(opts = {}) {
  const doc = runCwlCompleteLanguageDocGate();
  const phase15 = await runCwlPhase15CloseGate(opts);
  const phase16 = await runCwlDataCompleteGate(opts);
  const phase17 = await runCwlEffectsExecutableGate(opts);
  const phase18 = await runCwlCutoverGate({ ...opts, runPipeline: false });
  const maintenance = opts.skipMaintenance
    ? { ok: true, skip: "maintenance-skipped" }
    : await runCwlLanguageMaintenanceGate(opts);
  const ok =
    doc.ok === true &&
    phase15.ok === true &&
    phase16.ok === true &&
    phase17.ok === true &&
    phase18.ok === true &&
    maintenance.ok === true;
  return {
    kind: CWL_COMPLETE_LANGUAGE_CLOSE_SMOKE_KIND,
    schemaVersion: CWL_COMPLETE_LANGUAGE_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    phase15,
    phase16,
    phase17,
    phase18,
    maintenance,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlCompleteLanguageCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-complete-language-close");
  const t0 = progress.start("CWL complete language close (G7150)");
  const gate = await runCwlCompleteLanguageCloseGate(opts);
  progress.end("CWL complete language close (G7150)", gate.ok === true, t0);
  return {
    kind: CWL_COMPLETE_LANGUAGE_CLOSE_SMOKE_KIND,
    schemaVersion: CWL_COMPLETE_LANGUAGE_CLOSE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlCompleteLanguageCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-complete-language-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
