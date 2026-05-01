/**
 * Canonical structural keys for {@link mergeWebIrModules} cross-shard dedupe.
 * Two lowered nodes from different shard ingests map to the same key iff they
 * are semantically the same IR (dialect/op/type/effects/attrs/origin/provenance
 * and operand subtree keys), so shared lib/ helpers collapse to one graph.
 */

import { createHash } from "node:crypto";
import type { Effect, EffectSet, Locator, NodeBase, Provenance, WebIRType } from "./index.js";

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function stableValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = stableValue(o[k]);
  }
  return out;
}

function canonicalLocator(l: Locator): string {
  return stableJson(l);
}

function canonicalProvenanceList(ps: ReadonlyArray<Provenance>): string {
  const rows = ps.map((p) => stableJson(p));
  rows.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return rows.join("\n");
}

function canonicalEffects(effects: EffectSet): string {
  const tags = effects.map((e) => canonicalEffect(e));
  tags.sort();
  return tags.join("\n");
}

function canonicalEffect(e: Effect): string {
  return stableJson(e);
}

export function canonicalWebIRType(t: WebIRType): string {
  switch (t.kind) {
    case "unknown":
      return "unknown";
    case "void":
      return "void";
    case "null":
      return "null";
    case "bool":
      return "bool";
    case "int":
      return "int";
    case "float":
      return "float";
    case "string":
      return "string";
    case "literal":
      return `literal:${typeof t.value}:${String(t.value)}`;
    case "array":
      return `array:${canonicalWebIRType(t.element)}`;
    case "record": {
      const keys = Object.keys(t.fields).sort();
      const parts = keys.map((k) => `${k}:${canonicalWebIRType(t.fields[k]!)}`);
      return `record:${parts.join(",")}`;
    }
    case "union": {
      const parts = t.members.map(canonicalWebIRType);
      parts.sort();
      return `union:${parts.join(",")}`;
    }
    case "nullable":
      return `nullable:${canonicalWebIRType(t.inner)}`;
    case "named":
      return `named:${t.name}`;
    case "hole":
      return `hole:${canonicalWebIRType(t.contract.input)}->${canonicalWebIRType(t.contract.output)}`;
  }
}

/**
 * Stable hash input for one node given precomputed operand subtree keys
 * (post-order within a shard module).
 */
export function mergeDedupeStructuralKey(n: NodeBase, operandKeys: readonly string[]): string {
  const parts = [
    n.dialect,
    n.op,
    canonicalWebIRType(n.type),
    canonicalEffects(n.effects),
    stableJson(n.attrs),
    canonicalLocator(n.origin),
    canonicalProvenanceList(n.provenance),
    ...operandKeys,
  ];
  const h = createHash("sha256");
  for (const p of parts) {
    h.update(p, "utf8");
    h.update("\0", "utf8");
  }
  return h.digest("hex");
}
