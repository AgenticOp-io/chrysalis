/**
 * Generates TypeScript text from a WebIR handler body. Collects:
 *  - the body's emitted statements
 *  - any holes encountered
 *  - the effects observed (so the handler signature carries them)
 */

import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import { effectTag, effectTagsSorted } from "@chrysalis/webir";
import { matchStringDispatchChain } from "@chrysalis/insight";
import type { HttpEmitProfile } from "./http-profile.js";
import { honoHttpProfile } from "./http-profile.js";
import { ident, stringLit } from "./ts-util.js";

/**
 * Heuristic: auth-boundary / identity-adjacent callees that should be tracked
 * separately in emit hole reports (Milestone 6A). Conservative: false positives
 * are preferred over missing auth-tagged coverage.
 */
export function isAuthBoundaryCallee(callee: string): boolean {
  const n = callee.trim().replace(/^\\+/, "");
  const lower = n.toLowerCase();
  if (lower === "auth") return true;
  if (lower.includes("csrf")) return true;
  if (lower.includes("sanctum") || lower.includes("passport")) return true;
  if (lower.includes("gate::") || lower.includes("\\gate\\") || lower.includes("\\illuminate\\auth\\")) {
    return true;
  }
  if (lower.startsWith("auth::") || lower.includes("\\auth\\") || lower.includes("\\authorization\\")) {
    return true;
  }
  return false;
}

export interface EmittedHandler {
  readonly body: string;
  readonly holes: ReadonlyArray<{ name: string; line: number; reason: string }>;
  readonly effectNames: ReadonlyArray<string>;
  readonly shape: "html" | "redirect" | "mixed";
  /** Archaeology `domain.ts` types used as row generics (sorted). */
  readonly domainTypeImports: ReadonlyArray<string>;
  /** Handler calls `queryAllWhereIn` from `db.js` (N+1 batching). */
  readonly usesQueryAllWhereIn: boolean;
  /** Handler calls `chrysalisPluck` / `chrysalisRowByColumn` from `runtime.js`. */
  readonly usesChrysalisBatchHelpers: boolean;
  /** Handler uses `zod` via `parseZodBodyFieldRaw` (`boundary-zod` rewrite). */
  readonly usesZod: boolean;
}

/**
 * Tags for `@chrysalis-effects` and emit reports: prefer the handler node's
 * merged IR effects when present (ingest fills these), else tags collected
 * during lowering (hand-built modules).
 */
export function handlerEffectAnnotationTags(
  handler: NodeBase,
  emitted: EmittedHandler,
): readonly string[] {
  return handler.effects.length > 0 ? effectTagsSorted(handler.effects) : emitted.effectNames;
}

export interface EmitHandlerOptions {
  /**
   * Map lowercase SQL table name (as tagged on WebIR `db.query`) to the
   * TypeScript interface name from archaeology `domain.ts`.
   */
  readonly domainTypesByTable?: Readonly<Record<string, string>>;
}

interface EmitCtx {
  readonly m: Module;
  readonly profile: HttpEmitProfile;
  /** PHP variable name -> TS identifier once bound. */
  readonly bound: Set<string>;
  readonly holes: { name: string; line: number; reason: string }[];
  readonly effectNames: Set<string>;
  /** Lowercase SQL table name -> archaeology interface name; optional. */
  readonly domainTypesByTable: Readonly<Record<string, string>> | undefined;
  /** Archaeology interface names referenced for `queryOne<T>` / `queryAll<T>`. */
  readonly domainTypeImports: Set<string>;
  /** Index of the HTML buffer accumulator variable (`__html`) as used. */
  htmlBufferUsed: boolean;
  /** Whether the `__status` response-status variable has been mutated. */
  statusVarUsed: boolean;
  /** Whether we've emitted a redirect / early return. */
  hasTerminalResponse: boolean;
  /** Output shape so far. */
  shape: "html" | "redirect" | "mixed" | null;
  /** Unique-name counter for synthesised locals. */
  tmpCounter: number;
  usesQueryAllWhereIn: boolean;
  usesChrysalisBatchHelpers: boolean;
  usesZod: boolean;
}

