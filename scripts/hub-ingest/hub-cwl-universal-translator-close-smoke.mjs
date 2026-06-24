#!/usr/bin/env node
/** Universal translator program close (G7690) — Phases 26a–26d + G7590 regression. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPhase26aCloseGate } from "./hub-cwl-phase26a-close-smoke.mjs";
import { runCwlPhase26bCloseGate } from "./hub-cwl-phase26b-close-smoke.mjs";
import { runCwlPhase26cCloseGate } from "./hub-cwl-phase26c-close-smoke.mjs";
import { runCwlPhase26dCloseGate } from "./hub-cwl-phase26d-close-smoke.mjs";
import { runCwlFullWebLanguageCloseGate } from "./hub-cwl-full-web-language-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_UNIVERSAL_TRANSLATOR_CLOSE_SMOKE_KIND = "chrysalis.cwl.universal-translator-close-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlUniversalTranslatorDocGate() {
  const path = join(scriptRoot, "docs/CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Program closed") &&
    text.includes("G7690") &&
    text.includes("G7601") &&
    text.includes("G7604") &&
    text.toLowerCase().includes("n×n through cwl");
  return { ok, programDocOk: ok };
}

export async function runCwlUniversalTranslatorCloseGate(opts = {}) {
  const doc = runCwlUniversalTranslatorDocGate();
  const phase26a = await runCwlPhase26aCloseGate(opts);
  const phase26b = await runCwlPhase26bCloseGate(opts);
  const phase26c = await runCwlPhase26cCloseGate(opts);
  const phase26d = await runCwlPhase26dCloseGate(opts);
  const skipGoldVerify =
    opts.skipGoldVerify === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD === "1";
  const g7590 = await runCwlFullWebLanguageCloseGate({ ...opts, skipGoldVerify, skipMaintenance: true });
  const ok =
    doc.ok === true &&
    phase26a.ok === true &&
    phase26b.ok === true &&
    phase26c.ok === true &&
    phase26d.ok === true &&
    g7590.ok === true;
  return {
    kind: CWL_UNIVERSAL_TRANSLATOR_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    phase26a,
    phase26b,
    phase26c,
    phase26d,
    g7590,
    skipGoldVerify,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlUniversalTranslatorCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-universal-translator-close");
  const t0 = progress.start("CWL universal translator close (G7690)");
  const gate = await runCwlUniversalTranslatorCloseGate(opts);
  progress.end("CWL universal translator close (G7690)", gate.ok === true, t0);
  return {
    kind: CWL_UNIVERSAL_TRANSLATOR_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlUniversalTranslatorCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-universal-translator-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
