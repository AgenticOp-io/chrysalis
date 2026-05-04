/**
 * Response normalization for verify's diff step.
 *
 * Captured-vs-replayed responses have *expected* nondeterminism we need to
 * paper over before diffing: clock-derived timestamps, randomly-generated
 * session ids, trace IDs, and so on. The goal is to be *conservative*:
 * normalize only things that are known to vary unavoidably; never normalize
 * away content that might hide a real bug.
 *
 * Every normalization rule has a machine-readable tag so diff reports can
 * attribute which rules fired — if a rule is suppressing real divergence,
 * you can see it and tighten the rule.
 */

export interface NormalizeRule {
  readonly tag: string;
  readonly pattern: RegExp;
  readonly replacement: string;
}

export const DEFAULT_BODY_RULES: ReadonlyArray<NormalizeRule> = [
  {
    tag: "iso-timestamp",
    pattern: /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g,
    replacement: "<ISO_TS>",
  },
  {
    tag: "sqlite-timestamp",
    pattern: /\b\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\b/g,
    replacement: "<SQLITE_TS>",
  },
  {
    tag: "phpsessid-value",
    pattern: /PHPSESSID=[a-z0-9]{20,}/gi,
    replacement: "PHPSESSID=<SESSID>",
  },
  {
    tag: "chrysalis-sess-value",
    pattern: /chrysalis_sess=[A-Za-z0-9+/=_-]+/g,
    replacement: "chrysalis_sess=<SESSID>",
  },
  {
    tag: "uuid",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    replacement: "<UUID>",
  },
];

export const DEFAULT_HEADER_RULES: ReadonlyArray<NormalizeRule> = [
  {
    tag: "set-cookie-value",
    // Matches `name=value; attributes`, replacing just the value portion.
    pattern: /^([A-Za-z0-9_-]+)=([^;]*)/,
    replacement: "$1=<COOKIE_VALUE>",
  },
];

export interface Normalized {
  readonly body: string;
  readonly appliedTags: ReadonlyArray<string>;
}

export function normalizeBody(
  body: string,
  rules: ReadonlyArray<NormalizeRule> = DEFAULT_BODY_RULES,
): Normalized {
  const applied: string[] = [];
  let out = body;
  for (const rule of rules) {
    const before = out;
    out = out.replace(rule.pattern, rule.replacement);
    if (out !== before) applied.push(rule.tag);
  }
  // Collapse stretches of whitespace to a single space and trim — HTML differs
  // on line endings and indentation between PHP echo and emitted template.
  const collapsed = out.replace(/\s+/g, " ").trim();
  if (collapsed !== out) applied.push("whitespace");
  return { body: collapsed, appliedTags: Array.from(new Set(applied)) };
}

/**
 * Normalize a Set-Cookie header line (keep attributes, strip cookie value).
 */
export function normalizeSetCookie(raw: string): string {
  const rule = DEFAULT_HEADER_RULES[0]!;
  return raw.replace(rule.pattern, rule.replacement);
}

/**
 * Stable, diff-friendly summary of response headers. Drops transport-level
 * headers that vary trivially between servers (date, server, content-length),
 * and normalizes set-cookie values.
 */
const TRANSPORT_HEADERS = new Set(["date", "server", "content-length", "connection", "transfer-encoding", "keep-alive"]);

/** Compare redirect targets by path (PHP may emit absolute URLs; Hono uses relative). */
function normalizeLocationHeader(v: string): string {
  const t = v.trim();
  if (t === "") return t;
  try {
    const u = new URL(t, "http://chrysalis.verify.invalid");
    return u.pathname + u.search;
  } catch {
    return t;
  }
}

export function normalizeHeaders(headers: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    if (TRANSPORT_HEADERS.has(key)) continue;
    if (key === "set-cookie") {
      out[key] = normalizeSetCookie(v);
    } else if (key === "location") {
      out[key] = normalizeLocationHeader(v);
    } else {
      out[key] = v.trim();
    }
  }
  return out;
}
