/**
 * PHP-AST → WebIR conversion. The heart of the frontend.
 *
 * Scope: Milestone 1 tiny-blog surface. Unknown constructs become `data.hole`
 * nodes per DESIGN.md § 3 principle #2 ("Partial output beats no output").
 */

import type {
  PhpAst,
  PhpExpr,
  PhpNode,
  Pos as PhpPos,
} from "@chrysalis/parser-bridge";
import {
  ModuleBuilder,
  T,
  dataDialect,
  effectDialect,
  effectsReachableWithCallOverlay,
  phpLocator,
  provenance as prov,
  webRequest,
  type EffectSet,
  type Locator,
  type NodeId,
  type WebIRType,
} from "@chrysalis/webir";
import type { RouteSpec } from "./routes.js";

/**
 * Top-level `function` declarations in a route file are hoisted for call-effect
 * inference (`buildCallEffectMap`) and must not be lowered as handler statements
 * (would otherwise become holes).
 */
export function stripTopLevelFunctionDecls(stmts: readonly PhpNode[]): PhpNode[] {
  return stmts.filter((s) => s.kind !== "FunctionDecl");
}

interface Ctx {
  readonly m: ModuleBuilder;
  readonly data: ReturnType<typeof dataDialect.builders>;
  readonly effect: ReturnType<typeof effectDialect.builders>;
  readonly route: ReturnType<typeof webRequest.builders>;
  readonly file: string;
  readonly effects: Set<string>;
  /** Effect objects accumulated as we emit effectful nodes. */
  readonly effectObjs: Parameters<typeof import("@chrysalis/webir").mergeEffects>[0];
}

function makeCtx(builder: ModuleBuilder, file: string): Ctx {
  return {
    m: builder,
    data: dataDialect.builders(builder),
    effect: effectDialect.builders(builder),
    route: webRequest.builders(builder),
    file,
    effects: new Set(),
    effectObjs: [],
  };
}

function loc(ctx: Ctx, p: PhpPos): Locator {
  return phpLocator(ctx.file, p.line, p.col);
}

/** Build a `data.block` from PHP statements (library bodies, etc.). */
export function convertPhpStatementsToBlock(
  builder: ModuleBuilder,
  file: string,
  stmts: readonly PhpNode[],
  pathParams: RouteSpec["pathParams"] = [],
): NodeId {
  const ctx = makeCtx(builder, file);
  return convertStatements(ctx, stmts, pathParams);
}

function hole(ctx: Ctx, reason: string, p: PhpPos, output: WebIRType = T.unknown): NodeId {
  return ctx.data.hole({
    reason,
    input: T.unknown,
    output,
    origin: loc(ctx, p),
  });
}

/** Known PHP functions that we lower either to effect ops or to native idioms. */
type CallLowering =
  | { kind: "dbQuery"; mode: "rows" | "row-or-null" | "insert-id"; tableFrom: "firstArg" }
  | { kind: "htmlspecialchars" }
  | { kind: "nl2br" }
  | { kind: "trim" }
  | { kind: "intval" }
  | { kind: "strlen" }
  | { kind: "header.location" }
  | { kind: "http.status" }
  | { kind: "password_verify" }
  | { kind: "preg_match" }
  | { kind: "parse_url" }
  | { kind: "require_login" }
  | { kind: "current_user" }
  | { kind: "db" }
  | { kind: "echo" }
  | { kind: "exit" }
  | { kind: "require" }
  | { kind: "session_start" }
  /** PHP `session_name` / `session_set_cookie_params` — runtime only; emitted middleware owns cookies. */
  | { kind: "session_php_config_noop" }
  | { kind: "isset_builtin" }
  | { kind: "empty_builtin" }
  | { kind: "time_builtin" }
  | { kind: "php_rand" }
  | { kind: "getrandmax_builtin" }
  | { kind: "microtime_builtin" }
  | { kind: "uniqid_builtin" };

