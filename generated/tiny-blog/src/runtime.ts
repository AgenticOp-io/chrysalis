import type { Context } from "hono";
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
  return String(v ?? "").replace(/\r?\n/g, "<br />");
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
 * `unknown` so downstream expressions compile. Logged for visibility.
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
    // Heuristic: a leading `<` or `<!` marks this as HTML. Otherwise treat
    // as plain text. This matches most legacy PHP `echo` patterns.
    const isHtml = /^\s*<!?[a-z]/i.test(html);
    const s = status as Parameters<typeof c.text>[1];
    return isHtml ? c.html(html, s) : c.text(html, s);
  }
  return c.text("", status as Parameters<typeof c.text>[1]);
}
