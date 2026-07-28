/**
 * Walk hub-lifted WebIR modules for HTTP routes and handler body shape.
 */

const CWL_TRANSPARENT_CALLS = new Set([
  "json_encode",
  "__return_json",
  "__return",
  "__cast_int",
  "__cast_string",
  "__cast_float",
  "__cast_bool",
  "intval",
  "strval",
  "floatval",
  "boolval",
  // HTML echo peel — project origin literal chrome; skip dynamic leaves (D6442).
  "htmlspecialchars",
  "nl2br",
  "trim",
]);

/**
 * PHP session bootstrap / teardown — emit lowers these to middleware (RFC-0007 /
 * emit-shared `session_start`). CWL projects them as elided stmts; handler
 * `effects: session.read|write` come from real session effect nodes.
 */
const CWL_SESSION_BOOT_CALLS = new Set([
  "session_start",
  "session_name",
  "session_set_cookie_params",
  "session_write_close",
]);

/** Callees that end a handler branch (PHP exit/return) — early-exit guard marker. */
const CWL_EARLY_EXIT_CALLEES = new Set(["__exit", "__return"]);

/** Comparison operators projectable into CWL early-exit cond (RFC-0021). */
const CWL_COND_CMP_OPS = new Set(["===", "==", "!==", "!="]);
/** Boolean combinators projectable into CWL early-exit cond (RFC-0021). */
const CWL_COND_BOOL_OPS = new Set(["||", "&&"]);

/**
 * True when a block/stmt tree contains `__exit` / `__return` (early-exit guard).
 * @param {(id: string) => object | undefined} get
 * @param {string} id
 */
function cwlBlockHasEarlyExit(get, id) {
  const n = get(id);
  if (!n) return false;
  if (n.dialect === "data" && n.op === "call" && CWL_EARLY_EXIT_CALLEES.has(String(n.attrs?.callee ?? ""))) {
    return true;
  }
  for (const op of n.operands ?? []) {
    if (cwlBlockHasEarlyExit(get, op)) return true;
  }
  return false;
}

/**
 * Lower a WebIR early-exit condition into a CWL surface expression when the
 * shape is honest and simple (param cmp lit, || / && of those, `!param`).
 * Calls, members, session reads, and `empty` stay opaque — behavior remains in
 * WebIR/Hono (RFC-0021 widen: no invented verify runtime for call/member/empty).
 * @param {(id: string) => object | undefined} get
 * @param {string} id
 * @returns {string | null}
 */
export function cwlCondOf(get, id) {
  const n = get(id);
  if (!n) return null;
  if (n.dialect === "data" && n.op === "param") {
    const name = String(n.attrs?.name ?? "");
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? name : null;
  }
  if (n.dialect === "data" && n.op === "literal") {
    return cwlRenderLiteral(stripBom(n.attrs?.value));
  }
  if (n.dialect === "data" && n.op === "unaryop") {
    const uop = String(n.attrs?.operator ?? "");
    // Project `!param` / `not param` into cond_expr. `empty(param)` stays opaque
    // (`g_empty_<name>` via cwlOpaqueCondResidual) — no invented empty evaluate.
    if (uop === "!" || uop === "not") {
      const inner = get((n.operands ?? [])[0]);
      if (!inner || inner.dialect !== "data" || inner.op !== "param") return null;
      const name = String(inner.attrs?.name ?? "");
      return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? `!${name}` : null;
    }
    return null;
  }
  if (n.dialect === "data" && n.op === "binop") {
    const op = String(n.attrs?.operator ?? "");
    const ops = n.operands ?? [];
    if (ops.length < 2) return null;
    if (CWL_COND_CMP_OPS.has(op)) {
      const left = get(ops[0]);
      if (!left || left.dialect !== "data" || left.op !== "param") return null;
      const leftName = String(left.attrs?.name ?? "");
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(leftName)) return null;
      const right = cwlCondOf(get, ops[1]);
      if (right === null) return null;
      // Surface uses == / != (PHP === / !== collapse to value equality).
      const surf = op === "!==" || op === "!=" ? "!=" : "==";
      return `${leftName} ${surf} ${right}`;
    }
    if (CWL_COND_BOOL_OPS.has(op)) {
      const left = cwlCondOf(get, ops[0]);
      const right = cwlCondOf(get, ops[1]);
      if (left === null || right === null) return null;
      return `${left} ${op} ${right}`;
    }
    return null;
  }
  return null;
}

/**
 * Collect a stable IDENT member path (`attrs.key` chain) for opaque naming.
 * Returns null when any key is dynamic / non-IDENT (fall back to `gN`).
 * @param {(id: string) => object | undefined} get
 * @param {string} id
 * @param {number} [depth]
 * @returns {string | null}
 */
