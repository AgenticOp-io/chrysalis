/**
 * `dispatch-union-zod` — validates a string-dispatch request field against the
 * exact set of branch literals (z.enum-shaped contract), prepends a normalized
 * `data.param`, and rewires every matching `request.field` in the handler to
 * that param. After rewrite, `string-dispatch` no longer matches (conditions
 * compare `param` to literals, not raw `request.field`).
 */
import type { NodeBase, NodeId, WebIRType } from "@chrysalis/webir";
import { T } from "@chrysalis/webir";
import { matchStringDispatchChain } from "@chrysalis/insight";
import type { Opportunity } from "@chrysalis/insight";
import type { Edit, RewriteCtx, RewritePass } from "../framework.js";
import { makeDataCall } from "../framework.js";

const DATA_OPS_MAY_MODIFY: ReadonlyArray<string> = [
  "data.literal",
  "data.param",
  "data.request.field",
  "data.binop",
  "data.unaryop",
  "data.member",
  "data.call",
  "data.concat",
  "data.html.template",
  "data.block",
  "data.if",
  "data.foreach",
  "data.hole",
];

const DEFAULT_EFFECTS_TO_PRESERVE = [
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
] as const;

type ModuleFromCtx = RewriteCtx["module"];

function routeHandlerBodyId(m: ModuleFromCtx, op: Opportunity): NodeId | undefined {
  for (const rid of m.roots) {
    const route = m.nodes.get(rid);
    if (!route || route.dialect !== "web.request" || route.op !== "route") continue;
    const attrs = route.attrs as { method?: string; path?: string };
    if (attrs.method !== op.route?.method || attrs.path !== op.route?.path) continue;
    const handlerId = route.operands[0];
    const handler = handlerId ? m.nodes.get(handlerId) : undefined;
    return handler?.operands[0];
  }
  return undefined;
}

function collectDescendantIds(m: ModuleFromCtx, rootId: NodeId): Set<NodeId> {
  const set = new Set<NodeId>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (set.has(id)) continue;
    set.add(id);
    const n = m.nodes.get(id);
    if (!n) continue;
    for (const oid of n.operands) stack.push(oid);
  }
  return set;
}

function collectMatchingFields(
  m: ModuleFromCtx,
  bodyId: NodeId,
  source: string,
  name: string,
): NodeBase[] {
  const ids = collectDescendantIds(m, bodyId);
  const out: NodeBase[] = [];
  for (const id of ids) {
    const n = m.nodes.get(id);
    if (n?.dialect !== "data" || n.op !== "request.field") continue;
    const a = n.attrs as { source?: string; name?: string };
    if (a.source === source && a.name === name) out.push(n);
  }
  return out;
}

function findReferencingOperands(
  m: ModuleFromCtx,
  targetId: NodeId,
): Array<{ nodeId: NodeId; index: number }> {
  const out: Array<{ nodeId: NodeId; index: number }> = [];
  for (const [id, n] of m.nodes) {
    for (let i = 0; i < n.operands.length; i++) {
      if (n.operands[i] === targetId) out.push({ nodeId: id, index: i });
    }
  }
  return out;
}

function sanitizeIdentPart(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 24) || "f";
}

function cloneRequestField(ctx: RewriteCtx, n: NodeBase): NodeBase {
  return {
    ...n,
    id: ctx.allocId(),
    origin: ctx.synthetic("dispatch-union-zod field clone"),
    provenance: [...n.provenance, ctx.provenance("dispatch-union-zod field clone")],
  };
}

function literalNode(ctx: RewriteCtx, value: unknown, type: WebIRType): NodeBase {
  return {
    id: ctx.allocId(),
    dialect: "data",
    op: "literal",
    type,
    effects: [],
    operands: [],
    attrs: { value },
    origin: ctx.synthetic("dispatch-union-zod literal"),
    provenance: [ctx.provenance("dispatch-union-zod literal")],
  };
}

