/**
 * RFC-0021 — lower projectable early-exit / nested control to WebIR for simulate.
 * Opaque `g_*` residuals are skipped (no invented verify).
 */
import { HUB_T, hubOrigin } from "./hub-lift-webir-route.mjs";

/**
 * @param {string} expr
 * @param {string} sep "||" | "&&"
 */
function splitTopLevel(expr, sep) {
  /** @type {string[]} */
  const parts = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "(") depth += 1;
    else if (c === ")") depth -= 1;
    if (depth === 0 && expr.slice(i, i + sep.length) === sep) {
      parts.push(cur.trim());
      cur = "";
      i += sep.length - 1;
      continue;
    }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/**
 * @param {object} ctx
 * @param {string} name
 * @param {{ path?: string[], query?: string[], body?: string[], header?: string[], cookie?: string[] }} bindings
 * @param {{ file: string, line?: number }} loc
 */
function lowerIdent(ctx, name, bindings, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const prov = [webir.provenance("hub-ingest", "cwl:early-exit-ident")];
  if ((bindings.body ?? []).includes(name)) {
    return data.requestField({ source: "body", name, type: HUB_T.string, origin, provenance: prov });
  }
  if ((bindings.path ?? []).includes(name)) {
    return data.requestField({ source: "path", name, type: HUB_T.string, origin, provenance: prov });
  }
  if ((bindings.query ?? []).includes(name)) {
    return data.requestField({ source: "query", name, type: HUB_T.string, origin, provenance: prov });
  }
  if ((bindings.header ?? []).includes(name)) {
    return data.requestField({ source: "header", name, type: HUB_T.string, origin, provenance: prov });
  }
  if ((bindings.cookie ?? []).includes(name)) {
    return data.requestField({ source: "cookie", name, type: HUB_T.string, origin, provenance: prov });
  }
  // Unbound → simulate null (e.g. !post → true)
  return data.param({ name, type: HUB_T.unknown, origin, provenance: prov });
}

/**
 * @param {object} ctx
 * @param {unknown} lit
 * @param {{ file: string, line?: number }} loc
 */
function lowerLit(ctx, lit, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const type =
    lit === null
      ? HUB_T.unknown
      : typeof lit === "string"
        ? HUB_T.string
        : typeof lit === "boolean"
          ? HUB_T.bool
          : typeof lit === "number"
            ? HUB_T.int
            : HUB_T.unknown;
  return data.literal({
    value: lit,
    type,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:early-exit-lit")],
  });
}

/**
 * Parse a JSON-ish / CWL literal token.
 * @param {string} raw
 */
function parseLitToken(raw) {
  const t = raw.trim();
  if (t === "null") return { ok: true, value: null };
  if (t === "true") return { ok: true, value: true };
  if (t === "false") return { ok: true, value: false };
  if (/^-?\d+(\.\d+)?$/.test(t)) return { ok: true, value: Number(t) };
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return { ok: true, value: t.slice(1, -1) };
  }
  return { ok: false };
}

/**
 * Projectable cond → NodeId, or null if opaque (`g_*` / unsupported).
 * @param {object} ctx
 * @param {string} expr
 * @param {object} bindings
 * @param {{ file: string, line?: number }} loc
 * @returns {import('@chrysalis/webir').NodeId | null}
 */
export function lowerCwlCondExpr(ctx, expr, bindings, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  let t = expr.trim();
  if (!t) return null;
  if (/^g_[A-Za-z0-9_]+$/.test(t)) return null; // opaque residual

  // Strip one layer of parens
  while (t.startsWith("(") && t.endsWith(")")) {
    let depth = 0;
    let wrapped = true;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === "(") depth += 1;
      else if (t[i] === ")") {
        depth -= 1;
        if (depth === 0 && i < t.length - 1) {
          wrapped = false;
          break;
        }
      }
    }
    if (!wrapped) break;
    t = t.slice(1, -1).trim();
  }

  const orParts = splitTopLevel(t, "||");
  if (orParts.length > 1) {
    let acc = lowerCwlCondExpr(ctx, orParts[0], bindings, loc);
    if (!acc) return null;
    for (let i = 1; i < orParts.length; i++) {
      const r = lowerCwlCondExpr(ctx, orParts[i], bindings, loc);
      if (!r) return null;
      acc = data.binOp({
        operator: "||",
        left: acc,
        right: r,
        type: HUB_T.bool,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:early-exit-or")],
      });
    }
    return acc;
  }

  const andParts = splitTopLevel(t, "&&");
  if (andParts.length > 1) {
    let acc = lowerCwlCondExpr(ctx, andParts[0], bindings, loc);
    if (!acc) return null;
    for (let i = 1; i < andParts.length; i++) {
      const r = lowerCwlCondExpr(ctx, andParts[i], bindings, loc);
      if (!r) return null;
      acc = data.binOp({
        operator: "&&",
        left: acc,
        right: r,
        type: HUB_T.bool,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:early-exit-and")],
      });
    }
    return acc;
  }

  const notM = /^!\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(t);
  if (notM) {
    if (/^g_/.test(notM[1])) return null;
    return data.unaryOp({
      operator: "!",
      operand: lowerIdent(ctx, notM[1], bindings, loc),
      type: HUB_T.bool,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl:early-exit-not")],
    });
  }

  const cmpM = /^([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=)\s*(.+)$/.exec(t);
  if (cmpM) {
    if (/^g_/.test(cmpM[1])) return null;
    const lit = parseLitToken(cmpM[3]);
    if (!lit.ok) return null;
    return data.binOp({
      operator: cmpM[2] === "==" ? "==" : "!=",
      left: lowerIdent(ctx, cmpM[1], bindings, loc),
      right: lowerLit(ctx, lit.value, loc),
      type: HUB_T.bool,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl:early-exit-cmp")],
    });
  }

  // Bare ident as truthiness
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) {
    if (/^g_/.test(t)) return null;
    return lowerIdent(ctx, t, bindings, loc);
  }

  return null;
}

