/**
 * In-process WebIR simulator (D19).
 *
 * Given a `web.request.route` node, a request input, and a stub DB,
 * evaluates the handler's IR and returns a structured response
 * record: status, concatenated echo body, redirect target (if any),
 * DB reads/writes it issued, and session writes it performed.
 *
 * Purpose: behavioral verification of rewrites without running the
 * emitted TypeScript. The verify-gate evaluates each route under the
 * pre-rewrite module AND the post-rewrite module against a small
 * set of synthesized probe inputs, and diffs the responses. If the
 * only differences are explainable by the rewrites that were applied
 * (e.g. tainted substrings getting HTML-escaped by sanitize-output,
 * dynamic SQL becoming parameterized by parameterize-sql), the
 * rewrite is behaviorally safe. Otherwise it's a regression and the
 * gate fails loudly.
 *
 * This is **not** a full PHP runtime. It handles the op set that
 * `@chrysalis/ingest` currently produces for tiny-n1 and
 * tiny-blog-class handlers. Any op we don't recognize is returned as
 * a `SimError` and the verify gate treats the simulation as
 * inconclusive rather than a regression — we'd rather abstain than
 * lie. See the module docstring in DESIGN.md D19 for scope.
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";

export type SimValue =
  | { kind: "str"; value: string }
  | { kind: "num"; value: number }
  | { kind: "bool"; value: boolean }
  | { kind: "null" }
  | { kind: "array"; entries: ReadonlyArray<{ key: string | number; value: SimValue }> }
  | { kind: "symbol"; tag: string };

export interface RequestInput {
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly post: Readonly<Record<string, string>>;
  readonly cookies: Readonly<Record<string, string>>;
  readonly session: Readonly<Record<string, SimValue>>;
  readonly pathParams: Readonly<Record<string, string>>;
}

export interface DbReadEvent {
  readonly sql: string;
  readonly params: ReadonlyArray<SimValue>;
  readonly tables: ReadonlyArray<string>;
  readonly returned: SimValue;
}

export interface DbWriteEvent {
  readonly sql: string;
  readonly params: ReadonlyArray<SimValue>;
  readonly tables: ReadonlyArray<string>;
  readonly returned: SimValue;
}

export interface SessionWriteEvent {
  readonly key: string;
  readonly value: SimValue;
}

export interface SimError {
  readonly reason: string;
  readonly nodeId: NodeId;
  readonly op: string;
}

export interface SimResponse {
  readonly status: number;
  readonly body: string;
  readonly redirectTo: string | null;
  readonly dbReads: ReadonlyArray<DbReadEvent>;
  readonly dbWrites: ReadonlyArray<DbWriteEvent>;
  readonly sessionWrites: ReadonlyArray<SessionWriteEvent>;
  /**
   * Non-empty when the simulator hit an op it couldn't evaluate.
   * The verify gate treats a non-empty `errors` array as
   * "inconclusive" — we don't rollback on inconclusive, but we do
   * record it so the signal isn't lost.
   */
  readonly errors: ReadonlyArray<SimError>;
  /** Calls that carried PHP 8 attribute metadata from ingest (`data.call.phpAttributes`). */
  readonly phpAttributedCalls: ReadonlyArray<{
    readonly callee: string;
    readonly phpAttributes: ReadonlyArray<{ readonly name: string; readonly args: ReadonlyArray<unknown> }>;
  }>;
}

export interface StubDb {
  /**
   * Return a deterministic stub result for a query. Called once per
   * db.query evaluation. The sql + params are already substituted
   * (params are SimValues, not NodeIds). The stub should be
   * deterministic on these inputs so pre/post-rewrite diffs reflect
   * only IR changes.
   */
  query(event: {
    sql: string;
    params: ReadonlyArray<SimValue>;
    tables: ReadonlyArray<string>;
    kind: "read" | "write";
    returns: "rows" | "row-or-null" | "insert-id" | "rowcount";
  }): SimValue;
}