function cwlMemberPathOf(get, id, depth = 0) {
  if (depth > 16) return null;
  const n = get(id);
  if (!n || n.dialect !== "data" || n.op !== "member") return null;
  const key = n.attrs?.key;
  if (typeof key !== "string" || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return null;
  // Dynamic key operand (non-string attrs.key) — refuse path naming.
  if ((n.operands ?? []).length > 1) return null;
  const objId = n.operands?.[0];
  if (!objId) return key;
  const obj = get(objId);
  if (obj && obj.dialect === "data" && obj.op === "member") {
    const inner = cwlMemberPathOf(get, objId, depth + 1);
    return inner ? `${inner}_${key}` : null;
  }
  return key;
}

/**
 * Classify why a condition cannot project into CWL `cond_expr`. Walks the
 * WebIR tree for call / member / session / empty / unary markers. Does **not**
 * invent evaluate semantics — callers keep Hono/WebIR as authority.
 * @param {(id: string) => object | undefined} get
 * @param {string} id
 * @param {number} [depth]
 * @returns {{ reasons: string[], primaryCallee: string | null, primaryMemberPath: string | null, primaryEmptyParam: string | null }}
 */
export function cwlClassifyOpaqueCond(get, id, depth = 0) {
  /** @type {string[]} */
  const reasons = [];
  /** @type {string | null} */
  let primaryCallee = null;
  /** @type {string | null} */
  let primaryMemberPath = null;
  /** @type {string | null} */
  let primaryEmptyParam = null;
  if (depth > 24) {
    return {
      reasons: ["depth"],
      primaryCallee: null,
      primaryMemberPath: null,
      primaryEmptyParam: null,
    };
  }
  const n = get(id);
  if (!n) {
    return {
      reasons: ["missing"],
      primaryCallee: null,
      primaryMemberPath: null,
      primaryEmptyParam: null,
    };
  }

  const merge = (inner) => {
    for (const r of inner.reasons) {
      if (!reasons.includes(r)) reasons.push(r);
    }
    if (!primaryCallee && inner.primaryCallee) primaryCallee = inner.primaryCallee;
    if (!primaryMemberPath && inner.primaryMemberPath) {
      primaryMemberPath = inner.primaryMemberPath;
    }
    if (!primaryEmptyParam && inner.primaryEmptyParam) {
      primaryEmptyParam = inner.primaryEmptyParam;
    }
  };

  if (n.dialect === "data" && n.op === "call") {
    const callee = String(n.attrs?.callee ?? "");
    reasons.push("call");
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(callee)) primaryCallee = callee;
    for (const op of n.operands ?? []) merge(cwlClassifyOpaqueCond(get, op, depth + 1));
    return { reasons, primaryCallee, primaryMemberPath, primaryEmptyParam };
  }
  if (n.dialect === "data" && n.op === "member") {
    reasons.push("member");
    const path = cwlMemberPathOf(get, id);
    if (path) primaryMemberPath = path;
    for (const op of n.operands ?? []) merge(cwlClassifyOpaqueCond(get, op, depth + 1));
    return { reasons, primaryCallee, primaryMemberPath, primaryEmptyParam };
  }
  if (n.dialect === "effect" && String(n.op ?? "").startsWith("session.")) {
    reasons.push("session");
    return { reasons, primaryCallee, primaryMemberPath, primaryEmptyParam };
  }
  if (n.dialect === "data" && n.op === "unaryop") {
    const uop = String(n.attrs?.operator ?? "");
    if (uop === "empty") {
      reasons.push("empty");
      const arg = get((n.operands ?? [])[0]);
      if (arg && arg.dialect === "data" && arg.op === "param") {
        const pname = String(arg.attrs?.name ?? "");
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(pname)) primaryEmptyParam = pname;
      }
    } else reasons.push("unary");
    for (const op of n.operands ?? []) merge(cwlClassifyOpaqueCond(get, op, depth + 1));
    return { reasons, primaryCallee, primaryMemberPath, primaryEmptyParam };
  }
  if (n.dialect === "data" && n.op === "binop") {
    for (const op of n.operands ?? []) merge(cwlClassifyOpaqueCond(get, op, depth + 1));
    return { reasons, primaryCallee, primaryMemberPath, primaryEmptyParam };
  }
  for (const op of n.operands ?? []) merge(cwlClassifyOpaqueCond(get, op, depth + 1));
  if (reasons.length === 0) reasons.push("unsupported");
  return { reasons, primaryCallee, primaryMemberPath, primaryEmptyParam };
}

/**
 * Honest opaque residual for call/member (and related) early-exit conds.
 * Prefers `g_<callee>` when a call dominates; else `g_empty_<name>` when
 * `empty(param)` dominates; else `g_member_<path>` when a stable member path
 * dominates; else `gN`. Never a hole that invents verify — residual is
 * documentation surface only (RFC-0021).
 * @param {(id: string) => object | undefined} get
 * @param {string} id
 * @param {number} seq
 * @returns {{ name: string, reason: string, primaryCallee: string | null, primaryMemberPath: string | null, primaryEmptyParam: string | null }}
 */
export function cwlOpaqueCondResidual(get, id, seq) {
  const { reasons, primaryCallee, primaryMemberPath, primaryEmptyParam } =
    cwlClassifyOpaqueCond(get, id);
  const reason = reasons.length ? reasons.join("+") : "opaque";
  let name = `g${seq}`;
  if (primaryCallee && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(primaryCallee)) {
    name = `g_${primaryCallee}`;
  } else if (
    primaryEmptyParam &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(primaryEmptyParam)
  ) {
    name = `g_empty_${primaryEmptyParam}`;
  } else if (
    primaryMemberPath &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(primaryMemberPath)
  ) {
    name = `g_member_${primaryMemberPath}`;
  }
  return { name, reason, primaryCallee, primaryMemberPath, primaryEmptyParam };
}

/**
 * Peel transparent calls; classify echo payload for CWL projection.
 * Dynamic leaves (member/param/field/binop) are skipped in HTML chrome mode
 * rather than holing the whole handler (origin literals still project).
 * @param {(id: string) => object | undefined} get
 * @param {string} id
 * @returns {{ kind: "lit", value: unknown, json?: boolean } | { kind: "value", value: object, json?: boolean } | { kind: "skip" } | { kind: "hole", reason: string }}
 */
