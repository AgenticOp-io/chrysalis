#!/usr/bin/env node
/** Phase 43 — verify-gated convert hole apply (G8912). Never applies without verify + operator confirm. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defaultVerifySummaryPath } from "./hub-verify-playbooks.mjs";
import { HUB_CONVERT_HOLE_PROPOSALS_KIND } from "./hub-llm-convert-hole-proposals.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

export const HUB_CONVERT_VERIFY_APPLY_KIND = "chrysalis.hub.convert-verify-apply";
export const HUB_CONVERT_VERIFY_APPLY_SCHEMA_VERSION = 1;

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** Run verify gate for convert apply — post-translate verify when configured, else read summary. */
export function runConvertVerifyGate(projectDir) {
  const dir = resolve(projectDir);
  const summaryPath = defaultVerifySummaryPath(dir);
  const t0 = Date.now();

  if (!existsSync(cliBin)) {
    return {
      ok: false,
      skip: "cli-not-built",
      gatePass: false,
      correctness: null,
      summaryPath: null,
      verifyCostMs: Date.now() - t0,
    };
  }

  const tracesDir = join(dir, ".chrysalis", "traces");
  const baseUrl = process.env.CHRYSALIS_HUB_VERIFY_BASE_URL?.trim() ?? "";
  if (existsSync(tracesDir) && baseUrl) {
    const reportDir = join(dir, "reports", "verify");
    mkdirSync(reportDir, { recursive: true });
    const r = spawnSync(
      process.execPath,
      [
        cliBin,
        "verify",
        tracesDir,
        "--base-url",
        baseUrl,
        "--report",
        reportDir,
        "--project",
        dir,
        "--threshold",
        "1",
        "--json-summary",
        "--disable-cookie-chain",
      ],
      { cwd: scriptRoot, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    let correctness = null;
    if (existsSync(summaryPath)) {
      try {
        correctness = JSON.parse(readFileSync(summaryPath, "utf8")).aggregate?.correctness ?? null;
      } catch {
        /* ignore */
      }
    }
    const gatePass = (r.status ?? 1) === 0 && correctness !== null && correctness >= 1;
    return {
      ok: gatePass,
      gatePass,
      correctness,
      verifyExit: r.status ?? 1,
      summaryPath: existsSync(summaryPath) ? summaryPath : null,
      mode: "post-translate",
      verifyCostMs: Date.now() - t0,
    };
  }

  let correctness = null;
  if (existsSync(summaryPath)) {
    try {
      correctness = JSON.parse(readFileSync(summaryPath, "utf8")).aggregate?.correctness ?? null;
    } catch {
      /* ignore */
    }
  }
  const gatePass = correctness !== null && correctness >= 1;
  return {
    ok: gatePass,
    gatePass,
    correctness,
    verifyExit: gatePass ? 0 : 1,
    summaryPath: existsSync(summaryPath) ? summaryPath : null,
    mode: existsSync(summaryPath) ? "summary-cache" : "unavailable",
    verifyCostMs: Date.now() - t0,
  };
}

/**
 * Apply hole proposals after verify gate + operator confirm.
 * @param {object} input
 * @param {string} input.projectDir
 * @param {boolean} input.confirmApply
 */
export async function applyHubConvertHoleProposals(input) {
  const projectDir = resolve(input.projectDir);
  const artifactPath = join(projectDir, ".chrysalis", "hub-convert.hole-proposals.json");
  if (!existsSync(artifactPath)) {
    return { ok: false, skip: "missing-hole-proposals-artifact", applied: false };
  }
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const verify = runConvertVerifyGate(projectDir);
  const mod = await loadWebLlm();
  const { buildDisposeCertificate, assertDisposeCertificate } = await import(
    "../lib/dispose-certificate.mjs"
  );
  const disposeCertificate = buildDisposeCertificate({
    gateOk: verify.gatePass === true,
    ...(typeof verify.correctness === "number"
      ? { verifyCorrectness: verify.correctness }
      : {}),
    holeCount: artifact.holeCount ?? 0,
    evaluateVerifyGatePolicy: mod.evaluateVerifyGatePolicy,
  });
  const certPath = join(projectDir, ".chrysalis", "hub-convert.dispose-certificate.json");
  mkdirSync(dirname(certPath), { recursive: true });
  writeFileSync(certPath, `${JSON.stringify(disposeCertificate, null, 2)}\n`, "utf8");
  const certAssert = assertDisposeCertificate(disposeCertificate);

  const governor = mod.governConvertAction({
    action: "hub_convert_apply_holes",
    confirmApply: input.confirmApply === true,
    verifyGatePass: verify.gatePass === true,
  });
  const policy = mod.evaluateConvertVerifyApplyPolicy({
    gateOk: verify.gatePass === true,
    verifyCorrectness: verify.correctness,
    confirmApply: input.confirmApply === true,
    holeCount: artifact.holeCount ?? 0,
  });
  // Dispose Plane: refuse apply without a green dispose certificate (G10116 / G10119 pack).
  if (!certAssert.ok && policy.ok) {
    policy.ok = false;
    policy.canApply = false;
    policy.applied = false;
    policy.reasons = [...(policy.reasons ?? []), ...certAssert.reasons];
  }

  const trajectoryPath =
    artifact.trajectoryPath ?? join(projectDir, ".chrysalis", "hub-convert.trajectory.jsonl");
  const sessionId = artifact.sessionId ?? mod.createTrajectorySessionId("hub-convert-apply");
  await mkdir(dirname(trajectoryPath), { recursive: true });

  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId,
    step: (artifact.proposalCount ?? 0) + 30,
    role: "tool",
    toolName: "hub_convert_verify_gate",
    content: verify.gatePass ? "verify-pass" : "verify-fail",
    gate: { name: "verify-before-apply", ok: verify.gatePass === true },
    domainId: artifact.domainId,
    verifyCostMs: typeof verify.verifyCostMs === "number" ? verify.verifyCostMs : undefined,
    sourceDigest: artifact.sourceDigest,
    governorTier: mod.classifyConvertAction("hub_convert_verify_gate").tier,
    evidenceSource: "hub-convert-verify",
  });

  if (artifact.domainId) {
    const utilPath = mod.defaultIsUtilityPath(scriptRoot);
    let store = mod.loadIsUtilityStore(utilPath);
    const used = [String(artifact.domainId)];
    if (artifact.nearMissDomainId) used.push(String(artifact.nearMissDomainId));
    store = mod.recordEvidenceUsedUtility(store, {
      outcome: verify.gatePass === true ? "useful" : "noise",
      ...(typeof verify.correctness === "number" ? { verifyCorrectness: verify.correctness } : {}),
      usedDomainIds: used,
      surfacedButUnusedDomainIds: [],
    });
    mod.writeIsUtilityStore(utilPath, store);
  }

  if (verify.gatePass !== true && artifact.domainId) {
    mod.demoteShorthandInRepo({
      repoRoot: scriptRoot,
      domainId: String(artifact.domainId),
      reason: "verify-fail",
      sourceDigest: artifact.sourceDigest ? String(artifact.sourceDigest) : undefined,
    });
  }

  if (!governor.ok || !policy.ok) {
    const pending = {
      ...artifact,
      applied: false,
      verifyGate: {
        available: verify.summaryPath != null,
        correctness: verify.correctness,
        gatePass: verify.gatePass === true,
        summaryPath: verify.summaryPath,
      },
      disposeCertificate,
      disposeCertificatePath: certPath,
      applyPolicy: policy,
      governor,
      proposals: (artifact.proposals ?? []).map((p) => ({
        ...p,
        apply: false,
        status: verify.gatePass ? "verify_passed_pending_operator" : "pending_verify",
      })),
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(artifactPath, `${JSON.stringify(pending, null, 2)}\n`, "utf8");
    return {
      ok: false,
      applied: false,
      verifyGate: verify,
      disposeCertificate,
      applyPolicy: policy,
      governor,
      artifact: pending,
    };
  }

  const appliedArtifact = {
    ...artifact,
    kind: HUB_CONVERT_HOLE_PROPOSALS_KIND,
    applied: true,
    appliedAt: new Date().toISOString(),
    verifyGate: {
      available: true,
      correctness: verify.correctness,
      gatePass: true,
      summaryPath: verify.summaryPath,
    },
    disposeCertificate,
    disposeCertificatePath: certPath,
    applyPolicy: policy,
    governor,
    proposals: (artifact.proposals ?? []).map((p) => ({
      ...p,
      apply: true,
      status: "applied_verify_gated",
    })),
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(artifactPath, `${JSON.stringify(appliedArtifact, null, 2)}\n`, "utf8");

  const appliedRegistryPath = join(projectDir, ".chrysalis", "hub-convert.applied-holes.json");
  writeFileSync(
    appliedRegistryPath,
    `${JSON.stringify(
      {
        kind: HUB_CONVERT_VERIFY_APPLY_KIND,
        schemaVersion: HUB_CONVERT_VERIFY_APPLY_SCHEMA_VERSION,
        projectDir,
        holeCount: appliedArtifact.holeCount ?? 0,
        appliedAt: appliedArtifact.appliedAt,
        proposals: appliedArtifact.proposals,
        verifyGate: appliedArtifact.verifyGate,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const { runConvertRepairBridge } = await import("./hub-llm-convert-repair-bridge.mjs");
  const repairBridge = runConvertRepairBridge(projectDir, appliedArtifact);

  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId,
    step: (artifact.proposalCount ?? 0) + 31,
    role: "assistant",
    toolName: "hub_convert_apply_holes",
    content: `applied ${appliedArtifact.proposalCount ?? 0} proposals`,
    gate: { name: "convert-apply", ok: true },
    governorTier: governor.tier,
    collaborationAttribution: governor.attribution,
  });

  if (repairBridge.repairs?.length) {
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: (artifact.proposalCount ?? 0) + 32,
      role: "tool",
      toolName: "hub_convert_repair_bridge",
      content: repairBridge.skipped ?? `repairs ${repairBridge.repairs.length}`,
      gate: { name: "convert-repair-bridge", ok: repairBridge.ok === true },
    });
  }

  const finalArtifact = {
    ...appliedArtifact,
    repairBridge,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(artifactPath, `${JSON.stringify(finalArtifact, null, 2)}\n`, "utf8");

  return {
    ok: true,
    applied: true,
    verifyGate: verify,
    applyPolicy: policy,
    repairBridge,
    artifact: finalArtifact,
    appliedRegistryPath,
  };
}

/** Verify gate only — record on existing proposals artifact. */
export async function recordConvertVerifyGate(input) {
  const projectDir = resolve(input.projectDir);
  const verify = runConvertVerifyGate(projectDir);
  const { recordVerifyGateForHoleProposals } = await import("./hub-llm-convert-hole-proposals.mjs");
  let record = null;
  try {
    record = await recordVerifyGateForHoleProposals({ projectDir });
  } catch {
    record = { ok: false, skip: "hole-proposals-optional" };
  }

  const artifactPath = join(projectDir, ".chrysalis", "hub-convert.hole-proposals.json");
  let domainId = input.domainId;
  let sourceDigest = input.sourceDigest;
  let trajectoryPath =
    input.trajectoryPath ?? join(projectDir, ".chrysalis", "hub-convert.trajectory.jsonl");
  let sessionId = input.sessionId;
  if (existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
      domainId = domainId ?? artifact.domainId;
      sourceDigest = sourceDigest ?? artifact.sourceDigest;
      if (!input.trajectoryPath && artifact.trajectoryPath) trajectoryPath = artifact.trajectoryPath;
      sessionId = sessionId ?? artifact.sessionId;
    } catch {
      /* ignore */
    }
  }

  const mod = await loadWebLlm();
  if ((!domainId || !sessionId) && existsSync(trajectoryPath)) {
    try {
      const records = mod.readTrajectoryRecords(trajectoryPath);
      const last = [...records].reverse().find((r) => r.domainId || r.sessionId);
      domainId = domainId ?? last?.domainId;
      sessionId = sessionId ?? last?.sessionId;
      sourceDigest = sourceDigest ?? last?.sourceDigest;
    } catch {
      /* ignore */
    }
  }

  sessionId = sessionId ?? mod.createTrajectorySessionId("hub-convert-verify");
  await mkdir(dirname(trajectoryPath), { recursive: true });
  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId,
    step: 20,
    role: "tool",
    toolName: "hub_convert_verify_gate",
    content: verify.gatePass ? "verify-pass" : "verify-fail",
    gate: { name: "verify-gate", ok: verify.gatePass === true },
    domainId,
    verifyCostMs: typeof verify.verifyCostMs === "number" ? verify.verifyCostMs : undefined,
    sourceDigest,
    evidenceSource: "hub-convert-verify",
  });

  if (verify.gatePass !== true && domainId && input.allowDemote !== false) {
    mod.demoteShorthandInRepo({
      repoRoot: scriptRoot,
      domainId: String(domainId),
      reason: "verify-fail",
      sourceDigest: sourceDigest ? String(sourceDigest) : undefined,
    });
  }

  if (domainId && input.recordUtility !== false) {
    const utilPath = mod.defaultIsUtilityPath(scriptRoot);
    let store = mod.loadIsUtilityStore(utilPath);
    store = mod.recordUtilityOutcome(store, {
      domainId: String(domainId),
      outcome: verify.gatePass === true ? "useful" : "noise",
      ...(typeof verify.correctness === "number" ? { verifyCorrectness: verify.correctness } : {}),
    });
    mod.writeIsUtilityStore(utilPath, store);
  }

  if (domainId && existsSync(trajectoryPath)) {
    mod.snapshotOperatorTrajectoryForEvidence(scriptRoot, trajectoryPath, {
      domainId: String(domainId),
      fileName: input.evidenceFileName ?? "hub-convert.trajectory.jsonl",
    });
  }

  return { verify, record, gatePass: verify.gatePass === true, verifyCostMs: verify.verifyCostMs, domainId, sessionId };
}