function get(ctx: EmitCtx, id: NodeId): NodeBase {
  const n = ctx.m.nodes.get(id);
  if (!n) throw new Error(`emit-shared: missing node ${String(id)}`);
  return n;
}

function freshTmp(ctx: EmitCtx, prefix = "tmp"): string {
  ctx.tmpCounter += 1;
  return `__${prefix}${ctx.tmpCounter}`;
}

function mergeShape(ctx: EmitCtx, next: "html" | "redirect"): void {
  if (ctx.shape === null) {
    ctx.shape = next;
  } else if (ctx.shape !== next) {
    ctx.shape = "mixed";
  }
}

function exprAllowedInReduce(m: Module, id: NodeId, allowedNames: Set<string>): boolean {
  const n = m.nodes.get(id);
  if (!n) return false;
  if (n.op === "literal") return true;
  if (n.op === "param") return allowedNames.has(String(n.attrs.name));
  if (n.op === "member") {
    const o = n.operands[0]!;
    return exprAllowedInReduce(m, o, allowedNames);
  }
  if (n.op === "binop") {
    return (
      exprAllowedInReduce(m, n.operands[0]!, allowedNames) &&
      exprAllowedInReduce(m, n.operands[1]!, allowedNames)
    );
  }
  if (n.op === "call") {
    const c = String(n.attrs.callee);
    if ((c === "intval" || c === "__cast_int") && n.operands[0]) {
      return exprAllowedInReduce(m, n.operands[0]!, allowedNames);
    }
    return false;
  }
  if (n.op === "unaryop") {
    return n.operands[0] ? exprAllowedInReduce(m, n.operands[0]!, allowedNames) : false;
  }
  return false;
}

function emitExprSubst(
  ctx: EmitCtx,
  id: NodeId,
  subst: Readonly<Record<string, string>>,
): string {
  const n = get(ctx, id);
  if (n.op === "param") {
    const name = String(n.attrs.name);
    if (subst[name] !== undefined) return subst[name]!;
    return emitExpr(ctx, id);
  }
  if (n.op === "literal") return emitExpr(ctx, id);
  if (n.op === "member") {
    const obj = emitExprSubst(ctx, n.operands[0]!, subst);
    if (typeof n.attrs.key === "string") {
      const key = String(n.attrs.key);
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
        return `(${obj} as any).${key}`;
      }
      return `(${obj} as any)[${stringLit(key)}]`;
    }
    const idxNode = n.operands[1];
    const idx = idxNode ? emitExprSubst(ctx, idxNode, subst) : "0";
    return `(${obj} as any)[${idx}]`;
  }
  if (n.op === "binop") {
    const op = String(n.attrs.operator);
    const left = emitExprSubst(ctx, n.operands[0]!, subst);
    const right = emitExprSubst(ctx, n.operands[1]!, subst);
    if (op === ".") return `(String(${left}) + String(${right}))`;
    if (op === "??") return `((${left}) ?? (${right}))`;
    const mapped =
      op === "==" ? "===" : op === "!=" ? "!==" : op === "and" ? "&&" : op === "or" ? "||" : op;
    return `(${left} ${mapped} ${right})`;
  }
  if (n.op === "call") {
    const callee = String(n.attrs.callee);
    const args = n.operands.map((o) => emitExprSubst(ctx, o, subst));
    return emitKnownCall(ctx, callee, args);
  }
  if (n.op === "unaryop") {
    const op = String(n.attrs.operator);
    const operand = emitExprSubst(ctx, n.operands[0]!, subst);
    if (op === "isset") return `isset(${operand})`;
    if (op === "empty") return `empty(${operand})`;
    return `(${op}${operand})`;
  }
  return emitExpr(ctx, id);
}

