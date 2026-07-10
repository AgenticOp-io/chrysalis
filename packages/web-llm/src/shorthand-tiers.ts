import type { IntelligenceShorthandTier } from "./shorthand.js";

const TIER_ORDER: readonly IntelligenceShorthandTier[] = [
  "IS-T5-oracle-ref",
  "IS-T4-policy-graph",
  "IS-T3-skill-capsule",
  "IS-T2-lora-delta",
  "IS-T1-quantized",
  "IS-T0-weights",
] as const;

export function tierRank(tier: IntelligenceShorthandTier): number {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx < 0) throw new Error(`unknown tier: ${tier}`);
  return idx;
}

export function isHigherTier(a: IntelligenceShorthandTier, b: IntelligenceShorthandTier): boolean {
  return tierRank(a) < tierRank(b);
}

export { TIER_ORDER };
