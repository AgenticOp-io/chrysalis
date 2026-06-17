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
import type { HelperBodyEntry } from "./convert.js";

function helperLiftBodyId(ref: NodeId | HelperBodyEntry): NodeId {
  return typeof ref === "object" && ref !== null && "bodyId" in ref ? ref.bodyId : ref;
}

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

function literalNumericValue(n: NodeBase): number | undefined {
  if (n.dialect !== "data" || n.op !== "literal") return undefined;
  const t = n.type as WebIRType;
  if (t.kind === "int" || t.kind === "float") {
    const v = n.attrs.value;
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  }
  if (t.kind === "literal") {
    const v = t.value;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v !== "") {
      const p = Number(v);
      if (!Number.isNaN(p)) return p;
    }
  }
  return undefined;
}

/**
 * B5.2 v1: `P * 2` ≡ `P + P` when P is the same lowered subtree (param slot after B3/B5).
 * B5.2 v2: commutative `+` / `*` reorder when operand keys differ.
 * B5.3: skipped when `allowArithmetic` is false (body has IR effects).
 */
function helperLiftArithmeticCanonicalKey(
  n: NodeBase,
  operandKeys: readonly string[],
  getNode: (id: NodeId) => NodeBase | undefined,
  allowArithmetic: boolean,
): string | undefined {
  if (!allowArithmetic) return undefined;
  if (n.dialect !== "data" || n.op !== "binop" || operandKeys.length !== 2) return undefined;
  const op = n.attrs.operator;
  if (op === "*" && n.operands.length === 2) {
    const right = getNode(n.operands[1]!);
    const lit = right ? literalNumericValue(right) : undefined;
    if (lit === 2) {
      return `lift-scale2:${operandKeys[0]}`;
    }
  }
  if (op === "+" && operandKeys[0] === operandKeys[1]) {
    return `lift-scale2:${operandKeys[0]}`;
  }
  if ((op === "+" || op === "*") && operandKeys[0] !== operandKeys[1]) {
    const sorted = [...operandKeys].sort();
    return `lift-commutative:${op}:${sorted[0]}:${sorted[1]}`;
  }
  return undefined;
}

/** True when the lowered body contains any node with non-empty effects (**B5.3** gate). */
export function bodyHasIrEffects(
  getNode: (id: NodeId) => NodeBase | undefined,
  rootId: NodeId,
): boolean {
  const seen = new Set<NodeId>();
  const walk = (id: NodeId): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    const n = getNode(id);
    if (!n) return false;
    if (n.effects.length > 0) return true;
    for (const o of n.operands) {
      if (walk(o)) return true;
    }
    return false;
  };
  return walk(rootId);
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

  const registerParamRead = (id: NodeId): void => {
    const n = getNode(id);
    if (!n || n.dialect !== "data" || n.op !== "param") return;
    const name = n.attrs.name;
    if (typeof name === "string" && name.length > 0) {
      localSlotForName(slots, name);
    }
  };

  const walkBlock = (id: NodeId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = getNode(id);
    if (!n) return;
    registerParamRead(id);
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

/** B5.3 v3: collapse SQL whitespace for effectful helper semantic keys. B5.4: uppercase SQL keywords. */
const SQL_KEYWORDS_FOR_HELPER_LIFT = new Set([
  "select",
  "from",
  "where",
  "and",
  "or",
  "insert",
  "into",
  "update",
  "set",
  "delete",
  "join",
  "inner",
  "left",
  "right",
  "outer",
  "on",
  "order",
  "by",
  "group",
  "having",
  "limit",
  "offset",
  "distinct",
  "as",
  "in",
  "is",
  "null",
  "not",
  "values",
]);

export function normalizeSqlLiteralForHelperLift(sql: string): string {
  const collapsed = sql.trim().replace(/\s+/g, " ");
  let out = "";
  let i = 0;
  while (i < collapsed.length) {
    const ch = collapsed[i]!;
    if (ch === "-" && collapsed[i + 1] === "-") {
      out += "--";
      i += 2;
      while (i < collapsed.length) {
        out += collapsed[i]!;
        i++;
      }
      continue;
    }
    if (ch === "/" && collapsed[i + 1] === "*") {
      out += "/*";
      i += 2;
      while (i < collapsed.length - 1 && !(collapsed[i] === "*" && collapsed[i + 1] === "/")) {
        out += collapsed[i]!;
        i++;
      }
      if (i < collapsed.length - 1) {
        out += "*/";
        i += 2;
      }
      continue;
    }
    if (ch === "`") {
      out += ch;
      i++;
      while (i < collapsed.length) {
        const c = collapsed[i]!;
        out += c;
        if (c === "`") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      out += quote;
      i++;
      while (i < collapsed.length) {
        const c = collapsed[i]!;
        out += c;
        if (c === "\\" && quote === '"' && i + 1 < collapsed.length) {
          out += collapsed[i + 1]!;
          i += 2;
          continue;
        }
        if (c === quote) {
          if (quote === "'" && collapsed[i + 1] === "'") {
            out += collapsed[i + 1]!;
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    const wordMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(collapsed.slice(i));
    if (wordMatch) {
      const word = wordMatch[0];
      const lower = word.toLowerCase();
      out += SQL_KEYWORDS_FOR_HELPER_LIFT.has(lower) ? lower.toUpperCase() : word;
      i += word.length;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function normalizeNodeForHelperLiftSemantic(
  n: NodeBase,
  localSlots: ReadonlyMap<string, string>,
): NodeBase {
  let out = n;
  if (out.dialect === "effect" && out.op === "db.query" && typeof out.attrs.sql === "string") {
    const sql = String(out.attrs.sql);
    if (sql && sql !== "<dynamic>") {
      out = { ...out, attrs: { ...out.attrs, sql: normalizeSqlLiteralForHelperLift(sql) } };
    }
  }
  if (localSlots.size === 0) return out;
  n = out;
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
  const allowArithmetic = useSemantic && !bodyHasIrEffects(getNode, rootId);
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
    const arithKey = useSemantic
      ? helperLiftArithmeticCanonicalKey(n, operandKeys, getNode, allowArithmetic)
      : undefined;
    structuralMemo.set(id, arithKey ?? keyFn(n, operandKeys));
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
  bodies: ReadonlyMap<string, NodeId | HelperBodyEntry>,
  getNode: (id: NodeId) => NodeBase | undefined,
  opts?: { readonly ignoreOrigin?: boolean; readonly semantic?: boolean },
): ReadonlyMap<string, string> {
  const aliases = new Map<string, string>();
  const keyToCanonical = new Map<string, string>();
  const names = [...bodies.keys()].sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const rootRef = bodies.get(name);
    if (rootRef === undefined) continue;
    const rootId = helperLiftBodyId(rootRef);
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
  bodies: Map<string, HelperBodyEntry>,
  aliases: ReadonlyMap<string, string>,
): void {
  for (const [alias, canon] of aliases) {
    const canonEntry = bodies.get(canon);
    if (!canonEntry) {
      throw new Error(`applyHelperLiftAliases: canonical ${canon} missing for alias ${alias}`);
    }
    const aliasEntry = bodies.get(alias);
    bodies.set(alias, {
      bodyId: canonEntry.bodyId,
      paramNames: aliasEntry?.paramNames ?? canonEntry.paramNames,
    });
  }
}