/**
 * Default stub: param-insensitive, table + kind keyed.
 *
 * Critically, the stub does NOT vary its output by the `params`
 * array. If it did, pre-rewrite (dynamic SQL with zero bound params)
 * and post-rewrite (parameterized SQL with lifted params) would
 * return different rows, and behavior-verify would flag a spurious
 * divergence on the very class of rewrites we built it to verify.
 *
 * The consequence: behavior-verify can't detect SQL-level semantic
 * regressions through this stub. That's an explicit trade-off —
 * detecting SQL-level regressions requires a real database, which
 * belongs in a follow-on HTTP-replay layer. The stub's job is to
 * make PRE-rewrite and POST-rewrite IRs behave identically under
 * identical inputs, so any diff is attributable to an IR change in
 * something OTHER than the `effect.db.query.sql` attr.
 */
export const DEFAULT_STUB_DB: StubDb = {
  query({ tables, kind, returns }) {
    if (kind === "write") {
      return { kind: "num", value: 1 };
    }
    if (returns === "row-or-null") {
      return mkArray([
        { key: "id", value: { kind: "num", value: 1 } },
        { key: "name", value: { kind: "str", value: `stub-row:${tables[0] ?? "?"}` } },
      ]);
    }
    return mkArray([
      {
        key: 0,
        value: mkArray([
          { key: "id", value: { kind: "num", value: 1 } },
          { key: "name", value: { kind: "str", value: `stub-row:${tables[0] ?? "?"}` } },
        ]),
      },
    ]);
  },
};

function mkArray(entries: ReadonlyArray<{ key: string | number; value: SimValue }>): SimValue {
  return { kind: "array", entries };
}

/** Structural-equality check on SimValues. */
export function simValueEquals(a: SimValue, b: SimValue): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "null":
      return true;
    case "str":
    case "num":
    case "bool":
      return (a as { value: unknown }).value === (b as { value: unknown }).value;
    case "symbol":
      return a.tag === (b as typeof a).tag;
    case "array": {
      const bb = b as typeof a;
      if (a.entries.length !== bb.entries.length) return false;
      for (let i = 0; i < a.entries.length; i++) {
        const ae = a.entries[i]!;
        const be = bb.entries[i]!;
        if (ae.key !== be.key) return false;
        if (!simValueEquals(ae.value, be.value)) return false;
      }
      return true;
    }
  }
}

function stringify(v: SimValue): string {
  switch (v.kind) {
    case "str":
      return v.value;
    case "num":
      return String(v.value);
    case "bool":
      return v.value ? "1" : ""; // PHP's string coercion
    case "null":
      return "";
    case "symbol":
      return `{${v.tag}}`;
    case "array":
      return "Array";
  }
}

/** JSON.stringify-like output for `json_encode` simulation (Milestone 6A / D191). */
function jsonEncodeSimValue(v: SimValue): string {
  switch (v.kind) {
    case "str":
      return JSON.stringify(v.value);
    case "num":
      return JSON.stringify(v.value);
    case "bool":
      return JSON.stringify(v.value);
    case "null":
      return "null";
    case "symbol":
      return JSON.stringify(`{${v.tag}}`);
    case "array": {
      if (v.entries.length === 0) return "[]";
      const dense0ToN = v.entries.every((e, i) => typeof e.key === "number" && e.key === i);
      if (dense0ToN) {
        return `[${v.entries.map((e) => jsonEncodeSimValue(e.value)).join(",")}]`;
      }
      const parts = v.entries.map(
        (e) => `${JSON.stringify(String(e.key))}:${jsonEncodeSimValue(e.value)}`,
      );
      return `{${parts.join(",")}}`;
    }
  }
}

interface SimCtx {
  readonly m: Module;
  readonly input: RequestInput;
  readonly db: StubDb;
  readonly env: Map<string, SimValue>;
  readonly echo: string[];
  readonly dbReads: DbReadEvent[];
  readonly dbWrites: DbWriteEvent[];
  readonly sessionWrites: SessionWriteEvent[];
  readonly sessionScratch: Map<string, SimValue>;
  readonly errors: SimError[];
  readonly phpAttributedCalls: {
    callee: string;
    phpAttributes: ReadonlyArray<{ readonly name: string; readonly args: ReadonlyArray<unknown> }>;
  }[];
  pageLoad: SimValue | null;
  status: number;
  redirectTo: string | null;
  halted: boolean;
}

/**
 * Simulate a handler end-to-end. The handler's body is evaluated in
 * order; a redirect, http.error, or unrecoverable error sets
 * `halted` and subsequent statements are skipped (matching PHP's
 * exit-on-redirect semantics).
 */
