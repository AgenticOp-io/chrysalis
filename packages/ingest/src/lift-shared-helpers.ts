/**
 * IR helper lifting v0 (B2): canonicalize lib/vendor function bodies that are
 * structurally identical (origin- and provenance-insensitive lift key).
 */

import {
  mergeDedupeStructuralKey,
  mergeDedupeStructuralKeyForHelperLift,
  mergeDedupeStructuralKeyIgnoringOrigin,
  type NodeBase,
  type NodeId,
} from "@chrysalis/webir";

function subgraphHasHole(getNode: (id: NodeId) => NodeBase | undefined, rootId: NodeId): boolean {
  const seen = new Set<NodeId>();
  const walk = (id: NodeId): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    const n = getNode(id);
    if (!n) return false;
    if (n.dialect === "data" && n.op === "hole") return true;
    for (const o of n.operands) {
      if (walk(o)) return true;
    }
    return false;
  };
  return walk(rootId);
}

/** Structural hash for one lowered function body subtree. */
export function functionBodyStructuralKey(
  getNode: (id: NodeId) => NodeBase | undefined,
  rootId: NodeId,
  opts?: { readonly ignoreOrigin?: boolean; readonly forHelperLift?: boolean },
): string {
  if (subgraphHasHole(getNode, rootId)) {
    return `hole:${String(rootId)}`;
  }
  const keyFn = opts?.forHelperLift === true
    ? mergeDedupeStructuralKeyForHelperLift
    : opts?.ignoreOrigin === true
      ? mergeDedupeStructuralKeyIgnoringOrigin
      : mergeDedupeStructuralKey;
  const structuralMemo = new Map<NodeId, string>();
  const order: NodeId[] = [];
  const seen = new Set<NodeId>();
  const walk = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = getNode(id);
    if (!n) {
      throw new Error(`functionBodyStructuralKey: missing node ${String(id)}`);
    }
    for (const o of n.operands) walk(o);
    order.push(id);
  };
  walk(rootId);
  for (const id of order) {
    const n = getNode(id)!;
    const operandKeys = n.operands.map((oid) => {
      const k = structuralMemo.get(oid);
      if (!k) {
        throw new Error(`functionBodyStructuralKey: operand ${String(oid)} missing structural memo`);
      }
      return k;
    });
    structuralMemo.set(id, keyFn(n, operandKeys));
  }
  const rootKey = structuralMemo.get(rootId);
  if (!rootKey) {
    throw new Error(`functionBodyStructuralKey: missing root key for ${String(rootId)}`);
  }
  return rootKey;
}

/**
 * Map alias function name → canonical name (lexicographically first per equivalence class).
 */
export function buildHelperLiftAliasMap(
  bodies: ReadonlyMap<string, NodeId>,
  getNode: (id: NodeId) => NodeBase | undefined,
  opts?: { readonly ignoreOrigin?: boolean },
): ReadonlyMap<string, string> {
  const aliases = new Map<string, string>();
  const keyToCanonical = new Map<string, string>();
  const names = [...bodies.keys()].sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const rootId = bodies.get(name);
    if (!rootId) continue;
    const key = functionBodyStructuralKey(getNode, rootId, { forHelperLift: true });
    const canon = keyToCanonical.get(key);
    if (canon === undefined) {
      keyToCanonical.set(key, name);
      continue;
    }
    if (canon !== name) {
      aliases.set(name, canon);
    }
  }
  return aliases;
}

/** Point alias names at the canonical function body root in the bodies map. */
export function applyHelperLiftAliases(
  bodies: Map<string, NodeId>,
  aliases: ReadonlyMap<string, string>,
): void {
  for (const [alias, canon] of aliases) {
    const canonId = bodies.get(canon);
    if (!canonId) {
      throw new Error(`applyHelperLiftAliases: canonical ${canon} missing for alias ${alias}`);
    }
    bodies.set(alias, canonId);
  }
}
