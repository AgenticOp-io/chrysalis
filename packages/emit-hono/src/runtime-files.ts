/**
 * Static files written into the generated project: runtime helpers, session
 * adapter, db adapter, and project scaffolding. These are templates, not
 * generated from WebIR.
 */

export const PACKAGE_JSON = (
  appName: string,
  opts: { readonly drizzle: boolean } = { drizzle: false },
): string =>
  JSON.stringify(
    {
      name: appName,
      version: "0.0.0",
      private: true,
      type: "module",
      engines: { node: ">=22.5.0" },
      scripts: {
        dev: "tsx src/index.ts",
        build: "tsc --noEmit",
        start: "node --experimental-strip-types src/index.ts",
      },
      dependencies: {
        hono: "^4.6.0",
        "@hono/node-server": "^1.13.0",
        bcryptjs: "^3.0.2",
        redis: "^5.8.2",
        ...(opts.drizzle ? { "drizzle-orm": "^0.45.2" } : {}),
      },
      devDependencies: {
        "@types/node": "^22.10.0",
        tsx: "^4.7.0",
        typescript: "^5.6.0",
      },
    },
    null,
    2,
  );

export const TSCONFIG_JSON = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noUncheckedIndexedAccess: false,
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ["src/**/*"],
  },
  null,
  2,
);

export const DB_TS = `import { AsyncLocalStorage } from "node:async_hooks";
import type { MiddlewareHandler } from "hono";
import { DatabaseSync } from "node:sqlite";

/**
 * Recorded SELECT results from the Oracle (verify / Milestone 2). When the
 * \`x-chrysalis-sql-tape\` header is present, \`queryOne\` / \`queryAll\` serve
 * from the tape in order instead of SQLite.
 */
export interface SqlReplayTape {
  readonly queries: ReadonlyArray<{
    readonly sql: string;
    readonly params: ReadonlyArray<unknown>;
    readonly rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  }>;
}

interface SqlReplaySlot {
  tape: SqlReplayTape;
  index: number;
}

const sqlReplayAls = new AsyncLocalStorage<SqlReplaySlot | undefined>();

function normalizeSql(sql: string): string {
  return sql.replace(/\\s+/g, " ").trim().toLowerCase();
}

/** Oracle tapes follow PHP binds (e.g. int); emitted handlers often use string path params. */
function sqlBindParamEqual(x: unknown, y: unknown): boolean {
  if (Object.is(x, y)) return true;
  if (typeof x === "number" && typeof y === "string") {
    return y.trim() !== "" && !Number.isNaN(Number(y)) && x === Number(y);
  }
  if (typeof y === "number" && typeof x === "string") {
    return x.trim() !== "" && !Number.isNaN(Number(x)) && y === Number(x);
  }
  return JSON.stringify(x) === JSON.stringify(y);
}

function paramsMatch(a: ReadonlyArray<unknown>, b: ReadonlyArray<unknown>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!sqlBindParamEqual(a[i], b[i])) return false;
  }
  return true;
}

/** Lowered from Express \`express.urlencoded()\` (hub ingest). */
export const chrysalisUrlencodedBodyMiddleware: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    await next();
    return;
  }
  const ct = c.req.header("content-type") ?? "";
  if (!ct.includes("application/x-www-form-urlencoded")) {
    await next();
    return;
  }
  try {
    const raw = await c.req.text();
    if (raw) {
      new URLSearchParams(raw);
    }
  } catch {
    // permissive empty body
  }
  await next();
};

/** Lowered from Express \`express.json()\` (hub ingest). */
export const chrysalisJsonBodyMiddleware: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    await next();
    return;
  }
  const ct = c.req.header("content-type") ?? "";
  if (!ct.includes("application/json")) {
    await next();
    return;
  }
  try {
    await c.req.json();
  } catch {
    // permissive empty body (Express json default)
  }
  await next();
};

/** Per-request middleware: decode tape from \`x-chrysalis-sql-tape\` (base64url). */
export const sqlTapeMiddleware: MiddlewareHandler = async (c, next) => {
  const raw = c.req.header("x-chrysalis-sql-tape");
  if (!raw) {
    return sqlReplayAls.run(undefined, () => next());
  }
  let tape: SqlReplayTape;
  try {
    tape = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SqlReplayTape;
  } catch {
    return sqlReplayAls.run(undefined, () => next());
  }
  return sqlReplayAls.run({ tape, index: 0 }, () => next());
};

function tryReplaySelect(
  sql: string,
  params: ReadonlyArray<unknown>,
): ReadonlyArray<Readonly<Record<string, unknown>>> | null {
  const slot = sqlReplayAls.getStore();
  if (!slot) return null;
  const q = slot.tape.queries[slot.index];
  if (!q) {
    throw new Error(
      \`chrysalis sql replay: exhausted tape at index \${slot.index} (sql=\${sql.slice(0, 80)})\`,
    );
  }
  if (normalizeSql(q.sql) !== normalizeSql(sql)) {
    throw new Error(
      \`chrysalis sql replay: SQL mismatch at tape \${slot.index}: expected \${q.sql.slice(0, 120)}, got \${sql.slice(0, 120)}\`,
    );
  }
  if (!paramsMatch(q.params, params)) {
    throw new Error(\`chrysalis sql replay: param mismatch at tape \${slot.index}\`);
  }
  slot.index += 1;
  return q.rows;
}

let _db: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (_db === null) {
    const path = process.env.CHRYSALIS_DB_PATH ?? "blog.sqlite";
    _db = new DatabaseSync(path);
  }
  return _db;
}

export function queryAll<T = Record<string, unknown>>(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): T[] {
  const replayed = tryReplaySelect(sql, params);
  if (replayed != null) {
    return [...replayed] as T[];
  }
  return db().prepare(sql).all(...(params as never[])) as T[];
}

/**
 * Batch read: SELECT cols FROM table WHERE idColumn IN (?,?,...).
 * Identifiers must be static literals from codegen; only ids are dynamic data.
 */
export function queryAllWhereIn<T = Record<string, unknown>>(
  selectList: string,
  table: string,
  idColumn: string,
  ids: ReadonlyArray<unknown>,
): T[] {
  if (ids.length === 0) return [];
  const ph = ids.map(() => "?").join(", ");
  const sql = \`SELECT \${selectList} FROM \${table} WHERE \${idColumn} IN (\${ph})\`;
  return queryAll<T>(sql, ids);
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): T | null {
  const replayed = tryReplaySelect(sql, params);
  if (replayed != null) {
    const row = replayed[0];
    return (row as T | undefined) ?? null;
  }
  const row = db().prepare(sql).get(...(params as never[]));
  return (row as T | undefined) ?? null;
}

export function execSql(sql: string, params: ReadonlyArray<unknown> = []): number {
  const info = db().prepare(sql).run(...(params as never[]));
  return Number(info.lastInsertRowid);
}
`;

