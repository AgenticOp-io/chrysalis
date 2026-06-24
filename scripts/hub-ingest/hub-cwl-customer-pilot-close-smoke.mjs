#!/usr/bin/env node
/** CWL customer pilot program close (G7490) — Phases 24a–24d + G7390 regression. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPhase24aCloseGate } from "./hub-cwl-phase24a-close-smoke.mjs";
import { runCwlPhase24bCloseGate } from "./hub-cwl-phase24b-close-smoke.mjs";
import { runCwlPhase24cCloseGate } from "./hub-cwl-phase24c-close-smoke.mjs";
import { runCwlPhase24dCloseGate } from "./hub-cwl-phase24d-close-smoke.mjs";
import { runCwlUniversalLanguageCloseGate } from "./hub-cwl-universal-language-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_CUSTOMER_PILOT_CLOSE_SMOKE_KIND = "chrysalis.cwl.customer-pilot-close-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlCustomerPilotDocGate() {
  const path = join(scriptRoot, "docs/CWL-CUSTOMER-PILOT-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Program closed") &&
    text.includes("G7490") &&
    text.includes("G7401") &&
    text.includes("G7404") &&
    text.includes("Phase 24a") &&
    text.includes("Phase 24d");
  return { ok, programDocOk: ok };
}

export async function runCwlCustomerPilotCloseGate(opts = {}) {
  const doc = runCwlCustomerPilotDocGate();
  const phase24a = await runCwlPhase24aCloseGate(opts);
  const phase24b = await runCwlPhase24bCloseGate(opts);
  const phase24c = await runCwlPhase24cCloseGate(opts);
  const phase24d = await runCwlPhase24dCloseGate(opts);
  const g7390 = await runCwlUniversalLanguageCloseGate({ ...opts, skipMaintenance: true });
  const ok =
    doc.ok === true &&
    phase24a.ok === true &&
    phase24b.ok === true &&
    phase24c.ok === true &&
    phase24d.ok === true &&
    g7390.ok === true;
  return {
    kind: CWL_CUSTOMER_PILOT_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    phase24a,
    phase24b,
    phase24c,
    phase24d,
    g7390,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlCustomerPilotCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-customer-pilot-close");
  const t0 = progress.start("CWL customer pilot close (G7490)");
  const gate = await runCwlCustomerPilotCloseGate(opts);
  progress.end("CWL customer pilot close (G7490)", gate.ok === true, t0);
  return {
    kind: CWL_CUSTOMER_PILOT_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlCustomerPilotCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-customer-pilot-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
