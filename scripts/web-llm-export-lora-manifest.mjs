#!/usr/bin/env node
/** Export IS-T2 LoRA train manifest from verify-gated dataset (CPU only). */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmExportDataset } from "./web-llm-export-dataset.mjs";

export const LORA_MANIFEST_EXPORT_KIND = "chrysalis.web-llm.lora-manifest-export";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/**
 * @param {object} [opts]
 */
export async function exportLoraTrainManifest(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();

  let dataset = null;
  if (opts.skipDataset !== true) {
    dataset = await runWebLlmExportDataset({ repoRoot });
  }

  const jsonlPath = join(repoRoot, "reports/web-llm/dataset/training-shards.v1.jsonl");
  const shards = mod.readTrainingShardsFromJsonl(jsonlPath);
  const manifest = mod.buildLoraTrainManifest({
    repoRoot,
    shards,
    ...(opts.baseModel ? { baseModel: String(opts.baseModel) } : {}),
  });

  const validation = mod.validateLoraTrainManifest(manifest);
  mkdirSync(manifest.outputDir, { recursive: true });
  const manifestPath = join(manifest.outputDir, "train-manifest.v1.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const ok = validation.ok === true;
  return {
    kind: LORA_MANIFEST_EXPORT_KIND,
    ok,
    validation,
    manifest,
    manifestPath,
    dataset,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await exportLoraTrainManifest();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
