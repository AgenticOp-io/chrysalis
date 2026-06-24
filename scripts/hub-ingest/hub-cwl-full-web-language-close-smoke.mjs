#!/usr/bin/env node
/** CWL full web language program close (G7590) — Phases 25a–25d + G7490 regression. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPhase25aCloseGate } from "./hub-cwl-phase25a-close-smoke.mjs";
import { runCwlPhase25bCloseGate } from "./hub-cwl-phase25b-close-smoke.mjs";
import { runCwlPhase25cCloseGate } from "./hub-cwl-phase25c-close-smoke.mjs";
import { runCwlPhase25dCloseGate } from "./hub-cwl-phase25d-close-smoke.mjs";
import { runCwlCustomerPilotCloseGate } from "./hub-cwl-customer-pilot-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_FULL_WEB_LANGUAGE_CLOSE_SMOKE_KIND = "chrysalis.cwl.full-web-language-close-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlFullWebLanguageDocGate() {
  const path = join(scriptRoot, "docs/CWL-FULL-WEB-LANGUAGE-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Program closed") &&
    text.includes("G7590") &&
    text.includes("G7501") &&
    text.includes("G7504") &&
    text.toLowerCase().includes("fully complete web language");
  return { ok, programDocOk: ok };
}

export async function runCwlFullWebLanguageCloseGate(opts = {}) {
  const doc = runCwlFullWebLanguageDocGate();
  const phase25a = await runCwlPhase25aCloseGate(opts);
  const phase25b = await runCwlPhase25bCloseGate(opts);
  const phase25c = await runCwlPhase25cCloseGate(opts);
  const phase25d = await runCwlPhase25dCloseGate(opts);
  const g7490 = await runCwlCustomerPilotCloseGate({ ...opts, skipMaintenance: true });
  const ok =
    doc.ok === true &&
    phase25a.ok === true &&
    phase25b.ok === true &&
    phase25c.ok === true &&
    phase25d.ok === true &&
    g7490.ok === true;
  return {
    kind: CWL_FULL_WEB_LANGUAGE_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    phase25a,
    phase25b,
    phase25c,
    phase25d,
    g7490,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlFullWebLanguageCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-full-web-language-close");
  const t0 = progress.start("CWL full web language close (G7590)");
  const gate = await runCwlFullWebLanguageCloseGate(opts);
  progress.end("CWL full web language close (G7590)", gate.ok === true, t0);
  return {
    kind: CWL_FULL_WEB_LANGUAGE_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlFullWebLanguageCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-full-web-language-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