function cwlClassifyEchoPayload(get, id) {
  let cur = id;
  let json = false;
  for (let depth = 0; depth < 8; depth++) {
    const n = get(cur);
    if (!n) return { kind: "hole", reason: "hub:cwl:missing-value" };
    if (n.dialect === "data" && n.op === "call") {
      const callee = String(n.attrs?.callee ?? "");
      if (CWL_JSON_CALLS.has(callee)) json = true;
      if (CWL_TRANSPARENT_CALLS.has(callee)) {
        const ops = n.operands ?? [];
        if (ops.length === 1) {
          cur = ops[0];
          continue;
        }
        return { kind: "hole", reason: `hub:cwl:call-arity:${callee}` };
      }
    }
    break;
  }
  const n = get(cur);
  if (!n) return { kind: "hole", reason: "hub:cwl:missing-value" };
  if (n.dialect === "data" && n.op === "literal") {
    return { kind: "lit", value: stripBom(n.attrs?.value), json };
  }
  // Path/query/body params are projectable as CWL refs (e.g. `return userId;`).
  // Member/binop/unary stay skip for HTML chrome streams (D6442).
  if (n.dialect === "data" && (n.op === "param" || n.op === "request.field")) {
    const v = cwlValueOf(get, cur);
    if (v.t === "hole") return { kind: "hole", reason: v.reason };
    return { kind: "value", value: v, json };
  }
  if (
    n.dialect === "data" &&
    (n.op === "member" || n.op === "binop" || n.op === "unaryop")
  ) {
    return { kind: "skip" };
  }
  if (n.dialect === "data" && n.op === "call" && String(n.attrs?.callee ?? "") === "current_user") {
    return { kind: "skip" };
  }
  const v = cwlValueOf(get, cur);
  if (v.t === "hole") return { kind: "hole", reason: v.reason };
  return { kind: "value", value: v, json };
}

import { cwlHtmlTemplateToLit } from "./cwl-html-template.mjs";
import { isLowerableStructuredValue } from "./hub-native-body-emit.mjs";
function stripBom(s) {
  return typeof s === "string" ? s.replace(/^\uFEFF/, "") : s;
}

const CWL_JSON_CALLS = new Set(["json_encode", "__return_json"]);
const CWL_TEXT_CONTENT_TYPE = "text/plain; charset=utf-8";
const CWL_JSON_CONTENT_TYPE = "application/json";

/** Whether a node is a JSON-producing call (`json_encode(...)` / `__return_json(...)`). */
function isCwlJsonCall(get, id) {
  const n = get(id);
  return Boolean(n && n.dialect === "data" && n.op === "call" && CWL_JSON_CALLS.has(String(n.attrs?.callee ?? "")));
}

/**
 * Lower a WebIR data expression into a CWL value representation.
 * @param {(id: string) => object | undefined} get
 * @param {string} id
 * @returns {{ t: "lit", value: unknown } | { t: "ref", source: string, name: string } | { t: "obj", entries: Array<{ key: string, value: object }> } | { t: "hole", reason: string }}
 */
export function cwlValueOf(get, id) {
  const n = get(id);
  if (!n) return { t: "hole", reason: "hub:cwl:missing-value" };
  if (n.dialect === "data" && n.op === "html.template") {
    return cwlHtmlTemplateToLit(get, n);
  }
  if (n.dialect === "data" && n.op === "ui.tree") {
    return { t: "lit", value: "__cwl_ui_tree__" };
  }
  if (n.dialect === "data" && n.op === "literal") {
    return { t: "lit", value: stripBom(n.attrs?.value) };
  }
  if (n.dialect === "data" && n.op === "request.field") {
    const source = String(n.attrs?.source ?? "path");
    const name = String(n.attrs?.name ?? "");
    if (source !== "path" && source !== "query" && source !== "body" && source !== "header" && source !== "cookie") {
      return { t: "hole", reason: `hub:cwl:unsupported-field-source:${source}` };
    }
    return { t: "ref", source, name };
  }
  if (n.dialect === "data" && n.op === "binop" && n.attrs?.operator === "??") {
    // Null-coalesce: project the primary operand and carry the default literal
    // onto the (ref) so the CWL declaration can preserve it (`query q = "";`).
    const ops = n.operands ?? [];
    if (ops.length === 0) return { t: "hole", reason: "hub:cwl:empty-coalesce" };
    const primary = cwlValueOf(get, ops[0]);
    if (primary.t === "ref" && ops.length >= 2) {
      const def = cwlValueOf(get, ops[1]);
      if (def.t === "lit") return { ...primary, default: def.value };
    }
    return primary;
  }
  if (n.dialect === "data" && n.op === "block") {
    const ops = n.operands ?? [];
    if (ops.length === 1) return cwlValueOf(get, ops[0]);
    return { t: "hole", reason: "hub:cwl:unsupported-value:data.block" };
  }
  if (n.dialect === "data" && n.op === "call") {
    const callee = String(n.attrs?.callee ?? "");
    if (callee === "__object_literal") {
      const ops = n.operands ?? [];
      /** @type {Array<{ key: string, value: object }>} */
      const entries = [];
      for (let i = 0; i + 1 < ops.length; i += 2) {
        const keyNode = get(ops[i]);
        const key = keyNode?.attrs?.value;
        if (typeof key !== "string") return { t: "hole", reason: "hub:cwl:non-string-key" };
        const value = cwlValueOf(get, ops[i + 1]);
        if (value.t === "hole") return value;
        entries.push({ key, value });
      }
      return { t: "obj", entries };
    }
    if (callee === "__array_literal") {
      const ops = n.operands ?? [];
      const items = [];
      for (const op of ops) {
        const v = cwlValueOf(get, op);
        if (v.t !== "lit") return { t: "hole", reason: "hub:cwl:non-literal-array" };
        items.push(v.value);
      }
      return { t: "lit", value: items };
    }
    if (CWL_TRANSPARENT_CALLS.has(callee)) {
      const ops = n.operands ?? [];
      if (ops.length === 1) return cwlValueOf(get, ops[0]);
      return { t: "hole", reason: `hub:cwl:call-arity:${callee}` };
    }
    return { t: "hole", reason: `hub:cwl:unsupported-call:${callee}` };
  }
  return { t: "hole", reason: `hub:cwl:unsupported-value:${n.dialect}.${n.op}` };
}

