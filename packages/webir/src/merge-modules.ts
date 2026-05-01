/**
 * Combine disjoint WebIR shard modules (same `sourceApp`) into one {@link Module}.
 * Used when route-level ingest sharding produces one module per shard (V2-M2).
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
    if (!n) throw new Error(`mergeWebIrModules: missing node ${String(id)}`);
    for (const o of n.operands) walk(o);
    order.push(id);
  };
  for (const r of m.roots) walk(r);
  return order;
}

function routeKeyForRoot(m: Module, rootId: NodeId): string | null {
  const n = m.nodes.get(rootId);
  if (!n || n.dialect !== "web.request" || n.op !== "route") return null;
  const method = n.attrs.method;
  const path = n.attrs.path;
  if (typeof method === "string" && typeof path === "string") return `${method} ${path}`;
  return null;
}

/**
 * Merge multiple shard {@link Module}s into a single module. Each shard must
 * own disjoint routes (no duplicate `METHOD path` on root `web.request` route
 * nodes). NodeIds are remapped into a fresh graph so operand edges stay valid.
 *
 * Identical subgraphs lowered from the same PHP origins (shared `lib/`, etc.)
 * are **deduplicated** across shards using a structural key (dialect, op,
 * types, effects, attrs, origin, provenance, and operand subtree keys), so
 * merged `nodes.size` can match monolithic ingest for the same project.
 *
 * @throws if `sourceApp` differs across inputs, on duplicate route keys, or on
 *   operand graph inconsistencies.
 */
export function mergeWebIrModules(modules: readonly Module[]): Module {
  if (modules.length === 0) throw new Error("mergeWebIrModules: expected at least one module");
  if (modules.length === 1) return modules[0]!;

  const apps = [...new Set(modules.map((m) => m.meta.sourceApp))];
  if (apps.length !== 1) {
    throw new Error(`mergeWebIrModules: sourceApp mismatch (${apps.join(" vs ")})`);
  }

  const builder = new ModuleBuilder({
    sourceApp: modules[0]!.meta.sourceApp,
    chrysalisVersion: modules[0]!.meta.chrysalisVersion,
  });
  const seenRoutes = new Set<string>();
  /** Structural key -> canonical NodeId in the merged builder (first shard wins). */
  const globalKeyToNewId = new Map<string, NodeId>();

  for (const m of modules) {
    const localOldToNew = new Map<NodeId, NodeId>();
    const structuralMemo = new Map<NodeId, string>();
    const order = postOrderReachable(m);

    for (const oldId of order) {
      const n = m.nodes.get(oldId)!;
      const operandKeys = n.operands.map((oid) => {
        const k = structuralMemo.get(oid);
        if (!k) {
          throw new Error(`mergeWebIrModules: operand ${String(oid)} not in structural memo`);
        }
        return k;
      });
      const key = mergeDedupeStructuralKey(n, operandKeys);
      const existing = globalKeyToNewId.get(key);
      if (existing !== undefined) {
        localOldToNew.set(oldId, existing);
        structuralMemo.set(oldId, key);
        continue;
      }
      const newOperandIds = n.operands.map((oid) => {
        const mapped = localOldToNew.get(oid);
        if (!mapped) {
          throw new Error(`mergeWebIrModules: operand ${String(oid)} not in shard id map`);
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
      globalKeyToNewId.set(key, newId);
      localOldToNew.set(oldId, newId);
      structuralMemo.set(oldId, key);
    }

    for (const r of m.roots) {
      const rk = routeKeyForRoot(m, r);
      if (rk !== null) {
        if (seenRoutes.has(rk)) {
          throw new Error(`mergeWebIrModules: duplicate route "${rk}"`);
        }
        seenRoutes.add(rk);
      }
      const nr = localOldToNew.get(r);
      if (!nr) throw new Error(`mergeWebIrModules: missing root mapping for ${String(r)}`);
      builder.addRoot(nr);
    }
  }

  return builder.finish();
}
