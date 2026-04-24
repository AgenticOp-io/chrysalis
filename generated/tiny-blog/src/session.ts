import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";

/**
 * Session store: in-memory by default, or JSON files under
 * `CHRYSALIS_SESSION_DIR` when set (Milestone 2 chimera bridge). PHP can
 * read/write the same files if it uses the same session id cookie value
 * (`CHRYSALIS_SESSION_COOKIE`, default `chrysalis_sid`) and JSON shape.
 */
const sessions = new Map<string, Record<string, unknown>>();
const sessionDir = process.env.CHRYSALIS_SESSION_DIR;
const sessionCookieName = process.env.CHRYSALIS_SESSION_COOKIE ?? "chrysalis_sid";

function newSid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