/**
 * Per-request clock + PRNG (DESIGN: handlers do not call Date.now / Math.random).
 * Optional verify headers: `x-chrysalis-now-iso`, `x-chrysalis-random-seed` (uint32).
 */
export const CTX_TS = `import { AsyncLocalStorage } from "node:async_hooks";
import type { MiddlewareHandler } from "hono";

export interface ChrysalisHandlerContext {
  readonly nowIso: string;
  nextRandom: () => number;
}

const handlerCtxAls = new AsyncLocalStorage<ChrysalisHandlerContext>();

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wall clock for \`effect.time.now\` lowering; falls back to system time outside ALS. */
export function chrysalisNow(): string {
  return handlerCtxAls.getStore()?.nowIso ?? new Date().toISOString();
}

/** Unit interval PRNG for \`effect.random\` lowering; falls back to Math.random outside ALS. */
export function chrysalisRandom(): number {
  const s = handlerCtxAls.getStore();
  if (s) return s.nextRandom();
  return Math.random();
}

export const chrysalisDeterminismMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const hdrNow = c.req.header("x-chrysalis-now-iso");
    const hdrSeed = c.req.header("x-chrysalis-random-seed");
    const nowIso = hdrNow && hdrNow.length > 0 ? hdrNow : new Date().toISOString();
    let seed = (Math.random() * 0xffffffff) >>> 0;
    if (hdrSeed != null && hdrSeed.length > 0) {
      const n = Number.parseInt(hdrSeed, 10);
      if (Number.isFinite(n)) seed = n >>> 0;
    }
    const ctx: ChrysalisHandlerContext = { nowIso, nextRandom: mulberry32(seed) };
    return handlerCtxAls.run(ctx, () => next());
  };
};
`;

