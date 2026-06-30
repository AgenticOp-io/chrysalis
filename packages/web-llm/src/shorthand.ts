import { createHash } from "node:crypto";
import {
  INTELLIGENCE_SHORTHAND_KIND,
  INTELLIGENCE_SHORTHAND_SCHEMA_VERSION,
  WEB_LLM_TRAINING_SHARD_KIND,
} from "./kinds.js";
import type { TrainingShard } from "./types.js";

/** Externalized intelligence tiers — lowest storage/GPU first. */
export type IntelligenceShorthandTier =
  | "IS-T5-oracle-ref"
  | "IS-T4-policy-graph"
  | "IS-T3-skill-capsule"
  | "IS-T2-lora-delta"
  | "IS-T1-quantized"
  | "IS-T0-weights";

export interface IntelligenceShorthandTierSpec {
  tier: IntelligenceShorthandTier;
  label: string;
  /** Typical storage vs 7B bf16 weights for domain-scoped intelligence. Order-of-magnitude band. */
  compressionBand: string;
  /** Typical GPU at inference/train relative to full 7B bf16 fine-tune. */
  gpuBand: string;
  /** What is stored instead of full weights. */
  stores: string;
  /** Chrysalis-native artifact kinds at this tier. */
  artifactKinds: string[];
}

/** Research-backed tier ladder (see docs/INTELLIGENCE-SHORTHAND.md). */
export const INTELLIGENCE_SHORTHAND_TIER_SPECS: readonly IntelligenceShorthandTierSpec[] = [
  {
    tier: "IS-T5-oracle-ref",
    label: "Oracle + traces",
    compressionBand: "10^6–10^9× vs 7B weights (domain routes)",
    gpuBand: "0× LLM — CPU verify only",
    stores: "Probe traces, fixtures, verify replay contracts",
    artifactKinds: ["chrysalis.hub.verify-replay", "chrysalis.site-port.v1"],
  },
  {
    tier: "IS-T4-policy-graph",
    label: "WebIR / CWL policy",
    compressionBand: "10^5–10^7× vs 7B weights (per route/module)",
    gpuBand: "0× LLM — deterministic emit/runtime",
    stores: "CWL routes, WebIR modules, effect middleware",
    artifactKinds: ["chrysalis.webir.module", "cwl.route"],
  },
  {
    tier: "IS-T3-skill-capsule",
    label: "Verify-gated skill capsule",
    compressionBand: "10^3–10^6× vs 7B weights (task family)",
    gpuBand: "Small base model + retrieval; no retrain",
    stores: "Executable skill spec, gate proof, WVB case ids, shard digest",
    artifactKinds: ["chrysalis.web-llm.intelligence-shorthand", "chrysalis.web-llm.training-shard"],
  },
  {
    tier: "IS-T2-lora-delta",
    label: "LoRA / PEFT delta",
    compressionBand: "10^2–10^3× vs full fine-tune (50–500 MB vs 14 GB)",
    gpuBand: "~0.1–0.2× train VRAM vs full FT; shared base at inference",
    stores: "Low-rank adapter matrices only (base frozen)",
    artifactKinds: ["chrysalis.web-llm.lora-manifest"],
  },
  {
    tier: "IS-T1-quantized",
    label: "Quantized weights",
    compressionBand: "4–8× vs bf16 (hard floor ~3 bit/param PTP)",
    gpuBand: "~0.25–0.5× VRAM vs bf16",
    stores: "3–4 bit weight grid (same param count)",
    artifactKinds: ["gguf", "safetensors-quant"],
  },
  {
    tier: "IS-T0-weights",
    label: "Full neural weights",
    compressionBand: "1× baseline",
    gpuBand: "1× baseline (7B bf16 FT ~80 GB VRAM)",
    stores: "All parameters",
    artifactKinds: ["safetensors", "bf16-checkpoint"],
  },
] as const;

export interface IntelligenceShorthandPayload {
  /** Human-readable skill summary (not full chat log). */
  summary: string;
  /** Digest of source training shard when derived from trajectory. */
  shardDigest?: string;
  /** Tool names exercised in verified session. */
  tools?: string[];
  /** CWL/WebIR policy reference (path hash or fixture id). */
  policyRef?: string;
  /** LoRA manifest reference when tier IS-T2. */
  loraRef?: string;
  verifyGate: { name: string; ok: boolean; correctness?: number };
  benchmarkCaseIds?: string[];
}

export interface IntelligenceShorthand {
  kind: typeof INTELLIGENCE_SHORTHAND_KIND;
  schemaVersion: typeof INTELLIGENCE_SHORTHAND_SCHEMA_VERSION;
  id: string;
  tier: IntelligenceShorthandTier;
  domainId: string;
  payload: IntelligenceShorthandPayload;
  /** Estimated bytes for this shorthand artifact alone (excludes shared base model). */
  storageBytesEstimate: number;
  /** Order-of-magnitude compression vs storing domain knowledge in 7B bf16 weights (~14 GB). */
  compressionFactorVs7BWeights: number;
  provenance: string[];
  generatedAt: string;
}

