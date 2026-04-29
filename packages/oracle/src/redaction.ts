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
 *   - "sql.params[<driver>:<sqlPrefix>].<index>"   (`sql.query` **params** list only;
 *     implemented in **`packages/oracle-php/src/Redactor.php`**: `driver` may be `*` (any);
 *     SQL must **start with** `sqlPrefix` (case-insensitive); `index` is 0-based; **`drop`**
 *     applies as **mask** so bind arity stays stable for replay tapes). Rules apply only to
 *     **mutation-shaped** events (**empty `rowShape`**): SELECTs carry binds into `x-chrysalis-sql-tape`
 *     param matching and must not be altered at capture time.
 *   - "sql.row.<field>"             (`sql.query` only: hash/mask/drop cells whose **column
 *     name** matches, case-insensitive; bind **`params`** use **`sql.params[...]`** rules above)
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

/**
 * Default deny-list for corpora written to disk. Keep in lockstep with
 * `packages/oracle-php/src/Redactor.php` (same paths + kinds).
 *
 * Prefer **hash** where equality under replay still matters (headers, tokens in
 * URLs); **mask** for passwords and CSRF bodies where byte equality is irrelevant.
 */
export const DEFAULT_REDACTION: RedactionConfig = {
  rules: [
    { path: "request.headers.authorization", kind: "hash" },
    { path: "request.headers.cookie", kind: "hash" },
    { path: "request.headers.x-api-key", kind: "hash" },
    { path: "request.headers.x-auth-token", kind: "hash" },
    { path: "request.cookies.PHPSESSID", kind: "hash" },
    { path: "request.cookies.chrysalis_sess", kind: "hash" },
    { path: "request.cookies.laravel_session", kind: "hash" },
    { path: "request.cookies.remember_web", kind: "hash" },
    { path: "request.post.password", kind: "mask" },
    { path: "request.post.password_confirmation", kind: "mask" },
    { path: "request.post.password_confirm", kind: "mask" },
    { path: "request.post.pass", kind: "mask" },
    { path: "request.post.passwd", kind: "mask" },
    { path: "request.post.credit_card", kind: "mask" },
    { path: "request.post.cc", kind: "mask" },
    { path: "request.post.ssn", kind: "mask" },
    { path: "request.post._token", kind: "mask" },
    { path: "request.post.authenticity_token", kind: "mask" },
    { path: "request.post.csrf_token", kind: "mask" },
    { path: "request.post.api_key", kind: "mask" },
    { path: "request.post.api_token", kind: "mask" },
    { path: "request.post.access_token", kind: "mask" },
    { path: "request.post.refresh_token", kind: "mask" },
    { path: "request.post.client_secret", kind: "mask" },
    { path: "request.post.secret", kind: "mask" },
    { path: "request.post.token", kind: "mask" },
    { path: "request.query.access_token", kind: "hash" },
    { path: "request.query.refresh_token", kind: "hash" },
    { path: "request.query.token", kind: "hash" },
    { path: "request.query.code", kind: "hash" },
    { path: "request.query.state", kind: "hash" },
    { path: "session.user_hash", kind: "hash" },
    { path: "session.csrf", kind: "hash" },
    { path: "response.headers.set-cookie", kind: "hash" },
    { path: "setcookie.PHPSESSID", kind: "hash" },
    { path: "setcookie.chrysalis_sess", kind: "hash" },
    { path: "setcookie.laravel_session", kind: "hash" },
    { path: "outbound.url", kind: "hash" },
    { path: "mail.to", kind: "hash" },
    { path: "mail.subject", kind: "mask" },
    // SELECT `rows` payloads (oracle-php row capture): redact common secret columns by name.
    { path: "sql.row.password", kind: "hash" },
    { path: "sql.row.password_hash", kind: "hash" },
    { path: "sql.row.passwd", kind: "hash" },
    { path: "sql.row.secret", kind: "hash" },
    { path: "sql.row.api_key", kind: "hash" },
    { path: "sql.row.api_token", kind: "hash" },
    { path: "sql.row.access_token", kind: "hash" },
    { path: "sql.row.refresh_token", kind: "hash" },
    { path: "sql.row.token", kind: "hash" },
    { path: "sql.row.credit_card", kind: "mask" },
    { path: "sql.row.ssn", kind: "mask" },
    { path: "sql.row.current_password", kind: "mask" },
    // Mutation binds only (empty rowShape in oracle-php). Typical Laravel-style password UPDATE.
    { path: "sql.params[*:UPDATE users SET password].0", kind: "mask" },
  ],
};

/**
 * Merge rules from `chrysalis.observe.json` onto {@link DEFAULT_REDACTION}.
 * Default order is preserved; a file rule with the same `path` replaces the
 * default's `kind`. Paths present only in the file are appended in file order.
 */
export function mergeObserveFileRulesWithDefaults(
  fileRules: ReadonlyArray<RedactionRule>,
): RedactionRule[] {
  const overrideByPath = new Map<string, RedactionRule>();
  for (const r of fileRules) {
    overrideByPath.set(r.path, r);
  }
  const seen = new Set<string>();
  const out: RedactionRule[] = [];
  for (const r of DEFAULT_REDACTION.rules) {
    out.push(overrideByPath.get(r.path) ?? r);
    seen.add(r.path);
  }
  for (const r of fileRules) {
    if (!seen.has(r.path)) {
      out.push(r);
      seen.add(r.path);
    }
  }
  return out;
}

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
