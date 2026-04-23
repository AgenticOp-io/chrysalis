/**
 * String-based dispatch recognizer.
 *
 * Recognizes if/elseif chains that branch on literal equality against a
 * single request field — the classic "action controller" pattern:
 *
 *   $action = $_POST['action'];
 *   if ($action === 'login') { ... }
 *   elseif ($action === 'logout') { ... }
 *   elseif ($action === 'register') { ... }
 *
 * Equivalent rewrite: a discriminated union type for the action + an
 * exhaustive `switch`, hoisted to a single handler per action. This is
 * often the first step toward splitting a legacy "front controller" into
 * per-route handlers.
 *
 * Recognition rule: walk if-chains (an `ifElse` whose `else` branch is
 * another `ifElse`). A chain is eligible when every branch's condition is
 * a `binop` of kind `==` / `===` comparing the *same* request-field source
 * against a distinct string literal. We require ≥ 2 branches.
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import type { Opportunity, Recognizer } from "../framework.js";
import { descendants, routes } from "../walk.js";

const RECOGNIZER_ID = "string-dispatch" as const;

interface Branch {
  readonly condId: NodeId;
  readonly node: NodeBase; // the ifElse node
  readonly literal: string;
  readonly field: { source: string; name: string };
}

export const stringDispatchRecognizer: Recognizer = {
  id: RECOGNIZER_ID,
  name: "String-based dispatch",
  description:
    "An if/elseif chain switching on literal equality against one request field. Rewritable as a discriminated union + exhaustive `switch`.",

  recognize(m: Module): ReadonlyArray<Opportunity> {
    const out: Opportunity[] = [];

    for (const route of routes(m)) {
      const visited = new Set<NodeId>();
      for (const n of descendants(m, route.bodyNode.id)) {
        if (n.dialect !== "data" || n.op !== "if") continue;
        if (visited.has(n.id)) continue;
        const chain = collectChain(m, n);
        for (const inner of chain.visited) visited.add(inner);
        if (chain.branches.length < 2) continue;

        const field = chain.branches[0]!.field;
        if (!chain.branches.every((b) => b.field.source === field.source && b.field.name === field.name)) continue;
        const literals = chain.branches.map((b) => b.literal);
        if (new Set(literals).size !== literals.length) continue;

        const id = `${RECOGNIZER_ID}:${route.method}:${route.path}:${String(n.id)}`;
        const confidence = Math.min(0.8, 0.55 + 0.05 * chain.branches.length);
        const severity = chain.branches.length >= 4 ? "strong" : "suggestion";
        const nodeIds = chain.branches.map((b) => b.node.id);
        out.push({
          recognizer: RECOGNIZER_ID,
          id,
          title: `Dispatch on \`${field.source}.${field.name}\` (${chain.branches.length} branches)`,
          severity,
          confidence,
          nodes: nodeIds,
          origin: n.origin,
          route: { method: route.method, path: route.path },
          rationale: `if/elseif chain over ${chain.branches.length} string literals (${literals.map((s) => `"${s}"`).join(", ")}) against the same request field. Non-exhaustive by construction; silently falls through on unknown values.`,
          proposedLift: {
            kind: "action-union",
            sketch: `Introduce \`type Action = ${literals.map((s) => `"${s}"`).join(" | ")}\`; validate the field with \`z.enum(${JSON.stringify(literals)})\`; replace the chain with a \`switch (action)\` whose \`default\` clause returns 400.`,
            requires: ["zod"],
          },
          evidence: {
            source: field.source,
            name: field.name,
            branches: literals,
            branchCount: chain.branches.length,
            hasDefault: chain.hasTerminalElse,
          },
        });
      }
    }

    return out;
  },
};

interface ChainResult {
  branches: Branch[];
  hasTerminalElse: boolean;
  visited: Set<NodeId>;
}

/**
 * Walk an if-chain starting at `head`. Each hop is an `ifElse` whose else
 * branch is another `ifElse`. We stop when the else branch is anything
 * else (including absent, which we flag as "no default").
 */
function collectChain(m: Module, head: NodeBase): ChainResult {
  const branches: Branch[] = [];
  const visited = new Set<NodeId>();
  let cur: NodeBase | undefined = head;
  let hasTerminalElse = false;

  while (cur && cur.dialect === "data" && cur.op === "if") {
    visited.add(cur.id);
    const condId = cur.operands[0];
    if (!condId) break;
    const cond = m.nodes.get(condId);
    if (!cond) break;
    const matched = matchLiteralEquality(m, cond);
    if (!matched) break;
    branches.push({ condId, node: cur, literal: matched.literal, field: matched.field });

    const hasElse = (cur.attrs as { hasElse?: boolean }).hasElse === true;
    if (!hasElse) break;
    const elseId: NodeId | undefined = cur.operands[2];
    const el: NodeBase | undefined = elseId ? m.nodes.get(elseId) : undefined;
    const unwrapped: NodeBase | undefined = el ? unwrapSingleStatementBlock(m, el) : undefined;
    if (unwrapped && unwrapped.dialect === "data" && unwrapped.op === "if") {
      cur = unwrapped;
      continue;
    }
    hasTerminalElse = !!el;
    break;
  }

  return { branches, hasTerminalElse, visited };
}

/**
 * PHP `elseif` lowers through `convertStatements` in ingest, which wraps the
 * else branch in a `data.block`. Peek through single-statement blocks so we
 * still recognize the canonical if/elseif chain shape.
 */
function unwrapSingleStatementBlock(m: Module, n: NodeBase): NodeBase {
  if (n.dialect === "data" && n.op === "block" && n.operands.length === 1) {
    const inner = m.nodes.get(n.operands[0]!);
    if (inner) return inner;
  }
  return n;
}

function matchLiteralEquality(
  m: Module,
  cond: NodeBase,
): { literal: string; field: { source: string; name: string } } | null {
  if (cond.dialect !== "data" || cond.op !== "binop") return null;
  const op = (cond.attrs as { operator?: string }).operator ?? "";
  if (op !== "==" && op !== "===") return null;
  const left = cond.operands[0] ? m.nodes.get(cond.operands[0]) : undefined;
  const right = cond.operands[1] ? m.nodes.get(cond.operands[1]) : undefined;
  if (!left || !right) return null;

  const pair = isFieldAndStringLiteral(left, right) ?? isFieldAndStringLiteral(right, left);
  if (!pair) return null;
  const fieldAttrs = pair.field.attrs as { source?: string; name?: string };
  if (!fieldAttrs.source || !fieldAttrs.name) return null;
  return {
    literal: pair.literal,
    field: { source: fieldAttrs.source, name: fieldAttrs.name },
  };
}

function isFieldAndStringLiteral(
  a: NodeBase,
  b: NodeBase,
): { field: NodeBase; literal: string } | null {
  if (a.dialect !== "data" || a.op !== "request.field") return null;
  if (b.dialect !== "data" || b.op !== "literal") return null;
  const val = (b.attrs as { value?: unknown }).value;
  if (typeof val !== "string") return null;
  return { field: a, literal: val };
}