function tryEmitForeachReduceWithPrev(ctx: EmitCtx, prev: NodeBase, fe: NodeBase): string | null {
  if (fe.op !== "foreach" || fe.attrs.keyName) return null;
  if (prev.op !== "call" || String(prev.attrs.callee) !== "__assign") return null;
  const pName = get(ctx, prev.operands[0]!);
  const pRhsId = prev.operands[1]!;
  const pRhs = get(ctx, pRhsId);
  if (pName.op !== "literal" || pRhs.op !== "literal") return null;
  const accName = String((pName.attrs as { value?: unknown }).value ?? "");
  if (!accName || accName === "<complex-target>") return null;

  const iterId = fe.operands[0]!;
  const bodyId = fe.operands[1]!;
  const valName = String(fe.attrs.valueName);
  const body = get(ctx, bodyId);
  if (body.op !== "block" || body.operands.length !== 1) return null;
  const stmt = get(ctx, body.operands[0]!);
  if (stmt.op !== "call" || String(stmt.attrs.callee) !== "__assign") return null;
  const nameLit = get(ctx, stmt.operands[0]!);
  if (nameLit.op !== "literal" || String((nameLit.attrs as { value?: unknown }).value) !== accName)
    return null;
  const rhsId = stmt.operands[1]!;
  const rhs = get(ctx, rhsId);
  if (rhs.op !== "binop") return null;
  const op = String(rhs.attrs.operator);
  if (!["+", "-", "."].includes(op)) return null;
  const left = get(ctx, rhs.operands[0]!);
  const rightId = rhs.operands[1]!;
  if (left.op !== "param" || String(left.attrs.name) !== accName) return null;
  const allowed = new Set([accName, valName]);
  if (!exprAllowedInReduce(ctx.m, rightId, allowed)) return null;

  const accIdent = ident(accName);
  const vIdent = ident(valName);
  const iterExpr = emitExpr(ctx, iterId);
  const initialExpr = emitExpr(ctx, pRhsId);
  const stepInner = emitExprSubst(ctx, rhsId, { [accName]: accIdent, [valName]: vIdent });
  return `const ${accIdent} = (${iterExpr} ?? []).reduce((${accIdent}, ${vIdent}) => ${stepInner}, ${initialExpr});`;
}

/** Emit a WebIR data-dialect node as a TS expression. */
export function emitExpr(ctx: EmitCtx, id: NodeId): string {
  const n = get(ctx, id);
  if (n.dialect === "data") return emitDataExpr(ctx, n);
  if (n.dialect === "effect") return emitEffectExpr(ctx, n);
  if (n.dialect === "web.request") {
    return `/* unexpected web.request expression */ null`;
  }
  return `null /* unknown dialect ${n.dialect} */`;
}

