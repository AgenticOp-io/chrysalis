#!/usr/bin/env node
/** Phase 45 WISP showcase default CI (G9170). */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispCwlMaintenanceRegressionGate } from "./hub-wisp-cwl-maintenance-regression-smoke.mjs";
import { runPhase45ProgramDocGate } from "./hub-phase45-program-entry-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const PHASE45_WISP_SHOWCASE_KIND = "chrysalis.phase45-wisp-showcase-smoke";
export const PHASE45_WISP_SHOWCASE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G9171 — Phase 45 program doc indexes WISP showcase gate. */
export function runPhase45WispShowcaseDocGate() {
  const path = join(scriptRoot, "docs/PHASE-45-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-phase45-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G9170") &&
    text.includes("hub:phase45-wisp-showcase-smoke") &&
    text.includes("G6710") &&
    text.includes("D6336");
  return { ok, phase45WispShowcaseDocOk: ok };
}

/** G9170 — WISP showcase default CI composite (maintenance regression, no pipeline re-run). */
export async function runPhase45WispShowcaseGate(opts = {}) {
  const program = runPhase45ProgramDocGate();
  const doc = runPhase45WispShowcaseDocGate();
  const wisp = await runWispCwlMaintenanceRegressionGate({
    skipOperatorVerify: true,
    ...opts,
  });
  const ok = program.ok === true && doc.ok === true && wisp.ok === true;
  return {
    kind: PHASE45_WISP_SHOWCASE_KIND,
    schemaVersion: PHASE45_WISP_SHOWCASE_SCHEMA_VERSION,
    ok,
    program,
    doc,
    wisp,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase45WispShowcaseSmoke(opts = {}) {
  const progress = createSmokeProgress("phase45-wisp-showcase");
  const t0 = progress.start("Phase 45 WISP showcase default CI (G9170)");
  const gate = await runPhase45WispShowcaseGate(opts);
  progress.end("Phase 45 WISP showcase default CI (G9170)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase45WispShowcaseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase45-wisp-showcase-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
