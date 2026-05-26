/**
 * Static templates for the Fastify + node:sqlite emitted project.
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
        fastify: "^5.2.0",
        "@fastify/cookie": "^11.0.0",
        "@fastify/formbody": "^8.0.0",
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
import type { FastifyRequest } from "fastify";
import { DatabaseSync } from "node:sqlite";

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

/** Decode Oracle SQL tape from \`x-chrysalis-sql-tape\` (base64url); uses \`enterWith\` for the request. */
export async function sqlTapeOnRequest(req: FastifyRequest): Promise<void> {
  const hdr = req.headers["x-chrysalis-sql-tape"];
  const raw = Array.isArray(hdr) ? hdr[0] : hdr;
  if (raw === undefined || typeof raw !== "string") {
    return;
  }
  let tape: SqlReplayTape;
  try {
    tape = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SqlReplayTape;
  } catch {
    return;
  }
  sqlReplayAls.enterWith({ tape, index: 0 });
}

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

export const CTX_TS = `import { AsyncLocalStorage } from "node:async_hooks";
import type { FastifyRequest } from "fastify";

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

export function chrysalisNow(): string {
  return handlerCtxAls.getStore()?.nowIso ?? new Date().toISOString();
}

export function chrysalisRandom(): number {
  const s = handlerCtxAls.getStore();
  if (s) return s.nextRandom();
  return Math.random();
}

/** Async so Fastify 5 + \`inject()\` do not hang with sync \`onRequest\` hooks (Node 22+). */
export async function chrysalisDeterminismOnRequest(req: FastifyRequest): Promise<void> {
  const hdrNow = req.headers["x-chrysalis-now-iso"];
  const hdrSeed = req.headers["x-chrysalis-random-seed"];
  const nowRaw = Array.isArray(hdrNow) ? hdrNow[0] : hdrNow;
  const seedRaw = Array.isArray(hdrSeed) ? hdrSeed[0] : hdrSeed;
  const nowIso =
    nowRaw !== undefined && typeof nowRaw === "string" && nowRaw.length > 0
      ? nowRaw
      : new Date().toISOString();
  let seed = (Math.random() * 0xffffffff) >>> 0;
  if (seedRaw !== undefined && typeof seedRaw === "string" && seedRaw.length > 0) {
    const n = Number.parseInt(seedRaw, 10);
    if (Number.isFinite(n)) seed = n >>> 0;
  }
  handlerCtxAls.enterWith({ nowIso, nextRandom: mulberry32(seed) });
}
`;

export const SESSION_TS = `import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import { chrysalisRandom } from "./ctx.js";

const sessions = new Map<string, Record<string, unknown>>();
const sessionDir = process.env.CHRYSALIS_SESSION_DIR;
const sessionSqlitePath = process.env.CHRYSALIS_SESSION_SQLITE_PATH;
const sessionRedisUrl = process.env.CHRYSALIS_SESSION_REDIS_URL;
const sessionCookieName = process.env.CHRYSALIS_SESSION_COOKIE ?? "chrysalis_sid";

const sessionStoreKey = Symbol("chrysalisSession");
const sessionBackingKey = Symbol("chrysalisSessionBacking");

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

declare module "fastify" {
  interface FastifyRequest {
    [sessionStoreKey]?: Session;
    [sessionBackingKey]?: Record<string, unknown>;
  }
}

export async function registerSession(app: FastifyInstance): Promise<void> {
  await app.register(cookie, { hook: "onRequest", parseOptions: {} });

  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    let sid = req.cookies[sessionCookieName] ?? null;
    if (sid === null) {
      sid = newSid();
      reply.setCookie(sessionCookieName, sid, {
        httpOnly: true,
        sameSite: "lax",
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
          void deleteRedis(sid!);
        } else if (sessionSqlitePath) {
          deleteSqlite(sid!);
        } else if (sessionDir) {
          try {
            unlinkSync(diskPath(sid!));
          } catch {
            /* noop */
          }
        } else {
          sessions.delete(sid!);
        }
      },
    };
    req[sessionBackingKey] = store;
    req[sessionStoreKey] = session;
  });

  app.addHook("onResponse", async (req: FastifyRequest) => {
    if (!sessionDir && !sessionSqlitePath && !sessionRedisUrl) return;
    const sid = req.cookies[sessionCookieName];
    const backing = req[sessionBackingKey];
    if (!sid || !backing) return;
    if (sessionRedisUrl) {
      await writeRedis(sid, backing);
    } else if (sessionSqlitePath) {
      writeSqlite(sid, backing);
    } else {
      writeDisk(sid, backing);
    }
  });
}

export function getSession(req: FastifyRequest): Session {
  const s = req[sessionStoreKey];
  if (!s) throw new Error("session middleware not mounted");
  return s;
}
`;

