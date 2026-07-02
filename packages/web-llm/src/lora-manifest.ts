import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { INTELLIGENCE_SHORTHAND_KIND } from "./kinds.js";
import type { TrainingShard } from "./types.js";
import { WEB_LLM_TRAINING_SHARD_KIND } from "./kinds.js";

export const LORA_TRAIN_MANIFEST_KIND = "chrysalis.web-llm.lora-train-manifest";
export const LORA_TRAIN_MANIFEST_SCHEMA_VERSION = 1;

/** Recommended open base for IS-T2 QLoRA experiments (operator swaps as needed). */
export const DEFAULT_IS_T2_BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct";

export type LoraTrainManifest = {
  kind: typeof LORA_TRAIN_MANIFEST_KIND;
  schemaVersion: typeof LORA_TRAIN_MANIFEST_SCHEMA_VERSION;
  tier: "IS-T2-lora-delta";
  baseModel: string;
  shardCount: number;
  verifyGreenCount: number;
  datasetJsonlPath: string;
  datasetJsonPath: string;
  evalPromptsPath: string | null;
  shorthandBundlePath: string | null;
  outputDir: string;
  provenance: string[];
  generatedAt: string;
};

export function readTrainingShardsFromJsonl(jsonlPath: string): TrainingShard[] {
  if (!existsSync(jsonlPath)) return [];
  return readFileSync(jsonlPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as TrainingShard)
    .filter((s) => s.kind === WEB_LLM_TRAINING_SHARD_KIND);
}

export function buildLoraTrainManifest(opts: {
  repoRoot: string;
  shards?: TrainingShard[];
  baseModel?: string;
  provenance?: string[];
}): LoraTrainManifest {
  const repoRoot = opts.repoRoot;
  const datasetDir = join(repoRoot, "reports/web-llm/dataset");
  const jsonlPath = join(datasetDir, "training-shards.v1.jsonl");
  const jsonPath = join(datasetDir, "training-shards.v1.json");
  const evalPath = join(datasetDir, "wvb-eval-prompts.v1.json");
  const shorthandPath = join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json");
  const outputDir = join(repoRoot, "reports/web-llm/lora");

  const shards = opts.shards ?? readTrainingShardsFromJsonl(jsonlPath);
  const verifyGreenCount = shards.filter((s) => s.gate?.ok === true).length;

  return {
    kind: LORA_TRAIN_MANIFEST_KIND,
    schemaVersion: LORA_TRAIN_MANIFEST_SCHEMA_VERSION,
    tier: "IS-T2-lora-delta",
    baseModel: opts.baseModel ?? DEFAULT_IS_T2_BASE_MODEL,
    shardCount: shards.length,
    verifyGreenCount,
    datasetJsonlPath: jsonlPath,
    datasetJsonPath: jsonPath,
    evalPromptsPath: existsSync(evalPath) ? evalPath : null,
    shorthandBundlePath: existsSync(shorthandPath) ? shorthandPath : null,
    outputDir,
    provenance: opts.provenance ?? ["chrysalis.web-llm.export-lora-manifest"],
    generatedAt: new Date().toISOString(),
  };
}

export function validateLoraTrainManifest(doc: unknown): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!doc || typeof doc !== "object") return { ok: false, reasons: ["not-an-object"] };
  const d = doc as LoraTrainManifest;
  if (d.kind !== LORA_TRAIN_MANIFEST_KIND) reasons.push("kind-mismatch");
  if (d.schemaVersion !== LORA_TRAIN_MANIFEST_SCHEMA_VERSION) reasons.push("schema-version");
  if (d.tier !== "IS-T2-lora-delta") reasons.push("tier-mismatch");
  if (!d.baseModel) reasons.push("missing-base-model");
  if ((d.shardCount ?? 0) < 1) reasons.push("no-shards");
  if ((d.verifyGreenCount ?? 0) < 1) reasons.push("no-verify-green-shards");
  return { ok: reasons.length === 0, reasons };
}

/** Placeholder IS-T2 artifact reference after a successful GPU train (operator fills paths). */
export function buildLoraDeltaShorthandRef(manifest: LoraTrainManifest, adapterPath: string) {
  return {
    kind: INTELLIGENCE_SHORTHAND_KIND,
    tier: "IS-T2-lora-delta" as const,
    loraRef: adapterPath,
    baseModel: manifest.baseModel,
    shardCount: manifest.shardCount,
    verifyGreenCount: manifest.verifyGreenCount,
  };
}