/** Minimal site-port report fields for IS-T4/T5 builders. */
export type SitePortReportLite = {
  ok?: boolean;
  cwl?: { ok?: boolean; cwlPath?: string | null; routeCount?: number | null };
  verify?: { ok?: boolean; correctness?: number; mode?: string };
};

const TIER_COMPRESSION_VS_7B: Record<IntelligenceShorthandTier, number> = {
  "IS-T5-oracle-ref": 1_000_000,
  "IS-T4-policy-graph": 100_000,
  "IS-T3-skill-capsule": 10_000,
  "IS-T2-lora-delta": 300,
  "IS-T1-quantized": 6,
  "IS-T0-weights": 1,
};

function finalizeShorthand(input: {
  tier: IntelligenceShorthandTier;
  domainId: string;
  payload: IntelligenceShorthandPayload;
  provenance: string[];
  idSeed: string;
}): IntelligenceShorthand {
  const storageBytesEstimate = Buffer.byteLength(JSON.stringify(input.payload), "utf8");
  const id = createHash("sha256").update(input.idSeed).digest("hex").slice(0, 16);
  return {
    kind: INTELLIGENCE_SHORTHAND_KIND,
    schemaVersion: INTELLIGENCE_SHORTHAND_SCHEMA_VERSION,
    id: `is-${id}`,
    tier: input.tier,
    domainId: input.domainId,
    payload: input.payload,
    storageBytesEstimate,
    compressionFactorVs7BWeights: TIER_COMPRESSION_VS_7B[input.tier],
    provenance: input.provenance,
    generatedAt: new Date().toISOString(),
  };
}

export type IntelligenceShorthandSummary = {
  count: number;
  totalBytes: number;
  avgBytes: number;
  byTier: Record<IntelligenceShorthandTier, number>;
  domainCount: number;
  minCompressionFactor: number;
  maxCompressionFactor: number;
  /** Reference 7B bf16 size for comparison (bytes). */
  reference7BBytes: number;
  compressionVs7BTotal: number;
};

const REFERENCE_7B_BF16_BYTES = 14 * 1024 * 1024 * 1024;

export function summarizeIntelligenceShorthands(
  shorthands: IntelligenceShorthand[],
): IntelligenceShorthandSummary {
  /** @type {Record<IntelligenceShorthandTier, number>} */
  const byTier = {
    "IS-T5-oracle-ref": 0,
    "IS-T4-policy-graph": 0,
    "IS-T3-skill-capsule": 0,
    "IS-T2-lora-delta": 0,
    "IS-T1-quantized": 0,
    "IS-T0-weights": 0,
  };
  let totalBytes = 0;
  let minCompressionFactor = Infinity;
  let maxCompressionFactor = 0;
  const domains = new Set<string>();
  for (const s of shorthands) {
    byTier[s.tier] += 1;
    totalBytes += s.storageBytesEstimate;
    domains.add(s.domainId);
    minCompressionFactor = Math.min(minCompressionFactor, s.compressionFactorVs7BWeights);
    maxCompressionFactor = Math.max(maxCompressionFactor, s.compressionFactorVs7BWeights);
  }
  if (!shorthands.length) minCompressionFactor = 0;
  return {
    count: shorthands.length,
    totalBytes,
    avgBytes: shorthands.length ? Math.round(totalBytes / shorthands.length) : 0,
    byTier,
    domainCount: domains.size,
    minCompressionFactor,
    maxCompressionFactor,
    reference7BBytes: REFERENCE_7B_BF16_BYTES,
    compressionVs7BTotal: totalBytes > 0 ? Math.round(REFERENCE_7B_BF16_BYTES / totalBytes) : 0,
  };
}

export function buildPolicyGraphShorthandFromPortReport(
  domainId: string,
  portReport: SitePortReportLite,
  opts: { policyRef?: string; provenance?: string[] } = {},
): IntelligenceShorthand | null {
  if (portReport.ok !== true || portReport.cwl?.ok !== true) return null;
  const policyRef = opts.policyRef ?? portReport.cwl?.cwlPath ?? domainId;
  const routeCount = portReport.cwl?.routeCount ?? null;
  const payload: IntelligenceShorthandPayload = {
    summary: `CWL policy graph for ${domainId}${routeCount != null ? ` (${routeCount} routes)` : ""}`,
    policyRef,
    verifyGate: {
      name: "site-port:cwl",
      ok: true,
      ...(portReport.verify?.correctness != null ? { correctness: portReport.verify.correctness } : {}),
    },
  };
  return finalizeShorthand({
    tier: "IS-T4-policy-graph",
    domainId,
    payload,
    provenance: opts.provenance ?? ["chrysalis.web-llm.shorthand.from-port-report"],
    idSeed: `${domainId}:IS-T4:${policyRef}`,
  });
}