export function simulateHandler(
  m: Module,
  routeNodeId: NodeId,
  input: RequestInput,
  db: StubDb = DEFAULT_STUB_DB,
): SimResponse {
  const ctx: SimCtx = {
    m,
    input,
    db,
    env: new Map(),
    echo: [],
    dbReads: [],
    dbWrites: [],
    sessionWrites: [],
    sessionScratch: new Map(Object.entries(input.session)),
    errors: [],
    phpAttributedCalls: [],
    pageLoad: null,
    status: 200,
    redirectTo: null,
    halted: false,
  };

  const route = m.nodes.get(routeNodeId);
  if (!route || route.dialect !== "web.request" || route.op !== "route") {
    ctx.errors.push({ reason: "not a route node", nodeId: routeNodeId, op: "?" });
  } else {
    const handlerId = route.operands[0];
    const handler = handlerId ? m.nodes.get(handlerId) : undefined;
    const bodyId = handler?.operands[0];
    const body = bodyId ? m.nodes.get(bodyId) : undefined;
    if (body) {
      const result = evalNode(ctx, body);
      if (ctx.echo.length === 0 && !ctx.redirectTo && result.kind !== "null") {
        ctx.echo.push(
          result.kind === "str" ? result.value : jsonEncodeSimValue(result),
        );
      }
    }
  }

  return {
    status: ctx.status,
    body: ctx.echo.join(""),
    redirectTo: ctx.redirectTo,
    dbReads: ctx.dbReads,
    dbWrites: ctx.dbWrites,
    sessionWrites: ctx.sessionWrites,
    errors: ctx.errors,
    phpAttributedCalls: ctx.phpAttributedCalls,
  };
}

function evalNode(ctx: SimCtx, n: NodeBase): SimValue {
  if (ctx.halted) return { kind: "null" };
  const tag = `${n.dialect}.${n.op}`;

  // Fast path: if we've already logged an error on a parent op,
  // still try to evaluate children so the env stays plausible.
  switch (tag) {
    case "data.literal":
      return toSimValue((n.attrs as { value?: unknown }).value);

    case "data.param": {
      const name = (n.attrs as { name?: string }).name ?? "";
      return ctx.env.get(name) ?? { kind: "null" };
    }

    case "data.request.field": {
      const source = (n.attrs as { source: string }).source;
      const name = (n.attrs as { name: string }).name;
      const bag = pickBag(ctx.input, source);
      const v = bag[name];
      if (v === undefined) return { kind: "null" };
      return { kind: "str", value: v };
    }

    case "data.binop":
      return evalBinOp(ctx, n);
    case "data.unaryop":
      return evalUnaryOp(ctx, n);
    case "data.member":
      return evalMember(ctx, n);
    case "data.call":
      return evalCall(ctx, n);
    case "data.concat":
      return evalConcat(ctx, n);
    case "data.html.template":
      return evalHtmlTemplate(ctx, n);
    case "data.block":
      return evalBlock(ctx, n);
    case "data.if":
    case "data.ifElse":
      return evalIfElse(ctx, n);
    case "data.foreach":
      return evalForeach(ctx, n);
    case "data.hole":
      ctx.errors.push({ reason: "hit a hole", nodeId: n.id, op: tag });
      return { kind: "symbol", tag: "hole" };

    case "effect.echo":
      return evalEcho(ctx, n);
    case "effect.db.query":
      return evalDbQuery(ctx, n);
    case "effect.redirect":
      return evalRedirect(ctx, n);
    case "effect.http.error":
      return evalHttpError(ctx, n);
    case "effect.session.read":
      return evalSessionRead(ctx, n);
    case "effect.session.write":
      return evalSessionWrite(ctx, n);

    case "web.request.response": {
      const status = (n.attrs as { status?: number }).status;
      if (typeof status === "number") ctx.status = status;
      const val = n.operands[0] ? operand(ctx, n, 0) : { kind: "null" as const };
      if (val.kind === "str") {
        let body = val.value;
        if (ctx.pageLoad && ctx.pageLoad.kind !== "null") {
          body += `\n<script type="application/json" id="cwl-page-load">${jsonEncodeSimValue(ctx.pageLoad)}</script>`;
        }
        ctx.echo.push(body);
      } else if (val.kind !== "null") {
        ctx.echo.push(jsonEncodeSimValue(val));
      }
      return val;
    }

    case "effect.time.now": {
      const fmt = n.attrs.format;
      if (fmt === "unix" || fmt === "epoch_ms" || fmt === "epoch_float") {
        return { kind: "num", value: 0 };
      }
      return { kind: "str", value: "" };
    }
    case "effect.random": {
      const lo = operand(ctx, n, 0);
      const hi = operand(ctx, n, 1);
      if (lo.kind !== "num" || hi.kind !== "num") {
        ctx.errors.push({
          reason: "random bounds not numeric",
          nodeId: n.id,
          op: tag,
        });
        return { kind: "num", value: 0 };
      }
      return { kind: "num", value: lo.value };
    }

    default:
      ctx.errors.push({ reason: "unrecognized op", nodeId: n.id, op: tag });
      return { kind: "symbol", tag };
  }
}

