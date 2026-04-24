/**
 * Deterministic JSON snapshot of a {@link Module} for golden tests.
 * Node ids and roots keep ingest order; the `nodes` array is sorted by id so
 * diffs are stable across Map iteration differences.
 */

import type { Module, NodeBase, NodeId } from "./index.js";

function stableValue(v: unknown): unknown {
  if (v === null || typeof v !== "object") {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map(stableValue);
  }
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = stableValue(o[k]);
  }
  return out;
}

function nodeToGolden(n: NodeBase): unknown {
  return {
    id: String(n.id),
    dialect: n.dialect,
    op: n.op,
    type: stableValue(n.type),
    effects: stableValue(n.effects),
    operands: n.operands.map((id) => String(id)),
    attrs: stableValue(n.attrs),
    origin: stableValue(n.origin),
    provenance: stableValue(n.provenance),
  };
}

/**
 * Serialize a module to pretty-printed JSON with stable node ordering.
 * Suitable for committing as a golden file; compare with string equality.
 */
export function moduleToGoldenSnapshot(mod: Module): string {
  const sortedIds = [...mod.nodes.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const nodes = sortedIds.map((id) => nodeToGolden(mod.nodes.get(id)!));
  const payload = {
    meta: stableValue(mod.meta) as unknown,
    roots: mod.roots.map((id: NodeId) => String(id)),
    nodes,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
