/**
 * Intra-handler taint analysis.
 *
 * We model one binary taint lattice: a value is either **tainted** (derived
 * from untrusted input — request fields or session state) or **clean**
 * (literal, sanitized, or derived exclusively from clean inputs).
 *
 * The primitive is a simple fixpoint-free post-order propagation, which is
 * sound because WebIR values are SSA-ish (every `data` node produces a
 * single value and has no control-flow back-edges). Local variable reads
 * (`data.param`) are resolved through the per-handler bindings map built
 * by `collectBindings`.
 *
 * Sanitizers are a small, explicit allowlist. Any call whose callee is
 * *not* on the list propagates taint if any operand is tainted. This is
 * conservative: we prefer false positives (flagging a safe call) over
 * false negatives (missing a real vulnerability).
 *
 * Confidence story: the IR-only pass produces the classic
 * "source-reaches-sink" signal, which the runner can boost if the trace
 * corpus shows the sink actually writing an attacker-controllable value
 * (e.g. the echoed body contained the request-field substring).
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import { collectBindings } from "./walk.js";

export type Taint = "clean" | "tainted";

/**
 * Calls whose *output* is clean regardless of their inputs. These are
 * explicit sanitizers or type coercions that strip dangerous characters
 * from their arguments.
 *
 *   - htmlspecialchars: HTML entity-encodes; safe for HTML output
 *   - intval / floatval / __cast_int / __cast_float / __cast_bool /
 *     ctype_digit / is_numeric: numeric coercions; string payloads cannot
 *     survive
 *   - strlen / mb_strlen: produce an int
 *   - password_hash / password_verify: opaque cryptographic output
 *   - json_encode: JSON string — safe in a <script> context (note: unsafe
 *     in an HTML attribute, but we treat it as clean for echo sinks
 *     since the attacker-controllable chars are escaped)
 *   - preg_match / preg_match_all: produce bool / int
 */
export const SANITIZER_CALLS: ReadonlySet<string> = new Set([
  "htmlspecialchars",
  "intval",
  "floatval",
  "__cast_int",
  "__cast_float",
  "__cast_bool",
  "ctype_digit",
  "is_numeric",
  "strlen",
  "mb_strlen",
  "password_hash",
  "password_verify",
  "json_encode",
  "preg_match",
  "preg_match_all",
]);

/**
 * Unary operators whose output is a fresh bool/int regardless of input
 * taint. `!`, `isset`, `empty` all collapse to boolean.
 */
const SANITIZING_UNARY = new Set(["!", "isset", "empty"]);

/**
 * Binary operators whose output is boolean and therefore safe. Arithmetic
 * operators on numeric operands are also safe, but we keep the allowlist
 * minimal because a `+` on strings in PHP would promote to int and in the
 * rare case where that matters the imprecision is acceptable.
 */
const BOOLEAN_BINOPS = new Set(["==", "===", "!=", "!==", "<", "<=", ">", ">=", "&&", "||"]);

export interface TaintResult {
  /** Map from every visited NodeId to its inferred taint. */
  readonly taint: ReadonlyMap<NodeId, Taint>;
  /** Set of source node ids (for provenance in opportunities). */
  readonly sources: ReadonlySet<NodeId>;
}

/**
 * Compute taint for all nodes reachable from `rootId` within `m`. The
 * `bindings` argument typically comes from `collectBindings(m, rootId)`
 * and is reused if the caller needs both. Pass `bindings: undefined` to
 * have this function compute it itself.
 */
export function computeTaint(
  m: Module,
  rootId: NodeId,
  bindings?: Map<string, NodeId>,
): TaintResult {
  const binds = bindings ?? collectBindings(m, rootId);
  const taint = new Map<NodeId, Taint>();
  const sources = new Set<NodeId>();
  // Guard against cycles introduced by param→binding→param chains.
  const inProgress = new Set<NodeId>();

  const go = (id: NodeId): Taint => {
    const cached = taint.get(id);
    if (cached !== undefined) return cached;
    if (inProgress.has(id)) return "clean";
    inProgress.add(id);
    const n = m.nodes.get(id);
    if (!n) {
      inProgress.delete(id);
      taint.set(id, "clean");
      return "clean";
    }
    const result = classify(m, n, binds, go, sources);
    taint.set(id, result);
    inProgress.delete(id);
    return result;
  };

  go(rootId);
  return { taint, sources };
}

