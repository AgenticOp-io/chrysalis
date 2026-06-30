#!/usr/bin/env node
/** Export verify-gated training shards from trajectory JSONL files. */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WEB_LLM_EXPORT_DATASET_KIND = "chrysalis.web-llm.export-dataset";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

function listJsonlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => join(dir, f));
}

/**
 * @param {object} [opts]
 * @param {string} [opts.repoRoot]
 * @param {string[]} [opts.inputs]
 * @param {string} [opts.outDir]
 */
export async function runWebLlmExportDataset(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const inputs =
    opts.inputs ??
    [
      join(repoRoot, "reports/web-llm/gates/smokes.jsonl"),
      join(repoRoot, "generated/_web-llm-smoke/trajectory.jsonl"),
      join(repoRoot, "fixtures/web-llm/sample-gate-trajectory.jsonl"),
    ].filter((p) => existsSync(p));

  /** @type {import('@chrysalis/web-llm').TrajectoryRecord[]} */
  const allRecords = [];
  for (const file of inputs) {
    allRecords.push(...mod.readTrajectoryRecords(file));
  }

  const benchmarkPath = join(repoRoot, "fixtures/web-llm/chrysalis.web-verify-benchmark.v1.json");
  let evalPrompts = [];
  if (existsSync(benchmarkPath)) {
    const benchmark = JSON.parse(readFileSync(benchmarkPath, "utf8"));
    evalPrompts = mod.benchmarkEvalPrompts(benchmark.cases ?? [], 25);
  }

  const shards = mod.buildTrainingShardsFromRecords(allRecords, {
    provenance: ["chrysalis.web-llm.export-dataset"],
  });

  const outDir = resolve(opts.outDir ?? mod.resolveWebLlmDatasetDir(repoRoot));
  mkdirSync(outDir, { recursive: true });

  const shardsPath = join(outDir, "training-shards.v1.json");
  writeFileSync(
    shardsPath,
    `${JSON.stringify({ kind: mod.WEB_LLM_TRAINING_SHARD_KIND, schemaVersion: mod.WEB_LLM_TRAINING_SHARD_SCHEMA_VERSION, shardCount: shards.length, shards }, null, 2)}\n`,
    "utf8",
  );

  const jsonlPath = join(outDir, "training-shards.v1.jsonl");
  writeFileSync(jsonlPath, shards.map((s) => JSON.stringify(s)).join("\n") + (shards.length ? "\n" : ""), "utf8");

  const evalPath = join(outDir, "wvb-eval-prompts.v1.json");
  writeFileSync(
    evalPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), promptCount: evalPrompts.length, prompts: evalPrompts }, null, 2)}\n`,
    "utf8",
  );

  const ok = shards.length > 0 || evalPrompts.length > 0;
  return {
    kind: WEB_LLM_EXPORT_DATASET_KIND,
    schemaVersion: 1,
    ok,
    shardCount: shards.length,
    recordCount: allRecords.length,
    evalPromptCount: evalPrompts.length,
    inputs,
    outDir,
    shardsPath,
    jsonlPath,
    evalPath,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWebLlmExportDataset();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-export-dataset")) main();
