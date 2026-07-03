#!/usr/bin/env node
/** Phase 42a.2 — hole proposals logged; verify before apply (G8812). */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runLlmAssistedConvertProgramDocGate } from "./hub-llm-assisted-convert-program-entry-smoke.mjs";
import {
  proposeHubConvertHolePatches,
  recordVerifyGateForHoleProposals,
  readProjectHoles,
} from "./hub-llm-convert-hole-proposals.mjs";

export const LLM_CONVERT_HOLE_PROPOSALS_SMOKE_KIND = "chrysalis.llm-convert-hole-proposals-smoke";
export const LLM_CONVERT_HOLE_PROPOSALS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");
const holeFixture = join(scriptRoot, "fixtures/db-query-unknown-receiver-probe");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

function ensureIngest(projectDir) {
  if (!existsSync(cliBin)) return { ok: false, skip: "cli-not-built" };
  const { holes } = readProjectHoles(projectDir);
  if (holes.length > 0) return { ok: true, skipped: true };
  const r = spawnSync(process.execPath, [cliBin, "ingest", projectDir], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return { ok: (r.status ?? 1) === 0, status: r.status ?? 1 };
}

/** G8812 — hole proposals in trajectory; never auto-applied; verify gate recorded when available. */
export async function runLlmConvertHoleProposalsGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runLlmAssistedConvertProgramDocGate();
  const ingest = ensureIngest(holeFixture);
  const { holes } = readProjectHoles(holeFixture);
  const proposals = await proposeHubConvertHolePatches({
    projectDir: holeFixture,
    domainId: "dbQueryUnknownReceiver",
  });
  const verifyRecord = await recordVerifyGateForHoleProposals({ projectDir: holeFixture });
  const mod = await loadWebLlm();
  const records = proposals.trajectoryPath ? mod.readTrajectoryRecords(proposals.trajectoryPath) : [];
  const proposalLogged = records.some((r) => r.toolName === "hub_convert_hole_proposal");
  const verifyLogged = records.some((r) => r.toolName === "hub_convert_verify_gate");

  const checks = {
    programOk: program.ok === true,
    ingestOk: ingest.ok === true,
    holesPresent: holes.length >= 1,
    proposalCount: (proposals.proposalCount ?? 0) >= 1,
    neverApplied: proposals.applied === false,
    verifyRequired: proposals.verifyRequired === true,
    allProposalsNoApply: (proposals.proposals ?? []).every((p) => p.apply === false && p.verifyBeforeApply === true),
    artifactExists: existsSync(join(holeFixture, ".chrysalis", "hub-convert.hole-proposals.json")),
    proposalLogged,
    verifyLogged,
    verifyRecordNeverApplied: verifyRecord?.applied === false,
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: LLM_CONVERT_HOLE_PROPOSALS_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_HOLE_PROPOSALS_SMOKE_SCHEMA_VERSION,
    ok,
    checks,
    holeCount: holes.length,
    proposals,
    verifyRecord,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertHoleProposalsSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-hole-proposals");
  const t0 = progress.start("LLM convert hole proposals (G8812)");
  const gate = await runLlmConvertHoleProposalsGate(opts);
  progress.end("LLM convert hole proposals (G8812)", gate.ok === true, t0);
  return {
    kind: LLM_CONVERT_HOLE_PROPOSALS_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_HOLE_PROPOSALS_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmConvertHoleProposalsSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-hole-proposals-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