function pickBag(input: RequestInput, source: string): Record<string, string> {
  switch (source) {
    case "query":
      return input.query;
    case "body":
      return input.post;
    case "cookie":
      return input.cookies;
    case "path":
      return input.pathParams;
    case "header":
      return {};
    default:
      return {};
  }
}

function toSimValue(v: unknown): SimValue {
  if (v === null || v === undefined) return { kind: "null" };
  if (typeof v === "string") return { kind: "str", value: v };
  if (typeof v === "number") return { kind: "num", value: v };
  if (typeof v === "boolean") return { kind: "bool", value: v };
  return { kind: "symbol", tag: "unknown-literal" };
}

function operand(ctx: SimCtx, n: NodeBase, i: number): SimValue {
  const id = n.operands[i];
  if (id === undefined) return { kind: "null" };
  const child = ctx.m.nodes.get(id);
  if (!child) return { kind: "null" };
  return evalNode(ctx, child);
}

function evalBinOp(ctx: SimCtx, n: NodeBase): SimValue {
  const op = (n.attrs as { operator: string }).operator;
  const l = operand(ctx, n, 0);
  // `??` is lazy in PHP. Evaluate right only when left is null/unset.
  if (op === "??") {
    if (l.kind === "null") return operand(ctx, n, 1);
    return l;
  }
  const r = operand(ctx, n, 1);
  switch (op) {
    case ".":
      return { kind: "str", value: stringify(l) + stringify(r) };
    case "+":
      return { kind: "num", value: asNum(l) + asNum(r) };
    case "-":
      return { kind: "num", value: asNum(l) - asNum(r) };
    case "*":
      return { kind: "num", value: asNum(l) * asNum(r) };
    case "/": {
      const d = asNum(r);
      return { kind: "num", value: d === 0 ? 0 : asNum(l) / d };
    }
    case "==":
    case "===":
      return { kind: "bool", value: simValueEquals(l, r) };
    case "!=":
    case "!==":
      return { kind: "bool", value: !simValueEquals(l, r) };
    case "<":
      return { kind: "bool", value: asNum(l) < asNum(r) };
    case "<=":
      return { kind: "bool", value: asNum(l) <= asNum(r) };
    case ">":
      return { kind: "bool", value: asNum(l) > asNum(r) };
    case ">=":
      return { kind: "bool", value: asNum(l) >= asNum(r) };
    case "&&":
      return { kind: "bool", value: asBool(l) && asBool(r) };
    case "||":
      return { kind: "bool", value: asBool(l) || asBool(r) };
    default:
      ctx.errors.push({ reason: `unsupported binop ${op}`, nodeId: n.id, op: "data.binop" });
      return { kind: "symbol", tag: `binop:${op}` };
  }
}

function evalUnaryOp(ctx: SimCtx, n: NodeBase): SimValue {
  const op = (n.attrs as { operator: string }).operator;
  const v = operand(ctx, n, 0);
  switch (op) {
    case "!":
      return { kind: "bool", value: !asBool(v) };
    case "-":
      return { kind: "num", value: -asNum(v) };
    case "+":
      return { kind: "num", value: +asNum(v) };
    case "isset":
      return { kind: "bool", value: v.kind !== "null" };
    case "empty":
      return { kind: "bool", value: !asBool(v) || isEmptyish(v) };
    default:
      ctx.errors.push({ reason: `unsupported unaryop ${op}`, nodeId: n.id, op: "data.unaryop" });
      return { kind: "symbol", tag: `unary:${op}` };
  }
}