function emitDataExpr(ctx: EmitCtx, n: NodeBase): string {
  const p = ctx.profile;
  switch (n.op) {
    case "literal": {
      const v = n.attrs.value;
      if (v === null) return "null";
      if (typeof v === "string") return stringLit(v);
      if (typeof v === "number") return String(v);
      if (typeof v === "boolean") return v ? "true" : "false";
      return "null";
    }
    case "param":
      return ident(String(n.attrs.name));
    case "request.field": {
      const src = String(n.attrs.source);
      const name = String(n.attrs.name);
      switch (src) {
        case "query":
          return p.query(name);
        case "path":
          return p.pathParam(name);
        case "body":
          return `(__body[${stringLit(name)}] ?? null)`;
        case "cookie":
          return p.cookie(name);
        case "header":
          return p.header(name);
      }
      return "null";
    }
    case "binop": {
      const op = String(n.attrs.operator);
      const left = emitExpr(ctx, n.operands[0]!);
      const right = emitExpr(ctx, n.operands[1]!);
      if (op === ".") return `(String(${left}) + String(${right}))`;
      if (op === "??") return `((${left}) ?? (${right}))`;
      const mapped =
        op === "==" ? "===" : op === "!=" ? "!==" : op === "and" ? "&&" : op === "or" ? "||" : op;
      return `(${left} ${mapped} ${right})`;
    }
    case "unaryop": {
      const op = String(n.attrs.operator);
      const operand = emitExpr(ctx, n.operands[0]!);
      if (op === "isset") return `isset(${operand})`;
      if (op === "empty") return `empty(${operand})`;
      return `(${op}${operand})`;
    }
    case "member": {
      const obj = emitExpr(ctx, n.operands[0]!);
      if (typeof n.attrs.key === "string") {
        const key = String(n.attrs.key);
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
          return `(${obj} as any).${key}`;
        }
        return `(${obj} as any)[${stringLit(key)}]`;
      }
      const idxNode = n.operands[1];
      const idx = idxNode ? emitExpr(ctx, idxNode) : "0";
      return `(${obj} as any)[${idx}]`;
    }
    case "call": {
      const callee = String(n.attrs.callee);
      const args = n.operands.map((o) => emitExpr(ctx, o));
      return emitKnownCall(ctx, callee, args);
    }
    case "concat": {
      const parts = n.operands.map((o) => `String(${emitExpr(ctx, o)})`);
      return `(${parts.join(" + ") || '""'})`;
    }
    case "html.template": {
      return stringLit("<!-- html template -->");
    }
    case "hole": {
      const reason = String(n.attrs.reason);
      const holeName = `hole:${reason.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}`;
      const line = n.origin.kind === "php" ? n.origin.line : 0;
      ctx.holes.push({ name: holeName, line, reason });
      return `__hole(${stringLit(holeName)}, null) as any`;
    }
    default:
      return `/* unhandled data.${n.op} */ null`;
  }
}

function dbQueryTypeArg(ctx: EmitCtx, n: NodeBase): string {
  if (!ctx.domainTypesByTable) return "";
  const tablesRaw = n.attrs.tables;
  if (!Array.isArray(tablesRaw) || tablesRaw.length !== 1) return "";
  const table = String(tablesRaw[0]).toLowerCase();
  const tsName = ctx.domainTypesByTable[table];
  if (!tsName) return "";
  ctx.domainTypeImports.add(tsName);
  return `<${tsName}>`;
}

function recordEffectsFromNode(ctx: EmitCtx, n: NodeBase): void {
  for (const e of n.effects) ctx.effectNames.add(effectTag(e));
}

function emitEffectExpr(ctx: EmitCtx, n: NodeBase): string {
  switch (n.op) {
    case "db.query": {
      recordEffectsFromNode(ctx, n);
      const mode = String(n.attrs.returns);
      const sql = String(n.attrs.sql);
      const params = n.operands.map((o) => emitExpr(ctx, o));
      const tArg = dbQueryTypeArg(ctx, n);
      if (mode === "rows") {
        return `queryAll${tArg}(${stringLit(sql)}, [${params.join(", ")}])`;
      }
      if (mode === "row-or-null") {
        return `queryOne${tArg}(${stringLit(sql)}, [${params.join(", ")}])`;
      }
      return `execSql(${stringLit(sql)}, [${params.join(", ")}])`;
    }
    case "session.read":
      recordEffectsFromNode(ctx, n);
      return `${ctx.profile.sessionGetter()}.get(${stringLit(String(n.attrs.key))})`;
    case "time.now": {
      recordEffectsFromNode(ctx, n);
      const fmt = n.attrs.format;
      if (fmt === "unix") {
        return "Math.floor(Date.parse(chrysalisNow()) / 1000)";
      }
      if (fmt === "epoch_ms") {
        return "Date.parse(chrysalisNow())";
      }
      if (fmt === "epoch_float") {
        return "(Date.parse(chrysalisNow()) / 1000)";
      }
      return "chrysalisNow()";
    }
    case "random": {
      recordEffectsFromNode(ctx, n);
      const lo = emitExpr(ctx, n.operands[0]!);
      const hi = emitExpr(ctx, n.operands[1]!);
      return `(Math.floor(chrysalisRandom() * ((${hi}) - (${lo}) + 1)) + (${lo}))`;
    }
    default:
      return `/* unhandled effect.${n.op} */ null`;
  }
}

