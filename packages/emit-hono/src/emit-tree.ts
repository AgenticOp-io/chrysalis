/**
 * Generates TypeScript text from a WebIR handler body. Collects:
 *  - the body's emitted statements
 *  - any holes encountered
 *  - the effects observed (so the handler signature carries them)
 */

import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import { matchStringDispatchChain } from "@chrysalis/insight";
import { ident, stringLit } from "./ts-util.js";

export interface EmittedHandler {
  readonly body: string;
  readonly holes: ReadonlyArray<{ name: string; line: number; reason: string }>;
  readonly effectNames: ReadonlyArray<string>;
  readonly shape: "html" | "redirect" | "mixed";
}

interface EmitCtx {
  readonly m: Module;
  /** PHP variable name -> TS identifier once bound. */
  readonly bound: Set<string>;
  readonly holes: { name: string; line: number; reason: string }[];
  readonly effectNames: Set<string>;
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
}

function get(ctx: EmitCtx, id: NodeId): NodeBase {
  const n = ctx.m.nodes.get(id);
  if (!n) throw new Error(`emit-hono: missing node ${String(id)}`);
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
          return `c.req.query(${stringLit(name)})`;
        case "path":
          return `c.req.param(${stringLit(name)})`;
        case "body":
          return `(__body[${stringLit(name)}] ?? null)`;
        case "cookie":
          return `getCookie(c, ${stringLit(name)})`;
        case "header":
          return `c.req.header(${stringLit(name)})`;
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
      // Currently unused by ingest (we emit InlineHtml / Echo statements),
      // but kept for completeness.
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

function emitEffectExpr(ctx: EmitCtx, n: NodeBase): string {
  switch (n.op) {
    case "db.query": {
      for (const e of n.effects) ctx.effectNames.add(`${e.kind}:${"table" in e ? e.table : ""}`);
      const mode = String(n.attrs.returns);
      const sql = String(n.attrs.sql);
      const params = n.operands.map((o) => emitExpr(ctx, o));
      if (mode === "rows") {
        return `queryAll(${stringLit(sql)}, [${params.join(", ")}])`;
      }
      if (mode === "row-or-null") {
        return `queryOne(${stringLit(sql)}, [${params.join(", ")}])`;
      }
      return `execSql(${stringLit(sql)}, [${params.join(", ")}])`;
    }
    case "session.read":
      ctx.effectNames.add("session.read");
      return `getSession(c).get(${stringLit(String(n.attrs.key))})`;
    default:
      return `/* unhandled effect.${n.op} */ null`;
  }
}

function emitKnownCall(ctx: EmitCtx, callee: string, args: string[]): string {
  // Pseudo-ops injected by ingest.
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
  }
  // Common PHP stdlib.
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
      return `requireLogin(c)`;
    case "current_user":
      return `currentUser(c)`;
    case "db":
      return `db()`;
    case "session_start":
      return `undefined /* session_start handled by middleware */`;
  }
  // Fallback: call by name, letting TS resolve. Likely becomes a type error
  // if unknown — that's correct: emission of unresolved calls is a bug.
  ctx.holes.push({
    name: `call:${callee}`,
    line: 0,
    reason: `unresolved call: ${callee}`,
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
  switch (n.op) {
    case "block": {
      const lines: string[] = [];
      for (const op of n.operands) {
        const s = emitStmt(ctx, op);
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
        lines.push(
          `switch (${d} == null ? "" : String(${d})) {`,
        );
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
      // Pseudo-statements from ingest.
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
        // Bare `return;` in a PHP page file means "stop running this file".
        // When the handler has an accumulated HTML buffer / status, flush it
        // as the response. Otherwise emit an empty 200.
        return `return __respond(c, __html, __status);`;
      }
      if (callee === "__exit") {
        // PHP `exit;` after prior `http_response_code(N)` + `echo "msg"` means
        // "send the accumulated output with that status". Emit a single
        // response that reflects whatever was buffered.
        ctx.hasTerminalResponse = true;
        return `return __respond(c, __html, __status);`;
      }
      // Side-effecting call as statement.
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
      // PHP's `header('Location: /x')` passes the full header line; Hono's
      // `c.redirect` wants just the URL. Strip the prefix at runtime.
      return `return c.redirect(String(${loc}).replace(/^\\s*Location:\\s*/i, ""));`;
    }
    case "http.error": {
      // `http_response_code(N)` in PHP sets the response status but does
      // NOT terminate the handler. Record it in a mutable __status variable;
      // the handler epilogue uses it for the final response.
      ctx.statusVarUsed = true;
      const status = Number(n.attrs.status ?? 500);
      return `__status = ${status};`;
    }
    case "session.write": {
      ctx.effectNames.add("session.write");
      const val = emitExpr(ctx, n.operands[0]!);
      return `getSession(c).set(${stringLit(String(n.attrs.key))}, ${val});`;
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
export function emitHandlerBody(m: Module, handlerId: NodeId): EmittedHandler {
  const ctx: EmitCtx = {
    m,
    bound: new Set<string>(),
    holes: [],
    effectNames: new Set<string>(),
    htmlBufferUsed: false,
    statusVarUsed: false,
    hasTerminalResponse: false,
    shape: null,
    tmpCounter: 0,
  };
  const handler = m.nodes.get(handlerId);
  if (!handler) throw new Error(`emit-hono: handler not found ${String(handlerId)}`);
  const body = handler.operands[0]!;
  const preamble: string[] = [];
  const hasBodyUse = containsRequestSource(m, body, "body");
  if (hasBodyUse) {
    preamble.push(
      `const __body = await c.req.parseBody().catch(() => ({} as Record<string, unknown>));`,
    );
  }
  const main = emitStmt(ctx, body);
  // Always declare the response buffer/status and always end with a flush.
  // TypeScript correctly collapses the trailing `return` if every path above
  // already returns unconditionally.
  const decls: string[] = [`let __html = "";`, `let __status = 200;`];
  const epilogue: string[] = [`return __respond(c, __html, __status);`];
  const text = [...preamble, ...decls, main, ...epilogue]
    .filter((s): s is string => Boolean(s && s.trim()))
    .join("\n");
  return {
    body: text,
    holes: ctx.holes,
    effectNames: [...ctx.effectNames].sort(),
    shape: ctx.shape ?? "mixed",
  };
}

/** Post-order search for a data.request.field with the given source. */
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
