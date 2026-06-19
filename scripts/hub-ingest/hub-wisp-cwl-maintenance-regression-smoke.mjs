#!/usr/bin/env node
/** WISP CWL maintenance regression smoke (G6710) — default post-close verify queue. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isWispCwlPhase14Closed } from "./hub-cwl-fullstack-gates.mjs";
import { runCwlSurfaceTaxonomyDocGate } from "./hub-cwl-surface-taxonomy-smoke.mjs";
import { runWispPhase13CloseDocGate, runWispPhase13CloseHoleGate } from "./hub-wisp-cwl-phase13-close-smoke.mjs";
import { runWispCwlPhase14ProgramCloseGate } from "./hub-wisp-cwl-phase14-program-close-smoke.mjs";
import { runWispCwlPhase14OperatorVerifyGate } from "./hub-wisp-cwl-phase14-operator-verify-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_MAINTENANCE_REGRESSION_SMOKE_KIND = "chrysalis.wisp-cwl-maintenance-regression-smoke";
export const WISP_CWL_MAINTENANCE_REGRESSION_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6711 — program doc indexes maintenance regression gate. */
export function runWispMaintenanceRegressionDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6710") &&
    text.includes("hub:wisp-cwl-maintenance-regression-smoke") &&
    text.includes("maintenance");
  return { ok, maintenanceRegressionDocOk: ok };
}

/** G6710 — WISP CWL maintenance regression composite (no CI pipeline re-run). */
export async function runWispCwlMaintenanceRegressionGate(opts = {}) {
  const doc = runWispMaintenanceRegressionDocGate();
  const programClose = await runWispCwlPhase14ProgramCloseGate({ skipOperatorClose: true });
  const phase13Doc = runWispPhase13CloseDocGate();
  const phase13Holes = runWispPhase13CloseHoleGate();
  const phase13 = {
    ok: phase13Doc.ok === true && phase13Holes.ok === true,
    doc: phase13Doc,
    holes: phase13Holes,
  };
  const taxonomy = runCwlSurfaceTaxonomyDocGate();
  const operatorVerify =
    opts.skipOperatorVerify === true
      ? { ok: true, skip: "skip-operator-verify" }
      : await runWispCwlPhase14OperatorVerifyGate({
          requireLive: opts.requireLive === true,
          skipLive: opts.requireLive !== true,
        });
  const phase14Closed = isWispCwlPhase14Closed();
  const ok =
    doc.ok === true &&
    programClose.ok === true &&
    phase13.ok === true &&
    taxonomy.ok === true &&
    operatorVerify.ok === true &&
    phase14Closed === true;
  return {
    kind: WISP_CWL_MAINTENANCE_REGRESSION_SMOKE_KIND,
    schemaVersion: WISP_CWL_MAINTENANCE_REGRESSION_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    programClose,
    phase13,
    taxonomy,
    operatorVerify,
    phase14Closed,
    generatedAt: new Date().toISOString(),
  };
}

/** @param {Record<string, unknown>} [opts] */
export async function runWispCwlMaintenanceRegressionSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-maintenance-regression");
  const t0 = progress.start("WISP CWL maintenance regression");
  const gate = await runWispCwlMaintenanceRegressionGate(opts);
  progress.end("WISP CWL maintenance regression", gate.ok === true, t0);
  return {
    kind: WISP_CWL_MAINTENANCE_REGRESSION_SMOKE_KIND,
    schemaVersion: WISP_CWL_MAINTENANCE_REGRESSION_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const requireLive = process.argv.includes("--require");
  const r = await runWispCwlMaintenanceRegressionSmoke({ requireLive });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-maintenance-regression-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