export const SESSION_TS = `import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { chrysalisRandom } from "./ctx.js";

const sessions = new Map<string, Record<string, unknown>>();
const sessionDir = process.env.CHRYSALIS_SESSION_DIR;
const sessionSqlitePath = process.env.CHRYSALIS_SESSION_SQLITE_PATH;
const sessionRedisUrl = process.env.CHRYSALIS_SESSION_REDIS_URL;
const sessionCookieName = process.env.CHRYSALIS_SESSION_COOKIE ?? "chrysalis_sid";

function newSid(): string {
  const a = Math.floor(chrysalisRandom() * 1e12).toString(36);
  const b = Math.floor(chrysalisRandom() * 1e12).toString(36);
  return a + b;
}

function diskPath(sid: string): string {
  return join(sessionDir!, \`\${sid}.json\`);
}

function readDisk(sid: string): Record<string, unknown> {
  try {
    if (!existsSync(diskPath(sid))) return {};
    return JSON.parse(readFileSync(diskPath(sid), "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeDisk(sid: string, store: Record<string, unknown>): void {
  mkdirSync(sessionDir!, { recursive: true });
  writeFileSync(diskPath(sid), JSON.stringify(store), "utf8");
}

let _sessionDb: DatabaseSync | null = null;
function sessionDb(): DatabaseSync {
  if (_sessionDb === null) {
    _sessionDb = new DatabaseSync(sessionSqlitePath!);
    _sessionDb.exec(
      "CREATE TABLE IF NOT EXISTS chrysalis_sessions (" +
        "sid TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL)",
    );
  }
  return _sessionDb;
}

function readSqlite(sid: string): Record<string, unknown> {
  try {
    const row = sessionDb()
      .prepare("SELECT payload FROM chrysalis_sessions WHERE sid = ?")
      .get(sid) as { payload?: string } | undefined;
    if (!row || typeof row.payload !== "string") return {};
    return JSON.parse(row.payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeSqlite(sid: string, store: Record<string, unknown>): void {
  const payload = JSON.stringify(store);
  const nowIso = new Date().toISOString();
  sessionDb()
    .prepare(
      "INSERT INTO chrysalis_sessions(sid,payload,updated_at) VALUES(?,?,?) " +
        "ON CONFLICT(sid) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
    )
    .run(sid, payload, nowIso);
}

function deleteSqlite(sid: string): void {
  try {
    sessionDb().prepare("DELETE FROM chrysalis_sessions WHERE sid = ?").run(sid);
  } catch {
    /* noop */
  }
}

function createRedisClientPromise() {
  return (async () => {
    const { createClient } = await import("redis");
    const c = createClient({ url: sessionRedisUrl! });
    await c.connect();
    return c;
  })();
}

let _redisClientPromise: ReturnType<typeof createRedisClientPromise> | null = null;
async function redisClient() {
  if (_redisClientPromise === null) {
    _redisClientPromise = createRedisClientPromise();
  }
  return _redisClientPromise;
}

function redisKey(sid: string): string {
  return "chrysalis:sess:" + sid;
}

async function readRedis(sid: string): Promise<Record<string, unknown>> {
  try {
    const raw = await (await redisClient()).get(redisKey(sid));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeRedis(sid: string, store: Record<string, unknown>): Promise<void> {
  try {
    await (await redisClient()).set(redisKey(sid), JSON.stringify(store));
  } catch {
    /* noop */
  }
}

async function deleteRedis(sid: string): Promise<void> {
  try {
    await (await redisClient()).del(redisKey(sid));
  } catch {
    /* noop */
  }
}

export interface Session {
  get<T = unknown>(key: string): T | null;
  set(key: string, value: unknown): void;
  destroy(): void;
}

export function sessionMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    let sid = getCookie(c, sessionCookieName) ?? null;
    if (sid === null) {
      sid = newSid();
      setCookie(c, sessionCookieName, sid, {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
      });
    }

    let store: Record<string, unknown>;
    if (sessionRedisUrl) {
      store = await readRedis(sid);
    } else if (sessionSqlitePath) {
      store = readSqlite(sid);
    } else if (sessionDir) {
      store = readDisk(sid);
    } else {
      if (!sessions.has(sid)) {
        sessions.set(sid, {});
      }
      store = sessions.get(sid)!;
    }

    const session: Session = {
      get(key) {
        const v = store[key];
        return v === undefined ? null : (v as never);
      },
      set(key, value) {
        store[key] = value;
      },
      destroy() {
        if (sessionRedisUrl) {
          void deleteRedis(sid);
        } else if (sessionSqlitePath) {
          deleteSqlite(sid);
        } else if (sessionDir) {
          try {
            unlinkSync(diskPath(sid));
          } catch {
            /* noop */
          }
        } else {
          sessions.delete(sid);
        }
      },
    };
    c.set("session", session);
    await next();
    if (sessionRedisUrl) {
      await writeRedis(sid, store);
    } else if (sessionSqlitePath) {
      writeSqlite(sid, store);
    } else if (sessionDir) {
      writeDisk(sid, store);
    }
  };
}

export function getSession(c: Context): Session {
  const s = c.get("session") as Session | undefined;
  if (!s) throw new Error("session middleware not mounted");
  return s;
}
`;