function emitKnownCall(ctx: EmitCtx, callee: string, args: string[]): string {
  const p = ctx.profile;
  switch (callee) {
    case "__ternary":
      return `((${args[0]}) ? (${args[1]}) : (${args[2]}))`;
    case "__cast_int":
      return `intval(${args[0]})`;
    case "__cast_float":
      return `Number(${args[0]})`;
    case "__cast_string":
      return `String(${args[0]})`;
    case "__cast_bool":
      return `Boolean(${args[0]})`;
    case "__cast_array":
      return `([${args[0]}] as unknown as unknown[])`;
    case "__array_literal":
      return `[${args.join(", ")}]`;
    case "__dechex":
      return `(((${args[0]}) >>> 0).toString(16))`;
    case "microtimeString":
      return `microtimeString(Number(${args[0]}))`;
  }
  switch (callee) {
    case "htmlspecialchars":
      return `escapeHtml(${args[0]})`;
    case "nl2br":
      return `nl2br(${args[0]})`;
    case "trim":
      return `trim(${args[0]})`;
    case "intval":
      return `intval(${args[0]})`;
    case "strlen":
      return `strlen(${args[0]})`;
    case "preg_match":
      return `pregMatch(${args[0]}, ${args[1]})`;
    case "password_verify":
    case "verify_password":
      return `(await passwordVerify(${args[0]}, ${args[1]}))`;
    case "require_login":
      return p.requireLogin();
    case "current_user":
      return p.currentUser();
    case "db":
      return `db()`;
    case "session_start":
      return `undefined /* session_start handled by middleware */`;
    case "parseUrlComponent":
      return `parseUrlComponent(${args[0]}, ${args[1]})`;
    case "parseUrlParts":
      return `parseUrlParts(${args[0]})`;
    case "__chrysalis_pluck":
      ctx.usesChrysalisBatchHelpers = true;
      return `chrysalisPluck((${args[0]}) as ReadonlyArray<Record<string, unknown>>, String(${args[1]}))`;
    case "__chrysalis_row_by_column":
      ctx.usesChrysalisBatchHelpers = true;
      return `chrysalisRowByColumn((${args[0]}) as ReadonlyArray<Record<string, unknown>>, String(${args[1]}), ${args[2]})`;
    case "__chrysalis_query_all_where_in":
      ctx.usesQueryAllWhereIn = true;
      return `queryAllWhereIn(String(${args[0]}), String(${args[1]}), String(${args[2]}), ${args[3]})`;
    case "__chrysalis_zod_body_field":
      ctx.usesZod = true;
      return `parseZodBodyFieldRaw(${args[0]}, { minLen: Number(${args[1]}), trim: ${args[2]}, email: ${args[3]} })`;
    case "__chrysalis_zod_enum_body_field": {
      ctx.usesZod = true;
      const rest = args.slice(1);
      return `parseZodEnumBodyFieldRaw(${args[0]}, [${rest.join(", ")}] as const)`;
    }
  }
  const baseReason = `unresolved call: ${callee}`;
  const reason = isAuthBoundaryCallee(callee) ? `auth:${baseReason}` : baseReason;
  ctx.holes.push({
    name: `call:${callee}`,
    line: 0,
    reason,
  });
  return `(__hole(${stringLit(`call:${callee}`)}, { args: [${args.join(", ")}] }) as any)`;
}

/** Emit a WebIR node as one or more TS statements. Returns emitted text. */
export function emitStmt(ctx: EmitCtx, id: NodeId): string {
  const n = get(ctx, id);
  if (n.dialect === "data") return emitDataStmt(ctx, n);
  if (n.dialect === "effect") return emitEffectStmt(ctx, n);
  return `/* unhandled ${n.dialect}.${n.op} */`;
}

