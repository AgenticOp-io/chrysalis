/**
 * Optional within-module structural dedupe for monolithic WebIR (**DESIGN D283**).
 * Reuses the same structural key as {@link mergeWebIrModules} (**DESIGN D247**).
 */

import { ModuleBuilder } from "./builder.js";
import { mergeDedupeStructuralKey } from "./merge-dedupe-key.js";
import type { Module, NodeBase, NodeId } from "./index.js";

function postOrderReachable(m: Module): NodeId[] {
  const order: NodeId[] = [];
  const seen = new Set<NodeId>();
  const walk = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = m.nodes.get(id);
    if (!n) throw new Error(`dedupeStructuralSubgraphsInModule: missing node ${String(id)}`);
    for (const o of n.operands) walk(o);
    order.push(id);
  };
  for (const r of m.roots) walk(r);
  return order;
}

/**
 * Collapses structurally identical subgraphs reachable from {@link Module.roots}
 * into canonical nodes (first post-order occurrence wins). Same key contract as
 * {@link mergeWebIrModules}: dialect, op, type, effects, attrs, origin, provenance,
 * and operand subtree keys (**`mergeDedupeStructuralKey`**).
 *
 * Intended for **optional** ingest-time use when monolithic lowering duplicates
 * identical helpers across routes (**ROADMAP** V2-M4 *Remaining* slice). Default
 * ingest leaves the graph unchanged.
 */
export function dedupeStructuralSubgraphsInModule(m: Module): Module {
  const builder = new ModuleBuilder({
    sourceApp: m.meta.sourceApp,
    chrysalisVersion: m.meta.chrysalisVersion,
  });
  const keyToCanonicalNewId = new Map<string, NodeId>();
  const oldToNew = new Map<NodeId, NodeId>();
  const structuralMemo = new Map<NodeId, string>();
  const order = postOrderReachable(m);

  for (const oldId of order) {
    const n = m.nodes.get(oldId)!;
    const operandKeys = n.operands.map((oid) => {
      const k = structuralMemo.get(oid);
      if (!k) {
        throw new Error(
          `dedupeStructuralSubgraphsInModule: operand ${String(oid)} missing structural memo`,
        );
      }
      return k;
    });
    const key = mergeDedupeStructuralKey(n, operandKeys);
    const existing = keyToCanonicalNewId.get(key);
    if (existing !== undefined) {
      oldToNew.set(oldId, existing);
      structuralMemo.set(oldId, key);
      continue;
    }
    const newOperandIds = n.operands.map((oid) => {
      const mapped = oldToNew.get(oid);
      if (!mapped) {
        throw new Error(`dedupeStructuralSubgraphsInModule: operand ${String(oid)} not mapped`);
      }
      return mapped;
    });
    const newId = builder.ids.alloc();
    const next: NodeBase = {
      id: newId,
      dialect: n.dialect,
      op: n.op,
      type: n.type,
      effects: n.effects,
      operands: newOperandIds,
      attrs: n.attrs,
      origin: n.origin,
      provenance: n.provenance,
    };
    builder.node(next);
    keyToCanonicalNewId.set(key, newId);
    oldToNew.set(oldId, newId);
    structuralMemo.set(oldId, key);
  }

  for (const r of m.roots) {
    const nr = oldToNew.get(r);
    if (!nr) throw new Error(`dedupeStructuralSubgraphsInModule: missing root mapping for ${String(r)}`);
    builder.addRoot(nr);
  }

  return builder.finish();
}