/**
 * @param {object} ctx
 * @param {number} status
 * @param {object | null} body
 * @param {object} wr
 * @param {{ file: string, line?: number }} loc
 * @param {Function} lowerObjectEntriesBody
 */
function lowerExit(ctx, status, body, wr, loc, lowerObjectEntriesBody) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  let valueId;
  let kind = "text";
  let contentType = "text/plain; charset=utf-8";
  if (body?.kind === "html" && typeof body.value === "string") {
    valueId = data.literal({
      value: body.value,
      type: HUB_T.string,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl:early-exit-html")],
    });
    kind = "html";
    contentType = "text/html; charset=utf-8";
  } else if (body?.kind === "literal") {
    valueId = data.literal({
      value: body.value,
      type: typeof body.value === "string" ? HUB_T.string : HUB_T.unknown,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl:early-exit-lit")],
    });
    if (typeof body.value === "object" && body.value !== null) {
      kind = "json";
      contentType = "application/json";
    }
  } else if (body?.kind === "object" && body.entries && lowerObjectEntriesBody) {
    valueId = lowerObjectEntriesBody(ctx, body.entries, loc);
    kind = "json";
    contentType = "application/json";
  } else {
    valueId = data.literal({
      value: "",
      type: HUB_T.string,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl:early-exit-empty")],
    });
  }
  const resp = wr.response({
    attrs: { status, kind, contentType },
    value: valueId,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:early-exit-response")],
  });
  const ret = data.call({
    callee: "__return",
    args: [valueId],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:early-exit-halt")],
  });
  return data.block({
    statements: [resp, ret],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:early-exit")],
  });
}

/**
 * @param {object} ctx
 * @param {object} node if / earlyGuard with optional elseIfs + elseStmts
 * @param {object} wr
 * @param {{ file: string, line?: number }} loc
 * @param {object} bindings
 * @param {number} status
 * @param {Function} lowerObjectEntriesBody
 * @param {string} provTag
 * @returns {import('@chrysalis/webir').NodeId | null}
 */
function lowerIfConstruct(ctx, node, wr, loc, bindings, status, lowerObjectEntriesBody, provTag) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const cond = lowerCwlCondExpr(ctx, node.condExpr ?? "", bindings, loc);
  if (!cond) return null;
  // Opaque else-if → skip whole construct (no partial invent)
  for (const ei of node.elseIfs ?? []) {
    if (!lowerCwlCondExpr(ctx, ei.condExpr ?? "", bindings, loc)) return null;
  }

  const thenId =
    Array.isArray(node.stmts) && node.stmts.length > 0
      ? lowerControlStmts(ctx, node.stmts, wr, loc, bindings, node.status ?? status, lowerObjectEntriesBody)
      : lowerExit(ctx, node.status ?? status, node.body, wr, loc, lowerObjectEntriesBody);

  /** @type {import('@chrysalis/webir').NodeId | undefined} */
  let elseId;
  if (Array.isArray(node.elseStmts) && node.elseStmts.length > 0) {
    elseId = lowerControlStmts(
      ctx,
      node.elseStmts,
      wr,
      loc,
      bindings,
      node.elseStatus ?? status,
      lowerObjectEntriesBody,
    );
  } else if (node.elseBody) {
    elseId = lowerExit(ctx, node.elseStatus ?? status, node.elseBody, wr, loc, lowerObjectEntriesBody);
  }

  const elseIfs = node.elseIfs ?? [];
  for (let i = elseIfs.length - 1; i >= 0; i--) {
    const ei = elseIfs[i];
    const c = lowerCwlCondExpr(ctx, ei.condExpr ?? "", bindings, loc);
    if (!c) return null;
    const t =
      Array.isArray(ei.stmts) && ei.stmts.length > 0
        ? lowerControlStmts(ctx, ei.stmts, wr, loc, bindings, ei.status ?? status, lowerObjectEntriesBody)
        : lowerExit(ctx, ei.status ?? status, ei.body, wr, loc, lowerObjectEntriesBody);
    elseId = data.ifElse({
      cond: c,
      then: t,
      ...(elseId ? { else: elseId } : {}),
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl:early-exit-else-if")],
    });
  }

  return data.ifElse({
    cond,
    then: thenId,
    ...(elseId ? { else: elseId } : {}),
    origin,
    provenance: [webir.provenance("hub-ingest", provTag)],
  });
}