/**
 * Walk a hub handler body into a CWL-shaped projection: response status, the
 * referenced path/query params, and a single return value. Flattens nested
 * blocks, walks `data.if` / `data.ifElse` / `data.foreach` (D6442), concatenates
 * origin HTML literal echoes (foreach body inlined once; if/else chrome union),
 * and projects early-exit guards as `earlyGuards` for CWL `if` emit
 * (RFC-0021: real cond expr when projectable; else opaque residual —
 * `g_<callee>` / `gN`, no invented verify for calls/members). Stmt-level
 * `foreach` bindings capture collection+item when iterable is a param;
 * body chrome is kept inside the binding (not unrolled into outer HTML).
 * @param {(id: string) => object | undefined} get
 * @param {string} bodyId
 * @returns {{ status: number | null, params: Array<{ source: string, name: string }>, value: object | null, holeReason: string | null, earlyGuards: Array<{ condName: string, condExpr: string | null, opaqueReason: string | null, status: number | null, value: object | null }>, foreachBindings: Array<{ collection: string, item: string, key: string | null, bodyHtml: string | null }> }}
 */
export function walkCwlHandlerBody(get, bodyId) {
  let status = null;
  /** @type {object | null} */
  let value = null;
  /** @type {object | null} */
  let loadData = null;
  let holeReason = null;
  let json = false;
  let responseContentType = null;
  let responseKind = null;
  /** @type {string[]} */
  const htmlParts = [];
  let htmlChrome = false;
  /** @type {Array<{ condName: string, condExpr: string | null, opaqueReason: string | null, status: number | null, value: object | null }>} */
  const earlyGuards = [];
  /** @type {Array<{ collection: string, item: string, key: string | null, bodyHtml: string | null }>} */
  const foreachBindings = [];
  let guardSeq = 0;
  /** When >0, visit is capturing an early-exit guard body (status/value local). */
  let guardCapture = null;
  let sessionRead = false;
  let sessionWrite = false;

  const looksHtmlLit = (v) =>
    typeof v === "string" && (/^\s*</.test(v) || /<!doctype/i.test(v) || htmlChrome || htmlParts.length > 0);

  const applyEchoPayload = (payload) => {
    if (payload.kind === "skip") return;
    if (payload.kind === "hole") {
      holeReason = payload.reason;
      return;
    }
    if (payload.kind === "lit") {
      if (payload.value === "" || payload.value === undefined) return;
      if (payload.json) json = true;
      if (looksHtmlLit(payload.value)) {
        htmlChrome = true;
        htmlParts.push(String(payload.value));
        value = { t: "lit", value: htmlParts.join("") };
        if (guardCapture) guardCapture.value = value;
        return;
      }
      value = { t: "lit", value: payload.value };
      if (guardCapture) guardCapture.value = value;
      return;
    }
    // structured value
    if (htmlChrome || htmlParts.length > 0) {
      // Dynamic leaf mid-chrome — omit; keep origin literal HTML (D6442).
      return;
    }
    if (payload.json) json = true;
    value = payload.value;
    if (guardCapture) guardCapture.value = value;
  };

  const visit = (id) => {
    if (holeReason) return;
    const n = get(id);
    if (!n) {
      holeReason = "hub:cwl:missing-body";
      return;
    }
    if ((n.dialect === "legacy" || n.dialect === "data") && n.op === "hole") {
      holeReason = String(n.attrs?.reason ?? "hub:cwl:hole");
      return;
    }
    if (n.dialect === "data" && n.op === "call" && n.attrs?.callee === "__page_load") {
      const ops = n.operands ?? [];
      if (ops.length === 1) {
        const v = cwlValueOf(get, ops[0]);
        if (v.t === "hole") {
          holeReason = v.reason;
          return;
        }
        loadData = v;
      }
      return;
    }
    if (n.dialect === "web.request" && n.op === "response") {
      if (n.attrs?.contentType) responseContentType = String(n.attrs.contentType);
      if (n.attrs?.kind) responseKind = String(n.attrs.kind);
      // CWL-ingested routes carry the response status on the response node
      // (the lift path uses an `http.error` effect instead); read it here so a
      // round-tripped `status N;` projects as `withStatus`.
      const s = Number(n.attrs?.status);
      if (Number.isFinite(s) && s !== 200) {
        status = s;
        if (guardCapture) guardCapture.status = s;
      }
      for (const op of n.operands ?? []) visit(op);
      return;
    }
    if (n.dialect === "data" && n.op === "block") {
      for (const op of n.operands ?? []) visit(op);
      return;
    }
    // Early-exit guards: project then-body into earlyGuards; success path continues.
    if (n.dialect === "data" && (n.op === "if" || n.op === "ifElse")) {
      const ops = n.operands ?? [];
      const condId = ops[0];
      const thenId = ops[1];
      const elseId = ops.length >= 3 ? ops[2] : undefined;
      if (thenId && cwlBlockHasEarlyExit(get, thenId) && !elseId) {
        const savedStatus = status;
        const savedValue = value;
        const savedHtml = htmlParts.slice();
        const savedChrome = htmlChrome;
        const condExpr = condId ? cwlCondOf(get, condId) : null;
        let opaqueReason = null;
        let condName = condExpr;
        if (!condExpr && condId) {
          const opaque = cwlOpaqueCondResidual(get, condId, guardSeq++);
          condName = opaque.name;
          opaqueReason = opaque.reason;
        } else if (!condExpr) {
          condName = `g${guardSeq++}`;
          opaqueReason = "missing";
        }
        guardCapture = { condName, status: null, value: null };
        status = null;
        value = null;
        htmlParts.length = 0;
        htmlChrome = false;
        visit(thenId);
        earlyGuards.push({
          condName: guardCapture.condName,
          condExpr,
          opaqueReason,
          status: guardCapture.status ?? status,
          value: guardCapture.value ?? value,
        });
        guardCapture = null;
        status = savedStatus;
        value = savedValue;
        htmlParts.length = 0;
        htmlParts.push(...savedHtml);
        htmlChrome = savedChrome;
        return;
      }
      // HTML / normal branches: walk then + else (chrome union from origin literals).
      if (thenId) visit(thenId);
      if (elseId) visit(elseId);
      return;
    }
    if (n.dialect === "data" && n.op === "foreach") {
      // Stmt-level foreach binding when iterable is a simple param.
      // Body chrome stays inside the binding — not unrolled into outer HTML.
      // Dynamic leaves still omitted (D6442); no invented loop evaluate at verify.
      const iterableId = n.operands?.[0];
      const bodyOp = n.operands?.[1];
      const iterable = iterableId ? get(iterableId) : null;
      const collection =
        iterable && iterable.dialect === "data" && iterable.op === "param"
          ? String(iterable.attrs?.name ?? "")
          : "";
      const item = String(n.attrs?.valueName ?? "");
      const keyRaw = n.attrs?.keyName != null ? String(n.attrs.keyName) : "";
      const keyOk = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(keyRaw) ? keyRaw : null;
      const bindOk =
        /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(collection) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item);
      if (bindOk && bodyOp) {
        const savedStatus = status;
        const savedValue = value;
        const savedHtml = htmlParts.slice();
        const savedChrome = htmlChrome;
        status = null;
        value = null;
        htmlParts.length = 0;
        htmlChrome = false;
        visit(bodyOp);
        const bodyHtml =
          htmlParts.length > 0
            ? htmlParts.join("")
            : value?.t === "lit" && typeof value.value === "string"
              ? value.value
              : null;
        foreachBindings.push({
          collection,
          item,
          key: keyOk,
          bodyHtml: bodyHtml && bodyHtml.length > 0 ? bodyHtml : null,
        });
        status = savedStatus;
        value = savedValue;
        htmlParts.length = 0;
        htmlParts.push(...savedHtml);
        htmlChrome = savedChrome;
        return;
      }
      // Fallback: iterable not a bindable param — inline body chrome once.
      if (bodyOp) visit(bodyOp);
      return;
    }
    if (n.dialect === "effect" && (n.op === "http.error" || n.op === "http.status")) {
      const s = Number(n.attrs?.status);
      if (Number.isFinite(s)) {
        status = s;
        if (guardCapture) guardCapture.status = s;
      }
      return;
    }
    if (n.dialect === "effect" && n.op === "redirect") {
      // Do not project Location concat/binop into the return value (would hole).
      status = 302;
      if (guardCapture) guardCapture.status = 302;
      if (!value) value = { t: "lit", value: "" };
      return;
    }
    if (n.dialect === "effect" && n.op === "session.read") {
      sessionRead = true;
      return;
    }
    if (n.dialect === "effect" && n.op === "session.write") {
      sessionWrite = true;
      return;
    }
    if (n.dialect === "effect" && n.op === "db.query") {
      // Prep / INSERT side effects — retained in WebIR/Hono; not CWL surface stmts.
      return;
    }
    if (n.dialect === "data" && n.op === "call" && n.attrs?.callee === "__assign") {
      // Assign is surface-elided, but nested session effects still declare handler effects.
      const markSessionFx = (id, depth = 0) => {
        if (depth > 12) return;
        const x = get(id);
        if (!x) return;
        if (x.dialect === "effect" && x.op === "session.read") sessionRead = true;
        if (x.dialect === "effect" && x.op === "session.write") sessionWrite = true;
        for (const op of x.operands ?? []) markSessionFx(op, depth + 1);
      };
      for (const op of n.operands ?? []) markSessionFx(op);
      return;
    }
    if (
      n.dialect === "data" &&
      n.op === "call" &&
      CWL_SESSION_BOOT_CALLS.has(String(n.attrs?.callee ?? ""))
    ) {
      // Middleware-equivalent; do not hole the handler (D6442 / RFC-0007).
      return;
    }
    if (n.dialect === "data" && n.op === "call" && CWL_EARLY_EXIT_CALLEES.has(String(n.attrs?.callee ?? ""))) {
      return;
    }
    if (n.dialect === "effect" && n.op === "echo") {
      const ops = n.operands ?? [];
      if (ops.length === 0) return;
      const payloadId = ops[0];
      const payload = get(payloadId);
      // `__ternary(cond, thenLit, elseLit)` → RFC-0021-style if-guard + fallthrough
      // (no invented ternary evaluate; opaque cond when not projectable).
      if (
        payload &&
        payload.dialect === "data" &&
        payload.op === "call" &&
        String(payload.attrs?.callee ?? "") === "__ternary"
      ) {
        const tops = payload.operands ?? [];
        if (tops.length >= 3) {
          const thenP = cwlClassifyEchoPayload(get, tops[1]);
          const elseP = cwlClassifyEchoPayload(get, tops[2]);
          if (thenP.kind === "lit" && elseP.kind === "lit") {
            const condExpr = tops[0] ? cwlCondOf(get, tops[0]) : null;
            let opaqueReason = null;
            let condName = condExpr;
            if (!condExpr && tops[0]) {
              const opaque = cwlOpaqueCondResidual(get, tops[0], guardSeq++);
              condName = opaque.name;
              opaqueReason = opaque.reason;
            } else if (!condExpr) {
              condName = `g${guardSeq++}`;
              opaqueReason = "missing";
            }
            earlyGuards.push({
              condName,
              condExpr,
              opaqueReason,
              status: null,
              value: { t: "lit", value: thenP.value },
            });
            applyEchoPayload(elseP);
            return;
          }
        }
      }
      applyEchoPayload(cwlClassifyEchoPayload(get, payloadId));
      return;
    }
    if (n.dialect === "data" && (n.op === "literal" || n.op === "call" || n.op === "request.field" || n.op === "html.template" || n.op === "ui.tree")) {
      const jsonCall = isCwlJsonCall(get, id);
      if (n.op === "call" && CWL_TRANSPARENT_CALLS.has(String(n.attrs?.callee ?? ""))) {
        applyEchoPayload(cwlClassifyEchoPayload(get, id));
        return;
      }
      const v = cwlValueOf(get, id);
      if (v.t === "hole") {
        // Dynamic / unsupported leaf in chrome stream — skip rather than hole handler.
        if (htmlChrome || htmlParts.length > 0) return;
        holeReason = v.reason;
        return;
      }
      if (v.t === "lit" && (v.value === "" || v.value === undefined)) return;
      if (jsonCall) json = true;
      if (v.t === "lit" && looksHtmlLit(v.value)) {
        htmlChrome = true;
        htmlParts.push(String(v.value));
        value = { t: "lit", value: htmlParts.join("") };
      } else {
        value = v;
      }
      if (guardCapture) guardCapture.value = value;
      return;
    }
    holeReason = `hub:cwl:unsupported-stmt:${n.dialect}.${n.op}`;
  };

  visit(bodyId);
  if (htmlParts.length > 0) {
    value = { t: "lit", value: htmlParts.join("") };
  }

  /** @type {Array<{ source: string, name: string, default?: unknown }>} */
  const params = [];
  const collect = (v) => {
    if (!v) return;
    if (v.t === "ref") {
      let p = params.find((q) => q.name === v.name && q.source === v.source);
      if (!p) {
        p = { source: v.source, name: v.name };
        params.push(p);
      }
      if (Object.prototype.hasOwnProperty.call(v, "default")) p.default = v.default;
    }
    if (v.t === "obj") for (const e of v.entries) collect(e.value);
  };
  collect(value);

  // Infer the response MIME from the body shape (the PHP/JS header was dropped
  // at ingest by design; emit re-derives it): JSON-producing calls or
  // object/array bodies are application/json, other bodies are text/plain.
  const isJson =
    json || value?.t === "obj" || (value?.t === "lit" && Array.isArray(value.value));
  const noContent = status === 204 || status === 304;
  let contentType = responseContentType;
  if (!contentType && !noContent) {
    contentType = isJson ? CWL_JSON_CONTENT_TYPE : CWL_TEXT_CONTENT_TYPE;
  }
  const isPage =
    responseKind === "html" ||
    (contentType && contentType.includes("html")) ||
    (value?.t === "lit" && value.value === "__cwl_ui_tree__") ||
    (value?.t === "lit" &&
      typeof value.value === "string" &&
      value.value.trimStart().startsWith("<"));
  if (isPage && !noContent && !contentType?.includes("html")) {
    contentType = "text/html; charset=utf-8";
  }

  /** @type {string[]} */
  const effects = [];
  if (sessionRead) effects.push("session.read");
  if (sessionWrite) effects.push("session.write");

  return {
    status,
    params,
    value,
    loadData,
    holeReason,
    earlyGuards,
    foreachBindings,
    effects,
    contentType: noContent ? null : contentType,
    surfaceKind: isPage ? "page" : "api",
  };
}