export const RUNTIME_TS = `import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { compare as bcryptCompare } from "bcryptjs";
import { createHash } from "node:crypto";
import { crc32 as zlibCrc32 } from "node:zlib";
import { queryOne } from "./db.js";
import { getSession } from "./session.js";

export function escapeHtml(v: unknown): string {
  const s = String(v ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderCwlUiTree(nodes: unknown, values: unknown[]): string {
  function render(node: unknown): string {
    if (!node || typeof node !== "object") return "";
    const rec = node as Record<string, unknown>;
    if (rec.kind === "text") {
      if (typeof rec.text === "string") {
        return rec.escape === false ? rec.text : escapeHtml(rec.text);
      }
      const idx = rec.operandIndex;
      if (typeof idx === "number") {
        const s = String(values[idx] ?? "");
        return rec.escape === false ? s : escapeHtml(s);
      }
      return "";
    }
    if (rec.kind === "fragment" && Array.isArray(rec.children)) {
      return rec.children.map((c) => render(c)).join("");
    }
    if (rec.kind === "element" && typeof rec.tag === "string") {
      const tag = rec.tag;
      const attrs = rec.attrs && typeof rec.attrs === "object" ? (rec.attrs as Record<string, unknown>) : {};
      let attrStr = "";
      for (const [key, val] of Object.entries(attrs)) {
        if (typeof val === "string") {
          attrStr += " " + key + "=\\"" + escapeHtml(val) + "\\"";
        } else if (val && typeof val === "object" && "operandIndex" in val) {
          attrStr +=
            " " +
            key +
            "=\\"" +
            escapeHtml(String(values[(val as { operandIndex: number }).operandIndex] ?? "")) +
            "\\"";
        }
      }
      const children = Array.isArray(rec.children)
        ? rec.children.map((c) => render(c)).join("")
        : "";
      return "<" + tag + attrStr + ">" + children + "</" + tag + ">";
    }
    return "";
  }
  return render(nodes);
}

export function nl2br(v: unknown): string {
  return String(v ?? "").replace(/\\r?\\n/g, "<br />");
}

export function urlencode(v: unknown): string {
  return encodeURIComponent(String(v ?? "")).replace(/%20/g, "+");
}

export function rawurlencode(v: unknown): string {
  return encodeURIComponent(String(v ?? ""));
}

export function urldecode(v: unknown): string {
  return decodeURIComponent(String(v ?? "").replace(/\\+/g, " "));
}

export function rawurldecode(v: unknown): string {
  return decodeURIComponent(String(v ?? ""));
}

export function ltrim(v: unknown): string {
  return String(v ?? "").replace(/^\\s+/, "");
}

export function rtrim(v: unknown): string {
  return String(v ?? "").replace(/\\s+$/, "");
}

export function currentUser(c: Context): { id: number; username: string } | null {
  const s = getSession(c);
  const id = s.get<number>("user_id");
  if (id === null || id === undefined) return null;
  return queryOne<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE id = ?",
    [id],
  );
}

/** Guard for auth-required handlers. Uses HTTPException so Hono middleware compose (instanceof Error) forwards the 401 to the framework error handler. */
export function requireLogin(c: Context): { id: number; username: string } {
  const u = currentUser(c);
  if (u === null) {
    throw new HTTPException(401, { res: c.text("Login required", 401) });
  }
  return u;
}

export function isset(v: unknown): boolean {
  return v !== null && v !== undefined;
}

export function empty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (v === false || v === 0 || v === "" || v === "0") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === "object" && Object.keys(v as object).length === 0) return true;
  return false;
}

export function count(x: unknown): number {
  if (Array.isArray(x) || (typeof x === "object" && x !== null && typeof (x as ArrayLike<unknown>).length === "number")) {
    return (x as ArrayLike<unknown>).length;
  }
  if (typeof x === "object" && x !== null) {
    return Object.keys(x as object).length;
  }
  return 0;
}

export function is_array(x: unknown): boolean {
  return Array.isArray(x);
}

export function is_string(x: unknown): boolean {
  return typeof x === "string";
}

export function abs(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

export function is_numeric(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return false;
    return Number.isFinite(Number(s));
  }
  return false;
}

export function is_int(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v);
}

export function is_float(v: unknown): boolean {
  return typeof v === "number" && !Number.isInteger(v);
}

export function is_object(v: unknown): boolean {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function is_scalar(v: unknown): boolean {
  const t = typeof v;
  return t === "boolean" || t === "number" || t === "string";
}

export function is_bool(v: unknown): boolean {
  return typeof v === "boolean";
}

export function is_null(v: unknown): boolean {
  return v === null;
}

export function round(v: unknown, precision?: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  if (precision === undefined) return Math.round(n);
  const p = typeof precision === "number" ? precision : parseInt(String(precision), 10);
  if (!Number.isFinite(p)) return Math.round(n);
  const m = 10 ** p;
  return Math.round(n * m) / m;
}

export function max(a: unknown, b: unknown): number {
  const x = typeof a === "number" ? a : Number(a);
  const y = typeof b === "number" ? b : Number(b);
  const fx = Number.isFinite(x) ? x : 0;
  const fy = Number.isFinite(y) ? y : 0;
  return Math.max(fx, fy);
}

export function min(a: unknown, b: unknown): number {
  const x = typeof a === "number" ? a : Number(a);
  const y = typeof b === "number" ? b : Number(b);
  const fx = Number.isFinite(x) ? x : 0;
  const fy = Number.isFinite(y) ? y : 0;
  return Math.min(fx, fy);
}

export function substr(v: unknown, start: unknown, length?: unknown): string {
  const s = String(v ?? "");
  let i = typeof start === "number" ? start : parseInt(String(start), 10);
  if (!Number.isFinite(i)) i = 0;
  if (length === undefined) return s.slice(i);
  const len = typeof length === "number" ? length : parseInt(String(length), 10);
  if (!Number.isFinite(len)) return s.slice(i);
  return s.slice(i, i + len);
}

export function floor(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export function ceil(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.ceil(n) : 0;
}

export function trim(v: unknown): string {
  return String(v ?? "").trim();
}

export function intval(v: unknown): number {
  if (typeof v === "number") return Math.trunc(v);
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export function strlen(v: unknown): number {
  return String(v ?? "").length;
}

/** One column per row — used when batching N+1 reads (ids before a single IN query). */
export function chrysalisPluck(
  rows: ReadonlyArray<Record<string, unknown>>,
  key: string,
): unknown[] {
  const out: unknown[] = [];
  for (const r of rows ?? []) {
    out.push((r as Record<string, unknown>)[key]);
  }
  return out;
}

/** First row where \`row[col]\` equals \`keyVal\` (String comparison). */
export function chrysalisRowByColumn<T extends Record<string, unknown>>(
  rows: ReadonlyArray<T>,
  col: string,
  keyVal: unknown,
): T | null {
  const k = String(keyVal ?? "");
  for (const r of rows ?? []) {
    if (String((r as Record<string, unknown>)[col]) === k) return r;
  }
  return null;
}

/** PHP microtime() / microtime(false): "fractional_seconds seconds" string from injectable epoch float. */
export function microtimeString(epochSeconds: number): string {
  const sec = Math.floor(epochSeconds);
  const frac = epochSeconds - sec;
  return \`\${frac.toFixed(8)} \${sec}\`;
}

/**
 * PHP parse_url second-argument mode: PHP_URL_* component integers only.
 * Relative URLs resolve against http://chrysalis-parse-url.invalid (path-only
 * strings match PHP request URI behavior).
 */
export function parseUrlComponent(url: unknown, component: number): string | null {
  const u = String(url ?? "");
  try {
    const parsed = new URL(u, "http://chrysalis-parse-url.invalid");
    switch (component) {
      case 0:
        return parsed.protocol.replace(/:$/, "") || null;
      case 1:
        return parsed.hostname || null;
      case 2:
        return parsed.port ? String(parsed.port) : null;
      case 3:
        return parsed.username || null;
      case 4:
        return parsed.password || null;
      case 5:
        return parsed.pathname || null;
      case 6:
        return parsed.search ? parsed.search.slice(1) : null;
      case 7:
        return parsed.hash ? parsed.hash.slice(1) : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** PHP parse_url(url) single-arg: associative array keys scheme, host, port, user, pass, path, query, fragment. */
export function parseUrlParts(url: unknown): Record<string, string> {
  const u = String(url ?? "");
  try {
    const p = new URL(u, "http://chrysalis-parse-url.invalid");
    const out: Record<string, string> = {};
    const scheme = p.protocol.replace(/:$/, "");
    if (scheme) out.scheme = scheme;
    if (p.username) out.user = p.username;
    if (p.password) out.pass = p.password;
    if (p.hostname) out.host = p.hostname;
    if (p.port) out.port = String(p.port);
    if (p.pathname) out.path = p.pathname;
    const q = p.search ? p.search.slice(1) : "";
    if (q) out.query = q;
    const frag = p.hash ? p.hash.slice(1) : "";
    if (frag) out.fragment = frag;
    return out;
  } catch {
    return {};
  }
}

export function json_decode(v: unknown): unknown {
  if (v === null || v === undefined || v === "") return null;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

export function md5(v: unknown): string {
  return createHash("md5").update(String(v ?? "")).digest("hex");
}

export function sha1(v: unknown): string {
  return createHash("sha1").update(String(v ?? "")).digest("hex");
}

export function base64_encode(v: unknown): string {
  return Buffer.from(String(v ?? ""), "utf8").toString("base64");
}

export function base64_decode(v: unknown): string {
  try {
    return Buffer.from(String(v ?? ""), "base64").toString("utf8");
  } catch {
    return "";
  }
}

export function bin2hex(v: unknown): string {
  return Buffer.from(String(v ?? ""), "binary").toString("hex");
}

export function preg_quote(v: unknown, delimiter?: unknown): string {
  const s = String(v ?? "");
  const d = delimiter !== undefined ? String(delimiter) : "/";
  let out = "";
  for (const ch of s) {
    if ("\\\\.[]{}()*+-?^$|".includes(ch) || ch === d) out += "\\\\" + ch;
    else out += ch;
  }
  return out;
}

export function basename(path: unknown, suffix?: unknown): string {
  let p = String(path ?? "").replace(/\\\\/g, "/");
  const base = p.split("/").pop() ?? "";
  if (suffix !== undefined && base.endsWith(String(suffix))) {
    return base.slice(0, -String(suffix).length);
  }
  return base;
}

export function dirname(path: unknown): string {
  let p = String(path ?? "").replace(/\\\\/g, "/");
  const i = p.lastIndexOf("/");
  if (i === -1) return ".";
  if (i === 0) return "/";
  return p.slice(0, i);
}

export function gettype(v: unknown): string {
  if (v === null) return "NULL";
  if (Array.isArray(v)) return "array";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "double";
  if (typeof v === "string") return "string";
  if (typeof v === "object") return "object";
  return "unknown type";
}

export function is_callable(v: unknown): boolean {
  return typeof v === "function";
}

export function is_resource(_v: unknown): boolean {
  return false;
}

export function ord(v: unknown): number {
  const s = String(v ?? "");
  const c = s.codePointAt(0);
  return c === undefined ? 0 : c;
}

export function chr(v: unknown): string {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return "";
  return String.fromCodePoint(n);
}

export function hash(algo: unknown, data: unknown): string {
  const a = String(algo ?? "md5").toLowerCase();
  const allowed = ["md5", "sha1", "sha256", "sha512"];
  const alg = allowed.includes(a) ? a : "md5";
  return createHash(alg).update(String(data ?? "")).digest("hex");
}

export function sprintf(fmt: unknown, ...rest: unknown[]): string {
  let i = 0;
  return String(fmt ?? "").replace(/%[sd]/g, () => {
    const a = rest[i++];
    return a === undefined || a === null ? "" : String(a);
  });
}

export function number_format(num: unknown, decimals?: unknown): string {
  const n = typeof num === "number" ? num : Number(num);
  const d = decimals === undefined ? 0 : typeof decimals === "number" ? decimals : parseInt(String(decimals), 10);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(Number.isFinite(d) ? d : 0);
}

export function pregMatch(pattern: unknown, subject: unknown): boolean {
  const p = String(pattern ?? "");
  const s = String(subject ?? "");
  const lastSlash = p.lastIndexOf("/");
  if (p.length >= 2 && p[0] === "/" && lastSlash > 0) {
    const body = p.slice(1, lastSlash);
    const flags = p.slice(lastSlash + 1).replace(/[^gimsuy]/g, "");
    try {
      return new RegExp(body, flags).test(s);
    } catch {
      return false;
    }
  }
  try {
    return new RegExp(p).test(s);
  } catch {
    return false;
  }
}

function phpRegexFromPattern(pattern: unknown): RegExp | null {
  const p = String(pattern ?? "");
  const lastSlash = p.lastIndexOf("/");
  if (p.length >= 2 && p[0] === "/" && lastSlash > 0) {
    const body = p.slice(1, lastSlash);
    const flags = p.slice(lastSlash + 1).replace(/[^gimsuy]/g, "");
    try {
      return new RegExp(body, flags);
    } catch {
      return null;
    }
  }
  try {
    return new RegExp(p);
  } catch {
    return null;
  }
}

export function implode(separator: unknown, pieces: unknown): string {
  if (Array.isArray(pieces)) {
    return pieces.map((x) => String(x ?? "")).join(String(separator ?? ""));
  }
  return String(pieces ?? "");
}

export function pregReplace(pattern: unknown, replacement: unknown, subject: unknown): string {
  const re = phpRegexFromPattern(pattern);
  const s = String(subject ?? "");
  if (!re) return s;
  return s.replace(re, String(replacement ?? ""));
}

export function pregSplit(pattern: unknown, subject: unknown): string[] {
  const re = phpRegexFromPattern(pattern);
  const s = String(subject ?? "");
  if (!re) return [s];
  const parts = s.split(re);
  return parts.length > 0 && parts[parts.length - 1] === "" ? parts.slice(0, -1) : parts;
}

export function hexdec(hex: unknown): number {
  const n = parseInt(String(hex ?? "").replace(/^0x/i, ""), 16);
  return Number.isFinite(n) ? n : 0;
}

export function dechex(num: unknown): string {
  const n = typeof num === "number" ? num : parseInt(String(num), 10);
  if (!Number.isFinite(n)) return "0";
  return (n >>> 0).toString(16);
}

export function strval(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "1" : "";
  return String(v);
}

export function filterVar(value: unknown, filter: unknown): unknown {
  const f = typeof filter === "number" ? filter : parseInt(String(filter), 10);
  // FILTER_SANITIZE_STRING (deprecated in PHP 8.1) = 513
  if (f === 513) {
    return String(value ?? "").replace(/<[^>]*>/g, "");
  }
  return value;
}

export function crc32(v: unknown): number {
  const u = zlibCrc32(Buffer.from(String(v ?? ""), "utf8")) >>> 0;
  return u > 0x7fffffff ? u - 0x100000000 : u;
}

export async function passwordVerify(plain: string, hash: string): Promise<boolean> {
  const p = String(plain);
  let h = String(hash);
  if (p.length === 0 || h.length === 0) return false;
  if (!/^\\$2[aby]\\$/.test(h)) return false;
  if (h.startsWith("$2y$")) {
    h = "$2a$" + h.slice(4);
  }
  try {
    return await bcryptCompare(p, h);
  } catch {
    return false;
  }
}

/**
 * Manifest-declared WordPress / wp_* call stub (Phase 10 — verify-gated).
 * Returns deterministic probe values; customer slices extend via oracle evidence.
 */
export function wpCall(callee: string, _args: readonly unknown[]): unknown {
  switch (callee) {
    case "get_bloginfo":
      return "WordPress probe";
    case "apply_filters":
      return _args.length >= 2 ? _args[1] : "";
    case "wp_create_nonce":
      return "probe-nonce";
    case "is_admin":
      return true;
    case "current_user_can":
      return false;
    case "add_action":
    case "wp_head":
    case "wp_footer":
      return null;
    case "wp_die":
      return null;
    default:
      return __hole("wp.call:" + callee, { callee, args: _args });
  }
}

/**
 * Called in place of a hole's output during Milestone 1. Returns an
 * \`unknown\` so downstream expressions compile. Logged for visibility.
 */
export function __hole(name: string, payload: unknown): unknown {
  // eslint-disable-next-line no-console
  console.warn("[chrysalis] hole invoked:", name, payload);
  return null;
}

type PhpFqnCtor = (...args: unknown[]) => unknown;
const phpFqnCtorRegistry = new Map<string, PhpFqnCtor>();

/**
 * Optional bridge: register a runtime constructor for a PHP FQN so namespaced
 * construction can become a real object instead of a hole.
 *
 * Bootstrap example in emitted app entrypoint:
 * import { registerPhpFqnCtor } from "./runtime.js";
 * class AcmeThing { constructor(public n: unknown) {} }
 * registerPhpFqnCtor("Acme\\Namespaced\\Thing", (...args) => new AcmeThing(args[0]));
 */
export function registerPhpFqnCtor(fqn: string, ctor: PhpFqnCtor): void {
  phpFqnCtorRegistry.set(String(fqn), ctor);
}

/**
 * PHP namespaced new (no corresponding static TS import). Delegates to
 * {@link __hole} so handlers compile; production stacks register classes or
 * bridge to legacy.
 */
export function phpFqnNew(fqn: string, ...args: unknown[]): unknown {
  const ctor = phpFqnCtorRegistry.get(String(fqn));
  if (ctor) return ctor(...args);
  return __hole(
    "new:" + fqn.split(String.fromCharCode(92)).join("."),
    { fqn, args },
  );
}

/**
 * Dynamic class construction via registry when classExpr is a string; otherwise
 * preserve behavior via a typed hole.
 */
export function phpDynamicNew(classExpr: unknown, ...args: unknown[]): unknown {
  if (typeof classExpr === "string") {
    const ctor = phpFqnCtorRegistry.get(classExpr);
    if (ctor) return ctor(...args);
  }
  return __hole("new:dynamic", { classExpr, args });
}

function __isLikelyWebAppManifestJson(v: unknown): boolean {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.start_url === "string" &&
    typeof o.display === "string" &&
    (typeof o.name === "string" || typeof o.short_name === "string")
  );
}

/**
 * Final-response helper. Mirrors the PHP "set status then echo then exit"
 * sequence: if there is buffered HTML, return it with the accumulated
 * status; otherwise return an empty text response with that status.
 */
export function __respond(c: Context, html: string, status: number): Response {
  // Hono overloads accept \`ResponseOrInit\` as the 2nd arg; avoid \`Parameters<typeof c.text>[1]\`
  // (it unions status + init and breaks \`c.body(..., status, headers)\`).
  const contentful = status as ContentfulStatusCode;
  if (html.length > 0) {
    // Heuristic: a leading \`<\` or \`<!\` marks this as HTML. Otherwise treat
    // as plain text. This matches most legacy PHP \`echo\` patterns.
    const isHtml = /^\\s*<!?[a-z]/i.test(html);
    if (isHtml) return c.html(html, contentful);
    const t = html.trimStart();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try {
        const parsed = JSON.parse(html) as unknown;
        if (__isLikelyWebAppManifestJson(parsed)) {
          return c.body(html, contentful, {
            "Content-Type": "application/manifest+json; charset=utf-8",
          });
        }
        return c.body(JSON.stringify(parsed), contentful, {
          "Content-Type": "application/json; charset=utf-8",
        });
      } catch {
        /* fall through */
      }
    }
    if (t.startsWith("<?xml")) {
      return c.body(html, contentful, { "Content-Type": "application/xml; charset=utf-8" });
    }
    if (t.startsWith("/*") || t.startsWith("@")) {
      return c.body(html, contentful, { "Content-Type": "text/css; charset=utf-8" });
    }
    return c.text(html, contentful);
  }
  if (status === 204 || status === 304) {
    return c.body(null, contentful);
  }
  return c.text("", contentful);
}

/**
 * Normalizes a raw POST field for handlers rewritten by \`boundary-zod\`.
 * Matches the D19 simulator; intentionally dependency-free (no npm \`zod\`
 * required) so emitted apps stay minimal.
 */
export function parseZodBodyFieldRaw(
  raw: unknown,
  opts: { readonly minLen: number; readonly trim: boolean; readonly email: boolean },
): string {
  let s = raw == null ? "" : String(raw);
  if (opts.trim) s = s.trim();
  if (s.length < opts.minLen) return "";
  if (opts.email && !/^[^@]+@[^@]+$/.test(s)) return "";
  return s;
}

/**
 * Validates \`raw\` against a closed set of string literals (z.enum-shaped).
 * Used by \`dispatch-union-zod\`; dependency-free like \`parseZodBodyFieldRaw\`.
 */
export function parseZodEnumBodyFieldRaw(
  raw: unknown,
  allowed: readonly string[],
): string {
  const s = raw == null ? "" : String(raw);
  return (allowed as readonly string[]).includes(s) ? s : "";
}
`;