function isEmptyish(v: SimValue): boolean {
  if (v.kind === "str") return v.value === "" || v.value === "0";
  if (v.kind === "num") return v.value === 0;
  if (v.kind === "array") return v.entries.length === 0;
  return false;
}

function evalMember(ctx: SimCtx, n: NodeBase): SimValue {
  const obj = operand(ctx, n, 0);
  if (obj.kind !== "array") return { kind: "null" };
  // Key is either `attrs.key` (string literal) or operand[1] (computed).
  const keyAttr = (n.attrs as { key?: string }).key;
  let key: string | number;
  if (keyAttr !== undefined) {
    key = keyAttr;
  } else {
    const kv = operand(ctx, n, 1);
    key = kv.kind === "num" ? kv.value : stringify(kv);
  }
  const entry = obj.entries.find((e) => e.key === key);
  return entry ? entry.value : { kind: "null" };
}

function evalCall(ctx: SimCtx, n: NodeBase): SimValue {
  const callee = (n.attrs as { callee?: string }).callee ?? "";
  const phpAttributes = (
    n.attrs as {
      phpAttributes?: ReadonlyArray<{ readonly name: string; readonly args: ReadonlyArray<unknown> }>;
    }
  ).phpAttributes;
  if (phpAttributes !== undefined && phpAttributes.length > 0) {
    ctx.phpAttributedCalls.push({ callee, phpAttributes: [...phpAttributes] });
  }
  // Special: __assign(name, value) → env mutation.
  if (callee === "__assign") {
    const nameV = operand(ctx, n, 0);
    const val = operand(ctx, n, 1);
    if (nameV.kind === "str") ctx.env.set(nameV.value, val);
    return { kind: "null" };
  }
  // Evaluate all args once.
  const args = n.operands.map((_, i) => operand(ctx, n, i));
  switch (callee) {
    case "__return":
      ctx.halted = true;
      return args[0] ?? { kind: "null" };
    case "__ternary":
      return asBool(args[0] ?? { kind: "null" })
        ? (args[1] ?? { kind: "null" })
        : (args[2] ?? { kind: "null" });
    case "__arrow_fn": {
      const body = args[args.length - 1] ?? { kind: "null" };
      return body;
    }
    case "__first_class_callable": {
      const fnName = stringify(args[0] ?? { kind: "null" });
      return { kind: "symbol", tag: `callable:${fnName}` };
    }
    case "__match": {
      const subject = args[0] ?? { kind: "null" };
      const armCount = asNum(args[1] ?? { kind: "null" });
      let i = 2;
      let defaultBody: SimValue | undefined;
      for (let a = 0; a < armCount; a++) {
        const isDefault = asNum(args[i++] ?? { kind: "null" }) === 1;
        const condCount = asNum(args[i++] ?? { kind: "null" });
        const conds: SimValue[] = [];
        for (let c = 0; c < condCount; c++) {
          conds.push(args[i++] ?? { kind: "null" });
        }
        const body = args[i++] ?? { kind: "null" };
        if (isDefault) {
          defaultBody = body;
          continue;
        }
        for (const cond of conds) {
          if (simValueEquals(subject, cond)) return body;
        }
      }
      if (defaultBody !== undefined) return defaultBody;
      return { kind: "null" };
    }
    case "__cast_int":
      return { kind: "num", value: Math.trunc(asNum(args[0] ?? { kind: "null" })) };
    case "__cast_float":
      return { kind: "num", value: asNum(args[0] ?? { kind: "null" }) };
    case "__cast_string":
      return { kind: "str", value: stringify(args[0] ?? { kind: "null" }) };
    case "__cast_bool":
      return { kind: "bool", value: asBool(args[0] ?? { kind: "null" }) };
    case "__array_literal":
      return {
        kind: "array",
        entries: args.map((v, i) => ({ key: i, value: v })),
      };
    case "__object_literal": {
      const entries: { key: string | number; value: SimValue }[] = [];
      for (let i = 0; i < args.length; i += 2) {
        const keySim = args[i] ?? { kind: "null" };
        const valSim = args[i + 1] ?? { kind: "null" };
        const keyStr =
          keySim.kind === "str"
            ? keySim.value
            : keySim.kind === "num"
              ? String(keySim.value)
              : stringify(keySim);
        entries.push({ key: keyStr, value: valSim });
      }
      return { kind: "array", entries };
    }
    case "__page_load": {
      const data = args[0] ?? { kind: "null" };
      ctx.pageLoad = data;
      if (data.kind === "array") {
        for (const entry of data.entries) {
          const key =
            typeof entry.key === "string"
              ? entry.key
              : typeof entry.key === "number"
                ? String(entry.key)
                : stringify(entry.key);
          ctx.env.set(key, entry.value);
        }
      }
      return data;
    }
    case "json_encode":
      return { kind: "str", value: jsonEncodeSimValue(args[0] ?? { kind: "null" }) };
    case "htmlspecialchars":
      return { kind: "str", value: htmlEscape(stringify(args[0] ?? { kind: "null" })) };
    case "nl2br":
      return { kind: "str", value: stringify(args[0] ?? { kind: "null" }).replace(/\n/g, "<br />\n") };
    case "trim":
      return { kind: "str", value: stringify(args[0] ?? { kind: "null" }).trim() };
    case "intval":
      return { kind: "num", value: Math.trunc(asNum(args[0] ?? { kind: "null" })) };
    case "strlen":
      return { kind: "num", value: stringify(args[0] ?? { kind: "null" }).length };
    case "preg_match": {
      const pat = stringify(args[0] ?? { kind: "null" });
      const subj = stringify(args[1] ?? { kind: "null" });
      const re = phpSlashPatternToRegExp(pat);
      if (!re) {
        ctx.errors.push({
          reason: "preg_match: invalid or unsupported pattern",
          nodeId: n.id,
          op: "data.call",
        });
        return { kind: "bool", value: false };
      }
      return { kind: "bool", value: re.test(subj) };
    }
    case "microtimeString": {
      const n = asNum(args[0] ?? { kind: "null" });
      const sec = Math.floor(n);
      const frac = n - sec;
      return { kind: "str", value: `${frac.toFixed(8)} ${sec}` };
    }
    case "parseUrlParts": {
      const u = stringify(args[0] ?? { kind: "null" });
      try {
        const p = new URL(u, "http://chrysalis-parse-url.invalid");
        const entries: { key: string; value: SimValue }[] = [];
        const scheme = p.protocol.replace(/:$/, "");
        if (scheme) entries.push({ key: "scheme", value: { kind: "str", value: scheme } });
        if (p.username) entries.push({ key: "user", value: { kind: "str", value: p.username } });
        if (p.password) entries.push({ key: "pass", value: { kind: "str", value: p.password } });
        if (p.hostname) entries.push({ key: "host", value: { kind: "str", value: p.hostname } });
        if (p.port) entries.push({ key: "port", value: { kind: "str", value: String(p.port) } });
        if (p.pathname) entries.push({ key: "path", value: { kind: "str", value: p.pathname } });
        const q = p.search ? p.search.slice(1) : "";
        if (q) entries.push({ key: "query", value: { kind: "str", value: q } });
        const frag = p.hash ? p.hash.slice(1) : "";
        if (frag) entries.push({ key: "fragment", value: { kind: "str", value: frag } });
        return { kind: "array", entries };
      } catch {
        return { kind: "array", entries: [] };
      }
    }
    case "password_verify":
      // Opaque by design — value doesn't matter as long as it's
      // deterministic from the inputs.
      return { kind: "bool", value: simValueEquals(args[0] ?? { kind: "null" }, args[1] ?? { kind: "null" }) };
    case "require_login":
      return { kind: "null" };
    case "current_user":
      return mkArray([{ key: "id", value: { kind: "num", value: 1 } }, { key: "name", value: { kind: "str", value: "alice" } }]);
    case "db":
      return { kind: "symbol", tag: "db-handle" };
    case "session_start":
      return { kind: "null" };
    case "echo":
      ctx.echo.push(stringify(args[0] ?? { kind: "null" }));
      return { kind: "null" };
    case "__chrysalis_pluck": {
      const rows = args[0] ?? { kind: "array", entries: [] };
      const key = stringify(args[1] ?? { kind: "null" });
      if (rows.kind !== "array") {
        return { kind: "array", entries: [] };
      }
      const out: { key: number; value: SimValue }[] = [];
      let i = 0;
      for (const e of rows.entries) {
        if (e.value.kind === "array") {
          const cell = e.value.entries.find((x) => String(x.key) === key);
          out.push({ key: i++, value: cell?.value ?? { kind: "null" } });
        } else {
          out.push({ key: i++, value: { kind: "null" } });
        }
      }
      return { kind: "array", entries: out };
    }
    case "__chrysalis_row_by_column": {
      const rows = args[0] ?? { kind: "array", entries: [] };
      const col = stringify(args[1] ?? { kind: "null" });
      const keyVal = args[2] ?? { kind: "null" };
      const want = stringify(keyVal);
      if (rows.kind !== "array") return { kind: "null" };
      for (const e of rows.entries) {
        const row = e.value;
        if (row.kind !== "array") continue;
        const cell = row.entries.find((x) => String(x.key) === col);
        const v = cell?.value;
        if (v !== undefined && stringify(v) === want) return row;
      }
      return { kind: "null" };
    }
    case "__chrysalis_query_all_where_in": {
      const selectList = stringify(args[0] ?? { kind: "null" });
      const table = stringify(args[1] ?? { kind: "null" });
      const idCol = stringify(args[2] ?? { kind: "null" });
      const idsVal = args[3] ?? { kind: "array", entries: [] };
      const params = idsVal.kind === "array" ? idsVal.entries.map((e) => e.value) : [];
      const sql = `SELECT ${selectList} FROM ${table} WHERE ${idCol} IN (?) /*expanded*/`;
      const tables = [table.toLowerCase()];
      const returned = ctx.db.query({
        sql,
        params,
        tables,
        kind: "read",
        returns: "rows",
      });
      ctx.dbReads.push({ sql, params, tables, returned });
      return returned;
    }
    case "__chrysalis_zod_body_field": {
      const rawS = stringify(args[0] ?? { kind: "null" });
      let minLen = 0;
      const ml = args[1];
      if (ml?.kind === "num") minLen = ml.value;
      const trim = args[2]?.kind === "bool" ? args[2].value : false;
      const email = args[3]?.kind === "bool" ? args[3].value : false;
      let s = rawS;
      if (trim) s = s.trim();
      if (s.length < minLen) return { kind: "str", value: "" };
      if (email && !/^[^@]+@[^@]+$/.test(s)) return { kind: "str", value: "" };
      return { kind: "str", value: s };
    }
    case "__chrysalis_zod_enum_body_field": {
      const rawS = stringify(args[0] ?? { kind: "null" });
      const allowed: string[] = [];
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a?.kind === "str") allowed.push(a.value);
        else break;
      }
      if (allowed.length === 0) return { kind: "str", value: "" };
      return allowed.includes(rawS) ? { kind: "str", value: rawS } : { kind: "str", value: "" };
    }
    default: {
      const bound = ctx.env.get(callee);
      if (bound?.kind === "symbol" && bound.tag.startsWith("callable:")) {
        const inner = bound.tag.slice("callable:".length);
        return evalCall(ctx, { ...n, attrs: { ...n.attrs, callee: inner } } as NodeBase);
      }
      // Unknown call — record the opaque result so downstream diffs
      // don't silently succeed.
      ctx.errors.push({ reason: `unsupported call ${callee}`, nodeId: n.id, op: "data.call" });
      return { kind: "symbol", tag: `call:${callee}` };
    }
  }
}