/**
 * Lower a CWL value representation to a plain JSON-serializable literal.
 * Dynamic refs cannot be lowered — returns null.
 * @param {ReturnType<typeof cwlValueOf> | null | undefined} v
 * @returns {unknown | null}
 */
function hubCwlValueToLiteral(v) {
  if (!v) return null;
  if (v.t === "lit") return v.value;
  if (v.t === "obj") {
    /** @type {Record<string, unknown>} */
    const obj = {};
    for (const e of v.entries) {
      const inner = hubCwlValueToLiteral(e.value);
      if (inner === null) return null;
      obj[e.key] = inner;
    }
    return obj;
  }
  return null;
}

/**
 * Classify hub handler bodies for native emit (literal or path/query structured refs).
 * Reuses the CWL block walker so PHP header+echo and effect blocks lower consistently (D423).
 * @param {(id: string) => object | undefined} get
 * @param {string} bodyId
 */
export function classifyHubHandlerBody(get, bodyId) {
  const walked = walkCwlHandlerBody(get, bodyId);
  if (walked.holeReason) {
    return { kind: "hole", reason: walked.holeReason };
  }
  if (!walked.value) {
    const s = walked.status;
    if (s === 204 || s === 304) return { kind: "literal", value: null };
    if (s !== null || walked.contentType) return { kind: "literal", value: "" };
    return { kind: "hole", reason: "hub:empty-body" };
  }
  const literal = hubCwlValueToLiteral(walked.value);
  if (literal !== null) return { kind: "literal", value: literal };
  if (isLowerableStructuredValue(walked.value)) {
    return { kind: "structured", value: walked.value };
  }
  return { kind: "hole", reason: "hub:unsupported-body-shape" };
}

