/**
 * PHP-AST → WebIR conversion. The heart of the frontend.
 *
 * Scope: Milestone 1 tiny-blog surface. Unknown constructs become `data.hole`
 * nodes per DESIGN.md § 3 principle #2 ("Partial output beats no output").
 */

import type {
  PhpAst,
  PhpAttribute,
  PhpExpr,
  PhpNode,
  Pos as PhpPos,
} from "@chrysalis/parser-bridge";
import {
  ModuleBuilder,
  T,
  authTaggedHoleReason,
  dataDialect,
  effectDialect,
  effectsReachableWithCallOverlay,
  phpLocator,
  provenance as prov,
  webRequest,
  type EffectSet,
  type Locator,
  type NodeBase,
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

/**
 * Select the statements that form a route's handler body.
 *
 * Default: top-level executable statements (minus hoisted `function` decls).
 * Fallback for invokable controllers: when a route file has no executable
 * top-level statements but does declare an `__invoke` method (hoisted by the
 * parser bridge to a `Class::__invoke` `FunctionDecl`), lift that method body.
 * This keeps ingest generic — it keys off the PHP invokable convention, not any
 * framework — so Symfony/`__invoke` controllers lift bodies like plain-php pages.
 */
export function selectRouteHandlerStatements(stmts: readonly PhpNode[]): PhpNode[] {
  const topLevel = stripTopLevelFunctionDecls(stmts);
  const hasExecutable = topLevel.some((s) => s.kind !== "Noop");
  if (hasExecutable) return topLevel;

  const invoke = stmts.find(
    (s): s is Extract<PhpNode, { kind: "FunctionDecl" }> =>
      s.kind === "FunctionDecl" && (s.name === "__invoke" || s.name.endsWith("::__invoke")),
  );
  if (invoke) return [...invoke.body];

  return topLevel;
}

/** Bare function name or `Class::method` for static calls (parser `callee.kind === "expr"`). */
function tryCallCalleeLabel(e: Extract<PhpExpr, { kind: "Call" }>): string | undefined {
  if (e.callee.kind === "name") {
    return e.callee.name;
  }
  if (e.callee.kind === "expr" && e.callee.expr.kind === "StaticFetch") {
    return `${e.callee.expr.className}::${e.callee.expr.name}`;
  }
  return undefined;
}

function phpCallArgNames(
  e: Extract<PhpExpr, { kind: "Call" }>,
): { argNames?: ReadonlyArray<string | null> } {
  return e.argNames !== undefined ? { argNames: e.argNames } : {};
}

/** Serializable PHP 8 attribute metadata for WebIR `data.call` attrs. */
export type PhpAttributeMeta = {
  readonly name: string;
  readonly args: ReadonlyArray<string | number | boolean | null>;
};

/** Lib helper body root + formal parameter names for call-site inlining (G2294/G2298). */
export interface HelperBodyEntry {
  readonly bodyId: NodeId;
  readonly paramNames: readonly string[];
}

function serializePhpAttribute(a: PhpAttribute): PhpAttributeMeta {
  const args: (string | number | boolean | null)[] = [];
  for (const arg of a.args) {
    if (arg.kind === "Literal") {
      args.push(arg.value as string | number | boolean | null);
    } else {
      args.push(null);
    }
  }
  return { name: a.name, args };
}

/** Index top-level (and nested) `FunctionDecl` attributes by PHP name. */
export function collectFunctionAttributes(stmts: readonly PhpNode[]): Map<string, PhpAttributeMeta[]> {
  const out = new Map<string, PhpAttributeMeta[]>();
  const walk = (nodes: readonly PhpNode[]) => {
    for (const s of nodes) {
      if (s.kind !== "FunctionDecl") continue;
      if (s.attributes && s.attributes.length > 0) {
        out.set(s.name, s.attributes.map(serializePhpAttribute));
      }
      walk(s.body);
    }
  };
  walk(stmts);
  return out;
}

function resolveFunctionAttributes(
  map: ReadonlyMap<string, readonly PhpAttributeMeta[]>,
  callee: string,
): readonly PhpAttributeMeta[] | undefined {
  const direct = map.get(callee);
  if (direct !== undefined) return direct;
  if (callee.includes("::")) {
    for (const [key, attrs] of map) {
      if (key === callee || key.endsWith("\\" + callee)) {
        return attrs;
      }
    }
  }
  const tail = callee.includes("\\") ? callee.slice(callee.lastIndexOf("\\") + 1) : callee;
  return map.get(tail);
}

function phpCallAttributes(
  ctx: Ctx,
  callee: string,
): { phpAttributes?: ReadonlyArray<PhpAttributeMeta> } {
  const attrs = resolveFunctionAttributes(ctx.functionAttributes, callee);
  return attrs !== undefined && attrs.length > 0 ? { phpAttributes: attrs } : {};
}

/**
 * `db()` / `db_connect()->query("…")` on shared lib factory returns (PDO or mysqli in `lib/`), plus
 * **`DeclaredFactory::getConnection()->query`** when listed in **`chrysalis.routes.json`** **`dbFactoryReturnCallees`**,
 * plus **`$m->query`** when **`$m`** was assigned **`db()`**, **`new mysqli`**, **`new PDO`**, **`mysqli_connect(...)`**, a
 * manifest-declared factory call, or copied from a tracked variable (**`$b = $a`** when **`$a`** is already tracked)
 * (same conservative **`if` / `foreach`** alias merge as **`$db = db()`**). Other **`$x->query`**
 * stays a **`legacy:db-query-unknown-receiver`** hole so we do not guess SQL receivers.
 */
function calleeIsDeclaredDbFactoryReturn(ctx: Ctx, e: Extract<PhpExpr, { kind: "Call" }>): boolean {
  const lab = tryCallCalleeLabel(e);
  if (lab === undefined) return false;
  return ctx.dbFactoryReturnCallees.has(normalizeStaticCalleePath(lab));
}

function tryLowerDbFactoryQueryCall(
  ctx: Ctx,
  e: Extract<PhpExpr, { kind: "Call" }>,
  pathParams: RouteSpec["pathParams"],
): NodeId | undefined {
  if (e.callee.kind !== "expr") {
    return undefined;
  }
  const ex = e.callee.expr;
  if (ex.kind !== "PropertyFetch" || ex.name !== "query") {
    return undefined;
  }
  const factoryCalleeLabel =
    ex.target.kind === "Call" ? tryCallCalleeLabel(ex.target) : undefined;
  const receiverOk =
    ex.target.kind === "Call"
      ? factoryCalleeLabel === "db" ||
        factoryCalleeLabel === "db_connect" ||
        calleeIsDeclaredDbFactoryReturn(ctx, ex.target)
      : ex.target.kind === "Variable"
        ? ctx.dbFactoryAliases.has(ex.target.name)
        : false;
  if (!receiverOk) {
    return undefined;
  }
  const sqlArg = e.args[0];
  let sql: string;
  let sqlExpr: NodeId | undefined;
  const foldedSql = tryFoldPhpStaticStringConcat(sqlArg);
  if (sqlArg?.kind === "Literal" && sqlArg.literalKind === "string") {
    sql = String(sqlArg.value);
    sqlExpr = undefined;
  } else if (foldedSql !== undefined) {
    sql = foldedSql;
    sqlExpr = undefined;
  } else {
    sql = "<dynamic>";
    sqlExpr = sqlArg ? convertExpr(ctx, sqlArg, pathParams) : undefined;
  }
  const tables = guessTables(sql);
  const isRead = /^\s*select\b/i.test(sql);
  const mode = "rows" as const;
  const params = e.args.slice(1).map((a) => convertExpr(ctx, a, pathParams));
  const type = classifyDbReturn(mode);
  const dbQueryOpts: Parameters<typeof ctx.effect.dbQuery>[0] = {
    kind: isRead ? "read" : "write",
    sql,
    params,
    returns: mode,
    tables,
    type,
    origin: loc(ctx, e.pos),
  };
  if (sqlExpr !== undefined) {
    dbQueryOpts.sqlExpr = sqlExpr;
  }
  return ctx.effect.dbQuery(dbQueryOpts);
}

/** Match `Class::name` regardless of leading `\\` from PHP name resolution. */
function normalizeStaticCalleePath(name: string): string {
  return name.replace(/^\\+/, "");
}

/**
 * Fold PHP string concatenation (`"a" . "b"`) when every leaf is a string
 * literal. Used for SQL first arguments so `query_one("WITH …" . "SELECT …")`
 * stays a literal in WebIR instead of `<dynamic>`.
 */
function tryFoldPhpStaticStringConcat(e: PhpExpr | undefined): string | undefined {
  if (e == null) return undefined;
  if (e.kind === "Literal" && e.literalKind === "string") return String(e.value);
  if (e.kind === "BinOp" && e.operator === ".") {
    const a = tryFoldPhpStaticStringConcat(e.left);
    const b = tryFoldPhpStaticStringConcat(e.right);
    if (a !== undefined && b !== undefined) return a + b;
  }
  return undefined;
}

/** Unqualified or FQN **`mysqli`** for `new mysqli(...)` connection tracking. */
function isMysqliClassName(raw: string): boolean {
  const n = normalizeStaticCalleePath(raw);
  return n === "mysqli" || n.endsWith("\\mysqli");
}

/** Unqualified or FQN **`PDO`** for `new PDO(...)` connection tracking. */
function isPdoClassName(raw: string): boolean {
  const n = normalizeStaticCalleePath(raw);
  return n === "PDO" || n.endsWith("\\PDO");
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
  /**
   * Callee labels from **`chrysalis.routes.json`** **`dbFactoryReturnCallees`** (normalized). Declared
   * factory returns only — no body inference.
   */
  readonly dbFactoryReturnCallees: ReadonlySet<string>;
  /**
   * PHP variables whose **`->query`** calls may be lowered to **`effect.db.query`**: assigned
   * from **`db()`**, **`new mysqli`**, **`new PDO`**, **`mysqli_connect(...)`**, a **manifest-declared** factory
   * call, or copied from another tracked variable (**`$b = $a`**) (sequential + merged across `if`/`foreach`
   * branches for over-approximate widening).
   */
  dbFactoryAliases: Set<string>;
  /** PHP attributes on known callees (route-local + lib index). */
  readonly functionAttributes: ReadonlyMap<string, readonly PhpAttributeMeta[]>;
  /** Lowered lib/vendor helper bodies for zero-arg db.read inlining at call sites (G2294). */
  readonly helperBodies: ReadonlyMap<string, HelperBodyEntry>;
}

function resolveHelperBodyEntry(
  bodies: ReadonlyMap<string, HelperBodyEntry>,
  callee: string,
): HelperBodyEntry | undefined {
  const direct = bodies.get(callee);
  if (direct !== undefined) return direct;
  if (callee.includes("::")) {
    for (const [key, entry] of bodies) {
      if (key === callee || key.endsWith("\\" + callee)) return entry;
    }
  }
  const tail = callee.includes("\\") ? callee.slice(callee.lastIndexOf("\\") + 1) : callee;
  return bodies.get(tail);
}

function queryFromReturnStmt(ctx: Ctx, stmtId: NodeId): NodeId | undefined {
  const retStmt = ctx.m.get(stmtId);
  if (!retStmt || retStmt.op !== "call" || retStmt.attrs.callee !== "__return") return undefined;
  if (retStmt.operands.length !== 1) return undefined;
  const inner = ctx.m.get(retStmt.operands[0]!);
  if (!inner || inner.dialect !== "effect" || inner.op !== "db.query") return undefined;
  return retStmt.operands[0]!;
}

/** Normalize PHP variable names for helper-inline slot maps (`active` ≡ `$active`). */
function phpVarKey(name: string): string {
  return name.startsWith("$") ? name : `$${name}`;
}

function matchFormalParam(name: string, paramNames: readonly string[]): string | undefined {
  const key = phpVarKey(name);
  for (const p of paramNames) {
    if (phpVarKey(p) === key) return p;
  }
  return undefined;
}

function isSkippablePreludeExprStmt(ctx: Ctx, stmt: NodeBase): boolean {
  if (stmt.op !== "call") return false;
  const callee = String(stmt.attrs.callee);
  if (callee === "strlen" || callee === "intval" || callee === "trim" || callee === "empty" || callee === "isset") {
    return stmt.effects.length === 0;
  }
  return false;
}

function resolveInlineAssignRhs(
  ctx: Ctx,
  valueId: NodeId,
  paramNames: readonly string[],
  localToFormal: ReadonlyMap<string, string>,
): { kind: "formal"; formal: string } | { kind: "literal"; id: NodeId } | undefined {
  const valueNode = ctx.m.get(valueId);
  if (!valueNode) return undefined;
  if (valueNode.op === "literal") return { kind: "literal", id: valueId };
  if (valueNode.op === "param") {
    const srcName = String(valueNode.attrs.name ?? "");
    const formal =
      matchFormalParam(srcName, paramNames) ??
      localToFormal.get(phpVarKey(srcName)) ??
      localToFormal.get(srcName);
    if (formal === undefined) return undefined;
    return { kind: "formal", formal };
  }
  if (valueNode.op === "call") {
    const callee = String(valueNode.attrs.callee ?? "");
    if ((callee === "__cast_int" || callee === "intval") && valueNode.operands.length === 1) {
      return resolveInlineAssignRhs(ctx, valueNode.operands[0]!, paramNames, localToFormal);
    }
  }
  return undefined;
}

function tryExtractInlineQuery(
  ctx: Ctx,
  bodyId: NodeId,
  paramNames: readonly string[],
): {
  queryId: NodeId;
  localToArg: ReadonlyMap<string, string>;
  localToLiteral: ReadonlyMap<string, NodeId>;
} | undefined {
  const body = ctx.m.get(bodyId);
  if (!body || body.dialect !== "data" || body.op !== "block") return undefined;
  const stmts = body.operands;
  if (stmts.length === 0) return undefined;
  const queryId = queryFromReturnStmt(ctx, stmts[stmts.length - 1]!);
  if (queryId === undefined) return undefined;
  if (stmts.length === 1) {
    return { queryId, localToArg: new Map(), localToLiteral: new Map() };
  }
  const localToFormal = new Map<string, string>();
  const localToLiteral = new Map<string, NodeId>();
  for (let i = 0; i < stmts.length - 1; i++) {
    const stmtId = stmts[i]!;
    const stmt = ctx.m.get(stmtId);
    if (!stmt) return undefined;
    if (stmt.op === "call" && stmt.attrs.callee === "__assign") {
      const targetLit = ctx.m.get(stmt.operands[0]!);
      const valueId = stmt.operands[1]!;
      if (!targetLit || targetLit.op !== "literal") return undefined;
      const localName = phpVarKey(String(targetLit.attrs.value ?? ""));
      const resolved = resolveInlineAssignRhs(ctx, valueId, paramNames, localToFormal);
      if (resolved === undefined) return undefined;
      if (resolved.kind === "literal") {
        localToLiteral.set(localName, resolved.id);
        continue;
      }
      localToFormal.set(localName, resolved.formal);
      continue;
    }
    if (stmt.op === "hole") return undefined;
    if (stmt.effects.length > 0) return undefined;
    if (isSkippablePreludeExprStmt(ctx, stmt)) continue;
    return undefined;
  }
  return { queryId, localToArg: localToFormal, localToLiteral };
}

function walkSubgraphNodeIds(ctx: Ctx, rootId: NodeId, visit: (id: NodeId) => void, seen = new Set<NodeId>()): void {
  if (seen.has(rootId)) return;
  seen.add(rootId);
  visit(rootId);
  const n = ctx.m.get(rootId);
  if (!n) return;
  for (const op of n.operands) {
    walkSubgraphNodeIds(ctx, op, visit, seen);
  }
}

function cloneSubgraphWithReplacements(
  ctx: Ctx,
  rootId: NodeId,
  replacements: ReadonlyMap<NodeId, NodeId>,
  memo = new Map<NodeId, NodeId>(),
): NodeId {
  const replaced = replacements.get(rootId);
  if (replaced !== undefined) return replaced;
  if (memo.has(rootId)) return memo.get(rootId)!;
  const n = ctx.m.get(rootId);
  if (!n) return rootId;
  const clonedOperands = n.operands.map((op) => cloneSubgraphWithReplacements(ctx, op, replacements, memo));
  const newId = ctx.m.node({
    dialect: n.dialect,
    op: n.op,
    type: n.type,
    effects: n.effects,
    operands: clonedOperands,
    attrs: n.attrs,
    origin: n.origin,
    provenance: n.provenance,
  });
  memo.set(rootId, newId);
  return newId;
}

function buildQueryParamReplacements(
  ctx: Ctx,
  queryId: NodeId,
  paramNames: readonly string[],
  argNodeIds: readonly NodeId[],
  localToFormal: ReadonlyMap<string, string>,
  localToLiteral: ReadonlyMap<string, NodeId>,
): ReadonlyMap<NodeId, NodeId> | undefined {
  const formalToArg = new Map<string, NodeId>();
  for (let i = 0; i < paramNames.length; i++) {
    formalToArg.set(paramNames[i]!, argNodeIds[i]!);
    formalToArg.set(phpVarKey(paramNames[i]!), argNodeIds[i]!);
  }
  const nameToArg = new Map<string, NodeId>();
  for (const [formal, argId] of formalToArg) {
    nameToArg.set(formal, argId);
  }
  for (const [local, formal] of localToFormal) {
    const argId = formalToArg.get(formal) ?? formalToArg.get(phpVarKey(formal));
    if (argId === undefined) return undefined;
    nameToArg.set(local, argId);
    nameToArg.set(phpVarKey(local), argId);
  }
  for (const [local, literalId] of localToLiteral) {
    nameToArg.set(local, literalId);
    nameToArg.set(phpVarKey(local), literalId);
  }
  const replacements = new Map<NodeId, NodeId>();
  walkSubgraphNodeIds(ctx, queryId, (id) => {
    const n = ctx.m.get(id);
    if (n?.op !== "param" || typeof n.attrs.name !== "string") return;
    const rep =
      nameToArg.get(n.attrs.name) ??
      nameToArg.get(phpVarKey(n.attrs.name));
    if (rep !== undefined) replacements.set(id, rep);
  });
  return replacements;
}

/** Inline lib helpers whose body is `return <effect.db.query>` (G2294/G2298). */
function tryInlineLibHelperCall(
  ctx: Ctx,
  callee: string,
  argNodeIds: readonly NodeId[],
): NodeId | undefined {
  if (ctx.helperBodies.size === 0) return undefined;
  const entry = resolveHelperBodyEntry(ctx.helperBodies, callee);
  if (entry === undefined) return undefined;
  if (argNodeIds.length !== entry.paramNames.length) return undefined;
  const extracted = tryExtractInlineQuery(ctx, entry.bodyId, entry.paramNames);
  if (extracted === undefined) return undefined;
  if (entry.paramNames.length === 0) {
    return extracted.queryId;
  }
  const replacements = buildQueryParamReplacements(
    ctx,
    extracted.queryId,
    entry.paramNames,
    argNodeIds,
    extracted.localToArg,
    extracted.localToLiteral,
  );
  if (replacements === undefined) return undefined;
  return cloneSubgraphWithReplacements(ctx, extracted.queryId, replacements);
}

function makeCtx(
  builder: ModuleBuilder,
  file: string,
  dbFactoryReturnCallees: ReadonlySet<string> = new Set(),
  functionAttributes: ReadonlyMap<string, readonly PhpAttributeMeta[]> = new Map(),
  helperBodies: ReadonlyMap<string, HelperBodyEntry> = new Map(),
): Ctx {
  return {
    m: builder,
    data: dataDialect.builders(builder),
    effect: effectDialect.builders(builder),
    route: webRequest.builders(builder),
    file,
    effects: new Set(),
    effectObjs: [],
    dbFactoryReturnCallees,
    dbFactoryAliases: new Set(),
    functionAttributes,
    helperBodies,
  };
}

function forkDbAliasScope(ctx: Ctx): Ctx {
  return { ...ctx, dbFactoryAliases: new Set(ctx.dbFactoryAliases) };
}

function mergeDbAliasesUnion(ctx: Ctx, pre: ReadonlySet<string>, ...branchEnds: ReadonlyArray<ReadonlySet<string>>): void {
  ctx.dbFactoryAliases.clear();
  for (const v of pre) {
    ctx.dbFactoryAliases.add(v);
  }
  for (const b of branchEnds) {
    for (const v of b) {
      ctx.dbFactoryAliases.add(v);
    }
  }
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
  dbFactoryReturnCallees: ReadonlySet<string> = new Set(),
): NodeId {
  const ctx = makeCtx(builder, file, dbFactoryReturnCallees);
  return convertStatements(ctx, stmts, pathParams);
}

function hole(ctx: Ctx, reason: string, p: PhpPos, output: WebIRType = T.unknown): NodeId {
  return ctx.data.hole({
    reason: authTaggedHoleReason(reason),
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
  /** `session_status()` before `session_start` — cold handler entry matches `PHP_SESSION_NONE`. */
  | { kind: "session_status_int" }
  /** `session_write_close()` — middleware owns the session store; no-op at emit time. */
  | { kind: "session_write_close_noop" }
  | { kind: "isset_builtin" }
  | { kind: "empty_builtin" }
  | { kind: "time_builtin" }
  | { kind: "php_rand" }
  | { kind: "getrandmax_builtin" }
  | { kind: "microtime_builtin" }
  | { kind: "uniqid_builtin" }
  | { kind: "json_encode" };

const KNOWN_CALLS: Record<string, CallLowering> = {
  query_all: { kind: "dbQuery", mode: "rows", tableFrom: "firstArg" },
  query_one: { kind: "dbQuery", mode: "row-or-null", tableFrom: "firstArg" },
  exec_sql: { kind: "dbQuery", mode: "insert-id", tableFrom: "firstArg" },
  htmlspecialchars: { kind: "htmlspecialchars" },
  nl2br: { kind: "nl2br" },
  trim: { kind: "trim" },
  intval: { kind: "intval" },
  strlen: { kind: "strlen" },
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
  session_status: { kind: "session_status_int" },
  session_write_close: { kind: "session_write_close_noop" },
  time: { kind: "time_builtin" },
  rand: { kind: "php_rand" },
  mt_rand: { kind: "php_rand" },
  random_int: { kind: "php_rand" },
  getrandmax: { kind: "getrandmax_builtin" },
  mt_getrandmax: { kind: "getrandmax_builtin" },
  microtime: { kind: "microtime_builtin" },
  uniqid: { kind: "uniqid_builtin" },
  json_encode: { kind: "json_encode" },
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
      if (e.items.length === 0) {
        return ctx.data.call({
          callee: "__array_literal",
          args: [],
          type: T.array(T.unknown),
          origin: loc(ctx, e.pos),
        });
      }
      const allStringLiteralKeys = e.items.every(
        (it) => it.key !== null && it.key.kind === "Literal" && it.key.literalKind === "string",
      );
      const allUnkeyed = e.items.every((it) => it.key === null);
      if (allStringLiteralKeys) {
        const flat: NodeId[] = [];
        for (const it of e.items) {
          flat.push(convertExpr(ctx, it.key!, pathParams));
          flat.push(convertExpr(ctx, it.value, pathParams));
        }
        return ctx.data.call({
          callee: "__object_literal",
          args: flat,
          type: T.unknown,
          origin: loc(ctx, e.pos),
        });
      }
      if (allUnkeyed) {
        return ctx.data.call({
          callee: "__array_literal",
          args: e.items.map((it) => convertExpr(ctx, it.value, pathParams)),
          type: T.array(T.unknown),
          origin: loc(ctx, e.pos),
        });
      }
      return hole(ctx, "array: mixed or non-string-literal keys", e.pos);
    }
    case "Call": {
      return convertCall(ctx, e, pathParams);
    }
    case "ConstFetch": {
      const phpSessionConst: Record<string, number> = {
        PHP_SESSION_DISABLED: 0,
        PHP_SESSION_NONE: 1,
        PHP_SESSION_ACTIVE: 2,
      };
      const constName = e.name.replace(/^\\+/, "");
      const sv = phpSessionConst[constName];
      if (sv !== undefined) {
        return ctx.data.literal({
          value: sv,
          type: T.int,
          origin: loc(ctx, e.pos),
        });
      }
      return ctx.data.call({
        callee: e.name,
        args: [],
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
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
    case "New": {
      const segs = e.className.replace(/^\\+/, "").split("\\").filter((s) => s.length > 0);
      if (segs.length === 0) {
        return hole(ctx, "new: empty class name", e.pos);
      }
      for (const seg of segs) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(seg)) {
          return hole(ctx, "new: invalid class name segment", e.pos);
        }
      }
      const fqn = segs.join("\\");
      const ctorArgs = e.args.map((a) => convertExpr(ctx, a, pathParams));
      const nameLit = ctx.data.literal({
        value: fqn,
        type: T.string,
        origin: loc(ctx, e.pos),
      });
      return ctx.data.call({
        callee: "__new",
        args: [nameLit, ...ctorArgs],
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
    case "NewDynamic": {
      const ctorArgs = e.args.map((a) => convertExpr(ctx, a, pathParams));
      return ctx.data.call({
        callee: "__new_dynamic",
        args: [convertExpr(ctx, e.classExpr, pathParams), ...ctorArgs],
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
    case "ArrowFunction": {
      const fnArgs: NodeId[] = [];
      for (const p of e.params) {
        fnArgs.push(
          ctx.data.literal({
            value: p.name,
            type: T.string,
            origin: loc(ctx, e.pos),
          }),
        );
        fnArgs.push(
          p.default
            ? convertExpr(ctx, p.default, pathParams)
            : ctx.data.literal({ value: null, type: T.null, origin: loc(ctx, e.pos) }),
        );
      }
      fnArgs.push(convertExpr(ctx, e.body, pathParams));
      return ctx.data.call({
        callee: "__arrow_fn",
        args: fnArgs,
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
    case "Match": {
      const matchArgs: NodeId[] = [convertExpr(ctx, e.subject, pathParams)];
      matchArgs.push(
        ctx.data.literal({
          value: e.arms.length,
          type: T.int,
          origin: loc(ctx, e.pos),
        }),
      );
      for (const arm of e.arms) {
        matchArgs.push(
          ctx.data.literal({
            value: arm.isDefault ? 1 : 0,
            type: T.int,
            origin: loc(ctx, e.pos),
          }),
        );
        matchArgs.push(
          ctx.data.literal({
            value: arm.conditions.length,
            type: T.int,
            origin: loc(ctx, e.pos),
          }),
        );
        for (const cond of arm.conditions) {
          matchArgs.push(convertExpr(ctx, cond, pathParams));
        }
        matchArgs.push(convertExpr(ctx, arm.body, pathParams));
      }
      return ctx.data.call({
        callee: "__match",
        args: matchArgs,
        type: T.unknown,
        origin: loc(ctx, e.pos),
      });
    }
    default:
      return hole(ctx, `expr:${(e as PhpExpr).kind}`, (e as PhpExpr).pos);
  }
}

function convertCall(
  ctx: Ctx,
  e: Extract<PhpExpr, { kind: "Call" }>,
  pathParams: RouteSpec["pathParams"],
): NodeId {
  const factoryQuery = tryLowerDbFactoryQueryCall(ctx, e, pathParams);
  if (factoryQuery !== undefined) {
    return factoryQuery;
  }
  const callOrigin = loc(ctx, e.pos);
  const name = tryCallCalleeLabel(e);
  if (
    name !== undefined &&
    e.args.length === 1 &&
    e.args[0]?.kind === "VariadicPlaceholder"
  ) {
    return ctx.data.call({
      callee: "__first_class_callable",
      args: [
        ctx.data.literal({ value: name, type: T.string, origin: callOrigin }),
      ],
      type: T.unknown,
      origin: callOrigin,
    });
  }
  if (name === "pdo_item_count_row" && e.args.length === 0) {
    const sql = "SELECT COUNT(*) AS c FROM items";
    const tables = guessTables(sql);
    return ctx.effect.dbQuery({
      kind: "read",
      sql,
      params: [],
      returns: "row-or-null",
      tables,
      type: classifyDbReturn("row-or-null"),
      origin: loc(ctx, e.pos),
    });
  }
  if (name === undefined) {
    if (e.callee.kind === "variable") {
      const args = e.args.map((a) => convertExpr(ctx, a, pathParams));
      return ctx.data.call({
        callee: e.callee.name,
        args,
        type: T.unknown,
        origin: callOrigin,
        ...phpCallArgNames(e),
        ...phpCallAttributes(ctx, e.callee.name),
      });
    }
    if (
      e.callee.kind === "expr" &&
      e.callee.expr.kind === "PropertyFetch" &&
      e.callee.expr.name === "query"
    ) {
      return hole(ctx, "legacy:db-query-unknown-receiver", e.pos);
    }
    return hole(ctx, `call:${e.callee.kind}`, e.pos);
  }
  const calleePath = normalizeStaticCalleePath(name);
  // Flagship `laravel-min` / `laravel-full` probe stubs (D190): deterministic
  // lowering so emit does not treat these as unresolved auth-boundary calls.
  if (calleePath === "Illuminate\\Support\\Facades\\Gate::allows" && e.args.length >= 1) {
    const ability = convertExpr(ctx, e.args[0]!, pathParams);
    const mark = ctx.data.literal({
      value: "chrysalis-probe-yes",
      type: T.string,
      origin: callOrigin,
    });
    return ctx.data.binOp({
      operator: "===",
      left: ability,
      right: mark,
      type: T.bool,
      origin: callOrigin,
    });
  }
  if (calleePath === "Illuminate\\Support\\Facades\\Gate::denies" && e.args.length >= 1) {
    const ability = convertExpr(ctx, e.args[0]!, pathParams);
    const mark = ctx.data.literal({
      value: "chrysalis-probe-deny",
      type: T.string,
      origin: callOrigin,
    });
    return ctx.data.binOp({
      operator: "===",
      left: ability,
      right: mark,
      type: T.bool,
      origin: callOrigin,
    });
  }
  if (calleePath === "Laravel\\Sanctum\\NewAccessToken::probe" && e.args.length === 0) {
    return ctx.data.literal({ value: true, type: T.bool, origin: callOrigin });
  }
  if (calleePath === "League\\OAuth2\\Client\\GenericProvider::probe" && e.args.length === 0) {
    return ctx.data.literal({ value: "oauth-probe-ok", type: T.string, origin: callOrigin });
  }
  if (calleePath === "Laravel\\Socialite\\Facades\\Socialite::probe" && e.args.length === 0) {
    return ctx.data.literal({ value: "socialite-probe-ok", type: T.string, origin: callOrigin });
  }
  if (calleePath === "Laravel\\Fortify\\Fortify::probe" && e.args.length === 0) {
    return ctx.data.literal({ value: "fortify-probe-ok", type: T.string, origin: callOrigin });
  }
  if (name === "header") {
    const h0 = e.args[0];
    if (h0?.kind === "Literal" && h0.literalKind === "string") {
      const raw = String(h0.value);
      if (/^\s*Content-Type:/i.test(raw)) {
        return ctx.data.block({
          statements: [],
          type: { kind: "void" },
          origin: loc(ctx, e.pos),
          provenance: [prov("php-ast", loc(ctx, e.pos), "header(Content-Type): lowered to no-op; emit sets body MIME")],
        });
      }
    }
    const args = e.args.map((a) => convertExpr(ctx, a, pathParams));
    return ctx.effect.redirect({
      location: args[0] ?? hole(ctx, "header: no value", e.pos, T.string),
      origin: loc(ctx, e.pos),
    });
  }
  const lowering = KNOWN_CALLS[name];
  const args = e.args.map((a) => convertExpr(ctx, a, pathParams));

  if (!lowering) {
    const inlined = tryInlineLibHelperCall(ctx, name, args);
    if (inlined !== undefined) {
      return inlined;
    }
    return ctx.data.call({
      callee: name,
      args,
      type: T.unknown,
      origin: loc(ctx, e.pos),
      ...phpCallArgNames(e),
      ...phpCallAttributes(ctx, name),
    });
  }

  switch (lowering.kind) {
    case "dbQuery": {
      const sqlArg = e.args[0];
      let sql: string;
      let sqlExpr: NodeId | undefined;
      const foldedSql = tryFoldPhpStaticStringConcat(sqlArg);
      if (sqlArg?.kind === "Literal" && sqlArg.literalKind === "string") {
        sql = String(sqlArg.value);
        sqlExpr = undefined;
      } else if (foldedSql !== undefined) {
        sql = foldedSql;
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
        ...phpCallArgNames(e),
        ...phpCallAttributes(ctx, "strlen"),
      });
    case "json_encode": {
      if (e.args.length !== 1) {
        return hole(ctx, "json_encode:arg count", e.pos, T.string);
      }
      return ctx.data.call({
        callee: "json_encode",
        args: [args[0]!],
        type: T.string,
        origin: loc(ctx, e.pos),
      });
    }
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
    case "session_status_int":
      return ctx.data.literal({
        value: 1,
        type: T.int,
        origin: loc(ctx, e.pos),
      });
    case "session_write_close_noop":
      return ctx.data.call({
        callee: "session_write_close",
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
      if (s.target.kind === "Variable") {
        if (s.operator === "=") {
          if (
            (s.value.kind === "Call" && tryCallCalleeLabel(s.value) === "db") ||
            (s.value.kind === "Call" && tryCallCalleeLabel(s.value) === "db_connect") ||
            (s.value.kind === "New" && isMysqliClassName(s.value.className)) ||
            (s.value.kind === "New" && isPdoClassName(s.value.className)) ||
            (s.value.kind === "Call" && tryCallCalleeLabel(s.value) === "mysqli_connect") ||
            (s.value.kind === "Call" && calleeIsDeclaredDbFactoryReturn(ctx, s.value))
          ) {
            ctx.dbFactoryAliases.add(s.target.name);
          } else if (s.value.kind === "Variable" && ctx.dbFactoryAliases.has(s.value.name)) {
            ctx.dbFactoryAliases.add(s.target.name);
          } else {
            ctx.dbFactoryAliases.delete(s.target.name);
          }
        } else {
          ctx.dbFactoryAliases.delete(s.target.name);
        }
      }
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
      const pre = new Set(ctx.dbFactoryAliases);
      const cond = convertExpr(ctx, s.cond, pathParams);
      const ctxThen = forkDbAliasScope(ctx);
      const then = convertStatements(ctxThen, s.then, pathParams);
      if (s.else !== null) {
        const ctxElse = forkDbAliasScope(ctx);
        const elseBlock = convertStatements(ctxElse, s.else, pathParams);
        mergeDbAliasesUnion(ctx, pre, ctxThen.dbFactoryAliases, ctxElse.dbFactoryAliases);
        return ctx.data.ifElse({
          cond,
          then,
          else: elseBlock,
          origin: loc(ctx, s.pos),
        });
      }
      mergeDbAliasesUnion(ctx, pre, ctxThen.dbFactoryAliases);
      return ctx.data.ifElse({ cond, then, origin: loc(ctx, s.pos) });
    }
    case "Foreach": {
      const pre = new Set(ctx.dbFactoryAliases);
      const iterable = convertExpr(ctx, s.iterable, pathParams);
      const ctxBody = forkDbAliasScope(ctx);
      const body = convertStatements(ctxBody, s.body, pathParams);
      mergeDbAliasesUnion(ctx, pre, ctxBody.dbFactoryAliases);
      const base = {
        iterable,
        valueName: s.valueName,
        body,
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
    case "Throw": {
      return ctx.data.call({
        callee: "__throw",
        args: [convertExpr(ctx, s.expr, pathParams)],
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
    case "EnumDecl":
      // Enum declarations are type-level; runtime lowering deferred.
      return null;
    case "ClassDecl":
      // Class metadata is type-level; methods hoist separately.
      return null;
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
  dbFactoryReturnCallees: ReadonlySet<string> = new Set(),
  libFunctionAttributes: ReadonlyMap<string, readonly PhpAttributeMeta[]> = new Map(),
  helperBodies: ReadonlyMap<string, HelperBodyEntry> = new Map(),
): NodeId {
  const routeAttrs = collectFunctionAttributes(ast.statements);
  const mergedAttrs = new Map(libFunctionAttributes);
  for (const [name, attrs] of routeAttrs) {
    mergedAttrs.set(name, attrs);
  }
  const ctx = makeCtx(builder, ast.file, dbFactoryReturnCallees, mergedAttrs, helperBodies);
  const body = convertStatements(ctx, selectRouteHandlerStatements(ast.statements), route.pathParams);

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