export function buildOracleRefShorthandFromPortReport(
  domainId: string,
  portReport: SitePortReportLite,
  opts: { provenance?: string[] } = {},
): IntelligenceShorthand | null {
  if (portReport.ok !== true) return null;
  if (portReport.verify?.ok !== true) return null;
  if ((portReport.verify.correctness ?? 0) < 1) return null;
  const correctness = portReport.verify.correctness ?? 1;
  const payload: IntelligenceShorthandPayload = {
    summary: `Oracle verify replay for ${domainId} (${portReport.verify.mode ?? "probe-replay"})`,
    verifyGate: {
      name: "site-port:verify",
      ok: true,
      correctness,
    },
  };
  return finalizeShorthand({
    tier: "IS-T5-oracle-ref",
    domainId,
    payload,
    provenance: opts.provenance ?? ["chrysalis.web-llm.shorthand.from-port-report"],
    idSeed: `${domainId}:IS-T5:oracle`,
  });
}

export function tierSpec(tier: IntelligenceShorthandTier): IntelligenceShorthandTierSpec {
  const spec = INTELLIGENCE_SHORTHAND_TIER_SPECS.find((s) => s.tier === tier);
  if (!spec) throw new Error(`unknown tier: ${tier}`);
  return spec;
}

/** Prefer the smallest tier that can satisfy verify for a domain task. */
export function preferredShorthandTierForTask(opts: {
  hasOracleReplay: boolean;
  hasPolicyGraph: boolean;
  needsNovelLanguage: boolean;
}): IntelligenceShorthandTier {
  if (opts.hasOracleReplay && !opts.needsNovelLanguage) return "IS-T5-oracle-ref";
  if (opts.hasPolicyGraph && !opts.needsNovelLanguage) return "IS-T4-policy-graph";
  if (!opts.needsNovelLanguage) return "IS-T3-skill-capsule";
  return "IS-T2-lora-delta";
}

export function digestTrainingShard(shard: TrainingShard): string {
  const raw = JSON.stringify({
    id: shard.id,
    sessionId: shard.sessionId,
    gate: shard.gate,
    tools: shard.tools,
    messageCount: shard.messages.length,
  });
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

/**
 * Collapse a verify-green training shard into a skill capsule (IS-T3).
 * Drops raw message bodies — keeps gate proof + tool footprint + digest.
 */
export function buildSkillCapsuleFromShard(
  shard: TrainingShard,
  opts: { domainId?: string; provenance?: string[] } = {},
): IntelligenceShorthand | null {
  if (shard.kind !== WEB_LLM_TRAINING_SHARD_KIND) return null;
  if (shard.gate?.ok !== true) return null;

  const domainId = opts.domainId ?? shard.sessionId;
  const summaryLines = shard.messages
    .filter((m) => m.role === "assistant" || m.role === "user")
    .slice(-4)
    .map((m) => `${m.role}: ${m.content.slice(0, 240)}${m.content.length > 240 ? "…" : ""}`);

  const payload: IntelligenceShorthandPayload = {
    summary: summaryLines.join("\n") || "verify-green site-port session",
    shardDigest: digestTrainingShard(shard),
    verifyGate: {
      name: shard.gate.name,
      ok: true,
      ...(typeof shard.gate.detail?.correctness === "number"
        ? { correctness: shard.gate.detail.correctness }
        : {}),
    },
  };
  if (shard.tools?.length) payload.tools = shard.tools;
  if (shard.benchmarkCaseIds?.length) payload.benchmarkCaseIds = shard.benchmarkCaseIds;

  return finalizeShorthand({
    tier: "IS-T3-skill-capsule",
    domainId,
    payload,
    provenance: opts.provenance ?? ["chrysalis.web-llm.shorthand.from-shard"],
    idSeed: `${domainId}:${payload.shardDigest}:IS-T3`,
  });
}

export function validateIntelligenceShorthand(doc: unknown): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!doc || typeof doc !== "object") return { ok: false, reasons: ["not-an-object"] };
  const d = doc as IntelligenceShorthand;
  if (d.kind !== INTELLIGENCE_SHORTHAND_KIND) reasons.push("kind-mismatch");
  if (d.schemaVersion !== INTELLIGENCE_SHORTHAND_SCHEMA_VERSION) reasons.push("schema-version");
  if (!d.id || !d.domainId) reasons.push("missing-id-or-domain");
  if (!INTELLIGENCE_SHORTHAND_TIER_SPECS.some((s) => s.tier === d.tier)) reasons.push("unknown-tier");
  if (d.payload?.verifyGate?.ok !== true) reasons.push("verify-gate-not-ok");
  return { ok: reasons.length === 0, reasons };
}
