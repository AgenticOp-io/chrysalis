import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";

/**
 * Minimal in-memory session store for Milestone 1. Swap for Redis or a
 * shared store when integrating with the chimera runtime.
 */
const sessions = new Map<string, Record<string, unknown>>();

function newSid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface Session {
  get<T = unknown>(key: string): T | null;
  set(key: string, value: unknown): void;
  destroy(): void;
}

export function sessionMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    let sid = getCookie(c, "chrysalis_sid") ?? null;
    if (sid === null || !sessions.has(sid)) {
      sid = newSid();
      sessions.set(sid, {});
      setCookie(c, "chrysalis_sid", sid, {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
      });
    }
    const store = sessions.get(sid)!;
    const session: Session = {
      get(key) {
        const v = store[key];
        return v === undefined ? null : (v as never);
      },
      set(key, value) {
        store[key] = value;
      },
      destroy() {
        sessions.delete(sid!);
      },
    };
    c.set("session", session);
    await next();
  };
}

export function getSession(c: Context): Session {
  const s = c.get("session") as Session | undefined;
  if (!s) throw new Error("session middleware not mounted");
  return s;
}
