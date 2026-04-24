/**
 * `boundary-zod` — consolidates scattered `request.field` reads for one POST
 * field into a single normalized binding at the top of the handler, using
 * `__chrysalis_zod_body_field` (emitted as `parseZodBodyFieldRaw` in runtime).
 *
 * v1: `scattered-validation` opportunities with `source: body` only. Does not
 * remove legacy guard statements; it introduces a canonical string used via
 * `data.param` so downstream emission can share one normalized value.
 */
import type { NodeBase, NodeId, WebIRType } from "@chrysalis/webir";
import { T } from "@chrysalis/webir";
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

function zodOptsFromEvidence(kinds: readonly string[]): {
  minLen: number;
  trim: boolean;
  email: boolean;
} {
  const set = new Set(kinds);
  let minLen = 0;
  if (set.has("unary:isset") || set.has("unary:empty")) minLen = Math.max(minLen, 1);
  for (const k of set) {
    if (k.startsWith("call:strlen")) minLen = Math.max(minLen, 1);
  }
  const trim = set.has("call:trim");
  const email = set.has("call:preg_match");
  return { minLen, trim, email };
}

function cloneRequestField(ctx: RewriteCtx, n: NodeBase): NodeBase {
  return {
    ...n,
    id: ctx.allocId(),
    origin: ctx.synthetic("boundary-zod field clone"),
    provenance: [...n.provenance, ctx.provenance("boundary-zod field clone")],
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
    origin: ctx.synthetic("boundary-zod literal"),
    provenance: [ctx.provenance("boundary-zod literal")],
  };
}

export const boundaryZodPass: RewritePass = {
  id: "boundary-zod",
  name: "Normalize scattered POST field (boundary)",

  handles(op: Opportunity): boolean {
    return op.recognizer === "scattered-validation" && op.evidence["source"] === "body";
  },

  apply(ctx: RewriteCtx, op: Opportunity): ReadonlyArray<Edit> {
    const source = String(op.evidence["source"] ?? "");
    const name = String(op.evidence["name"] ?? "");
    const kinds = (op.evidence["distinctGuardKinds"] as string[] | undefined) ?? [];
    if (source !== "body" || !name) {
      throw new Error("boundary-zod: opportunity missing body field name");
    }

    const m = ctx.module;
    const bodyId = routeHandlerBodyId(m, op);
    if (!bodyId) throw new Error("boundary-zod: could not locate handler body");

    const matches = collectMatchingFields(m, bodyId, source, name);
    if (matches.length === 0) throw new Error("boundary-zod: no matching request.field in handler");

    const opts = zodOptsFromEvidence(kinds);
    const edits: Edit[] = [];

    const dup = cloneRequestField(ctx, matches[0]!);
    edits.push({ kind: "add", node: dup });

    const minLit = literalNode(ctx, opts.minLen, T.int);
    const trimLit = literalNode(ctx, opts.trim, T.bool);
    const emailLit = literalNode(ctx, opts.email, T.bool);
    edits.push({ kind: "add", node: minLit });
    edits.push({ kind: "add", node: trimLit });
    edits.push({ kind: "add", node: emailLit });

    const zodCall = makeDataCall(
      ctx,
      "__chrysalis_zod_body_field",
      [dup.id, minLit.id, trimLit.id, emailLit.id],
      T.string,
      "boundary-zod coerce",
    );
    edits.push({ kind: "add", node: zodCall });

    const vName = `__valid_body_${sanitizeIdentPart(name)}`;
    const nameLit = literalNode(ctx, vName, T.string);
    edits.push({ kind: "add", node: nameLit });
    const assignTop = makeDataCall(ctx, "__assign", [nameLit.id, zodCall.id], T.void, "boundary-zod assign");
    edits.push({ kind: "add", node: assignTop });

    const block = m.nodes.get(bodyId);
    if (!block || block.op !== "block") throw new Error("boundary-zod: handler body is not a block");

    const newOps = [assignTop.id, ...block.operands];
    const patchedBlock: NodeBase = {
      ...block,
      operands: Object.freeze(newOps),
      provenance: [...block.provenance, ctx.provenance("boundary-zod prepend")],
    };
    edits.push({ kind: "add", node: patchedBlock });

    const paramBinding: NodeBase = {
      id: ctx.allocId(),
      dialect: "data",
      op: "param",
      type: T.unknown,
      effects: [],
      operands: [],
      attrs: { name: vName },
      origin: ctx.synthetic("boundary-zod param"),
      provenance: [ctx.provenance("boundary-zod param")],
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
