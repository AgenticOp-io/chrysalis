#!/usr/bin/env node
/** Phase 44c track close — Horizon C operator GPU train contract (G9130). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runHorizonCProgramDocGate } from "./hub-horizon-c-program-entry-smoke.mjs";
import { runHorizonCTrainLoopGate } from "./hub-horizon-c-train-loop-smoke.mjs";
import { runIsT2LoraPrepSmoke } from "./hub-is-t2-lora-prep-smoke.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";

export const HORIZON_C_TRAIN_CLOSE_KIND = "chrysalis.horizon-c-train-close-smoke";
export const HORIZON_C_TRAIN_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

/** Operator contract for real QLoRA — CI validates path; GPU proof optional via marker. */
export async function runHorizonCTrainCloseGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runPhase44ProgramDocGate();
  const horizonEntry = runHorizonCProgramDocGate();
  const trainLoop = await runHorizonCTrainLoopGate({ repoRoot });
  const loraPrep = await runIsT2LoraPrepSmoke({ repoRoot });

  const trainPy = join(repoRoot, "scripts/chrysalis-lora-qlora-train.py");
  const trainSh = join(repoRoot, "scripts/gce-gpu-lora-train.sh");
  const orchestrateSh = join(repoRoot, "scripts/gce-gpu-lab-orchestrate.sh");
  const gpuDoc = join(repoRoot, "docs/GCE-GPU-LAB.md");
  const trainShText = readText(trainSh);
  const orchestrateText = readText(orchestrateSh);
  const gpuDocText = readText(gpuDoc);

  const operatorMarker = join(repoRoot, "reports/ci/gce-gpu-lab.ok");
  const operatorProofComplete = existsSync(operatorMarker);
  const strictOperator =
    process.env.CHRYSALIS_STRICT_HORIZON_C_OPERATOR === "1" ||
    process.env.CHRYSALIS_STRICT_STRATEGIC_PLAN === "1";

  const contract = {
    trainPyExists: existsSync(trainPy),
    trainShReferencesPy: trainShText.includes("chrysalis-lora-qlora-train.py"),
    trainShDryRunEnv: trainShText.includes("CHRYSALIS_GPU_LAB_DRY_RUN"),
    orchestrateSyncsPy: orchestrateText.includes("chrysalis-lora-qlora-train.py"),
    gpuDocG9130: gpuDocText.includes("G9130") || gpuDocText.includes("chrysalis-lora-qlora-train.py"),
    gpuDocDryRunDefault: gpuDocText.includes("CHRYSALIS_GPU_LAB_DRY_RUN=1"),
  };

  const checks = {
    programOk: program.ok === true,
    horizonEntryOk: horizonEntry.ok === true,
    trainLoopOk: trainLoop.ok === true,
    loraPrepOk: loraPrep.ok === true,
    operatorContractOk: Object.values(contract).every(Boolean),
    operatorProofComplete: strictOperator ? operatorProofComplete : true,
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: HORIZON_C_TRAIN_CLOSE_KIND,
    schemaVersion: HORIZON_C_TRAIN_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    contract,
    operatorProofComplete,
    strictOperator,
    operatorMarker: operatorProofComplete ? operatorMarker : null,
    trainLoop,
    generatedAt: new Date().toISOString(),
  };
}

export async function runHorizonCTrainCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("horizon-c-train-close");
  const t0 = progress.start("Horizon C train close (G9130)");
  const gate = await runHorizonCTrainCloseGate(opts);
  progress.end("Horizon C train close (G9130)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runHorizonCTrainCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-horizon-c-train-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