/**
 * CWL `IDENT` for handler/page names (`docs/CWL.md` grammar). File-derived
 * WebIR names often contain `.` (e.g. `config.json`); those are not valid IDENT
 * and round-trip lift would drop the route.
 * @param {unknown} name
 * @param {string} [fallback]
 */
export function toCwlIdent(name, fallback = "handler") {
  let s = String(name ?? "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (!s) s = fallback;
  if (!/^[a-zA-Z_]/.test(s)) s = `h_${s}`;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) s = fallback;
  return s;
}

/**
 * List routes with CWL-shaped handler projections (status/params/value).
 * @param {import('@chrysalis/webir').Module} module
 */
export function listCwlRoutes(module) {
  const get = (id) => module.nodes.get(id);
  const routes = [];
  for (const rid of module.roots) {
    const routeNode = get(rid);
    if (!routeNode || routeNode.dialect !== "web.request" || routeNode.op !== "route") continue;
    const attrs = routeNode.attrs ?? {};
    const method = String(attrs.method ?? "GET").toUpperCase();
    const path = String(attrs.path ?? "/");
    const handlerId = routeNode.operands?.[0];
    if (handlerId === undefined) continue;
    const handler = get(handlerId);
    if (!handler || handler.dialect !== "web.request" || handler.op !== "handler") continue;
    const bodyId = handler.operands?.[0];
    if (bodyId === undefined) continue;
    const rawName = String(handler.attrs?.name ?? `${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`);
    const handlerName = toCwlIdent(rawName, `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]+/g, "_") || "root"}`);
    routes.push({ method, path, handlerName, ...walkCwlHandlerBody(get, bodyId) });
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

/** Render a CWL literal value. */
function cwlRenderLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(cwlRenderLiteral).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    const ent = Object.entries(value).map(([k, v]) => `${k}: ${cwlRenderLiteral(v)}`);
    return `{ ${ent.join(", ")} }`;
  }
  return "null";
}

