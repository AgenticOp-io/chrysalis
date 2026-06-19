#!/usr/bin/env node
/** Phase 14 program close smoke (G6690) — archive HSS operator deploy; maintenance default queue. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispCwlPhase14CloseGate } from "./hub-wisp-cwl-phase14-close-smoke.mjs";

export const WISP_CWL_PHASE14_PROGRAM_CLOSE_SMOKE_KIND = "chrysalis.wisp-cwl-phase14-program-close-smoke";
export const WISP_CWL_PHASE14_PROGRAM_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const wispProgramDocPath = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");

function isPhase14ClosedRecorded() {
  if (!existsSync(wispProgramDocPath)) return false;
  return readFileSync(wispProgramDocPath, "utf8").includes("Phase 14 closed");
}

/** G6691 — program doc records Phase 14 close. */
export function runWispPhase14ProgramCloseDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Phase 14 closed") &&
    text.includes("G6690") &&
    text.includes("G6590") &&
    text.includes("GenieACS is WISPTools legacy — not Chrysalis POC scope");
  return { ok, phase14ProgramCloseDocOk: ok };
}

/** G6692 — strategic plan default queue reflects Phase 14 closed. */
export function runStrategicPlanPhase14ClosedQueueGate() {
  const path = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-strategic-plan" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Phase 14 closed") &&
    text.includes("G6690") &&
    text.includes("maintenance") &&
    text.includes("PAUSED-AND-MAINTENANCE.md");
  return { ok, strategicPlanOk: ok };
}

/** G6693 — ROADMAP archives Phase 14 operator queue. */
export function runRoadmapPhase14ClosedQueueGate() {
  const path = join(scriptRoot, "ROADMAP.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-roadmap" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Phase 14 closed") &&
    text.includes("G6690") &&
    text.includes("G6590") &&
    text.includes("maintenance");
  return { ok, roadmapOk: ok };
}

/** G6694 — paused doc indexes Phase 14 regression smokes. */
export function runPausedPhase14ClosedDocGate() {
  const path = join(scriptRoot, "docs/PAUSED-AND-MAINTENANCE.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-paused-and-maintenance-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Phase 14 closed") &&
    text.includes("G6690") &&
    text.includes("hub:wisp-cwl-phase14-close-smoke") &&
    text.includes("G6410");
  return { ok, pausedOk: ok };
}

/** G6690 — Phase 14 program close composite. */
export async function runWispCwlPhase14ProgramCloseGate(opts = {}) {
  const doc = runWispPhase14ProgramCloseDocGate();
  const strategicPlan = runStrategicPlanPhase14ClosedQueueGate();
  const roadmap = runRoadmapPhase14ClosedQueueGate();
  const paused = runPausedPhase14ClosedDocGate();
  const operatorClose =
    opts.skipOperatorClose === true
      ? { ok: true, skip: "skip-operator-close" }
      : await runWispCwlPhase14CloseGate({
          apply: false,
          skipPipeline: true,
        });
  const closedRecorded = isPhase14ClosedRecorded();
  const ok =
    doc.ok === true &&
    strategicPlan.ok === true &&
    roadmap.ok === true &&
    paused.ok === true &&
    operatorClose.ok === true &&
    closedRecorded === true;
  return {
    kind: WISP_CWL_PHASE14_PROGRAM_CLOSE_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_PROGRAM_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    strategicPlan,
    roadmap,
    paused,
    operatorClose,
    closedRecorded,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlPhase14ProgramCloseGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-program-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
