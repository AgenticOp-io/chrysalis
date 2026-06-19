/**
 * Generates TypeScript text from a WebIR handler body. Collects:
 *  - the body's emitted statements
 *  - any holes encountered
 *  - the effects observed (so the handler signature carries them)
 */

import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import { effectTag, effectTagsSorted, isAuthBoundaryCallee } from "@chrysalis/webir";
import { matchStringDispatchChain } from "@chrysalis/insight";
import type { HttpEmitProfile } from "./http-profile.js";
import { honoHttpProfile } from "./http-profile.js";
import {
  libHelperTsExportName,
  resolveHelperBodyEntry,
  tryEmitInlineLibHelperCall,
  type EmitInlineCtx,
} from "./lib-helper-inline.js";
import { ident, stringLit } from "./ts-util.js";

function emitPhpAttributesSuffix(n: NodeBase): string {
  const pa = (
    n.attrs as {
      phpAttributes?: ReadonlyArray<{ readonly name: string; readonly args: ReadonlyArray<unknown> }>;
    }
  ).phpAttributes;
  if (!pa?.length) return "";
  return ` /* phpAttrs:${JSON.stringify(pa)} */`;
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
  /** Handler uses `phpFqnNew` for namespaced `new` (PHP FQN has no static TS class). */
  readonly usesPhpFqnNew: boolean;
  /** Handler uses `phpDynamicNew` for dynamic class construction (`new $x`). */
  readonly usesPhpDynamicNew: boolean;
  /** Lib helper calls that require `lib-helpers.ts` (non-inlinable at emit). */
  readonly libHelperImports: ReadonlyArray<string>;
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
  usesPhpFqnNew: boolean;
  usesPhpDynamicNew: boolean;
  /** When `function`, `__return` lowers to TS `return` (lib helper bodies). */
  returnMode: "handler" | "function";
  libHelperCalls: Set<string>;
}

function emitInlineCtx(ctx: EmitCtx): EmitInlineCtx {
  return {
    m: ctx.m,
    ...(ctx.domainTypesByTable !== undefined ? { domainTypesByTable: ctx.domainTypesByTable } : {}),
    domainTypeImports: ctx.domainTypeImports,
    effectNames: ctx.effectNames,
    emitParamExpr: (id, subst) => emitExprSubst(ctx, id, subst),
  };
}

function tryEmitLibHelperCallExpr(ctx: EmitCtx, callee: string, argExprs: readonly string[]): string | undefined {
  return tryEmitInlineLibHelperCall(emitInlineCtx(ctx), callee, argExprs);
}

function recordLibHelperCallIfNeeded(ctx: EmitCtx, callee: string, argExprs: readonly string[]): string | undefined {
  const bodies = ctx.m.meta.helperBodies;
  if (!bodies) return undefined;
  const entry = resolveHelperBodyEntry(bodies, callee);
  if (entry === undefined) return undefined;
  const inline = tryEmitLibHelperCallExpr(ctx, callee, argExprs);
  if (inline !== undefined) return inline;
  const exportName = libHelperTsExportName(callee);
  ctx.libHelperCalls.add(exportName);
  return `${exportName}(${argExprs.join(", ")})`;
}

/** TS identifier for a PHP `$name` binding; must not shadow the HTTP profile request/reply param. */
function phpBindingIdent(ctx: EmitCtx, phpRawName: string): string {
  const base = ident(phpRawName);
  const forbidden = new Set([ctx.profile.requestVar, ctx.profile.replyVar]);
  if (!forbidden.has(base)) return base;
  let candidate = `${base}Var`;
  let i = 1;
  while (forbidden.has(candidate)) {
    i += 1;
    candidate = `${base}Var${i}`;
  }
  return candidate;
}

function get(ctx: EmitCtx, id: NodeId): NodeBase {
  const n = ctx.m.nodes.get(id);
  if (!n) throw new Error(`emit-shared: missing node ${String(id)}`);
  return n;
}

