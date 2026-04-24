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

function paramsMatch(a: ReadonlyArray<unknown>, b: ReadonlyArray<unknown>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
  }
  return true;
}

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

export const SESSION_TS = `import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";

/**
 * Session store: in-memory by default, or JSON files under
 * \`CHRYSALIS_SESSION_DIR\` when set (Milestone 2 chimera bridge). PHP can
 * read/write the same files if it uses the same session id cookie value
 * (\`CHRYSALIS_SESSION_COOKIE\`, default \`chrysalis_sid\`) and JSON shape.
 */
const sessions = new Map<string, Record<string, unknown>>();
const sessionDir = process.env.CHRYSALIS_SESSION_DIR;
const sessionCookieName = process.env.CHRYSALIS_SESSION_COOKIE ?? "chrysalis_sid";

function newSid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
    if (sessionDir) {
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
        if (sessionDir) {
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
    if (sessionDir) {
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

export function currentUser(c: Context): { id: number; username: string } | null {
  const s = getSession(c);
  const id = s.get<number>("user_id");
  if (id === null || id === undefined) return null;
  return queryOne<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE id = ?",
    [id],
  );
}

/** Guard used by handlers that require auth. Throws a 401 Response. */
export function requireLogin(c: Context): { id: number; username: string } {
  const u = currentUser(c);
  if (u === null) {
    throw c.text("Login required", 401);
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

/**
 * PHP preg_match for slash-delimited patterns only (first and last slash
 * enclose the body; flags after the closing slash). Example: email check
 * uses body ^.+@.+$ with optional u flag.
 */
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
  // Milestone 1: placeholder. Real implementation must validate bcrypt.
  // Holes elsewhere will request a proper lowering with bcrypt/argon2.
  return String(plain).length > 0 && String(hash).length > 0;
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

/**
 * Final-response helper. Mirrors the PHP "set status then echo then exit"
 * sequence: if there is buffered HTML, return it with the accumulated
 * status; otherwise return an empty text response with that status.
 */
export function __respond(c: Context, html: string, status: number): Response {
  if (html.length > 0) {
    // Heuristic: a leading \`<\` or \`<!\` marks this as HTML. Otherwise treat
    // as plain text. This matches most legacy PHP \`echo\` patterns.
    const isHtml = /^\\s*<!?[a-z]/i.test(html);
    const s = status as Parameters<typeof c.text>[1];
    return isHtml ? c.html(html, s) : c.text(html, s);
  }
  return c.text("", status as Parameters<typeof c.text>[1]);
}
`;

/**
 * Route registration + `app` instance only — no listen. Lets callers
 * run `app.fetch(request)` in-process (HTTP-replay verification, tests)
 * without binding a port. `src/index.ts` imports this and calls `serve`.
 */
export const SERVER_TS = (mountBlocks: string): string => `import { Hono } from "hono";
import { sqlTapeMiddleware } from "./db.js";
import { sessionMiddleware } from "./session.js";

${mountBlocks}

export const app = new Hono();
app.use("*", sqlTapeMiddleware);
app.use("*", sessionMiddleware());

registerRoutes(app);
`;

export const INDEX_TS = `import { serve } from "@hono/node-server";
import { app } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
// eslint-disable-next-line no-console
console.log(\`chrysalis-emitted app listening on :\${port}\`);
`;
