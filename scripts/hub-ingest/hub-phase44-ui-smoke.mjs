#!/usr/bin/env node
/** Phase 44 operator hub UI — extended matrix + hole-closure surfacing (G9121). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";

export const PHASE44_UI_SMOKE_KIND = "chrysalis.phase44-ui-smoke";
export const PHASE44_UI_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G9121 — operator web surfaces Phase 44 census + hole-closure on job progress. */
export function runPhase44UiGate(_opts = {}) {
  const program = runPhase44ProgramDocGate();
  const indexPath = join(scriptRoot, "scripts/chrysalis-operator-index.html");
  const uiPath = join(scriptRoot, "scripts/chrysalis-operator-ui.js");
  const webPath = join(scriptRoot, "scripts/chrysalis-operator-web.mjs");
  if (!existsSync(indexPath) || !existsSync(uiPath) || !existsSync(webPath)) {
    return { ok: false, skip: "missing-operator-hub-ui" };
  }
  const index = readFileSync(indexPath, "utf8");
  const ui = readFileSync(uiPath, "utf8");
  const web = readFileSync(webPath, "utf8");
  const checks = {
    programOk: program.ok === true,
    extendedMatrixCard: index.includes('id="extendedMatrixSummary"'),
    holeClosureSummary: index.includes('id="holeClosureSummary"'),
    uiLoadsExtendedMatrix: ui.includes("loadExtendedMatrixSummary") && ui.includes("extendedMatrixOracle"),
    uiHoleClosureJobText: ui.includes("hole-closure") && ui.includes("holeClosureSummary"),
    webCapabilityMatrixApi: web.includes("/api/hub/capability-matrix"),
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: PHASE44_UI_SMOKE_KIND,
    schemaVersion: PHASE44_UI_SMOKE_SCHEMA_VERSION,
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase44UiSmoke(opts = {}) {
  const progress = createSmokeProgress("phase44-ui");
  const t0 = progress.start("Phase 44 operator UI (G9121)");
  const gate = runPhase44UiGate(opts);
  progress.end("Phase 44 operator UI (G9121)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase44UiSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase44-ui-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
