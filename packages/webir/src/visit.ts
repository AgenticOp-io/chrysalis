import type { Module, NodeBase, NodeId } from "./index.js";

/** Post-order traversal over a Module, starting from each root. */
export function walk(
  m: Module,
  visit: (n: NodeBase, m: Module) => void,
): void {
  const seen = new Set<NodeId>();
  const go = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = m.nodes.get(id);
    if (!n) throw new Error(`webir.walk: missing node ${String(id)}`);
    for (const op of n.operands) go(op);
    visit(n, m);
  };
  for (const r of m.roots) go(r);
}

export function allNodes(m: Module): NodeBase[] {
  const out: NodeBase[] = [];
  walk(m, (n) => out.push(n));
  return out;
}

export function countByDialect(m: Module): Record<string, number> {
  const counts: Record<string, number> = {};
  walk(m, (n) => {
    counts[n.dialect] = (counts[n.dialect] ?? 0) + 1;
  });
  return counts;
}

export function countHoles(m: Module): number {
  let n = 0;
  walk(m, (node) => {
    if (node.dialect === "data" && node.op === "hole") n += 1;
  });
  return n;
}

/**
 * IR-level **coverage** (Milestone 4 / DESIGN success metrics): fraction of
 * reachable nodes that are not `data.hole`. Uses the same root-walk as
 * {@link countHoles}.
 */
export function irCoverageStats(m: Module): {
  readonly nodeCount: number;
  readonly holeCount: number;
  /** 0..1; 1 when every reachable node is a non-hole. */
  readonly coverage: number;
} {
  let nodeCount = 0;
  let holeCount = 0;
  walk(m, (node) => {
    nodeCount += 1;
    if (node.dialect === "data" && node.op === "hole") holeCount += 1;
  });
  const coverage = nodeCount === 0 ? 1 : (nodeCount - holeCount) / nodeCount;
  return { nodeCount, holeCount, coverage };
}
