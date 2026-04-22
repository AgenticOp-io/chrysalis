/**
 * Structural diff between a captured http.response and a replayed one.
 */

import type { HttpResponseEvent } from "@chrysalis/oracle";
import { normalizeBody, normalizeHeaders } from "./normalize.js";

export type DivergenceKind =
  | "status-mismatch"
  | "header-mismatch"
  | "body-mismatch";

export interface Divergence {
  readonly kind: DivergenceKind;
  readonly detail: string;
  readonly expected: string;
  readonly actual: string;
}

export interface ReplayedResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export interface DiffOptions {
  /** Headers that must match exactly after normalization. */
  readonly strictHeaders?: ReadonlyArray<string>;
  /** Body similarity threshold (0..1). Below this, we report a body-mismatch. */
  readonly bodySimilarityThreshold?: number;
}

export interface DiffResult {
  readonly divergences: ReadonlyArray<Divergence>;
  /** 0..1 similarity score for the body (1 = identical after normalization). */
  readonly bodySimilarity: number;
  /** Which normalization tags fired on expected/actual bodies. */
  readonly appliedTags: ReadonlyArray<string>;
}

const DEFAULT_STRICT_HEADERS: ReadonlyArray<string> = ["location", "content-type"];

export function diffResponse(
  expected: HttpResponseEvent,
  actual: ReplayedResponse,
  opts: DiffOptions = {},
): DiffResult {
  const divergences: Divergence[] = [];
  const strictHeaders = (opts.strictHeaders ?? DEFAULT_STRICT_HEADERS).map((h) => h.toLowerCase());
  const threshold = opts.bodySimilarityThreshold ?? 0.9;

  if (expected.status !== actual.status) {
    divergences.push({
      kind: "status-mismatch",
      detail: `status code differs`,
      expected: String(expected.status),
      actual: String(actual.status),
    });
  }

  const expH = normalizeHeaders(expected.headers);
  const actH = normalizeHeaders(actual.headers);
  for (const name of strictHeaders) {
    const e = expH[name];
    const a = actH[name];
    if (e === undefined && a === undefined) continue;
    // Content-Type: compare the mime type only, ignore charset/param drift.
    // PHP sends `text/html; charset=UTF-8`; Hono/Node may send just
    // `text/html; charset=UTF-8` or `text/html`. The *mime type* is what
    // matters for integration correctness.
    const ev = name === "content-type" ? mimeOnly(e) : e;
    const av = name === "content-type" ? mimeOnly(a) : a;
    if (ev !== av) {
      divergences.push({
        kind: "header-mismatch",
        detail: `header '${name}'`,
        expected: String(e ?? ""),
        actual: String(a ?? ""),
      });
    }
  }

  const nExp = normalizeBody(expected.body);
  const nAct = normalizeBody(actual.body);
  const similarity = jaccardTokenSimilarity(nExp.body, nAct.body);
  if (similarity < threshold) {
    divergences.push({
      kind: "body-mismatch",
      detail: `body similarity ${similarity.toFixed(3)} < ${threshold}`,
      expected: truncate(nExp.body, 400),
      actual: truncate(nAct.body, 400),
    });
  }

  return {
    divergences,
    bodySimilarity: similarity,
    appliedTags: Array.from(new Set([...nExp.appliedTags, ...nAct.appliedTags])),
  };
}

/**
 * Jaccard similarity over tokenized bodies. Stable, symmetric, and doesn't
 * depend on character-level positioning — so reordered attributes in HTML
 * don't tank the score but real content divergence does.
 */
function jaccardTokenSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 1 : inter / union;
}

function mimeOnly(ct: string | undefined): string | undefined {
  if (ct == null) return ct;
  const i = ct.indexOf(";");
  return (i >= 0 ? ct.slice(0, i) : ct).trim().toLowerCase();
}

function tokenize(s: string): Set<string> {
  const tokens = new Set<string>();
  // Words and tag names; keep HTML entities together.
  for (const m of s.matchAll(/[A-Za-z][A-Za-z0-9_-]*|\&[a-z]+;|\d+/g)) {
    tokens.add(m[0].toLowerCase());
  }
  return tokens;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + "…";
}
