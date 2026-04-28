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

/** First row where `row[col]` equals `keyVal` (String comparison). */
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
  return `${frac.toFixed(8)} ${sec}`;
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

/**
 * Normalizes a raw POST field for handlers rewritten by `boundary-zod`.
 * Matches the D19 simulator; intentionally dependency-free (no npm `zod`
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
 * Validates `raw` against a closed set of string literals (z.enum-shaped).
 * Used by `dispatch-union-zod`; dependency-free like `parseZodBodyFieldRaw`.
 */
export function parseZodEnumBodyFieldRaw(
  raw: unknown,
  allowed: readonly string[],
): string {
  const s = raw == null ? "" : String(raw);
  return (allowed as readonly string[]).includes(s) ? s : "";
}
