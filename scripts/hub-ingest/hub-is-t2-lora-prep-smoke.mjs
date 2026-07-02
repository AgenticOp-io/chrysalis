#!/usr/bin/env node
/** IS-T2 LoRA prep gate (G8610) — CPU dataset + train manifest, no GPU spend. */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exportLoraTrainManifest } from "../web-llm-export-lora-manifest.mjs";
import { exportIntelligenceShorthands } from "../web-llm-export-shorthand.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_IS_T2_LORA_PREP_KIND = "chrysalis.hub.is-t2-lora-prep-smoke";
export const HUB_IS_T2_LORA_PREP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runIsT2LoraPrepSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const exported = await exportLoraTrainManifest({ repoRoot });
  const shorthand = await exportIntelligenceShorthands({ repoRoot });
  const mod = await loadWebLlm();
  const validation = mod.validateLoraTrainManifest(exported.manifest);

  const checks = {
    manifestOk: exported.ok === true && validation.ok === true,
    manifestExists: existsSync(exported.manifestPath ?? ""),
    verifyGreenMin: (exported.manifest?.verifyGreenCount ?? 0) >= 1,
    tierIsT2: exported.manifest?.tier === "IS-T2-lora-delta",
    shorthandOk: shorthand.ok === true,
    outputDirExists: existsSync(join(repoRoot, "reports/web-llm/lora")),
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_IS_T2_LORA_PREP_KIND,
    schemaVersion: HUB_IS_T2_LORA_PREP_SCHEMA_VERSION,
    ok,
    checks,
    exported,
    shorthand: { count: shorthand.count, ok: shorthand.ok },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const progress = createSmokeProgress("is-t2-lora-prep");
  const t0 = progress.start("IS-T2 LoRA prep (G8610)");
  const report = await runIsT2LoraPrepSmoke();
  progress.end("IS-T2 LoRA prep (G8610)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: scriptRoot,
    gateName: "G8610",
    ok: report.ok === true,
    detail: report.checks,
  });
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