function classify(
  m: Module,
  n: NodeBase,
  bindings: Map<string, NodeId>,
  visit: (id: NodeId) => Taint,
  sources: Set<NodeId>,
): Taint {
  if (n.dialect === "data") {
    switch (n.op) {
      case "literal":
        return "clean";
      case "request.field":
        sources.add(n.id);
        return "tainted";
      case "param": {
        const name = (n.attrs as { name?: string }).name;
        if (name && bindings.has(name)) {
          const rhs = bindings.get(name)!;
          return visit(rhs);
        }
        // Unresolved locals (foreach value vars, etc.) are conservatively
        // treated as tainted when their enclosing foreach's iterable is
        // tainted. Without that context, assume clean.
        return "clean";
      }
      case "unaryop": {
        const op = (n.attrs as { operator?: string }).operator ?? "";
        if (SANITIZING_UNARY.has(op)) return "clean";
        return anyOperandTainted(n, visit);
      }
      case "binop": {
        const op = (n.attrs as { operator?: string }).operator ?? "";
        if (BOOLEAN_BINOPS.has(op)) return "clean";
        return anyOperandTainted(n, visit);
      }
      case "call": {
        const callee = (n.attrs as { callee?: string }).callee ?? "";
        if (SANITIZER_CALLS.has(callee)) {
          for (const o of n.operands) visit(o); // propagate into subtree
          return "clean";
        }
        // `__assign` returns void; its taint is irrelevant to downstream
        // consumers, but we still propagate into the rhs so param lookups
        // classify correctly later.
        if (callee === "__assign") {
          for (const o of n.operands) visit(o);
          return "clean";
        }
        return anyOperandTainted(n, visit);
      }
      case "member":
      case "concat":
      case "foreach":
      case "if":
      case "block":
      case "html.template":
        return anyOperandTainted(n, visit);
      case "hole":
        return "tainted"; // unknown input → safest assumption
      default:
        return anyOperandTainted(n, visit);
    }
  }

  if (n.dialect === "effect") {
    if (n.op === "session.read") {
      sources.add(n.id);
      return "tainted";
    }
    if (n.op === "db.query") {
      // A query's *return value* is conservatively tainted — user-
      // controlled rows come back — and we register it as a source so
      // recognizers can attribute the origin of flagged flows to "db".
      // We still descend into the operands so any tainted param values
      // (request fields used as placeholders) are marked and recorded
      // for downstream recognizers like raw-sql-concat.
      for (const o of n.operands) visit(o);
      // db.query also carries a non-operand `sqlExpr` attr when the
      // SQL was built dynamically at the call site (see
      // packages/ingest/src/convert.ts). Treat it as a virtual operand
      // for taint purposes so request fields appearing only inside the
      // dynamic SQL tree still get classified as tainted — that's the
      // exact flow `raw-sql-concat` uses to flip severity to strong.
      const sqlExpr = (n.attrs as { sqlExpr?: NodeId }).sqlExpr;
      if (sqlExpr) visit(sqlExpr);
      sources.add(n.id);
      return "tainted";
    }
    if (n.op === "time.now" || n.op === "random") return "clean";
    return anyOperandTainted(n, visit);
  }

  return anyOperandTainted(n, visit);
}

function anyOperandTainted(n: NodeBase, visit: (id: NodeId) => Taint): Taint {
  // Visit all operands unconditionally so every node in the subtree gets
  // classified and cached. Short-circuiting on the first tainted operand
  // would leave later siblings unvisited — which matters for `block`
  // nodes (statement sequences): the recognizer expects every statement
  // in a handler body to have an entry in the taint map.
  let tainted = false;
  for (const opId of n.operands) {
    if (visit(opId) === "tainted") tainted = true;
  }
  return tainted ? "tainted" : "clean";
}
