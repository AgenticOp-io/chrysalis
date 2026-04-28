import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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
  return join(sessionDir!, `${sid}.json`);
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