function emitDataStmt(ctx: EmitCtx, n: NodeBase): string {
  const p = ctx.profile;
  switch (n.op) {
    case "block": {
      const lines: string[] = [];
      const ops = n.operands;
      for (let i = 0; i < ops.length; i++) {
        const opId = ops[i]!;
        const opn = get(ctx, opId);
        if (opn.op === "foreach" && i > 0) {
          const prev = get(ctx, ops[i - 1]!);
          const reduced = tryEmitForeachReduceWithPrev(ctx, prev, opn);
          if (reduced) {
            const pLit = get(ctx, prev.operands[0]!);
            const accRaw = String((pLit.attrs as { value?: unknown }).value ?? "");
            const accIdent = ident(accRaw);
            lines.pop();
            ctx.bound.delete(accIdent);
            lines.push(reduced);
            ctx.bound.add(accIdent);
            i++;
            continue;
          }
        }
        const s = emitStmt(ctx, opId);
        if (s.trim().length > 0) lines.push(s);
      }
      return lines.join("\n");
    }
    case "if": {
      const dispatch = matchStringDispatchChain(ctx.m, n);
      if (dispatch) {
        const d = freshTmp(ctx, "dispatch");
        const raw = emitExpr(ctx, dispatch.fieldNodeId);
        const lines: string[] = [];
        lines.push(`const ${d} = ${raw};`);
        lines.push(`switch (${d} == null ? "" : String(${d})) {`);
        for (const b of dispatch.branches) {
          const arm = emitStmt(ctx, b.thenBodyId);
          lines.push(`  case ${stringLit(b.literal)}:`);
          lines.push(indentBlock(indentBlock(arm)));
          lines.push(`    break;`);
        }
        if (dispatch.defaultElseBodyId != null) {
          const def = emitStmt(ctx, dispatch.defaultElseBodyId);
          lines.push(`  default:`);
          lines.push(indentBlock(indentBlock(def)));
        }
        lines.push(`}`);
        return lines.join("\n");
      }
      const cond = emitExpr(ctx, n.operands[0]!);
      const then = emitStmt(ctx, n.operands[1]!);
      const hasElse = Boolean(n.attrs.hasElse);
      if (hasElse) {
        const el = emitStmt(ctx, n.operands[2]!);
        return `if (${cond}) {\n${indentBlock(then)}\n} else {\n${indentBlock(el)}\n}`;
      }
      return `if (${cond}) {\n${indentBlock(then)}\n}`;
    }
    case "foreach": {
      const iter = emitExpr(ctx, n.operands[0]!);
      const body = emitStmt(ctx, n.operands[1]!);
      const valName = ident(String(n.attrs.valueName));
      const keyName = n.attrs.keyName ? ident(String(n.attrs.keyName)) : null;
      if (keyName) {
        return `for (const [${keyName}, ${valName}] of Object.entries(${iter} ?? {} as any)) {\n${indentBlock(body)}\n}`;
      }
      return `for (const ${valName} of (${iter} ?? []) as any[]) {\n${indentBlock(body)}\n}`;
    }
    case "call": {
      const callee = String(n.attrs.callee);
      const args = n.operands.map((o) => emitExpr(ctx, o));
      if (callee === "__assign") {
        const raw = String((ctx.m.nodes.get(n.operands[0]!)?.attrs as { value?: unknown }).value ?? "x");
        const rhs = args[1] ?? "undefined";
        const name = ident(raw);
        if (ctx.bound.has(name)) return `${name} = ${rhs};`;
        ctx.bound.add(name);
        return `let ${name} = ${rhs};`;
      }
      if (callee === "__return") {
        ctx.hasTerminalResponse = true;
        if (args.length > 0) return `return ${args[0]};`;
        return p.respondBuffered();
      }
      if (callee === "__exit") {
        ctx.hasTerminalResponse = true;
        return p.respondBuffered();
      }
      return `${emitKnownCall(ctx, callee, args)};`;
    }
    case "literal":
    case "param":
    case "binop":
    case "unaryop":
    case "member":
    case "concat":
    case "html.template":
    case "request.field":
      return `${emitExpr(ctx, n.id)};`;
    case "hole":
      return `${emitDataExpr(ctx, n)};`;
    default:
      return `/* unhandled data.${n.op} */`;
  }
}