export const dispatchUnionZodPass: RewritePass = {
  id: "dispatch-union-zod",
  name: "String dispatch field → enum-shaped boundary (z.enum)",

  handles(op: Opportunity): boolean {
    return op.recognizer === "string-dispatch";
  },

  apply(ctx: RewriteCtx, op: Opportunity): ReadonlyArray<Edit> {
    const source = String(op.evidence["source"] ?? "");
    const name = String(op.evidence["name"] ?? "");
    const branches = op.evidence["branches"] as string[] | undefined;
    if (!source || !name || !branches || branches.length < 2) {
      throw new Error("dispatch-union-zod: opportunity missing source, name, or branches");
    }

    const m = ctx.module;
    const bodyId = routeHandlerBodyId(m, op);
    if (!bodyId) throw new Error("dispatch-union-zod: could not locate handler body");

    const headId = op.nodes[0];
    if (!headId) throw new Error("dispatch-union-zod: opportunity missing head node");
    const head = m.nodes.get(headId);
    if (!head) throw new Error("dispatch-union-zod: head node missing");
    const mat = matchStringDispatchChain(m, head);
    if (!mat) throw new Error("dispatch-union-zod: chain shape no longer matches");
    if (mat.field.source !== source || mat.field.name !== name) {
      throw new Error("dispatch-union-zod: opportunity evidence does not match IR chain");
    }

    const matches = collectMatchingFields(m, bodyId, source, name);
    if (matches.length === 0) throw new Error("dispatch-union-zod: no matching request.field in handler");

    const edits: Edit[] = [];
    const dup = cloneRequestField(ctx, matches[0]!);
    edits.push({ kind: "add", node: dup });

    const literalArgs: NodeBase[] = [];
    for (const b of branches) {
      const lit = literalNode(ctx, b, T.string);
      edits.push({ kind: "add", node: lit });
      literalArgs.push(lit);
    }

    const enumCall = makeDataCall(
      ctx,
      "__chrysalis_zod_enum_body_field",
      [dup.id, ...literalArgs.map((x) => x.id)],
      T.string,
      "dispatch-union-zod enum coerce",
    );
    edits.push({ kind: "add", node: enumCall });

    const vName = `__valid_dispatch_${sanitizeIdentPart(name)}`;
    const nameLit = literalNode(ctx, vName, T.string);
    edits.push({ kind: "add", node: nameLit });
    const assignTop = makeDataCall(ctx, "__assign", [nameLit.id, enumCall.id], T.void, "dispatch-union-zod assign");
    edits.push({ kind: "add", node: assignTop });

    const block = m.nodes.get(bodyId);
    if (!block || block.op !== "block") throw new Error("dispatch-union-zod: handler body is not a block");

    const newOps = [assignTop.id, ...block.operands];
    const patchedBlock: NodeBase = {
      ...block,
      operands: Object.freeze(newOps),
      provenance: [...block.provenance, ctx.provenance("dispatch-union-zod prepend")],
    };
    edits.push({ kind: "add", node: patchedBlock });

    const paramBinding: NodeBase = {
      id: ctx.allocId(),
      dialect: "data",
      op: "param",
      type: T.string,
      effects: [],
      operands: [],
      attrs: { name: vName },
      origin: ctx.synthetic("dispatch-union-zod param"),
      provenance: [ctx.provenance("dispatch-union-zod param")],
    };
    edits.push({ kind: "add", node: paramBinding });

    for (const field of matches) {
      for (const ref of findReferencingOperands(m, field.id)) {
        edits.push({
          kind: "replaceOperand",
          nodeId: ref.nodeId,
          index: ref.index,
          newOperandId: paramBinding.id,
        });
      }
    }

    return edits;
  },

  invariants: {
    mayModify: [...DATA_OPS_MAY_MODIFY],
    preserveEffectCounts: [...DEFAULT_EFFECTS_TO_PRESERVE],
  },
};
