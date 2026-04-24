/**
 * Redaction config for the Oracle.
 *
 * Rules are simple dotted paths; supported prefixes:
 *   - "request.headers.<name>"    (case-insensitive header match)
 *   - "request.cookies.<name>"
 *   - "request.post.<field>"
 *   - "request.query.<field>"
 *   - "response.headers.<name>"
 *   - "response.body"             (body-level: mask the whole body)
 *   - "session.<key>"             (pre- and post-session)
 *   - "sql.params[<driver>:<sqlPrefix>].<index>"   (deep redaction — see below)
 *   - "setcookie.<name>"
 *   - "outbound.url"                (http.outbound event — full URL string)
 *   - "mail.to" / "mail.subject"   (mail.send event)
 *
 * `kind` is one of:
 *   - "drop" — remove the field from the trace entirely.
 *   - "hash" — replace with `sha256:<first 16 hex chars>`, preserves equality
 *     semantics for diffing without leaking the original value.
 *   - "mask" — replace with a literal sentinel. Loses equality information but
 *     guarantees the trace can never be used to recover anything.
 *
 * The config is hashed into every trace header so we can refuse to compare
 * traces captured under different redaction policies.
 */

import type { RedactionKind, RedactionRecord } from "./trace-schema.js";

export interface RedactionConfig {
  readonly rules: ReadonlyArray<RedactionRule>;
}

export interface RedactionRule {
  readonly path: string;
  readonly kind: RedactionKind;
}

export const DEFAULT_REDACTION: RedactionConfig = {
  rules: [
    { path: "request.headers.authorization", kind: "hash" },
    { path: "request.headers.cookie", kind: "hash" },
    { path: "request.cookies.PHPSESSID", kind: "hash" },
    { path: "request.cookies.chrysalis_sess", kind: "hash" },
    { path: "request.post.password", kind: "mask" },
    { path: "request.post.password_confirm", kind: "mask" },
    { path: "request.post.pass", kind: "mask" },
    { path: "request.post.passwd", kind: "mask" },
    { path: "request.post.credit_card", kind: "mask" },
    { path: "request.post.cc", kind: "mask" },
    { path: "request.post.ssn", kind: "mask" },
    { path: "session.user_hash", kind: "hash" },
    { path: "session.csrf", kind: "hash" },
    { path: "setcookie.PHPSESSID", kind: "hash" },
    { path: "setcookie.chrysalis_sess", kind: "hash" },
    { path: "outbound.url", kind: "hash" },
    { path: "mail.to", kind: "hash" },
    { path: "mail.subject", kind: "mask" },
  ],
};

/**
 * Stable JSON stringify (sorted keys) for hashing config.
 */
export function canonicalJSON(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJSON).join(",")}]`;
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJSON((v as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

export function redactionRecords(cfg: RedactionConfig): RedactionRecord[] {
  return cfg.rules.map((r) => ({ path: r.path, kind: r.kind }));
}
