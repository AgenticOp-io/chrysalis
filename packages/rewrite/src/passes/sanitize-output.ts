/**
 * `sanitize-output` pass — fixes XSS opportunities reported by the
 * `unescaped-output` recognizer.
 *
 * Strategy:
 *   1. For a direct `echo(tainted)` sink, wrap the echo value in a
 *      synthetic `htmlspecialchars(x)` call and rewire the echo's
 *      operand to point at the wrapper.
 *   2. For a `html.template` sink with `escape: false`, flip the
 *      offending part's `escape` flag to `true` and wrap the operand in
 *      `htmlspecialchars`. The emitter already treats `escape: true`
 *      template expressions as HTML-safe, so this is the minimal patch.
 *
 * Why `htmlspecialchars` and not a framework-specific helper: the
 * emitter already recognizes `htmlspecialchars(x)` (see `emitKnownCall`
 * in emit-hono) and lowers it to the correct HTML-escape call for the
 * target framework. Keeping the rewrite framework-agnostic means a
 * future `emit-fastify` inherits this fix for free.
 *
 * Safety: `htmlspecialchars` is an idempotent transform on clean text.
 * On attacker-controlled input it swaps `<`, `>`, `&`, `'`, `"` for
 * entity references. Traces that didn't contain those characters in the
 * response body are unchanged byte-for-byte; traces that did will now
 * contain the escaped form, which is what the corpus verifier flags as
 * a behavioral *improvement*, not a regression (see D15 rationale).
 */
import type { NodeBase, NodeId } from "@chrysalis/webir";
import { T } from "@chrysalis/webir";
import type { Opportunity } from "@chrysalis/insight";
import { computeTaint } from "@chrysalis/insight";
import type { Edit, RewriteCtx, RewritePass } from "../framework.js";
import { makeDataCall } from "../framework.js";

export const sanitizeOutputPass: RewritePass = {
  id: "sanitize-output",
  name: "Sanitize unescaped output",

  handles(op: Opportunity): boolean {
    return op.recognizer === "unescaped-output";
  },

  apply(ctx: RewriteCtx, op: Opportunity): ReadonlyArray<Edit> {
    const isTemplate = op.evidence["isTemplate"] === true;

    if (!isTemplate) {
      return applyToEcho(ctx, op);
    }
    return applyToTemplate(ctx, op);
  },

  // The pass only ever adds `data.call` wrappers and rewires operand
  // pointers on nodes in the string-building tree rooted at an echo or
  // a template sink. It never touches DB writes, redirects, session
  // writes, cookies, status codes, or arithmetic binops. Any such
  // mutation would be a bug: the invariant catches it before the
  // rewrite is committed (see D16). Note the narrow `data.binop`
  // pattern: we explicitly require `operator: "."` so tampering with
  // arithmetic `+` / `*` / `-` binops still triggers the invariant.
  invariants: {
    mayModify: [
      "effect.echo",
      "data.html.template",
      "data.concat",
      { dialectOp: "data.binop", attrMatch: { operator: "." } },
    ],
  },
};

function applyToEcho(ctx: RewriteCtx, op: Opportunity): ReadonlyArray<Edit> {
  const echoId = findEchoNode(ctx, op);
  if (!echoId) throw new Error("sanitize-output: could not find echo anchor");
  const echo = ctx.get(echoId);
  if (!echo || echo.operands.length === 0) {
    throw new Error("sanitize-output: echo node has no value operand");
  }
  const valueId = echo.operands[0]!;
  const value = ctx.get(valueId);
  if (!value) throw new Error("sanitize-output: echo value missing from module");

  if (alreadySanitized(ctx, valueId)) {
    throw new Error("sanitize-output: echo value is already sanitized");
  }

  // When the echo value is a string-building tree — `data.concat` or a
  // chain of PHP `.` binops — wrap only the tainted leaves so literal
  // HTML (e.g. `<h1>`) in the string keeps its markup. This is the
  // difference between a correct sanitizer and an over-escaping one
  // that turns the whole page into entity-encoded gibberish.
  if (isConcatLike(value)) {
    return wrapConcatLikeLeaves(ctx, op, value);
  }

  const wrapper = makeDataCall(
    ctx,
    "htmlspecialchars",
    [valueId],
    T.string,
    `sanitize-output wrap of ${op.id}`,
  );
  return [
    { kind: "add", node: wrapper },
    { kind: "replaceOperand", nodeId: echoId, index: 0, newOperandId: wrapper.id },
  ];
}

/**
 * A concat-like node is either a `data.concat` (explicit n-ary
 * concatenation) or a `data.binop` with operator `"."` (PHP's string
 * concatenation, which ingest lowers as a left-folded binary tree).
 */
function isConcatLike(n: NodeBase): boolean {
  if (n.dialect !== "data") return false;
  if (n.op === "concat") return true;
  if (n.op === "binop" && (n.attrs as { operator?: string }).operator === ".") return true;
  return false;
}

/**
 * Walk a concat-like subtree, find every tainted leaf (a non-concat-
 * like node that's marked tainted by the taint primitive), and wrap
 * each in `htmlspecialchars`. Clean literals are untouched, preserving
 * legitimate HTML markup in the concatenation. For `data.binop` nodes
 * we rewrite their operand arrays in place; for `data.concat` we do
 * the same at the concat level.
 */
