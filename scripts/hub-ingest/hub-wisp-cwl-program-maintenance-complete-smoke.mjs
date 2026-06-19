#!/usr/bin/env node
/** WISP CWL program maintenance complete (G6720) — governance + optional live operator verify. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhase14ClosedGovernanceGate } from "./hub-cwl-fullstack-gates.mjs";
import { runWispCwlPhase14OperatorVerifyGate } from "./hub-wisp-cwl-phase14-operator-verify-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_PROGRAM_MAINTENANCE_COMPLETE_SMOKE_KIND =
  "chrysalis.wisp-cwl-program-maintenance-complete-smoke";
export const WISP_CWL_PROGRAM_MAINTENANCE_COMPLETE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6721 — program doc indexes program maintenance complete gate. */
export function runWispProgramMaintenanceCompleteDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6720") &&
    text.includes("hub:wisp-cwl-program-maintenance-complete-smoke") &&
    text.includes("G6710");
  return { ok, programMaintenanceCompleteDocOk: ok };
}

/** G6720 — WISP program maintenance complete composite. */
export async function runWispCwlProgramMaintenanceCompleteGate(opts = {}) {
  const doc = runWispProgramMaintenanceCompleteDocGate();
  const governance = await runPhase14ClosedGovernanceGate(opts);
  const operatorVerify =
    opts.requireLive === true
      ? await runWispCwlPhase14OperatorVerifyGate({ requireLive: true })
      : { ok: true, skip: "skip-live-operator-verify" };
  const ok = doc.ok === true && governance.ok === true && operatorVerify.ok === true;
  return {
    kind: WISP_CWL_PROGRAM_MAINTENANCE_COMPLETE_SMOKE_KIND,
    schemaVersion: WISP_CWL_PROGRAM_MAINTENANCE_COMPLETE_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    governance,
    operatorVerify,
    generatedAt: new Date().toISOString(),
  };
}

/** @param {Record<string, unknown>} [opts] */
export async function runWispCwlProgramMaintenanceCompleteSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-program-maintenance-complete");
  const t0 = progress.start("WISP CWL program maintenance complete");
  const gate = await runWispCwlProgramMaintenanceCompleteGate(opts);
  progress.end("WISP CWL program maintenance complete", gate.ok === true, t0);
  return {
    kind: WISP_CWL_PROGRAM_MAINTENANCE_COMPLETE_SMOKE_KIND,
    schemaVersion: WISP_CWL_PROGRAM_MAINTENANCE_COMPLETE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const requireLive = process.argv.includes("--require");
  const r = await runWispCwlProgramMaintenanceCompleteSmoke({ requireLive });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-program-maintenance-complete-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