function emitEffectStmt(ctx: EmitCtx, n: NodeBase): string {
  const p = ctx.profile;
  switch (n.op) {
    case "echo": {
      mergeShape(ctx, "html");
      ctx.htmlBufferUsed = true;
      const val = emitExpr(ctx, n.operands[0]!);
      return `__html += String(${val});`;
    }
    case "redirect": {
      mergeShape(ctx, "redirect");
      ctx.hasTerminalResponse = true;
      const loc = emitExpr(ctx, n.operands[0]!);
      return p.redirectReturn(loc);
    }
    case "http.error": {
      ctx.statusVarUsed = true;
      const status = Number(n.attrs.status ?? 500);
      return `__status = ${status};`;
    }
    case "session.write": {
      recordEffectsFromNode(ctx, n);
      const val = emitExpr(ctx, n.operands[0]!);
      return `${p.sessionGetter()}.set(${stringLit(String(n.attrs.key))}, ${val});`;
    }
    case "db.query":
    case "session.read":
    case "time.now":
    case "random":
      return `${emitExpr(ctx, n.id)};`;
    default:
      return `/* unhandled effect.${n.op} */`;
  }
}

function indentBlock(s: string): string {
  return s
    .split("\n")
    .map((l) => (l.length ? `  ${l}` : l))
    .join("\n");
}

/**
 * Emit a full handler body given the route's `web.request.handler` node id.
 * The emitted body is the content of the handler function, not including
 * the function signature.
 */
export function emitHandlerBody(
  m: Module,
  handlerId: NodeId,
  opts?: EmitHandlerOptions,
  profile: HttpEmitProfile = honoHttpProfile,
): EmittedHandler {
  const ctx: EmitCtx = {
    m,
    profile,
    bound: new Set<string>(),
    holes: [],
    effectNames: new Set<string>(),
    domainTypesByTable: opts?.domainTypesByTable,
    domainTypeImports: new Set<string>(),
    htmlBufferUsed: false,
    statusVarUsed: false,
    hasTerminalResponse: false,
    shape: null,
    tmpCounter: 0,
    usesQueryAllWhereIn: false,
    usesChrysalisBatchHelpers: false,
    usesZod: false,
  };
  const handler = m.nodes.get(handlerId);
  if (!handler) throw new Error(`emit-shared: handler not found ${String(handlerId)}`);
  const body = handler.operands[0]!;
  const preamble: string[] = [];
  const hasBodyUse = containsRequestSource(m, body, "body");
  if (hasBodyUse) {
    preamble.push(profile.bodyPreamble());
  }
  const main = emitStmt(ctx, body);
  const decls: string[] = [`let __html = "";`, `let __status = 200;`];
  const epilogue: string[] = [profile.respondBuffered()];
  const text = [...preamble, ...decls, main, ...epilogue]
    .filter((s): s is string => Boolean(s && s.trim()))
    .join("\n");
  return {
    body: text,
    holes: ctx.holes,
    effectNames: [...ctx.effectNames].sort(),
    shape: ctx.shape ?? "mixed",
    domainTypeImports: [...ctx.domainTypeImports].sort(),
    usesQueryAllWhereIn: ctx.usesQueryAllWhereIn,
    usesChrysalisBatchHelpers: ctx.usesChrysalisBatchHelpers,
    usesZod: ctx.usesZod,
  };
}

function containsRequestSource(m: Module, root: NodeId, source: string): boolean {
  const seen = new Set<NodeId>();
  const stack: NodeId[] = [root];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = m.nodes.get(id);
    if (!n) continue;
    if (n.op === "request.field" && String(n.attrs.source) === source) return true;
    for (const o of n.operands) stack.push(o);
  }
  return false;
}
