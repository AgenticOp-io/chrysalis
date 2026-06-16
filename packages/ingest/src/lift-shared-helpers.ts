/**
 * IR helper lifting (B2/B3): canonicalize lib/vendor function bodies for merge.
 */

import {
  mergeDedupeStructuralKey,
  mergeDedupeStructuralKeyForHelperLift,
  mergeDedupeStructuralKeyIgnoringOrigin,
  type NodeBase,
  type NodeId,
  type WebIRType,
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

function localSlotForName(slots: Map<string, string>, raw: string): string {
  const bare = raw.startsWith("$") ? raw.slice(1) : raw;
  const keyed = raw.startsWith("$") ? raw : `$${bare}`;
  const existing = slots.get(raw) ?? slots.get(bare) ?? slots.get(keyed);
  if (existing) return existing;
  const slot = `__l${slots.size}`;
  slots.set(raw, slot);
  slots.set(bare, slot);
  slots.set(keyed, slot);
  return slot;
}

function literalStringValue(n: NodeBase): string | undefined {
  if (n.dialect !== "data" || n.op !== "literal") return undefined;
  const t = n.type as WebIRType;
  if (t.kind !== "string") return undefined;
  const v = n.attrs.value;
  return typeof v === "string" ? v : undefined;
}

function isAssignCall(getNode: (id: NodeId) => NodeBase | undefined, n: NodeBase): boolean {
  return n.dialect === "data" && n.op === "call" && n.attrs.callee === "__assign";
}

/**
 * Map PHP local names in a lowered function body to order-based slots (**B3**).
 */
export function buildHelperLiftLocalSlotMap(
  getNode: (id: NodeId) => NodeBase | undefined,
  rootId: NodeId,
): ReadonlyMap<string, string> {
  const slots = new Map<string, string>();
  const seen = new Set<NodeId>();

  const registerAssignTarget = (id: NodeId): void => {
    const n = getNode(id);
    if (!n || !isAssignCall(getNode, n) || n.operands.length < 2) return;
    const nameLit = getNode(n.operands[0]!);
    const name = nameLit ? literalStringValue(nameLit) : undefined;
    if (name) localSlotForName(slots, name);
  };

  const walkBlock = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = getNode(id);
    if (!n) return;
    if (n.dialect === "data" && n.op === "block") {
      for (const stmtId of n.operands) {
        registerAssignTarget(stmtId);
        walkBlock(stmtId);
      }
      return;
    }
    registerAssignTarget(id);
    for (const o of n.operands) walkBlock(o);
  };

  walkBlock(rootId);
  return slots;
}

function normalizeNodeForHelperLiftSemantic(
  n: NodeBase,
  localSlots: ReadonlyMap<string, string>,
): NodeBase {
  if (localSlots.size === 0) return n;
  if (n.op === "literal") {
    const v = literalStringValue(n);
    if (v !== undefined) {
      const slot = localSlots.get(v) ?? localSlots.get(`$${v}`) ?? localSlots.get(v.startsWith("$") ? v.slice(1) : v);
      if (slot) {
        return { ...n, attrs: { ...n.attrs, value: slot } };
      }
    }
  }
  if (n.op === "param" && typeof n.attrs.name === "string") {
    const name = n.attrs.name;
    const slot =
      localSlots.get(name) ??
      localSlots.get(`$${name}`) ??
      localSlots.get(name.startsWith("$") ? name.slice(1) : name);
    if (slot) {
      return { ...n, attrs: { ...n.attrs, name: slot } };
    }
  }
  return n;
}

/** Structural hash for one lowered function body subtree. */
export function functionBodyStructuralKey(
  getNode: (id: NodeId) => NodeBase | undefined,
  rootId: NodeId,
  opts?: {
    readonly ignoreOrigin?: boolean;
    readonly forHelperLift?: boolean;
    readonly forHelperLiftSemantic?: boolean;
  },
): string {
  if (subgraphHasHole(getNode, rootId)) {
    return `hole:${String(rootId)}`;
  }
  const useSemantic = opts?.forHelperLiftSemantic === true;
  const useLift = opts?.forHelperLift === true || useSemantic;
  const keyFn = useLift
    ? opts?.ignoreOrigin === false
      ? mergeDedupeStructuralKey
      : mergeDedupeStructuralKeyForHelperLift
    : opts?.ignoreOrigin === true
      ? mergeDedupeStructuralKeyIgnoringOrigin
      : mergeDedupeStructuralKey;
  const localSlots = useSemantic ? buildHelperLiftLocalSlotMap(getNode, rootId) : new Map<string, string>();
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
    const raw = getNode(id)!;
    const n = useSemantic ? normalizeNodeForHelperLiftSemantic(raw, localSlots) : raw;
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
  opts?: { readonly ignoreOrigin?: boolean; readonly semantic?: boolean },
): ReadonlyMap<string, string> {
  const aliases = new Map<string, string>();
  const keyToCanonical = new Map<string, string>();
  const names = [...bodies.keys()].sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const rootId = bodies.get(name);
    if (!rootId) continue;
    const key = functionBodyStructuralKey(getNode, rootId, {
      forHelperLift: true,
      ...(opts?.ignoreOrigin === false ? { ignoreOrigin: false as const } : {}),
      ...(opts?.semantic === true ? { forHelperLiftSemantic: true as const } : {}),
    });
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
