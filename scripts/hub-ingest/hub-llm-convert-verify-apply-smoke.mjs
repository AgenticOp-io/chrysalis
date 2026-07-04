#!/usr/bin/env node
/** Phase 43a — verify-gated hole apply smoke (G8912). */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { proposeHubConvertHolePatches } from "./hub-llm-convert-hole-proposals.mjs";
import { applyHubConvertHoleProposals } from "./hub-llm-convert-verify-apply.mjs";
import { defaultVerifySummaryPath } from "./hub-verify-playbooks.mjs";
import { runLlmConvertFullProgramDocGate } from "./hub-llm-convert-full-program-entry-smoke.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function seedVerifySummary(projectDir, correctness = 1) {
  const summaryPath = defaultVerifySummaryPath(projectDir);
  mkdirSync(dirname(summaryPath), { recursive: true });
  writeFileSync(
    summaryPath,
    `${JSON.stringify(
      {
        aggregate: { correctness },
        endpoints: [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return summaryPath;
}

export async function runLlmConvertVerifyApplyGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const projectDir = join(repoRoot, "fixtures/db-query-unknown-receiver-probe");
  const program = runLlmConvertFullProgramDocGate();

  await proposeHubConvertHolePatches({
    projectDir,
    enrichWithLlm: true,
    skipLlm: false,
    domainId: "dbQueryProbe",
  });
  seedVerifySummary(projectDir, 1);

  const deny = await applyHubConvertHoleProposals({ projectDir, confirmApply: false });
  const apply = await applyHubConvertHoleProposals({ projectDir, confirmApply: true });

  const artifactPath = join(projectDir, ".chrysalis", "hub-convert.hole-proposals.json");
  const registryPath = join(projectDir, ".chrysalis", "hub-convert.applied-holes.json");

  const checks = {
    programOk: program.ok === true,
    proposeEnriched: existsSync(artifactPath),
    denyNotApplied: deny.applied === false,
    applyOk: apply.ok === true,
    applyApplied: apply.applied === true,
    repairBridgeRecorded: apply.repairBridge?.skipped != null || apply.repairBridge?.repairs != null,
    registryExists: existsSync(registryPath),
    proposalsHaveSuggestions: (apply.artifact?.proposals ?? []).some((p) => p.suggestion != null),
  };
  return {
    kind: "chrysalis.llm-convert-verify-apply-smoke",
    schemaVersion: 1,
    ok: Object.values(checks).every(Boolean),
    checks,
    deny,
    apply,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertVerifyApplySmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-verify-apply");
  const t0 = progress.start("LLM convert verify-apply (G8912)");
  const gate = await runLlmConvertVerifyApplyGate(opts);
  progress.end("LLM convert verify-apply (G8912)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runLlmConvertVerifyApplySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-verify-apply-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