export const RUNTIME_TS = `import type { FastifyReply, FastifyRequest } from "fastify";
import { compare as bcryptCompare } from "bcryptjs";
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

export function nl2br(v: unknown): string {
  return String(v ?? "").replace(/\\r?\\n/g, "<br />");
}

export function currentUser(req: FastifyRequest): { id: number; username: string } | null {
  const s = getSession(req);
  const id = s.get<number>("user_id");
  if (id === null || id === undefined) return null;
  return queryOne<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE id = ?",
    [id],
  );
}

export function requireLogin(
  req: FastifyRequest,
  reply: FastifyReply,
): { id: number; username: string } {
  const u = currentUser(req);
  if (u === null) {
    void reply.code(401).send("Login required");
    throw new Error("unauthorized");
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

export function microtimeString(epochSeconds: number): string {
  const sec = Math.floor(epochSeconds);
  const frac = epochSeconds - sec;
  return \`\${frac.toFixed(8)} \${sec}\`;
}

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

export function __hole(name: string, payload: unknown): unknown {
  // eslint-disable-next-line no-console
  console.warn("[chrysalis] hole invoked:", name, payload);
  return null;
}

type PhpFqnCtor = (...args: unknown[]) => unknown;
const phpFqnCtorRegistry = new Map<string, PhpFqnCtor>();

/**
 * Optional runtime bridge for PHP FQN constructor mapping.
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
 * Same contract as Hono runtime: namespaced new lowers here; no static import for FQN.
 */
export function phpFqnNew(fqn: string, ...args: unknown[]): unknown {
  const ctor = phpFqnCtorRegistry.get(String(fqn));
  if (ctor) return ctor(...args);
  return __hole(
    "new:" + fqn.split(String.fromCharCode(92)).join("."),
    { fqn, args },
  );
}

/** Dynamic class construction via registry or hole fallback. */
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

export function __respond(reply: FastifyReply, html: string, status: number): FastifyReply {
  if (html.length > 0) {
    const isHtml = /^\\s*<!?[a-z]/i.test(html);
    if (isHtml) {
      return reply.code(status).type("text/html; charset=utf-8").send(html);
    }
    const t = html.trimStart();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try {
        const parsed = JSON.parse(html) as unknown;
        if (__isLikelyWebAppManifestJson(parsed)) {
          return reply.code(status).type("application/manifest+json; charset=utf-8").send(html);
        }
        return reply.code(status).type("application/json; charset=utf-8").send(parsed);
      } catch {
        /* fall through */
      }
    }
    if (t.startsWith("<?xml")) {
      return reply.code(status).type("application/xml; charset=utf-8").send(html);
    }
    if (t.startsWith("/*") || t.startsWith("@")) {
      return reply.code(status).type("text/css; charset=utf-8").send(html);
    }
    return reply.code(status).type("text/plain; charset=utf-8").send(html);
  }
  return reply.code(status).send("");
}

/** See Hono runtime: same contract for \`boundary-zod\` / D19 alignment. */
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

export function parseZodEnumBodyFieldRaw(
  raw: unknown,
  allowed: readonly string[],
): string {
  const s = raw == null ? "" : String(raw);
  return (allowed as readonly string[]).includes(s) ? s : "";
}
`;

export const SERVER_TS = (
  imports: string,
  routeRegistrations: string,
  hubMiddlewareRegistrations = "",
): string =>
  `${imports}
import Fastify, { type FastifyInstance } from "fastify";
import formbody from "@fastify/formbody";
import { chrysalisDeterminismOnRequest } from "./ctx.js";
import { sqlTapeOnRequest } from "./db.js";
import { registerSession } from "./session.js";

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.addHook("onRequest", sqlTapeOnRequest);
  app.addHook("onRequest", chrysalisDeterminismOnRequest);
  await registerSession(app);
  await app.register(formbody);
${hubMiddlewareRegistrations}  app.setErrorHandler((err, _req, reply) => {
    if (reply.sent) return;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "unauthorized") return;
    reply.code(500).send(msg);
  });
${routeRegistrations}
  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).type("text/plain; charset=utf-8").send("Not Found");
  });
  return app;
}

const _app = await buildApp();
await _app.ready();
export const app = _app;

export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const req =
    typeof input === "string"
      ? new Request(input, init)
      : input instanceof Request
        ? input
        : new Request(input, init);
  const url = new URL(req.url);
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });
  let payload: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    payload = await req.text();
  }
  const method = req.method.toLowerCase() as
    | "delete"
    | "get"
    | "head"
    | "options"
    | "patch"
    | "post"
    | "put";
  const inj = await app.inject({
    method,
    url: url.pathname + url.search,
    headers,
    ...(payload !== undefined ? { payload } : {}),
  });
  const out = new Headers();
  for (const [k, v] of Object.entries(inj.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const part of v) out.append(k, part);
    } else {
      out.set(k, String(v));
    }
  }
  return new Response(inj.payload, { status: inj.statusCode, headers: out });
}
`;

export const INDEX_TS = `import { app } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
await app.listen({ port, host });
// eslint-disable-next-line no-console
console.log(\`chrysalis-emitted fastify app listening on \${host}:\${port}\`);
`;
