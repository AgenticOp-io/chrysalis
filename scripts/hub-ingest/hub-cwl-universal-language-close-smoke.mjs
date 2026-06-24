#!/usr/bin/env node
/** CWL universal web language program close (G7390) — Phases 19–23 composite. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPhase19CloseGate } from "./hub-cwl-phase19-close-smoke.mjs";
import { runCwlPhase20CloseGate } from "./hub-cwl-phase20-close-smoke.mjs";
import { runCwlPhase21CloseGate } from "./hub-cwl-phase21-close-smoke.mjs";
import { runCwlPhase22CloseGate } from "./hub-cwl-phase22-close-smoke.mjs";
import { runCwlPhase23CloseGate } from "./hub-cwl-phase23-close-smoke.mjs";
import { runCwlCompleteLanguageCloseGate } from "./hub-cwl-complete-language-close-smoke.mjs";
import { runIrHelperProgramCloseGate } from "./hub-ir-helper-program-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_UNIVERSAL_LANGUAGE_CLOSE_SMOKE_KIND = "chrysalis.cwl.universal-language-close-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlUniversalLanguageDocGate() {
  const path = join(scriptRoot, "docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Program closed") &&
    text.includes("G7390") &&
    text.includes("G7310") &&
    text.includes("G7320") &&
    text.includes("G7330") &&
    text.includes("G7340") &&
    text.includes("G7350");
  return { ok, programDocOk: ok };
}

export async function runCwlUniversalLanguageCloseGate(opts = {}) {
  const doc = runCwlUniversalLanguageDocGate();
  const phase19 = await runCwlPhase19CloseGate(opts);
  const phase20 = await runCwlPhase20CloseGate(opts);
  const phase21 = await runCwlPhase21CloseGate(opts);
  const phase22 = await runCwlPhase22CloseGate(opts);
  const phase23 = await runCwlPhase23CloseGate(opts);
  const g7150 = await runCwlCompleteLanguageCloseGate({ ...opts, skipMaintenance: true });
  const g7200 = await runIrHelperProgramCloseGate(opts);
  const irHelperOk = g7200.ok === true;
  const ok =
    doc.ok === true &&
    phase19.ok === true &&
    phase20.ok === true &&
    phase21.ok === true &&
    phase22.ok === true &&
    phase23.ok === true &&
    g7150.ok === true &&
    irHelperOk;
  return {
    kind: CWL_UNIVERSAL_LANGUAGE_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    phase19,
    phase20,
    phase21,
    phase22,
    phase23,
    g7150,
    irHelperOk,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlUniversalLanguageCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-universal-language-close");
  const t0 = progress.start("CWL universal language close (G7390)");
  const gate = await runCwlUniversalLanguageCloseGate(opts);
  progress.end("CWL universal language close (G7390)", gate.ok === true, t0);
  return {
    kind: CWL_UNIVERSAL_LANGUAGE_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlUniversalLanguageCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-universal-language-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