/**
 * Route registration + `app` instance only — no listen. Lets callers
 * run `app.fetch(request)` in-process (HTTP-replay verification, tests)
 * without binding a port. `src/index.ts` imports this and calls `serve`.
 */
export const SERVER_TS = (
  mountBlocks: string,
  routeRegistration: "eager" | "lazy",
  hubMiddleware: { serverImports: string; beforeTapeLines: string } = {
    serverImports: "",
    beforeTapeLines: "",
  },
): string => {
  const routeHook = routeRegistration === "lazy" ? "await registerRoutes(app);" : "registerRoutes(app);";
  return `import { Hono } from "hono";
import { chrysalisDeterminismMiddleware } from "./ctx.js";
import { sqlTapeMiddleware } from "./db.js";
import { sessionMiddleware } from "./session.js";
${hubMiddleware.serverImports}
${mountBlocks}

export const app = new Hono();
${hubMiddleware.beforeTapeLines}app.use("*", sqlTapeMiddleware);
app.use("*", chrysalisDeterminismMiddleware());
app.use("*", sessionMiddleware());

${routeHook}

/**
 * In-process corpus replay: build Request in this module next to app so Hono
 * always sees a Request with a populated url (avoids tsx / loader edge cases).
 */
export async function chrysalisInProcessFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  return app.fetch(new Request(url, init ?? {}));
}
`;
};

export const INDEX_TS = `import { serve } from "@hono/node-server";
import { app } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
// eslint-disable-next-line no-console
console.log(\`chrysalis-emitted app listening on :\${port}\`);
`;
