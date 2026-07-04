#!/usr/bin/env node
/** Horizon C in-repo QLoRA train loop smoke (G9110) — CPU plan + dry-run only. */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exportLoraTrainManifest } from "../web-llm-export-lora-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runHorizonCProgramDocGate } from "./hub-horizon-c-program-entry-smoke.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runHorizonCTrainLoopGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runHorizonCProgramDocGate();
  const exported = await exportLoraTrainManifest({ repoRoot });
  const mod = await loadWebLlm();
  const manifest = exported.manifest;
  const plan = mod.buildLoraTrainPlan({
    manifest,
    manifestPath: exported.manifestPath ?? join(repoRoot, "reports/web-llm/lora/train-manifest.v1.json"),
    dryRun: true,
  });
  const planOk = mod.validateLoraTrainPlan(plan);

  const trainPy = join(repoRoot, "scripts/chrysalis-lora-qlora-train.py");
  const py =
    process.platform === "win32"
      ? spawnSync("python", [trainPy, "--manifest", plan.manifestPath, "--dry-run"], {
          cwd: repoRoot,
          encoding: "utf8",
        })
      : spawnSync("python3", [trainPy, "--manifest", plan.manifestPath, "--dry-run"], {
          cwd: repoRoot,
          encoding: "utf8",
        });

  const checks = {
    programOk: program.ok === true,
    manifestOk: exported.ok === true,
    planOk: planOk.ok === true,
    trainScriptExists: existsSync(trainPy),
    trainDryRunOk: (py.status ?? 1) === 0,
  };
  return {
    kind: "chrysalis.horizon-c-train-loop-smoke",
    schemaVersion: 1,
    ok: Object.values(checks).every(Boolean),
    checks,
    plan,
    pyStdout: py.stdout?.slice(0, 500) ?? "",
    generatedAt: new Date().toISOString(),
  };
}

export async function runHorizonCTrainLoopSmoke(opts = {}) {
  const progress = createSmokeProgress("horizon-c-train-loop");
  const t0 = progress.start("Horizon C train loop (G9110)");
  const gate = await runHorizonCTrainLoopGate(opts);
  progress.end("Horizon C train loop (G9110)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runHorizonCTrainLoopSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-horizon-c-train-loop-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