function evalConcat(ctx: SimCtx, n: NodeBase): SimValue {
  let out = "";
  for (let i = 0; i < n.operands.length; i++) out += stringify(operand(ctx, n, i));
  return { kind: "str", value: out };
}

function evalHtmlTemplate(ctx: SimCtx, n: NodeBase): SimValue {
  const parts = (n.attrs as {
    parts?: ReadonlyArray<
      { kind: "literal"; text: string } | { kind: "expr"; operandIndex: number; escape: boolean }
    >;
  }).parts ?? [];
  let out = "";
  for (const p of parts) {
    if (p.kind === "literal") {
      out += p.text;
    } else {
      const exprPart = p as { kind: "expr"; operandIndex?: number; idx?: number; escape: boolean };
      const v = operand(ctx, n, exprPart.operandIndex ?? exprPart.idx ?? 0);
      const s = stringify(v);
      out += p.escape ? htmlEscape(s) : s;
    }
  }
  return { kind: "str", value: out };
}

function evalBlock(ctx: SimCtx, n: NodeBase): SimValue {
  let last: SimValue = { kind: "null" };
  for (let i = 0; i < n.operands.length; i++) {
    if (ctx.halted) break;
    last = operand(ctx, n, i);
  }
  return last;
}

function evalIfElse(ctx: SimCtx, n: NodeBase): SimValue {
  const cond = operand(ctx, n, 0);
  if (asBool(cond)) {
    return operand(ctx, n, 1);
  }
  if (n.operands.length >= 3) return operand(ctx, n, 2);
  return { kind: "null" };
}