/**
 * @param {object} ctx
 * @param {object[]} stmts
 * @param {object} wr
 * @param {{ file: string, line?: number }} loc
 * @param {object} bindings
 * @param {number} status
 * @param {Function} lowerObjectEntriesBody
 */
function lowerControlStmts(ctx, stmts, wr, loc, bindings, status, lowerObjectEntriesBody) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  let curStatus = status;
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const parts = [];
  for (const s of stmts ?? []) {
    if (s.kind === "status") {
      curStatus = Number(s.status);
      continue;
    }
    if (s.kind === "return") {
      // Keep scanning: nested foreach/if after return are documentation IR
      // (empty-iter / opaque skips under simulate — never invent N-iteration).
      parts.push(lowerExit(ctx, curStatus, s.body, wr, loc, lowerObjectEntriesBody));
      continue;
    }
    if (s.kind === "if") {
      const lowered = lowerIfConstruct(
        ctx,
        s,
        wr,
        loc,
        bindings,
        curStatus,
        lowerObjectEntriesBody,
        "cwl:early-exit-nested-if",
      );
      if (lowered) parts.push(lowered);
      continue;
    }
    // foreach: emit IR for documentation; empty/non-array iterable skips under simulate
    if (s.kind === "foreach") {
      const iterable = lowerIdent(ctx, s.collection ?? "items", bindings, loc);
      const bodyId = lowerControlStmts(
        ctx,
        s.stmts ?? [],
        wr,
        loc,
        bindings,
        curStatus,
        lowerObjectEntriesBody,
      );
      parts.push(
        data.foreach({
          iterable,
          keyName: s.key ?? undefined,
          valueName: s.item ?? "item",
          body: bodyId,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:foreach")],
        }),
      );
    }
  }
  if (parts.length === 0) {
    return data.block({
      statements: [],
      type: HUB_T.unknown,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl:early-exit-empty-block")],
    });
  }
  if (parts.length === 1) return parts[0];
  return data.block({
    statements: parts,
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:early-exit-stmts")],
  });
}

/**
 * @param {object} route
 */
function routeBindings(route) {
  return {
    path: route.handlerPathParams ?? [],
    query: route.handlerQueryParams ?? [],
    body: route.handlerBodyParams ?? [],
    header: route.handlerHeaders ?? [],
    cookie: route.handlerCookies ?? [],
  };
}

/**
 * Wrap success value with projectable earlyGuards (halt on match).
 * @param {object} ctx
 * @param {import('@chrysalis/webir').NodeId} successId
 * @param {object[]} earlyGuards
 * @param {object} route
 * @param {object} wr
 * @param {Function} lowerObjectEntriesBody
 */
export function wrapWithEarlyGuards(ctx, successId, earlyGuards, route, wr, lowerObjectEntriesBody) {
  if (!Array.isArray(earlyGuards) || earlyGuards.length === 0) return successId;
  const { data, webir, file } = ctx;
  const loc = { file, line: route.line ?? 1 };
  const origin = hubOrigin(file, route.line ?? 1);
  const bindings = routeBindings(route);
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const parts = [];
  for (const g of earlyGuards) {
    const lowered = lowerIfConstruct(
      ctx,
      g,
      wr,
      loc,
      bindings,
      g.status ?? 200,
      lowerObjectEntriesBody,
      "cwl:early-guard",
    );
    if (!lowered) continue; // opaque g_* residual — skip invent
    parts.push(lowered);
  }
  parts.push(successId);
  if (parts.length === 1) return successId;
  return data.block({
    statements: parts,
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:early-guards")],
  });
}

/**
 * Append top-level foreachBindings after success chrome (empty-iter IR honesty).
 * Unbound collections → data.param → non-array → simulate skips body (no N-iteration claim).
 * @param {object} ctx
 * @param {import('@chrysalis/webir').NodeId} successId
 * @param {object[]} foreachBindings
 * @param {object} route
 * @param {object} wr
 * @param {Function} lowerObjectEntriesBody
 */
export function appendForeachBindings(ctx, successId, foreachBindings, route, wr, lowerObjectEntriesBody) {
  if (!Array.isArray(foreachBindings) || foreachBindings.length === 0) return successId;
  const { data, webir, file } = ctx;
  const loc = { file, line: route.line ?? 1 };
  const origin = hubOrigin(file, route.line ?? 1);
  const bindings = routeBindings(route);
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const feNodes = [];
  for (const fe of foreachBindings) {
    const iterable = lowerIdent(ctx, fe.collection ?? "items", bindings, loc);
    const bodyId = lowerControlStmts(
      ctx,
      fe.stmts ?? [],
      wr,
      loc,
      bindings,
      200,
      lowerObjectEntriesBody,
    );
    feNodes.push(
      data.foreach({
        iterable,
        keyName: fe.key ?? undefined,
        valueName: fe.item ?? "item",
        body: bodyId,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:foreach")],
      }),
    );
  }
  return data.block({
    statements: [successId, ...feNodes],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:foreach-bindings")],
  });
}
