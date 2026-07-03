#!/usr/bin/env node
/** Phase 42a.2 — verify-gated hole proposals for hub convert (G8812). Never auto-apply. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defaultVerifySummaryPath } from "./hub-verify-playbooks.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

export const HUB_CONVERT_HOLE_PROPOSALS_KIND = "chrysalis.hub.convert-hole-proposals";
export const HUB_CONVERT_HOLE_PROPOSALS_SCHEMA_VERSION = 1;

const VERIFY_GATE_CORRECTNESS = 1;

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** @param {string} projectDir */
function readProjectHolesFromStatus(projectDir) {
  if (!existsSync(cliBin)) return [];
  const r = spawnSync(process.execPath, [cliBin, "status", "--project", projectDir, "--json"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  if ((r.status ?? 1) !== 0) return [];
  try {
    const summary = JSON.parse(r.stdout ?? "{}");
    const reasons = summary.residualLegacy?.topHoleReasons ?? [];
    return reasons.map((row) => ({
      name: row.reason,
      count: row.count,
      source: "status-residualLegacy",
    }));
  } catch {
    return [];
  }
}

/** @param {string} projectDir */
export function readProjectHoles(projectDir) {
  const holesPath = join(resolve(projectDir), "chrysalis.holes.json");
  if (existsSync(holesPath)) {
    try {
      const raw = JSON.parse(readFileSync(holesPath, "utf8"));
      const holes = Array.isArray(raw.holes) ? raw.holes : Array.isArray(raw) ? raw : [];
      return { holes, holesPath };
    } catch {
      return { holes: [], holesPath };
    }
  }
  const holes = readProjectHolesFromStatus(projectDir);
  return { holes, holesPath: holes.length ? "status:residualLegacy" : null };
}

/**
 * @param {object} input
 * @param {string} input.projectDir
 * @param {string} [input.trajectoryPath]
 * @param {string} [input.sessionId]
 */
export async function proposeHubConvertHolePatches(input) {
  const projectDir = resolve(input.projectDir);
  const { holes, holesPath } = readProjectHoles(projectDir);
  const mod = await loadWebLlm();
  const trajectoryPath =
    input.trajectoryPath ??
    process.env.CHRYSALIS_HUB_CONVERT_TRAJECTORY ??
    join(projectDir, ".chrysalis", "hub-convert.trajectory.jsonl");
  const sessionId = input.sessionId ?? mod.createTrajectorySessionId("hub-convert-holes");
  await mkdir(dirname(trajectoryPath), { recursive: true });

  /** @type {Array<object>} */
  const proposals = [];
  let step = input.stepBase ?? 10;

  const holeInputs = holes.map((hole) => ({
    name: hole.name ?? hole.id ?? hole.reason ?? "legacy:unknown",
    detail: hole.detail ?? hole.message ?? null,
  }));

  let enrichResult = { enrichments: [], skipLlm: true, llmUsed: false };
  if (input.enrichWithLlm === true && holeInputs.length > 0) {
    const skipLlm = input.skipLlm === true;
    enrichResult = await mod.enrichConvertHoleProposals({
      holes: holeInputs,
      skipLlm,
      domainId: input.domainId,
      tier: input.tier,
    });
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: step++,
      role: "tool",
      toolName: "hub_convert_llm_enrich",
      content: enrichResult.llmUsed ? "llm-enriched" : enrichResult.skipLlm ? "skip-llm" : "stub-enriched",
      gate: { name: "llm-enrich", ok: true },
      skipLlm: enrichResult.skipLlm,
      domainId: input.domainId ?? undefined,
    });
  }

  for (let i = 0; i < holeInputs.length; i++) {
    const holeInput = holeInputs[i];
    const name = holeInput.name;
    const enrichment = enrichResult.enrichments[i];
    const proposal = {
      id: `hole-proposal-${proposals.length + 1}`,
      hole: name,
      detail: holeInput.detail,
      action: "hole-patch",
      patch: enrichment?.patchHint ?? null,
      suggestion: enrichment?.suggestion ?? null,
      enrichSource: enrichment?.source ?? null,
      apply: false,
      verifyBeforeApply: true,
      status: "pending_verify",
    };
    proposals.push(proposal);
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: step++,
      role: "assistant",
      toolName: "hub_convert_hole_proposal",
      content: name,
      gate: { name: "hole-proposal", ok: true },
      unverified: true,
      domainId: input.domainId ?? undefined,
    });
  }

  const artifactPath = join(projectDir, ".chrysalis", "hub-convert.hole-proposals.json");
  await mkdir(dirname(artifactPath), { recursive: true });
  const report = {
    kind: HUB_CONVERT_HOLE_PROPOSALS_KIND,
    schemaVersion: HUB_CONVERT_HOLE_PROPOSALS_SCHEMA_VERSION,
    projectDir,
    holesPath,
    holeCount: holes.length,
    proposalCount: proposals.length,
    applied: false,
    verifyRequired: true,
    llmEnriched: input.enrichWithLlm === true,
    llmUsed: enrichResult.llmUsed === true,
    skipLlm: enrichResult.skipLlm === true,
    proposals,
    trajectoryPath,
    sessionId,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

/** Record verify gate outcome for pending hole proposals (still never auto-applies). */
export async function recordVerifyGateForHoleProposals(input) {
  const projectDir = resolve(input.projectDir);
  const artifactPath = join(projectDir, ".chrysalis", "hub-convert.hole-proposals.json");
  if (!existsSync(artifactPath)) {
    return { ok: false, skip: "missing-hole-proposals-artifact" };
  }
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const verifySummaryPath = defaultVerifySummaryPath(projectDir);
  let verify = { available: false, correctness: null, gatePass: false };
  if (existsSync(verifySummaryPath)) {
    try {
      const s = JSON.parse(readFileSync(verifySummaryPath, "utf8"));
      const correctness = s.aggregate?.correctness ?? null;
      verify = {
        available: true,
        correctness,
        gatePass: correctness !== null && correctness >= VERIFY_GATE_CORRECTNESS,
        summaryPath: verifySummaryPath,
      };
    } catch {
      verify.available = false;
    }
  }

  const mod = await loadWebLlm();
  const trajectoryPath = artifact.trajectoryPath ?? join(projectDir, ".chrysalis", "hub-convert.trajectory.jsonl");
  const sessionId = artifact.sessionId ?? mod.createTrajectorySessionId("hub-convert-holes");
  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId,
    step: (artifact.proposalCount ?? 0) + 20,
    role: "tool",
    toolName: "hub_convert_verify_gate",
    content: verify.gatePass ? "verify-pass" : "verify-pending",
    gate: { name: "verify-before-apply", ok: verify.gatePass === true },
  });

  const updated = {
    ...artifact,
    applied: false,
    verifyGate: verify,
    proposals: (artifact.proposals ?? []).map((p) => ({
      ...p,
      apply: false,
      status: verify.gatePass ? "verify_passed_pending_operator" : "pending_verify",
    })),
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(artifactPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return {
    ok: verify.available === true,
    applied: false,
    verifyGate: verify,
    artifact: updated,
  };
}

/**
 * After translate: propose holes + optional verify gate record.
 * @param {object} input
 */
export async function runHubConvertHoleProposalPipeline(input) {
  const proposals = await proposeHubConvertHolePatches(input);
  let verifyRecord = null;
  if (input.recordVerifyGate === true) {
    verifyRecord = await recordVerifyGateForHoleProposals({ projectDir: input.projectDir });
  }
  return { proposals, verifyRecord, applied: proposals.applied === true };
}
