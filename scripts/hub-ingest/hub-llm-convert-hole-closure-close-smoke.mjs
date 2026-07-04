#!/usr/bin/env node
/** Phase 44b track close — hole-closure enrich + verify-gated apply + repair bridge (G9070). */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";
import { runLlmConvertHoleClosureGate } from "./hub-llm-convert-hole-closure-smoke.mjs";
import { proposeHubConvertHolePatches } from "./hub-llm-convert-hole-proposals.mjs";
import { applyHubConvertHoleProposals } from "./hub-llm-convert-verify-apply.mjs";
import { defaultVerifySummaryPath } from "./hub-verify-playbooks.mjs";

export const LLM_CONVERT_HOLE_CLOSURE_CLOSE_KIND = "chrysalis.llm-convert-hole-closure-close-smoke";
export const LLM_CONVERT_HOLE_CLOSURE_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function seedVerifySummary(projectDir, correctness = 1) {
  const summaryPath = defaultVerifySummaryPath(projectDir);
  mkdirSync(dirname(summaryPath), { recursive: true });
  writeFileSync(
    summaryPath,
    `${JSON.stringify({ aggregate: { correctness }, endpoints: [] }, null, 2)}\n`,
    "utf8",
  );
  return summaryPath;
}

/** G9070 — end-to-end hole-closure patch through verify-gated apply. */
export async function runLlmConvertHoleClosureCloseGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const projectDir = join(repoRoot, "fixtures/db-query-unknown-receiver-probe");
  const program = runPhase44ProgramDocGate();
  const hintGate = await runLlmConvertHoleClosureGate({ repoRoot });

  const holesPath = join(projectDir, "chrysalis.holes.json");
  const proposed = await proposeHubConvertHolePatches({
    projectDir,
    enrichWithLlm: true,
    skipLlm: true,
    domainId: "dbQueryProbe",
  });
  seedVerifySummary(projectDir, 1);
  const apply = await applyHubConvertHoleProposals({ projectDir, confirmApply: true });

  const proposals = apply.artifact?.proposals ?? proposed.proposals ?? [];
  const closureProposals = proposals.filter((p) => p?.patch?.kind === "hole-closure" && p.patch.holeId);
  const repairBridge = apply.repairBridge ?? null;

  const checks = {
    programOk: program.ok === true,
    hintGateOk: hintGate.ok === true,
    holesFixture: existsSync(holesPath),
    closurePatchProposed: closureProposals.length > 0,
    applyOk: apply.ok === true,
    applyRecorded: apply.applied === true,
    repairBridgeInvoked:
      repairBridge != null &&
      repairBridge.skipped !== "no-hole-closure-patches" &&
      (repairBridge.skipped === "no-traces" ||
        repairBridge.skipped === "no-CHRYSALIS_HUB_VERIFY_BASE_URL" ||
        (repairBridge.repairs?.length ?? 0) > 0),
    verifyGated: apply.verifyGate?.gatePass === true,
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: LLM_CONVERT_HOLE_CLOSURE_CLOSE_KIND,
    schemaVersion: LLM_CONVERT_HOLE_CLOSURE_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    closureProposals: closureProposals.map((p) => ({
      id: p.id,
      holeId: p.patch?.holeId,
      kind: p.patch?.kind,
    })),
    repairBridge,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertHoleClosureCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-hole-closure-close");
  const t0 = progress.start("LLM convert hole closure close (G9070)");
  const gate = await runLlmConvertHoleClosureCloseGate(opts);
  progress.end("LLM convert hole closure close (G9070)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runLlmConvertHoleClosureCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-hole-closure-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