const KNOWN_CALLS: Record<string, CallLowering> = {
  query_all: { kind: "dbQuery", mode: "rows", tableFrom: "firstArg" },
  query_one: { kind: "dbQuery", mode: "row-or-null", tableFrom: "firstArg" },
  exec_sql: { kind: "dbQuery", mode: "insert-id", tableFrom: "firstArg" },
  htmlspecialchars: { kind: "htmlspecialchars" },
  nl2br: { kind: "nl2br" },
  trim: { kind: "trim" },
  intval: { kind: "intval" },
  strlen: { kind: "strlen" },
  header: { kind: "header.location" },
  http_response_code: { kind: "http.status" },
  password_verify: { kind: "password_verify" },
  preg_match: { kind: "preg_match" },
  parse_url: { kind: "parse_url" },
  require_login: { kind: "require_login" },
  current_user: { kind: "current_user" },
  db: { kind: "db" },
  __isset: { kind: "isset_builtin" },
  __empty: { kind: "empty_builtin" },
  __require: { kind: "require" },
  __require_once: { kind: "require" },
  session_start: { kind: "session_start" },
  session_name: { kind: "session_php_config_noop" },
  session_set_cookie_params: { kind: "session_php_config_noop" },
  time: { kind: "time_builtin" },
  rand: { kind: "php_rand" },
  mt_rand: { kind: "php_rand" },
  random_int: { kind: "php_rand" },
  getrandmax: { kind: "getrandmax_builtin" },
  mt_getrandmax: { kind: "getrandmax_builtin" },
  microtime: { kind: "microtime_builtin" },
  uniqid: { kind: "uniqid_builtin" },
};

/** Crude table guesser from a SQL literal. Used for effect tagging. */
function guessTables(sql: string): string[] {
  const out = new Set<string>();
  const re = /\b(?:from|join|into|update)\s+([a-z_][a-z0-9_]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sql)) !== null) {
    if (match[1]) out.add(match[1].toLowerCase());
  }
  return [...out];
}

function classifyDbReturn(mode: "rows" | "row-or-null" | "insert-id"): WebIRType {
  if (mode === "rows") return T.array(T.record({}));
  if (mode === "row-or-null") return T.nullable(T.record({}));
  return T.int;
}