/** Render a CWL value representation produced by `walkCwlHandlerBody`/`cwlValueOf`. */
function cwlRenderValue(v) {
  if (!v) return '""';
  if (v.t === "lit") return cwlRenderLiteral(v.value);
  if (v.t === "ref") return v.name;
  if (v.t === "obj") {
    const ent = v.entries.map((e) => `${e.key}: ${cwlRenderValue(e.value)}`);
    return `{ ${ent.join(", ")} }`;
  }
  return '""';
}

/**
 * Render the CWL projection of `listCwlRoutes` to CWL source text. Shared by the
 * round-trip emit (`emit-cwl-from-hub`) and the project-to-CWL migration export
 * (`hub-project-cwl-export`) so both carry the same status/param/`??`-default/
 * content-type/object-body fidelity rather than diverging projections.
 * @param {ReturnType<typeof listCwlRoutes>} routes
 * @param {{ header?: string, moduleName?: string }} [opts]
 * @returns {{ text: string, holeCount: number, routeCount: number }}
 */
export function renderCwlRoutes(routes, opts = {}) {
  const header = opts.header ?? "# Chrysalis Web Language";
  const moduleName = opts.moduleName ?? "hub";
  const lines = [header, `module ${moduleName};`, ""];
  let holeCount = 0;
  for (const r of routes) {
    const isPage =
      r.surfaceKind === "page" ||
      (r.contentType && String(r.contentType).includes("html"));
    const handlerIdent = toCwlIdent(
      r.handlerName,
      `${String(r.method ?? "GET").toLowerCase()}_${String(r.path ?? "/").replace(/[^a-zA-Z0-9]+/g, "_") || "root"}`,
    );
    lines.push(isPage ? `@page ${r.method} "${r.path}"` : `@route ${r.method} "${r.path}"`);
    lines.push(isPage ? `page ${handlerIdent} {` : `handler ${handlerIdent} {`);
    const effectTags = Array.isArray(r.effects) && r.effects.length > 0 ? r.effects : ["none"];
    lines.push(`  effects: ${effectTags.join(", ")};`);
    const renderSurface = () => {
      if (typeof r.status === "number" && r.status !== 200) {
        lines.push(`  status ${r.status};`);
      }
      if (r.contentType) {
        lines.push(`  content-type ${JSON.stringify(r.contentType)};`);
      }
      for (const p of r.params ?? []) {
        const kw =
          p.source === "query"
            ? "query"
            : p.source === "body"
              ? "body"
              : p.source === "header"
                ? "header"
                : p.source === "cookie"
                  ? "cookie"
                  : "param";
        const hasDefault = Object.prototype.hasOwnProperty.call(p, "default");
        lines.push(hasDefault ? `  ${kw} ${p.name} = ${cwlRenderLiteral(p.default)};` : `  ${kw} ${p.name};`);
      }
      for (const h of r.responseHeaders ?? []) {
        const name = String(h?.name ?? "");
        if (!name) continue;
        if (Object.prototype.hasOwnProperty.call(h, "default")) {
          lines.push(`  response-header ${name} = ${cwlRenderLiteral(h.default)};`);
        } else {
          lines.push(`  response-header ${name};`);
        }
      }
    };
    if (r.holeReason) {
      holeCount += 1;
      // Importers (OpenAPI -> CWL) keep the known route surface alongside an
      // honest body hole; the default (round-trip emit) keeps the legacy
      // hole-only shape so existing golden snapshots are byte-identical.
      if (opts.surfaceOnHole) renderSurface();
      // The CWL `hole` statement takes a bare token reason (`hole foo:bar;`);
      // a free-text reason falls back to the `hole <name> "<message>";` form.
      const reason = String(r.holeReason);
      lines.push(
        /^[A-Za-z0-9_:.-]+$/.test(reason)
          ? `  hole ${reason};`
          : `  hole legacy ${JSON.stringify(reason)};`,
      );
      lines.push("}");
      lines.push("");
      continue;
    }
    renderSurface();
    // Early-exit guards (RFC-0021): projectable cond expr, else opaque residual
    // (`g_<callee>` / `gN`). Complex calls/members stay in WebIR/Hono.
    for (const g of r.earlyGuards ?? []) {
      const cond = g.condExpr || g.condName;
      lines.push(`  if ${cond} {`);
      if (typeof g.status === "number" && g.status !== 200) {
        lines.push(`    status ${g.status};`);
      }
      lines.push(`    return ${cwlRenderValue(g.value)};`);
      lines.push("  }");
    }
    if (r.loadData && !r.holeReason) {
      lines.push(`  load ${cwlRenderValue(r.loadData)};`);
    }
    if (
      isPage &&
      r.value?.t === "lit" &&
      typeof r.value.value === "string" &&
      !r.holeReason
    ) {
      lines.push(`  return html ${JSON.stringify(r.value.value)};`);
    } else {
      lines.push(`  return ${cwlRenderValue(r.value)};`);
    }
    // Stmt-level foreach after page return so ST/chrome extractors keep the
    // outer HTML return as authority; body chrome is binding documentation.
    for (const fe of r.foreachBindings ?? []) {
      const keyPart = fe.key ? ` ${fe.key} =>` : "";
      lines.push(`  foreach ${fe.collection} as${keyPart} ${fe.item} {`);
      if (fe.bodyHtml) {
        lines.push(`    return html ${JSON.stringify(fe.bodyHtml)};`);
      }
      lines.push("  }");
    }
    lines.push("}");
    lines.push("");
  }
  return { text: `${lines.join("\n")}\n`, holeCount, routeCount: routes.length };
}

