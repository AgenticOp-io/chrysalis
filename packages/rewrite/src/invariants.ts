/**
 * Invariant verifier for rewrite passes.
 *
 * Design (see DESIGN.md D16): HTTP-replay-level verification
 * (`@chrysalis/verify`) is the gold-standard behavioral oracle, but it
 * requires spinning up a running server and a full recorded corpus,
 * which is too heavy to run *per opportunity* inside `applyRewrites`.
 * Instead, each `RewritePass` declares a cheap, module-level **structural
 * invariant** that must hold between the pre- and post-rewrite modules.
 * The invariant framework checks that the declared invariants hold and
 * rolls back the opportunity if they don't.
 *
 * Invariants are intentionally coarse: they cannot prove full behavioral
 * equivalence (they can't — that would require an interpreter over the
 * IR), but they can cheaply rule out the pass classes of bug we care
 * about most in an autonomous rewrite pipeline:
 *
 *   - a "sanitize" pass accidentally deleting an effect (e.g. losing a
 *     DB write)
 *   - a pass introducing an un-provenance-tagged node (breaks the audit
 *     trail)
 *   - a pass mutating effects it didn't claim to touch
 *
 * HTTP-level verification still lives in `@chrysalis/verify`; it's run
 * once, end-to-end, by the CLI after the full rewrite batch is applied.
 * The two layers are complementary: invariants are the fast, per-pass
 * gate; HTTP replay is the slow, holistic gate.
 */

import type { Module, NodeBase, NodeId } from "@chrysalis/webir";

/**
 * A `MayModifyPattern` identifies a class of nodes a pass is allowed
 * to mutate. Two forms:
 *
 *   - a bare `dialect.op` string (e.g. `"effect.echo"`) — matches any
 *     node with that dialect/op pair regardless of attrs
 *   - a refined form `{ dialectOp, attrMatch }` — matches only nodes
 *     whose attrs contain at least every key in `attrMatch` and whose
 *     values are `===` (deep-equal for primitives). Useful when a pass
 *     touches one sub-shape of a general op: `sanitize-output` only
 *     mutates `data.binop` *with* `operator: "."` (PHP string concat),
 *     so arithmetic `+` / `*` binops still trigger `modified-disallowed`
 *     if tampered.
 */
export type MayModifyPattern =
  | string
  | {
      readonly dialectOp: string;
      readonly attrMatch: Readonly<Record<string, unknown>>;
    };

/**
 * Declarative spec of what a pass may mutate. `applyRewrites` checks
 * that anything *not* matched by the allowlist is preserved
 * byte-for-byte between the pre- and post-rewrite module.
 */
export interface InvariantSpec {
  readonly mayModify?: ReadonlyArray<MayModifyPattern>;
  /**
   * Effect kinds whose *count* must be preserved exactly. Defaults to
   * every effect kind the module already contains. Lets passes declare
   * "I never change the number of DB writes, echoes, or redirects."
   */
  readonly preserveEffectCounts?: ReadonlyArray<string>;
}

export interface InvariantViolation {
  readonly kind:
    | "missing-node"
    | "modified-disallowed"
    | "effect-count-changed"
    | "untagged-new-node";
  readonly nodeId?: NodeId;
  readonly detail: string;
}

export interface InvariantResult {
  readonly ok: boolean;
  readonly violations: ReadonlyArray<InvariantViolation>;
}

/** Dialect.op pairs that represent observable external effects. */
const DEFAULT_EFFECT_KINDS: ReadonlyArray<string> = [
  "effect.echo",
  "effect.db.query",
  "effect.db.exec",
  "effect.session.write",
  "effect.session.destroy",
  "effect.http.response",
  "effect.http.redirect",
  "effect.http.header",
  "effect.cookie.set",
  "effect.cookie.delete",
];

function dialectOp(n: NodeBase): string {
  return `${n.dialect}.${n.op}`;
}

