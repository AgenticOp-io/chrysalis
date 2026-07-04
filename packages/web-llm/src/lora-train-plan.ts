import { existsSync, readFileSync } from "node:fs";
import type { LoraTrainManifest } from "./lora-manifest.js";
import { LORA_TRAIN_MANIFEST_KIND, validateLoraTrainManifest } from "./lora-manifest.js";

export const LORA_TRAIN_PLAN_KIND = "chrysalis.web-llm.lora-train-plan";
export const LORA_TRAIN_PLAN_SCHEMA_VERSION = 1;

export type LoraTrainPlan = {
  kind: typeof LORA_TRAIN_PLAN_KIND;
  schemaVersion: typeof LORA_TRAIN_PLAN_SCHEMA_VERSION;
  tier: "IS-T2-lora-delta";
  manifestPath: string;
  baseModel: string;
  datasetJsonlPath: string;
  outputDir: string;
  shardCount: number;
  verifyGreenCount: number;
  pythonEntry: string;
  maxMinutes: number;
  dryRun: boolean;
  generatedAt: string;
};

export function buildLoraTrainPlan(input: {
  manifest: LoraTrainManifest;
  manifestPath: string;
  pythonEntry?: string;
  maxMinutes?: number;
  dryRun?: boolean;
}): LoraTrainPlan {
  const m = input.manifest;
  return {
    kind: LORA_TRAIN_PLAN_KIND,
    schemaVersion: LORA_TRAIN_PLAN_SCHEMA_VERSION,
    tier: "IS-T2-lora-delta",
    manifestPath: input.manifestPath,
    baseModel: m.baseModel,
    datasetJsonlPath: m.datasetJsonlPath,
    outputDir: m.outputDir,
    shardCount: m.shardCount,
    verifyGreenCount: m.verifyGreenCount,
    pythonEntry: input.pythonEntry ?? "scripts/chrysalis-lora-qlora-train.py",
    maxMinutes: input.maxMinutes ?? 120,
    dryRun: input.dryRun !== false,
    generatedAt: new Date().toISOString(),
  };
}

export function validateLoraTrainPlan(plan: unknown): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!plan || typeof plan !== "object") return { ok: false, reasons: ["not-an-object"] };
  const p = plan as LoraTrainPlan;
  if (p.kind !== LORA_TRAIN_PLAN_KIND) reasons.push("kind-mismatch");
  if (p.schemaVersion !== LORA_TRAIN_PLAN_SCHEMA_VERSION) reasons.push("schema-version");
  if (!p.baseModel) reasons.push("missing-base-model");
  if ((p.shardCount ?? 0) < 1) reasons.push("no-shards");
  if ((p.verifyGreenCount ?? 0) < 1) reasons.push("no-verify-green");
  if (!p.pythonEntry) reasons.push("missing-python-entry");
  return { ok: reasons.length === 0, reasons };
}

export function validateManifestFileForTrain(manifestPath: string): { ok: boolean; reasons: string[] } {
  if (!existsSync(manifestPath)) return { ok: false, reasons: ["manifest-missing"] };
  try {
    const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (raw?.kind !== LORA_TRAIN_MANIFEST_KIND) return { ok: false, reasons: ["manifest-kind"] };
    return validateLoraTrainManifest(raw);
  } catch {
    return { ok: false, reasons: ["manifest-parse"] };
  }
}