/**
 * Counted coverage of the CWL projection for a flagship module: how many routes
 * are hole-free and how many carry each fidelity feature (status, params, `??`
 * defaults, content-type, structured object bodies). This turns the G124–G128
 * projection depth into a measurable evidence signal rather than a binary pass.
 * @param {import('@chrysalis/webir').Module} module
 * @returns {{ total: number, holeFree: number, withStatus: number, withParams: number, withBodyParams: number, withHeaderParams: number, withCookieParams: number, withParamDefaults: number, withContentType: number, objectBodies: number, holeReasons: string[] }}
 */
export function summarizeCwlProjection(module) {
  const routes = listCwlRoutes(module);
  let holeFree = 0;
  let withStatus = 0;
  let withParams = 0;
  let withBodyParams = 0;
  let withHeaderParams = 0;
  let withCookieParams = 0;
  let withParamDefaults = 0;
  let withContentType = 0;
  let objectBodies = 0;
  const holeReasons = [];
  for (const r of routes) {
    if (r.holeReason === null) holeFree++;
    else holeReasons.push(r.holeReason);
    if (typeof r.status === "number") withStatus++;
    const params = Array.isArray(r.params) ? r.params : [];
    if (params.length > 0) withParams++;
    if (params.some((p) => p.source === "body")) withBodyParams++;
    if (params.some((p) => p.source === "header")) withHeaderParams++;
    if (params.some((p) => p.source === "cookie")) withCookieParams++;
    if (params.some((p) => Object.prototype.hasOwnProperty.call(p, "default"))) withParamDefaults++;
    if (r.contentType) withContentType++;
    if (r.value && r.value.t === "obj") objectBodies++;
  }
  return {
    total: routes.length,
    holeFree,
    withStatus,
    withParams,
    withBodyParams,
    withHeaderParams,
    withCookieParams,
    withParamDefaults,
    withContentType,
    objectBodies,
    holeReasons: [...new Set(holeReasons)].sort(),
  };
}

/**
 * @param {import('@chrysalis/webir').Module} module
 */
export function listHubWebRoutes(module) {
  const get = (id) => module.nodes.get(id);
  const routes = [];
  for (const rid of module.roots) {
    const routeNode = get(rid);
    if (!routeNode || routeNode.dialect !== "web.request" || routeNode.op !== "route") continue;
    const attrs = routeNode.attrs ?? {};
    const method = String(attrs.method ?? "GET").toUpperCase();
    const path = String(attrs.path ?? "/");
    const handlerId = routeNode.operands?.[0];
    if (handlerId === undefined) continue;
    const handler = get(handlerId);
    if (!handler || handler.dialect !== "web.request" || handler.op !== "handler") continue;
    const bodyId = handler.operands?.[0];
    if (bodyId === undefined) continue;
    const rawName = String(handler.attrs?.name ?? `${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`);
    const handlerName = toCwlIdent(
      rawName,
      `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]+/g, "_") || "root"}`,
    );
    routes.push({
      method,
      path,
      handlerName,
      body: classifyHubHandlerBody(get, bodyId),
      origin: handler.origin ?? routeNode.origin,
    });
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}