function evalForeach(ctx: SimCtx, n: NodeBase): SimValue {
  const iterable = operand(ctx, n, 0);
  const attrs = n.attrs as { keyName: string | null; valueName: string };
  if (iterable.kind !== "array") return { kind: "null" };
  const bodyId = n.operands[1];
  const body = bodyId ? ctx.m.nodes.get(bodyId) : undefined;
  if (!body) return { kind: "null" };
  for (const entry of iterable.entries) {
    if (ctx.halted) break;
    ctx.env.set(attrs.valueName, entry.value);
    if (attrs.keyName) {
      ctx.env.set(attrs.keyName, typeof entry.key === "number"
        ? { kind: "num", value: entry.key }
        : { kind: "str", value: entry.key });
    }
    evalNode(ctx, body);
  }
  return { kind: "null" };
}

function evalEcho(ctx: SimCtx, n: NodeBase): SimValue {
  const v = operand(ctx, n, 0);
  ctx.echo.push(stringify(v));
  return { kind: "null" };
}

function evalDbQuery(ctx: SimCtx, n: NodeBase): SimValue {
  const attrs = n.attrs as {
    kind: "read" | "write";
    sql: string;
    returns: "rows" | "row-or-null" | "insert-id" | "rowcount";
    tables: ReadonlyArray<string>;
  };
  const params = n.operands.map((_, i) => operand(ctx, n, i));
  const returned = ctx.db.query({
    sql: attrs.sql,
    params,
    tables: attrs.tables,
    kind: attrs.kind,
    returns: attrs.returns,
  });
  if (attrs.kind === "read") {
    ctx.dbReads.push({ sql: attrs.sql, params, tables: attrs.tables, returned });
  } else {
    ctx.dbWrites.push({ sql: attrs.sql, params, tables: attrs.tables, returned });
  }
  return returned;
}

