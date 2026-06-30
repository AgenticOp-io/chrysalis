#!/usr/bin/env node
/** Open web-LLM Horizon B gate (G8240) — dataset export, leaderboard, auto gate logging. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmExportDataset } from "../web-llm-export-dataset.mjs";
import { runWebLlmBuildLeaderboard } from "../web-llm-build-leaderboard.mjs";

export const OPEN_WEB_LLM_HORIZON_B_KIND = "chrysalis.web-llm.horizon-b-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export function runOpenWebLlmTrainingRecipeDocGate() {
  const path = join(scriptRoot, "docs/WEB-LLM-TRAINING-RECIPE.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-training-recipe-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("training-shard") &&
    text.includes("verify-gated") &&
    (text.includes("WEB_LLM_TRAINING_SHARD") || text.includes("chrysalis.web-llm.training-shard"));
  return { ok, trainingRecipeDocOk: ok };
}

export async function runOpenWebLlmDatasetGate() {
  const dataset = await runWebLlmExportDataset({ repoRoot: scriptRoot });
  return { ok: dataset.ok === true && dataset.shardCount >= 1, dataset };
}

export async function runOpenWebLlmLeaderboardGate() {
  const leaderboard = await runWebLlmBuildLeaderboard({ repoRoot: scriptRoot });
  const htmlOk = existsSync(leaderboard.htmlPath);
  const jsonOk = existsSync(leaderboard.jsonPath);
  return { ok: leaderboard.ok === true && htmlOk && jsonOk, leaderboard, htmlOk, jsonOk };
}

export async function runOpenWebLlmAutoLogGate() {
  const mod = await loadWebLlm();
  const prev = process.env.CHRYSALIS_WEB_LLM_TRAJECTORY;
  process.env.CHRYSALIS_WEB_LLM_TRAJECTORY = "1";
  const logged = mod.logWebLlmSmokeGate({
    repoRoot: scriptRoot,
    gateName: "G8240-auto-log-probe",
    ok: true,
    detail: { probe: true },
    force: true,
  });
  if (prev === undefined) delete process.env.CHRYSALIS_WEB_LLM_TRAJECTORY;
  else process.env.CHRYSALIS_WEB_LLM_TRAJECTORY = prev;
  const enabled = mod.isWebLlmTrajectoryLoggingEnabled();
  return { ok: logged.ok === true && logged.skipped !== true, logged, enabledWhenForced: enabled };
}

export async function runOpenWebLlmHorizonBGate() {
  const recipe = runOpenWebLlmTrainingRecipeDocGate();
  const dataset = await runOpenWebLlmDatasetGate();
  const leaderboard = await runOpenWebLlmLeaderboardGate();
  const autoLog = await runOpenWebLlmAutoLogGate();
  const ok = recipe.ok && dataset.ok && leaderboard.ok && autoLog.ok;
  return {
    kind: OPEN_WEB_LLM_HORIZON_B_KIND,
    schemaVersion: 1,
    ok,
    recipe,
    dataset,
    leaderboard,
    autoLog,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runOpenWebLlmHorizonBGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-open-web-llm-horizon-b-smoke")) main();