/** Two or more PHP identifier segments joined by `\\` (FQN / namespaced class). */
function isValidPhpFqnTypeString(v: string): boolean {
  const segs = v.replace(/^\\+/, "").split("\\").filter((s) => s.length > 0);
  if (segs.length < 2) return false;
  return segs.every((s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s));
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
    const lib = recordLibHelperCallIfNeeded(ctx, callee, args);
    if (lib !== undefined) return lib;
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

  const accIdent = phpBindingIdent(ctx, accName);
  const vIdent = phpBindingIdent(ctx, valName);
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
      return phpBindingIdent(ctx, String(n.attrs.name));
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
    case "block": {
      const ops = n.operands;
      if (ops.length === 1) {
        return emitExpr(ctx, ops[0]!);
      }
      if (ops.length > 0) {
        const last = get(ctx, ops[ops.length - 1]!);
        if (last.op === "call") {
          const callee = String(last.attrs.callee);
          if (callee !== "__assign" && callee !== "__return") {
            return emitExpr(ctx, ops[ops.length - 1]!);
          }
        }
      }
      return `/* unhandled data.block */ null`;
    }
    case "call": {
      const callee = String(n.attrs.callee);
      if (callee === "__new" && n.operands.length >= 1) {
        const clsNode = ctx.m.nodes.get(n.operands[0]!);
        if (clsNode?.dialect === "data" && clsNode.op === "literal") {
          const v = (clsNode.attrs as { value?: unknown }).value;
          if (typeof v === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(v)) {
            const rest = n.operands.slice(1).map((o) => emitExpr(ctx, o));
            return `new ${ident(v)}(${rest.join(", ")})`;
          }
          if (typeof v === "string" && isValidPhpFqnTypeString(v)) {
            const rest = n.operands.slice(1).map((o) => emitExpr(ctx, o));
            ctx.usesPhpFqnNew = true;
            return `phpFqnNew(${stringLit(v)}, ${rest.join(", ")})`;
          }
        }
      }
      if (callee === "__new_dynamic" && n.operands.length >= 1) {
        const classExpr = emitExpr(ctx, n.operands[0]!);
        const rest = n.operands.slice(1).map((o) => emitExpr(ctx, o));
        ctx.usesPhpDynamicNew = true;
        return rest.length > 0 ? `phpDynamicNew(${classExpr}, ${rest.join(", ")})` : `phpDynamicNew(${classExpr})`;
      }
      const args = n.operands.map((o) => emitExpr(ctx, o));
      const lib = recordLibHelperCallIfNeeded(ctx, callee, args);
      if (lib !== undefined) return lib + emitPhpAttributesSuffix(n);
      return emitKnownCall(ctx, callee, args) + emitPhpAttributesSuffix(n);
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
    case "wp.call": {
      recordEffectsFromNode(ctx, n);
      const callee = String(n.attrs.callee ?? "");
      const args = n.operands.map((o) => emitExpr(ctx, o)).join(", ");
      return `wpCall(${stringLit(callee)}, [${args}])`;
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
    case "__arrow_fn": {
      const body = args[args.length - 1] ?? "null";
      const paramParts: string[] = [];
      for (let i = 0; i + 1 < args.length - 1; i += 2) {
        const nameExpr = args[i] ?? '""';
        const defExpr = args[i + 1] ?? "undefined";
        const nameMatch = /^"(.+)"$/.exec(nameExpr.trim());
        const paramName = nameMatch?.[1] ?? nameExpr;
        paramParts.push(defExpr === "null" ? paramName : `${paramName} = ${defExpr}`);
      }
      return `((${paramParts.join(", ")}) => (${body}))`;
    }
    case "__first_class_callable": {
      const nameExpr = args[0] ?? '""';
      const nameMatch = /^"(.+)"$/.exec(nameExpr.trim());
      const fn = nameMatch?.[1] ?? nameExpr;
      if (fn === "strlen") {
        return `(($__chrysalisArg: unknown) => strlen(String($__chrysalisArg)))`;
      }
      return `((__hole(${stringLit(`first-class-callable:${fn}`)}) as any)`;
    }
    case "__match": {
      const subject = args[0] ?? "null";
      const armCount = Number(args[1] ?? "0");
      let i = 2;
      const lines: string[] = [`const __matchSubject = ${subject};`];
      let defaultBody: string | undefined;
      for (let a = 0; a < armCount; a++) {
        const isDefault = (args[i++] ?? "0") === "1";
        const condCount = Number(args[i++] ?? "0");
        const conds: string[] = [];
        for (let c = 0; c < condCount; c++) {
          conds.push(`__matchSubject === (${args[i++] ?? "null"})`);
        }
        const body = args[i++] ?? "null";
        if (isDefault) {
          defaultBody = body;
        } else {
          lines.push(`if (${conds.join(" || ")}) return ${body};`);
        }
      }
      if (defaultBody !== undefined) {
        lines.push(`return ${defaultBody};`);
      }
      lines.push(`throw new Error("unhandled match");`);
      return `(() => { ${lines.join(" ")} })()`;
    }
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
    case "__object_literal": {
      const parts: string[] = [];
      for (let i = 0; i < args.length; i += 2) {
        const ke = args[i] ?? "null";
        const ve = args[i + 1] ?? "null";
        const keyMatch = /^"(.+)"$/.exec(ke.trim());
        const keyName = keyMatch?.[1];
        const keyPart =
          keyName && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(keyName) ? keyName : `[${ke}]`;
        parts.push(`${keyPart}: ${ve}`);
      }
      return `({ ${parts.join(", ")} })`;
    }
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
    case "json_encode":
      return `JSON.stringify(${args[0]})`;
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
    case "session_write_close":
      return `undefined /* session_write_close noop; middleware owns session */`;
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
    case "__new_dynamic": {
      ctx.usesPhpDynamicNew = true;
      const rest = args.slice(1);
      return rest.length > 0
        ? `phpDynamicNew(${args[0]}, ${rest.join(", ")})`
        : `phpDynamicNew(${args[0]})`;
    }
  }
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callee)) {
    return `${callee}(${args.join(", ")})`;
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

function emitWebRequestStmt(ctx: EmitCtx, n: NodeBase): string {
  const p = ctx.profile;
  if (n.op !== "response") return `/* unhandled web.request.${n.op} */`;
  const attrs = n.attrs as { status?: number; kind?: string; contentType?: string };
  const status = Number(attrs.status ?? 200);
  const kind = String(attrs.kind ?? "json");
  const contentType = attrs.contentType ? String(attrs.contentType) : undefined;
  const valueId = n.operands[0];
  ctx.hasTerminalResponse = true;

  if (!valueId) {
    if (p.id === "hono") {
      if (contentType) {
        return `return ${p.requestVar}.body("", ${status}, { "Content-Type": ${stringLit(contentType)} });`;
      }
      return `return ${p.requestVar}.text("", ${status});`;
    }
    if (contentType) {
      return `return ${p.replyVar}.code(${status}).type(${stringLit(contentType)}).send("");`;
    }
    return `return ${p.replyVar}.code(${status}).send("");`;
  }

  const val = emitExpr(ctx, valueId);
  const isJson = kind === "json" || Boolean(contentType?.includes("json"));
  if (isJson) {
    if (p.id === "hono") {
      if (contentType && status === 200) {
        return `return ${p.requestVar}.json(${val}, 200, { "Content-Type": ${stringLit(contentType)} });`;
      }
      return status === 200
        ? `return ${p.requestVar}.json(${val});`
        : `return ${p.requestVar}.json(${val}, ${status});`;
    }
    let chain = `${p.replyVar}.code(${status})`;
    if (contentType) chain += `.type(${stringLit(contentType)})`;
    return `return ${chain}.send(${val});`;
  }

  if (p.id === "hono") {
    if (contentType) {
      return `return ${p.requestVar}.body(String(${val}), ${status}, { "Content-Type": ${stringLit(contentType)} });`;
    }
    ctx.htmlBufferUsed = true;
    ctx.statusVarUsed = status !== 200;
    return `__html = String(${val});\n${p.respondBuffered()}`;
  }
  let chain = `${p.replyVar}.code(${status})`;
  if (contentType) chain += `.type(${stringLit(contentType)})`;
  return `return ${chain}.send(String(${val}));`;
}

/** Emit a WebIR node as one or more TS statements. Returns emitted text. */
export function emitStmt(ctx: EmitCtx, id: NodeId): string {
  const n = get(ctx, id);
  if (n.dialect === "data") return emitDataStmt(ctx, n);
  if (n.dialect === "effect") return emitEffectStmt(ctx, n);
  if (n.dialect === "web.request") return emitWebRequestStmt(ctx, n);
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
            const accIdent = phpBindingIdent(ctx, accRaw);
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
      const valName = phpBindingIdent(ctx, String(n.attrs.valueName));
      const keyName = n.attrs.keyName ? phpBindingIdent(ctx, String(n.attrs.keyName)) : null;
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
        const name = phpBindingIdent(ctx, raw);
        if (ctx.bound.has(name)) return `${name} = ${rhs};`;
        ctx.bound.add(name);
        return `let ${name} = ${rhs};`;
      }
      if (callee === "__return") {
        ctx.hasTerminalResponse = true;
        if (args.length > 0) {
          if (ctx.returnMode === "function") {
            return `return ${args[0]};`;
          }
          // Both backends must buffer then `__respond`: Fastify needs reply.send;
          // Hono bare `return ""` makes `app.fetch` yield Context, not Response.
          ctx.htmlBufferUsed = true;
          return `__html = String(${args[0]});\n${p.respondBuffered()}`;
        }
        if (ctx.returnMode === "function") return "return;";
        return p.respondBuffered();
      }
      if (callee === "__return_json") {
        ctx.hasTerminalResponse = true;
        if (args.length > 0) {
          if (p.id === "hono") {
            // When a preceding `http.error` effect set a non-200 `__status`
            // (e.g. `res.status(201).json(...)`), apply it. `c.json(x, __status)`
            // would force a `ContentfulStatusCode` cast/import, so buffer the JSON
            // and respond via `__respond`, which sniffs JSON (`application/json`)
            // and applies `__status` — matching the PHP echo+json_encode path.
            if (ctx.statusVarUsed) {
              ctx.htmlBufferUsed = true;
              return `__html += JSON.stringify(${args[0]});\n${p.respondBuffered()}`;
            }
            return `return ${p.requestVar}.json(${args[0]});`;
          }
          return `return ${p.replyVar}.code(__status).send(${args[0]});`;
        }
        return p.respondBuffered();
      }
      if (callee === "__throw") {
        ctx.hasTerminalResponse = true;
        if (args.length > 0) return `throw ${args[0]};`;
        return "throw new Error('throw');";
      }
      if (callee === "__exit") {
        ctx.hasTerminalResponse = true;
        return p.respondBuffered();
      }
      return `${emitKnownCall(ctx, callee, args)}${emitPhpAttributesSuffix(n)};`;
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
    case "wp.call":
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

/** True when control cannot fall through past `id` (handler epilogue not needed). */
function nodeEndsWithTerminalReturn(m: Module, id: NodeId): boolean {
  const n = m.nodes.get(id);
  if (!n) return false;
  if (n.dialect === "effect" && n.op === "redirect") return true;
  if (n.dialect !== "data") return false;
  switch (n.op) {
    case "block": {
      const ops = n.operands;
      if (ops.length === 0) return false;
      return nodeEndsWithTerminalReturn(m, ops[ops.length - 1]!);
    }
    case "call": {
      const c = String(n.attrs.callee);
      return c === "__return" || c === "__return_json" || c === "__exit" || c === "__throw";
    }
    case "if": {
      if (!n.attrs.hasElse) return false;
      const thenId = n.operands[1]!;
      const elseId = n.operands[2];
      if (elseId == null) return false;
      return nodeEndsWithTerminalReturn(m, thenId) && nodeEndsWithTerminalReturn(m, elseId);
    }
    default:
      return false;
  }
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
    usesPhpFqnNew: false,
    usesPhpDynamicNew: false,
    returnMode: "handler",
    libHelperCalls: new Set<string>(),
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
  const epilogue: string[] =
    ctx.hasTerminalResponse || nodeEndsWithTerminalReturn(m, body) ? [] : [profile.respondBuffered()];
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
    usesPhpFqnNew: ctx.usesPhpFqnNew,
    usesPhpDynamicNew: ctx.usesPhpDynamicNew,
    libHelperImports: [...ctx.libHelperCalls].sort(),
  };
}

/** Emit a lib helper function body (assign chain + return db.read). */
export function emitLibHelperFunctionBody(
  m: Module,
  bodyId: NodeId,
  _paramNames: readonly string[],
  opts?: EmitHandlerOptions,
  profile: HttpEmitProfile = honoHttpProfile,
): { body: string; holes: EmittedHandler["holes"]; domainTypeImports: string[]; usesDb: boolean } {
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
    usesPhpFqnNew: false,
    usesPhpDynamicNew: false,
    returnMode: "function",
    libHelperCalls: new Set<string>(),
  };
  const main = emitStmt(ctx, bodyId);
  let usesDb = false;
  for (const e of ctx.effectNames) {
    if (e.startsWith("db.")) usesDb = true;
  }
  return {
    body: main,
    holes: ctx.holes,
    domainTypeImports: [...ctx.domainTypeImports].sort(),
    usesDb,
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