function structuralKey(n: NodeBase): string {
  // A node outside the pass's `mayModify` allowlist must be preserved
  // byte-for-byte in everything that affects behavior: dialect, op,
  // full attrs (sql text, table list, callee, operator, status, etc.),
  // operand pointers, and declared effects. Provenance is deliberately
  // ignored — appending an audit trail entry doesn't change semantics.
  return JSON.stringify({
    dialect: n.dialect,
    op: n.op,
    attrs: n.attrs ?? {},
    operands: [...n.operands],
    effects: [...n.effects],
    type: n.type,
  });
}

function hasIntentRewriteProvenance(n: NodeBase): boolean {
  return n.provenance.some((p) => p.source === "intent-rewrite");
}

function matchesMayModify(
  n: NodeBase,
  patterns: ReadonlyArray<MayModifyPattern>,
): boolean {
  const dop = dialectOp(n);
  for (const p of patterns) {
    if (typeof p === "string") {
      if (p === dop) return true;
      continue;
    }
    if (p.dialectOp !== dop) continue;
    const attrs = (n.attrs as Record<string, unknown> | undefined) ?? {};
    let ok = true;
    for (const [k, v] of Object.entries(p.attrMatch)) {
      if (attrs[k] !== v) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function verifyInvariants(
  before: Module,
  after: Module,
  spec: InvariantSpec,
): InvariantResult {
  const violations: InvariantViolation[] = [];
  const mayModify = spec.mayModify ?? [];

  for (const [id, beforeNode] of before.nodes) {
    const afterNode = after.nodes.get(id);
    if (!afterNode) {
      violations.push({
        kind: "missing-node",
        nodeId: id,
        detail: `node ${String(id)} (${dialectOp(beforeNode)}) present before but not after`,
      });
      continue;
    }
    const dop = dialectOp(beforeNode);
    // A node is allowed to be modified if either before-state or
    // after-state matches a mayModify pattern. We check both so that a
    // pass can e.g. narrow a sub-shape's attrs (though that's rare).
    if (matchesMayModify(beforeNode, mayModify) || matchesMayModify(afterNode, mayModify)) continue;
    const beforeKey = structuralKey(beforeNode);
    const afterKey = structuralKey(afterNode);
    if (beforeKey !== afterKey) {
      violations.push({
        kind: "modified-disallowed",
        nodeId: id,
        detail: `node ${String(id)} (${dop}) structurally changed; pass did not declare ${dop} in mayModify`,
      });
    }
  }

  // New nodes (in `after` but not `before`) must carry the
  // intent-rewrite provenance tag. Otherwise we can't attribute the
  // addition back to a specific pass in the audit trail.
  for (const [id, afterNode] of after.nodes) {
    if (before.nodes.has(id)) continue;
    if (!hasIntentRewriteProvenance(afterNode)) {
      violations.push({
        kind: "untagged-new-node",
        nodeId: id,
        detail: `new node ${String(id)} (${dialectOp(afterNode)}) has no intent-rewrite provenance`,
      });
    }
  }

  const effectKinds = spec.preserveEffectCounts ?? DEFAULT_EFFECT_KINDS;
  const effectKindSet = new Set(effectKinds);
  const countBefore = new Map<string, number>();
  const countAfter = new Map<string, number>();
  for (const n of before.nodes.values()) {
    const dop = dialectOp(n);
    if (effectKindSet.has(dop)) {
      countBefore.set(dop, (countBefore.get(dop) ?? 0) + 1);
    }
  }
  for (const n of after.nodes.values()) {
    const dop = dialectOp(n);
    if (effectKindSet.has(dop)) {
      countAfter.set(dop, (countAfter.get(dop) ?? 0) + 1);
    }
  }
  for (const kind of effectKindSet) {
    const b = countBefore.get(kind) ?? 0;
    const a = countAfter.get(kind) ?? 0;
    if (b !== a) {
      violations.push({
        kind: "effect-count-changed",
        detail: `effect-kind ${kind} count changed: ${b} → ${a}`,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}

export function formatViolations(vs: ReadonlyArray<InvariantViolation>): string {
  if (vs.length === 0) return "(none)";
  return vs.map((v) => `${v.kind}: ${v.detail}`).join("; ");
}
