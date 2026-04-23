/**
 * Scattered input validation recognizer.
 *
 * The classic PHP shape:
 *
 *   if (!isset($_POST['email']) || empty($_POST['email'])) { ... }
 *   if (!preg_match('/.../', $_POST['email'])) { ... }
 *   $email = trim($_POST['email']);
 *   if (strlen($email) < 3) { ... }
 *
 * The same request field is examined through multiple unrelated guards
 * (isset, empty, preg_match, strlen, trim, intval, filter_var, and
 * equality-to-literal binops). Converting this to a single `zod`-style
 * schema parsed at the top of the handler replaces every guard with a
 * typed, validated input object.
 *
 * Recognition rule: per handler, group by `(source, name)` of every
 * `data.request.field` read. When the same field shows up under two or
 * more *distinct* guard kinds, emit one opportunity for that field.
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import type { Opportunity, Recognizer } from "../framework.js";
import { descendants, routes } from "../walk.js";

const RECOGNIZER_ID = "scattered-validation" as const;

const GUARD_CALLS = new Set([
  "trim",
  "intval",
  "strlen",
  "htmlspecialchars",
  "password_verify",
  "preg_match",
  "filter_var",
  "ctype_digit",
  "is_numeric",
  "mb_strlen",
]);

const GUARD_UNARY = new Set(["isset", "empty", "!"]);

type GuardKind =
  | { kind: "call"; name: string }
  | { kind: "unary"; op: string }
  | { kind: "compare"; op: string; withLiteral: boolean }
  | { kind: "coalesce" };

interface FieldUse {
  source: "query" | "body" | "path" | "header" | "cookie";
  name: string;
  fieldNode: NodeBase;
  guard: GuardKind;
  guardNode: NodeBase;
}

export const scatteredValidationRecognizer: Recognizer = {
  id: RECOGNIZER_ID,
  name: "Scattered input validation",
  description:
    "A single request field is touched by multiple ad-hoc guards (isset/empty/trim/intval/preg_match/strlen/...). Replaceable with one zod schema parsed at the top of the handler.",

  recognize(m: Module): ReadonlyArray<Opportunity> {
    const out: Opportunity[] = [];

    for (const route of routes(m)) {
      const usesByKey = new Map<string, FieldUse[]>();

      for (const n of descendants(m, route.bodyNode.id)) {
        const guards = extractGuards(m, n);
        if (!guards) continue;
        for (const use of guards) {
          const key = `${use.source}:${use.name}`;
          const bucket = usesByKey.get(key) ?? [];
          bucket.push(use);
          usesByKey.set(key, bucket);
        }
      }

      for (const [key, uses] of usesByKey) {
        const distinctKinds = new Set(uses.map((u) => summarizeGuard(u.guard)));
        if (distinctKinds.size < 2) continue;

        const first = uses[0]!;
        const id = `${RECOGNIZER_ID}:${route.method}:${route.path}:${key}`;
        const confidence = Math.min(0.75, 0.4 + 0.1 * distinctKinds.size);
        const severity = distinctKinds.size >= 3 ? "strong" : "suggestion";
        const nodeIds: NodeId[] = [];
        for (const u of uses) {
          nodeIds.push(u.fieldNode.id, u.guardNode.id);
        }
        out.push({
          recognizer: RECOGNIZER_ID,
          id,
          title: `Field \`${first.source}.${first.name}\` guarded ${distinctKinds.size} ways`,
          severity,
          confidence,
          nodes: nodeIds,
          origin: first.fieldNode.origin,
          route: { method: route.method, path: route.path },
          rationale: `${distinctKinds.size} distinct guards applied to the same request field. Each is a redundant opportunity for divergence.`,
          proposedLift: {
            kind: "zod-schema",
            sketch: `Define a zod schema for this handler's input once (e.g. \`z.object({ ${first.name}: z.string().min(1) })\`) and parse \`c.req\` at the top of the handler; remove the scattered guards.`,
            requires: ["zod"],
          },
          evidence: {
            source: first.source,
            name: first.name,
            guardCount: uses.length,
            distinctGuardKinds: [...distinctKinds].sort(),
          },
        });
      }
    }

    return out;
  },
};

/**
 * If `n` is a guard wrapping one or more request-field reads, return each
 * wrapped field along with the guard descriptor. Otherwise return null.
 */
function extractGuards(m: Module, n: NodeBase): FieldUse[] | null {
  if (n.dialect !== "data") return null;

  const resolve = (id: NodeId | undefined): NodeBase | undefined =>
    id ? m.nodes.get(id) : undefined;

  if (n.op === "call") {
    const callee = (n.attrs as { callee?: string }).callee ?? "";
    if (!GUARD_CALLS.has(callee)) return null;
    const hits: FieldUse[] = [];
    for (const opId of n.operands) {
      const arg = resolve(opId);
      if (arg && isRequestField(arg)) {
        const attrs = arg.attrs as { source?: FieldUse["source"]; name?: string };
        if (attrs.source && attrs.name) {
          hits.push({
            source: attrs.source,
            name: attrs.name,
            fieldNode: arg,
            guard: { kind: "call", name: callee },
            guardNode: n,
          });
        }
      }
    }
    return hits.length > 0 ? hits : null;
  }

  if (n.op === "unaryop") {
    const op = (n.attrs as { operator?: string }).operator ?? "";
    if (!GUARD_UNARY.has(op)) return null;
    const arg = resolve(n.operands[0]);
    if (!arg || !isRequestField(arg)) return null;
    const attrs = arg.attrs as { source?: FieldUse["source"]; name?: string };
    if (!attrs.source || !attrs.name) return null;
    return [
      {
        source: attrs.source,
        name: attrs.name,
        fieldNode: arg,
        guard: { kind: "unary", op },
        guardNode: n,
      },
    ];
  }

  if (n.op === "binop") {
    const op = (n.attrs as { operator?: string }).operator ?? "";
    if (op === "??") {
      const left = resolve(n.operands[0]);
      if (!left || !isRequestField(left)) return null;
      const attrs = left.attrs as { source?: FieldUse["source"]; name?: string };
      if (!attrs.source || !attrs.name) return null;
      return [
        {
          source: attrs.source,
          name: attrs.name,
          fieldNode: left,
          guard: { kind: "coalesce" },
          guardNode: n,
        },
      ];
    }
    const CMP = new Set(["==", "===", "!=", "!==", "<", "<=", ">", ">="]);
    if (!CMP.has(op)) return null;
    const left = resolve(n.operands[0]);
    const right = resolve(n.operands[1]);
    const side =
      left && isRequestField(left)
        ? { field: left, other: right }
        : right && isRequestField(right)
          ? { field: right, other: left }
          : null;
    if (!side) return null;
    const attrs = side.field.attrs as { source?: FieldUse["source"]; name?: string };
    if (!attrs.source || !attrs.name) return null;
    const withLiteral =
      !!side.other && side.other.dialect === "data" && side.other.op === "literal";
    return [
      {
        source: attrs.source,
        name: attrs.name,
        fieldNode: side.field,
        guard: { kind: "compare", op, withLiteral },
        guardNode: n,
      },
    ];
  }

  return null;
}

function isRequestField(n: NodeBase): boolean {
  return n.dialect === "data" && n.op === "request.field";
}

function summarizeGuard(g: GuardKind): string {
  switch (g.kind) {
    case "call":
      return `call:${g.name}`;
    case "unary":
      return `unary:${g.op}`;
    case "compare":
      return `compare:${g.op}${g.withLiteral ? ":lit" : ""}`;
    case "coalesce":
      return "coalesce";
  }
}
