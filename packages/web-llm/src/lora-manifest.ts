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

/** Repo-relative posix paths so Windows prep → Linux GPU VM stays portable (G9620 / D6395). */
const REL_DATASET_JSONL = "reports/web-llm/dataset/training-shards.v1.jsonl";
const REL_DATASET_JSON = "reports/web-llm/dataset/training-shards.v1.json";
const REL_EVAL_PROMPTS = "reports/web-llm/dataset/wvb-eval-prompts.v1.json";
const REL_SHORTHAND = "reports/web-llm/shorthand/intelligence-shorthands.v1.json";
const REL_OUTPUT_DIR = "reports/web-llm/lora";

export function buildLoraTrainManifest(opts: {
  repoRoot: string;
  shards?: TrainingShard[];
  baseModel?: string;
  provenance?: string[];
}): LoraTrainManifest {
  const repoRoot = opts.repoRoot;
  const jsonlAbs = join(repoRoot, REL_DATASET_JSONL);
  const evalAbs = join(repoRoot, REL_EVAL_PROMPTS);
  const shorthandAbs = join(repoRoot, REL_SHORTHAND);

  const shards = opts.shards ?? readTrainingShardsFromJsonl(jsonlAbs);
  const verifyGreenCount = shards.filter((s) => s.gate?.ok === true).length;

  return {
    kind: LORA_TRAIN_MANIFEST_KIND,
    schemaVersion: LORA_TRAIN_MANIFEST_SCHEMA_VERSION,
    tier: "IS-T2-lora-delta",
    baseModel: opts.baseModel ?? DEFAULT_IS_T2_BASE_MODEL,
    shardCount: shards.length,
    verifyGreenCount,
    datasetJsonlPath: REL_DATASET_JSONL,
    datasetJsonPath: REL_DATASET_JSON,
    evalPromptsPath: existsSync(evalAbs) ? REL_EVAL_PROMPTS : null,
    shorthandBundlePath: existsSync(shorthandAbs) ? REL_SHORTHAND : null,
    outputDir: REL_OUTPUT_DIR,
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