function evalRedirect(ctx: SimCtx, n: NodeBase): SimValue {
  ctx.redirectTo = stringify(operand(ctx, n, 0));
  ctx.status = 302;
  ctx.halted = true;
  return { kind: "null" };
}

function evalHttpError(ctx: SimCtx, n: NodeBase): SimValue {
  const status = (n.attrs as { status?: number }).status ?? 500;
  ctx.status = status;
  ctx.halted = true;
  return { kind: "null" };
}

function evalSessionRead(ctx: SimCtx, n: NodeBase): SimValue {
  const key = (n.attrs as { key: string }).key;
  return ctx.sessionScratch.get(key) ?? { kind: "null" };
}

function evalSessionWrite(ctx: SimCtx, n: NodeBase): SimValue {
  const key = (n.attrs as { key: string }).key;
  const v = operand(ctx, n, 0);
  ctx.sessionScratch.set(key, v);
  ctx.sessionWrites.push({ key, value: v });
  return { kind: "null" };
}

function asNum(v: SimValue): number {
  switch (v.kind) {
    case "num":
      return v.value;
    case "str": {
      const n = Number.parseFloat(v.value);
      return Number.isFinite(n) ? n : 0;
    }
    case "bool":
      return v.value ? 1 : 0;
    case "null":
      return 0;
    default:
      return 0;
  }
}

function asBool(v: SimValue): boolean {
  switch (v.kind) {
    case "bool":
      return v.value;
    case "num":
      return v.value !== 0;
    case "str":
      return v.value !== "" && v.value !== "0";
    case "null":
      return false;
    case "array":
      return v.entries.length > 0;
    case "symbol":
      return true;
  }
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Slash-delimited PHP patterns only; mirrors `pregMatch` in emit-hono runtime. */
function phpSlashPatternToRegExp(pattern: string): RegExp | null {
  const lastSlash = pattern.lastIndexOf("/");
  if (pattern.length >= 2 && pattern[0] === "/" && lastSlash > 0) {
    const body = pattern.slice(1, lastSlash);
    const flags = pattern.slice(lastSlash + 1).replace(/[^gimsuy]/g, "");
    try {
      return new RegExp(body, flags);
    } catch {
      return null;
    }
  }
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}
