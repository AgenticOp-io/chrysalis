/**
 * Combine disjoint WebIR shard modules (same `sourceApp`) into one {@link Module}.
 * Used when route-level ingest sharding produces one module per shard (V2-M2).
 */

import { ModuleBuilder } from "./builder.js";
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

  for (const m of modules) {
    const idMap = new Map<NodeId, NodeId>();
    const order = postOrderReachable(m);
    for (const oldId of order) {
      idMap.set(oldId, builder.ids.alloc());
    }
    for (const oldId of order) {
      const n = m.nodes.get(oldId)!;
      const newId = idMap.get(oldId)!;
      const operands = n.operands.map((oid) => {
        const mapped = idMap.get(oid);
        if (!mapped) {
          throw new Error(`mergeWebIrModules: operand ${String(oid)} not in shard id map`);
        }
        return mapped;
      });
      const next: NodeBase = {
        id: newId,
        dialect: n.dialect,
        op: n.op,
        type: n.type,
        effects: n.effects,
        operands,
        attrs: n.attrs,
        origin: n.origin,
        provenance: n.provenance,
      };
      builder.node(next);
    }
    for (const r of m.roots) {
      const rk = routeKeyForRoot(m, r);
      if (rk !== null) {
        if (seenRoutes.has(rk)) {
          throw new Error(`mergeWebIrModules: duplicate route "${rk}"`);
        }
        seenRoutes.add(rk);
      }
      const nr = idMap.get(r);
      if (!nr) throw new Error(`mergeWebIrModules: missing root mapping for ${String(r)}`);
      builder.addRoot(nr);
    }
  }

  return builder.finish();
}