/** Convert an expression tree into a single NodeId. */
function convertExpr(ctx: Ctx, e: PhpExpr, pathParams: RouteSpec["pathParams"]): NodeId {
  switch (e.kind) {
    case "Literal": {
      let type: WebIRType = T.unknown;
      switch (e.literalKind) {
        case "string":
          type = T.string;
          break;
        case "int":
          type = T.int;
          break;
        case "float":
          type = T.float;
          break;
        case "bool":
          type = T.bool;
          break;
        case "null":
          type = T.null;
          break;
      }
      return ctx.data.literal({ value: e.value, type, origin: loc(ctx, e.pos) });
    }
    case "Variable": {
      const pp = pathParams.find((p) => p.phpVar === e.name || p.name === e.name);
      if (pp) {
        return ctx.data.requestField({
          source: "path",
          name: pp.name,
          type: pp.type === "int" ? T.int : T.string,
          origin: loc(ctx, e.pos),
        });
      }
      return ctx.data.param({
        name: e.name,
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
    case "Superglobal": {
      // Bare `$_POST` is only meaningful when indexed. Emit a param-like stub.
      return ctx.data.param({
        name: e.name,
        type: T.record({}),
        origin: loc(ctx, e.pos),
      });
    }
    case "ArrayAccess": {
      // Detect `$_POST['x']`, `$_GET['x']`, `$_SESSION['x']`, `$_COOKIE['x']`,
      // `$_SERVER['X']` and lower to requestField / session.read.
      const target = e.target;
      if (target.kind === "Superglobal") {
        if (e.index.kind === "Literal" && e.index.literalKind === "string") {
          const name = String(e.index.value);
          if (target.name === "_POST") {
            return ctx.data.requestField({
              source: "body",
              name,
              type: T.nullable(T.string),
              origin: loc(ctx, e.pos),
            });
          }
          if (target.name === "_GET") {
            return ctx.data.requestField({
              source: "query",
              name,
              type: T.nullable(T.string),
              origin: loc(ctx, e.pos),
            });
          }
          if (target.name === "_COOKIE") {
            return ctx.data.requestField({
              source: "cookie",
              name,
              type: T.nullable(T.string),
              origin: loc(ctx, e.pos),
            });
          }
          if (target.name === "_SERVER") {
            return ctx.data.requestField({
              source: "header",
              name,
              type: T.nullable(T.string),
              origin: loc(ctx, e.pos),
            });
          }
          if (target.name === "_SESSION") {
            return ctx.effect.sessionRead({
              key: name,
              type: T.nullable(T.unknown),
              origin: loc(ctx, e.pos),
            });
          }
        }
      }
      // Ordinary array/record access.
      const obj = convertExpr(ctx, target, pathParams);
      const key =
        e.index.kind === "Literal" && typeof e.index.value !== "object"
          ? String(e.index.value)
          : convertExpr(ctx, e.index, pathParams);
      return ctx.data.member({
        obj,
        key,
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
    case "BinOp": {
      const opMap: Record<string, string> = {
        "&&": "&&",
        and: "&&",
        "||": "||",
        or: "||",
        "==": "==",
        "===": "===",
        "!=": "!=",
        "!==": "!==",
        "<": "<",
        "<=": "<=",
        ">": ">",
        ">=": ">=",
        "+": "+",
        "-": "-",
        "*": "*",
        "/": "/",
        ".": ".",
        "??": "??",
      };
      const mapped = opMap[e.operator];
      if (!mapped) return hole(ctx, `binop ${e.operator}`, e.pos);
      const left = convertExpr(ctx, e.left, pathParams);
      const right = convertExpr(ctx, e.right, pathParams);
      return ctx.data.binOp({
        operator: mapped as Parameters<typeof ctx.data.binOp>[0]["operator"],
        left,
        right,
        type: mapped === "." ? T.string : T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
    case "UnaryOp": {
      const op = e.operator === "~" ? "!" : e.operator;
      return ctx.data.unaryOp({
        operator: op,
        operand: convertExpr(ctx, e.operand, pathParams),
        type: T.bool,
        origin: loc(ctx, e.pos),
      });
    }
    case "Coalesce": {
      return ctx.data.binOp({
        operator: "??",
        left: convertExpr(ctx, e.left, pathParams),
        right: convertExpr(ctx, e.right, pathParams),
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
    case "Ternary": {
      const cond = convertExpr(ctx, e.cond, pathParams);
      const then = e.then ? convertExpr(ctx, e.then, pathParams) : cond;
      const el = convertExpr(ctx, e.else, pathParams);
      // Model as a call to a pseudo-op the emitter lowers to a conditional
      // expression. Kept as a hole for now since ?: semantics need care.
      return ctx.data.call({
        callee: "__ternary",
        args: [cond, then, el],
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
    case "Cast": {
      const inner = convertExpr(ctx, e.expr, pathParams);
      return ctx.data.call({
        callee: `__cast_${e.castKind}`,
        args: [inner],
        type:
          e.castKind === "int"
            ? T.int
            : e.castKind === "float"
              ? T.float
              : e.castKind === "string"
                ? T.string
                : e.castKind === "bool"
                  ? T.bool
                  : T.array(T.unknown),
        origin: loc(ctx, e.pos),
      });
    }
    case "Array": {
      return ctx.data.call({
        callee: "__array_literal",
        args: e.items.map((it) => convertExpr(ctx, it.value, pathParams)),
        type: T.array(T.unknown),
        origin: loc(ctx, e.pos),
      });
    }
    case "Call": {
      return convertCall(ctx, e, pathParams);
    }
    case "ConstFetch":
      return ctx.data.call({
        callee: e.name,
        args: [],
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    case "StaticFetch":
      return ctx.data.call({
        callee: `${e.className}::${e.name}`,
        args: [],
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    case "PropertyFetch":
      return ctx.data.member({
        obj: convertExpr(ctx, e.target, pathParams),
        key: e.name,
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    default:
      return hole(ctx, `expr:${(e as PhpExpr).kind}`, (e as PhpExpr).pos);
  }
}

function convertCall(
  ctx: Ctx,
  e: Extract<PhpExpr, { kind: "Call" }>,
  pathParams: RouteSpec["pathParams"],
): NodeId {
  if (e.callee.kind !== "name") {
    return hole(ctx, `call:${e.callee.kind}`, e.pos);
  }
  const name = e.callee.name;
  const lowering = KNOWN_CALLS[name];
  const args = e.args.map((a) => convertExpr(ctx, a, pathParams));

  if (!lowering) {
    return ctx.data.call({
      callee: name,
      args,
      type: T.unknown,
      origin: loc(ctx, e.pos),
    });
  }

  switch (lowering.kind) {
    case "dbQuery": {
      const sqlArg = e.args[0];
      let sql: string;
      let sqlExpr: NodeId | undefined;
      if (sqlArg?.kind === "Literal" && sqlArg.literalKind === "string") {
        sql = String(sqlArg.value);
        sqlExpr = undefined;
      } else {
        sql = "<dynamic>";
        // When the SQL isn't a literal we ALSO convert the expression tree
        // and stash its NodeId on the db.query node as an attr. Without
        // this, the rewrite engine couldn't recover the attacker inputs
        // from the IR for the `parameterize-sql` pass — the concat tree
        // would be orphaned with no consumer. Keeping it as a non-operand
        // attr means db.query's operand contract (params only) is
        // unchanged, so emit, taint, and invariants all keep working.
        sqlExpr = sqlArg ? convertExpr(ctx, sqlArg, pathParams) : undefined;
      }
      const tables = guessTables(sql);
      const isRead = /^\s*select\b/i.test(sql) || lowering.mode === "rows" || lowering.mode === "row-or-null";
      // PHP calling convention: `query_*(sql, [p1, p2, ...])`. Unwrap a single
      // PHP array literal for the params into individual WebIR operands.
      const paramsArg = e.args[1];
      let params: NodeId[];
      if (paramsArg?.kind === "Array") {
        params = paramsArg.items.map((it) => convertExpr(ctx, it.value, pathParams));
      } else {
        params = args.slice(1);
      }
      const type = classifyDbReturn(lowering.mode);
      const dbQueryOpts: Parameters<typeof ctx.effect.dbQuery>[0] = {
        kind: isRead ? "read" : "write",
        sql,
        params,
        returns: lowering.mode,
        tables,
        type,
        origin: loc(ctx, e.pos),
      };
      if (sqlExpr !== undefined) dbQueryOpts.sqlExpr = sqlExpr;
      return ctx.effect.dbQuery(dbQueryOpts);
    }
    case "htmlspecialchars":
      return ctx.data.call({
        callee: "htmlspecialchars",
        args,
        type: T.string,
        origin: loc(ctx, e.pos),
      });
    case "nl2br":
      return ctx.data.call({
        callee: "nl2br",
        args,
        type: T.string,
        origin: loc(ctx, e.pos),
      });
    case "trim":
      return ctx.data.call({
        callee: "trim",
        args,
        type: T.string,
        origin: loc(ctx, e.pos),
      });
    case "intval":
      return ctx.data.call({
        callee: "intval",
        args,
        type: T.int,
        origin: loc(ctx, e.pos),
      });
    case "strlen":
      return ctx.data.call({
        callee: "strlen",
        args,
        type: T.int,
        origin: loc(ctx, e.pos),
      });
    case "time_builtin": {
      if (e.args.length !== 0) {
        return hole(ctx, "time:args", e.pos, T.int);
      }
      return ctx.effect.timeNow({
        format: "unix",
        origin: loc(ctx, e.pos),
        provenance: [prov("php-ast", loc(ctx, e.pos), "time()")],
      });
    }
    case "php_rand": {
      const origin = loc(ctx, e.pos);
      if (e.args.length === 0) {
        const min = ctx.data.literal({ value: 0, type: T.int, origin });
        const max = ctx.data.literal({ value: 2_147_483_647, type: T.int, origin });
        return ctx.effect.random({
          min,
          max,
          origin,
          provenance: [prov("php-ast", origin, `${name}()`)],
        });
      }
      if (e.args.length === 2) {
        return ctx.effect.random({
          min: args[0]!,
          max: args[1]!,
          origin,
          provenance: [prov("php-ast", origin, `${name}(…)`)],
        });
      }
      return hole(ctx, `rand:args:${e.args.length}`, e.pos, T.int);
    }
    case "getrandmax_builtin": {
      if (e.args.length !== 0) {
        return hole(ctx, "getrandmax:args", e.pos, T.int);
      }
      return ctx.data.literal({
        value: 2_147_483_647,
        type: T.int,
        origin: loc(ctx, e.pos),
        provenance: [prov("php-ast", loc(ctx, e.pos), `${name}()`)],
      });
    }
    case "microtime_builtin": {
      const origin = loc(ctx, e.pos);
      const stringMode =
        e.args.length === 0 ||
        (e.args[0]?.kind === "Literal" &&
          e.args[0].literalKind === "bool" &&
          e.args[0].value === false);
      if (stringMode) {
        const t = ctx.effect.timeNow({
          format: "epoch_float",
          origin,
          provenance: [prov("php-ast", origin, "microtime()")],
        });
        return ctx.data.call({
          callee: "microtimeString",
          args: [t],
          type: T.string,
          origin,
        });
      }
      const a = e.args[0]!;
      if (a.kind === "Literal" && a.literalKind === "bool" && a.value === true) {
        return ctx.effect.timeNow({
          format: "epoch_float",
          origin,
          provenance: [prov("php-ast", origin, "microtime(true)")],
        });
      }
      return hole(ctx, "microtime:unsupported-args", e.pos, T.unknown);
    }
    case "uniqid_builtin": {
      const origin = loc(ctx, e.pos);
      const prefixArg = e.args[0];
      const prefix = prefixArg
        ? convertExpr(ctx, prefixArg, pathParams)
        : ctx.data.literal({ value: "", type: T.string, origin });
      const ms = ctx.effect.timeNow({
        format: "epoch_ms",
        origin,
        provenance: [prov("php-ast", origin, "uniqid")],
      });
      const hexMs = ctx.data.call({
        callee: "__dechex",
        args: [ms],
        type: T.string,
        origin,
      });
      let acc: NodeId = ctx.data.concat({ parts: [prefix, hexMs], origin });
      const entArg = e.args[1];
      let useEntropy = false;
      if (entArg === undefined) {
        useEntropy = false;
      } else if (entArg.kind === "Literal" && entArg.literalKind === "bool") {
        useEntropy = entArg.value === true;
      } else {
        return hole(ctx, "uniqid:dynamic-entropy", e.pos, T.string);
      }
      if (useEntropy) {
        const lo = ctx.data.literal({ value: 0, type: T.int, origin });
        const hi = ctx.data.literal({ value: 0xffffff, type: T.int, origin });
        const r = ctx.effect.random({
          min: lo,
          max: hi,
          origin,
          provenance: [prov("php-ast", origin, "uniqid:entropy")],
        });
        const hexR = ctx.data.call({
          callee: "__dechex",
          args: [r],
          type: T.string,
          origin,
        });
        acc = ctx.data.concat({ parts: [acc, hexR], origin });
      }
      return acc;
    }
    case "isset_builtin":
      return ctx.data.unaryOp({
        operator: "isset",
        operand: args[0] ?? hole(ctx, "isset: no argument", e.pos, T.bool),
        type: T.bool,
        origin: loc(ctx, e.pos),
      });
    case "empty_builtin":
      return ctx.data.unaryOp({
        operator: "empty",
        operand: args[0] ?? hole(ctx, "empty: no argument", e.pos, T.bool),
        type: T.bool,
        origin: loc(ctx, e.pos),
      });
    case "password_verify":
      return ctx.data.call({
        callee: "password_verify",
        args,
        type: T.bool,
        origin: loc(ctx, e.pos),
      });
    case "preg_match":
      return ctx.data.call({
        callee: "preg_match",
        args,
        type: T.bool,
        origin: loc(ctx, e.pos),
      });
    case "parse_url": {
      const urlExpr = args[0] ?? hole(ctx, "parse_url:no-url", e.pos, T.string);
      const compArg = e.args[1];
      if (compArg === undefined) {
        return ctx.data.call({
          callee: "parseUrlParts",
          args: [urlExpr],
          type: T.record({}),
          origin: loc(ctx, e.pos),
        });
      }
      let comp: number | undefined;
      if (compArg.kind === "Literal" && compArg.literalKind === "int" && typeof compArg.value === "number") {
        comp = compArg.value;
      } else if (compArg.kind === "ConstFetch") {
        const map: Record<string, number> = {
          PHP_URL_SCHEME: 0,
          PHP_URL_HOST: 1,
          PHP_URL_PORT: 2,
          PHP_URL_USER: 3,
          PHP_URL_PASS: 4,
          PHP_URL_PATH: 5,
          PHP_URL_QUERY: 6,
          PHP_URL_FRAGMENT: 7,
        };
        comp = map[compArg.name];
      }
      if (comp === undefined) {
        return hole(ctx, "parse_url:component", e.pos, T.nullable(T.string));
      }
      const compLit = ctx.data.literal({
        value: comp,
        type: T.int,
        origin: loc(ctx, e.pos),
      });
      return ctx.data.call({
        callee: "parseUrlComponent",
        args: [urlExpr, compLit],
        type: T.nullable(T.string),
        origin: loc(ctx, e.pos),
      });
    }
    case "header.location":
      return ctx.effect.redirect({
        location: args[0] ?? hole(ctx, "header: no location", e.pos, T.string),
        origin: loc(ctx, e.pos),
      });
    case "http.status":
      return ctx.effect.httpError({
        status:
          e.args[0]?.kind === "Literal" && typeof e.args[0].value === "number"
            ? e.args[0].value
            : 500,
        message: null,
        origin: loc(ctx, e.pos),
      });
    case "require_login":
    case "current_user":
    case "db":
    case "session_start":
    case "echo":
      return ctx.data.call({
        callee: lowering.kind,
        args,
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    case "session_php_config_noop":
      return ctx.data.call({
        callee: "session_start",
        args: [],
        type: T.void,
        origin: loc(ctx, e.pos),
      });
    case "exit":
    case "require":
      return hole(ctx, `call:${lowering.kind}`, e.pos, T.void);
  }
}

function convertStatements(
  ctx: Ctx,
  stmts: ReadonlyArray<PhpNode>,
  pathParams: RouteSpec["pathParams"],
): NodeId {
  const childIds: NodeId[] = [];
  for (const s of stmts) {
    const id = convertStatement(ctx, s, pathParams);
    if (id) childIds.push(id);
  }
  return ctx.data.block({
    statements: childIds,
    origin:
      stmts.length > 0
        ? loc(ctx, stmts[0]!.pos)
        : { kind: "synthetic", reason: "empty block" },
  });
}

function convertStatement(
  ctx: Ctx,
  s: PhpNode,
  pathParams: RouteSpec["pathParams"],
): NodeId | null {
  switch (s.kind) {
    case "Noop":
      return null;
    case "InlineHtml": {
      return ctx.effect.echo({
        value: ctx.data.literal({
          value: s.text,
          type: T.string,
          origin: loc(ctx, s.pos),
          provenance: [prov("php-ast", loc(ctx, s.pos), "inline html")],
        }),
        origin: loc(ctx, s.pos),
      });
    }
    case "Echo": {
      const ids = s.values.map((v) => convertExpr(ctx, v, pathParams));
      const concat =
        ids.length === 1 ? ids[0]! : ctx.data.concat({ parts: ids, origin: loc(ctx, s.pos) });
      return ctx.effect.echo({ value: concat, origin: loc(ctx, s.pos) });
    }
    case "Assign": {
      let rhs = convertExpr(ctx, s.value, pathParams);
      // Detect `$_SESSION['k'] = expr`
      if (
        s.target.kind === "ArrayAccess" &&
        s.target.target.kind === "Superglobal" &&
        s.target.target.name === "_SESSION" &&
        s.target.index.kind === "Literal" &&
        s.target.index.literalKind === "string"
      ) {
        return ctx.effect.sessionWrite({
          key: String(s.target.index.value),
          value: rhs,
          origin: loc(ctx, s.pos),
        });
      }
      // Compound assignment: lower `x += y` to `x = x + y` (and friends).
      if (
        s.operator !== "=" &&
        (s.operator === "+=" ||
          s.operator === "-=" ||
          s.operator === ".=" ||
          s.operator === "??=")
      ) {
        if (s.target.kind !== "Variable") {
          return hole(ctx, `assign:compound:${s.operator}:complex-target`, s.pos, T.void);
        }
        const lhs = convertExpr(ctx, s.target, pathParams);
        if (s.operator === "+=") {
          rhs = ctx.data.binOp({
            operator: "+",
            left: lhs,
            right: rhs,
            type: T.unknown,
            origin: loc(ctx, s.pos),
          });
        } else if (s.operator === "-=") {
          rhs = ctx.data.binOp({
            operator: "-",
            left: lhs,
            right: rhs,
            type: T.unknown,
            origin: loc(ctx, s.pos),
          });
        } else if (s.operator === ".=") {
          rhs = ctx.data.binOp({
            operator: ".",
            left: lhs,
            right: rhs,
            type: T.string,
            origin: loc(ctx, s.pos),
          });
        } else {
          rhs = ctx.data.binOp({
            operator: "??",
            left: lhs,
            right: rhs,
            type: T.unknown,
            origin: loc(ctx, s.pos),
          });
        }
      }
      // Everything else: wrap as a pseudo-assign call so the emitter can
      // recover a `let/const`. Variable name is attached to the target node.
      const targetName =
        s.target.kind === "Variable"
          ? s.target.name
          : s.target.kind === "ArrayAccess" && s.target.target.kind === "Variable"
            ? s.target.target.name
            : "<complex-target>";
      return ctx.data.call({
        callee: "__assign",
        args: [
          ctx.data.literal({
            value: targetName,
            type: T.string,
            origin: loc(ctx, s.pos),
          }),
          rhs,
        ],
        type: T.void,
        origin: loc(ctx, s.pos),
      });
    }
    case "ExpressionStatement": {
      return convertExpr(ctx, s.expr, pathParams);
    }
    case "If": {
      const cond = convertExpr(ctx, s.cond, pathParams);
      const then = convertStatements(ctx, s.then, pathParams);
      if (s.else !== null) {
        return ctx.data.ifElse({
          cond,
          then,
          else: convertStatements(ctx, s.else, pathParams),
          origin: loc(ctx, s.pos),
        });
      }
      return ctx.data.ifElse({ cond, then, origin: loc(ctx, s.pos) });
    }
    case "Foreach": {
      const base = {
        iterable: convertExpr(ctx, s.iterable, pathParams),
        valueName: s.valueName,
        body: convertStatements(ctx, s.body, pathParams),
        origin: loc(ctx, s.pos),
      };
      if (s.keyName) {
        return ctx.data.foreach({ ...base, keyName: s.keyName });
      }
      return ctx.data.foreach(base);
    }
    case "Return": {
      const val = s.value ? convertExpr(ctx, s.value, pathParams) : null;
      return ctx.data.call({
        callee: "__return",
        args: val ? [val] : [],
        type: T.void,
        origin: loc(ctx, s.pos),
      });
    }
    case "Exit": {
      return ctx.data.call({
        callee: "__exit",
        args: s.value ? [convertExpr(ctx, s.value, pathParams)] : [],
        type: T.void,
        origin: loc(ctx, s.pos),
      });
    }
    case "Require": {
      // Page-level `require` is a control-flow bridge in tiny-blog's dispatcher.
      // Ingest treats requires in handler bodies as no-ops (the module loader
      // has no modern equivalent); emit drops them.
      return null;
    }
    case "FunctionDecl":
      // Library functions inside a handler body are not yet hoisted; treat as
      // a hole with descriptive reason. Top-level library files are handled
      // separately by the library-ingest path.
      return hole(ctx, "nested function decl", s.pos, T.void);
    case "Unknown":
      return hole(ctx, s.detail, s.pos, T.void);
    default:
      return hole(ctx, `stmt:${(s as PhpNode).kind}`, (s as PhpNode).pos, T.void);
  }
}

export function ingestHandler(
  builder: ModuleBuilder,
  ast: PhpAst,
  route: RouteSpec,
  libCallEffects: ReadonlyMap<string, EffectSet> = new Map(),
): NodeId {
  const ctx = makeCtx(builder, ast.file);
  const body = convertStatements(ctx, stripTopLevelFunctionDecls(ast.statements), route.pathParams);

  const handlerName =
    route.file
      .replace(/^.*[\\/]/, "")
      .replace(/\.php$/i, "")
      .replace(/[^a-zA-Z0-9]/g, "_") || "handler";

  const handlerEffects = effectsReachableWithCallOverlay(
    (id) => ctx.m.get(id),
    body,
    libCallEffects,
  );
  const handlerNode = ctx.route.handler({
    attrs: {
      name: handlerName,
      input: T.record({}),
      output: T.named("Response"),
    },
    body,
    effects: handlerEffects,
    origin: phpLocator(ast.file, 1, 0),
  });
  const routeNode = ctx.route.route({
    attrs: {
      method: route.method,
      path: route.path,
      pathParams: route.pathParams.map((p) => ({
        name: p.name,
        type: p.type === "int" ? T.int : T.string,
      })),
    },
    handler: handlerNode,
    origin: phpLocator(ast.file, 1, 0),
  });
  return routeNode;
}