function wrapConcatLikeLeaves(
  ctx: RewriteCtx,
  op: Opportunity,
  root: NodeBase,
): ReadonlyArray<Edit> {
  const route = op.route;
  const bodyId = findRouteBodyId(ctx, route);
  if (!bodyId) throw new Error("sanitize-output: could not locate route body for taint");

  const { taint } = computeTaint(ctx.module, bodyId);
  const edits: Edit[] = [];
  // Track replacements so we patch each container once at the end.
  const replacements = new Map<string, { node: NodeBase; operands: NodeId[] }>();
  let wrappedAny = false;

  const ensurePatched = (n: NodeBase): NodeId[] => {
    const ex = replacements.get(n.id);
    if (ex) return ex.operands;
    const ops = [...n.operands];
    replacements.set(n.id, { node: n, operands: ops });
    return ops;
  };

  const walk = (n: NodeBase): void => {
    if (!isConcatLike(n)) return;
    const ops = ensurePatched(n);
    for (let i = 0; i < ops.length; i++) {
      const child = ctx.get(ops[i]!);
      if (!child) continue;
      if (isConcatLike(child)) {
        walk(child);
        continue;
      }
      if (taint.get(child.id) !== "tainted") continue;
      if (alreadySanitized(ctx, child.id)) continue;
      const wrapper = makeDataCall(
        ctx,
        "htmlspecialchars",
        [child.id],
        T.string,
        `sanitize-output leaf wrap of ${op.id}`,
      );
      edits.push({ kind: "add", node: wrapper });
      ops[i] = wrapper.id;
      wrappedAny = true;
    }
  };

  walk(root);

  if (!wrappedAny) {
    throw new Error("sanitize-output: no tainted leaves in concat tree");
  }

  for (const { node, operands } of replacements.values()) {
    const patched: NodeBase = {
      ...node,
      operands: Object.freeze(operands),
      provenance: [
        ...node.provenance,
        {
          source: "intent-rewrite",
          locator: node.origin,
          reason: `sanitize-output leaf wrap via ${op.id}`,
        },
      ],
    };
    edits.push({ kind: "add", node: patched });
  }
  return edits;
}

function findRouteBodyId(
  ctx: RewriteCtx,
  route: { method: string; path: string } | undefined,
): NodeId | undefined {
  if (!route) return undefined;
  for (const n of ctx.module.nodes.values()) {
    if (n.dialect !== "web.request" || n.op !== "route") continue;
    const attrs = n.attrs as { method?: string; path?: string };
    if (attrs.method !== route.method || attrs.path !== route.path) continue;
    const handlerId = n.operands[0];
    if (!handlerId) continue;
    const handler = ctx.module.nodes.get(handlerId);
    if (!handler) continue;
    return handler.operands[0];
  }
  return undefined;
}

function applyToTemplate(ctx: RewriteCtx, op: Opportunity): ReadonlyArray<Edit> {
  // The recognizer anchors the opportunity on the tainted *operand* node,
  // which is the expression inside the template part. We locate the
  // owning template node by scanning the module; templates are rare
  // per-handler, so the linear scan is acceptable.
  const taintedOperandId = op.nodes[0];
  if (!taintedOperandId) throw new Error("sanitize-output: missing tainted operand id");
  const tmpl = findTemplateOwningOperand(ctx, taintedOperandId);
  if (!tmpl) throw new Error("sanitize-output: no template found owning operand");

  const parts = (tmpl.attrs as {
    parts?: ReadonlyArray<
      { kind: "literal"; text: string } | { kind: "expr"; idx: number; escape: boolean }
    >;
  }).parts;
  if (!parts) throw new Error("sanitize-output: template has no parts array");

  const operandIndex = tmpl.operands.findIndex((o) => o === taintedOperandId);
  if (operandIndex < 0) {
    throw new Error("sanitize-output: operand not found on owning template");
  }

  const wrapper = makeDataCall(
    ctx,
    "htmlspecialchars",
    [taintedOperandId],
    T.string,
    `sanitize-output template wrap of ${op.id}`,
  );
  const newParts = parts.map((p) =>
    p.kind === "expr" && p.idx === operandIndex ? { ...p, escape: true } : p,
  );
  const newOperands = [...tmpl.operands];
  newOperands[operandIndex] = wrapper.id;

  // `add` overwrites by id, so re-publishing the template with new
  // operands + new parts is enough to commit both changes atomically.
  const patchedTmpl: NodeBase = {
    ...tmpl,
    operands: Object.freeze(newOperands),
    attrs: { ...tmpl.attrs, parts: newParts },
    provenance: [
      ...tmpl.provenance,
      {
        source: "intent-rewrite",
        locator: tmpl.origin,
        reason: `flipped escape=true on part ${operandIndex} via ${op.id}`,
      },
    ],
  };

  return [
    { kind: "add", node: wrapper },
    { kind: "add", node: patchedTmpl },
  ];
}

function findEchoNode(ctx: RewriteCtx, op: Opportunity): NodeId | null {
  // The opportunity's `nodes` list begins with the anchor; in the non-
  // template case the anchor is the echo itself (see unescaped-output.ts).
  for (const id of op.nodes) {
    const n = ctx.get(id);
    if (n && n.dialect === "effect" && n.op === "echo") return id;
  }
  return null;
}

function findTemplateOwningOperand(ctx: RewriteCtx, operandId: NodeId): NodeBase | null {
  for (const n of ctx.module.nodes.values()) {
    if (n.dialect !== "data" || n.op !== "html.template") continue;
    if (n.operands.includes(operandId)) return n;
  }
  return null;
}

function alreadySanitized(ctx: RewriteCtx, valueId: NodeId): boolean {
  const n = ctx.get(valueId);
  if (!n || n.dialect !== "data" || n.op !== "call") return false;
  const callee = (n.attrs as { callee?: string }).callee;
  return callee === "htmlspecialchars" || callee === "json_encode";
}
