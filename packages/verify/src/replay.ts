/**
 * Corpus replay: turn a TraceCorpus into a sequence of HTTP requests against
 * a running generated app, diff each response against what was captured, and
 * return a per-trace VerifyOutcome.
 *
 * Milestone 1 scope:
 *   - Single-user cookie chaining: cookies from each response feed into the
 *     next request in timestamp order. Good enough for the tiny-blog driver,
 *     which is single-user. Multi-user cookie threading is a Milestone 2 task.
 *   - Replay targets a running HTTP server via global `fetch`. Any emit
 *     backend that speaks HTTP is compatible (not Hono-specific).
 *   - No SQL-level replay (the generated app uses its own DB, which is
 *     expected to be seeded to the same initial state as the PHP fixture).
 */

import type { HttpRequestEvent, HttpResponseEvent, Trace, TraceCorpus } from "@chrysalis/oracle";
import { diffResponse, type DiffResult, type ReplayedResponse } from "./diff.js";

export interface ReplayOptions {
  readonly baseUrl: string;
  /**
   * Optional hook invoked *before* each request, after cookies are assembled.
   * Useful for tests that need to inspect/modify request construction without
   * monkey-patching fetch.
   */
  readonly onRequest?: (r: { url: string; init: RequestInit }) => void;
  /**
   * Skip cookie chaining. Defaults to false. Handy when the emitted app has a
   * different session cookie name and you want each trace replayed fresh.
   */
  readonly disableCookieChain?: boolean;
  /**
   * Request timeout in ms. Defaults to 10000.
   */
  readonly timeoutMs?: number;
}

export interface TraceOutcome {
  readonly traceId: string;
  readonly route: string; // "METHOD PATH"
  readonly expected: HttpResponseEvent;
  readonly actual: ReplayedResponse;
  readonly diff: DiffResult;
  readonly ok: boolean; // true iff diff has zero divergences
}

export async function replayCorpus(
  corpus: TraceCorpus,
  opts: ReplayOptions,
): Promise<TraceOutcome[]> {
  // Replay must be deterministic, so sort by startedAt (already done by the
  // reader, but defensive here too).
  const ordered = [...corpus.traces].sort((a, b) =>
    a.header.startedAt.localeCompare(b.header.startedAt),
  );
  const cookieJar = new Map<string, string>();
  const outcomes: TraceOutcome[] = [];
  for (const trace of ordered) {
    const outcome = await replayOne(trace, cookieJar, opts);
    if (outcome) outcomes.push(outcome);
  }
  return outcomes;
}

async function replayOne(
  trace: Trace,
  cookieJar: Map<string, string>,
  opts: ReplayOptions,
): Promise<TraceOutcome | null> {
  const req = trace.events.find((e) => e.type === "http.request") as HttpRequestEvent | undefined;
  const resp = trace.events.find((e) => e.type === "http.response") as
    | HttpResponseEvent
    | undefined;
  if (!req || !resp) return null;

  const url = buildUrl(opts.baseUrl, req);
  const { body, contentType } = buildBody(req);
  const headers: Record<string, string> = {};
  // Pass through content-type so the emitted app parses form bodies correctly.
  if (contentType) headers["content-type"] = contentType;
  // Accept header: if the original had one, use it (some emitted templates
  // content-negotiate). Default to text/html for GETs.
  const accept = req.headers["accept"];
  if (accept) headers["accept"] = accept;

  if (!opts.disableCookieChain && cookieJar.size > 0) {
    headers["cookie"] = [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (body !== undefined) init.body = body;

  opts.onRequest?.({ url, init });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  let actualResp: Response;
  try {
    actualResp = await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  const actual: ReplayedResponse = {
    status: actualResp.status,
    headers: responseHeadersToMap(actualResp),
    body: await actualResp.text(),
  };

  if (!opts.disableCookieChain) {
    updateCookieJar(cookieJar, actualResp);
  }

  const diff = diffResponse(resp, actual);
  return {
    traceId: trace.header.traceId,
    route: `${req.method} ${req.path}`,
    expected: resp,
    actual,
    diff,
    ok: diff.divergences.length === 0,
  };
}

function buildUrl(baseUrl: string, req: HttpRequestEvent): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const qs = Object.keys(req.query).length
    ? "?" + new URLSearchParams(Object.entries(req.query)).toString()
    : "";
  return `${base}${req.path}${qs}`;
}

function buildBody(req: HttpRequestEvent): { body?: string; contentType?: string } {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return {};
  if (req.post && Object.keys(req.post).length > 0) {
    // post is `Record<string, unknown>`; URLSearchParams wants string values.
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.post)) {
      if (v == null) continue;
      params.set(k, typeof v === "string" ? v : JSON.stringify(v));
    }
    return {
      body: params.toString(),
      contentType: req.headers["content-type"] ?? "application/x-www-form-urlencoded",
    };
  }
  if (req.rawBody != null) {
    return {
      body: req.rawBody,
      contentType: req.headers["content-type"] ?? "application/octet-stream",
    };
  }
  return {};
}

function responseHeadersToMap(r: Response): Record<string, string> {
  const out: Record<string, string> = {};
  r.headers.forEach((v, k) => {
    out[k.toLowerCase()] = v;
  });
  return out;
}

function updateCookieJar(jar: Map<string, string>, r: Response): void {
  // Some runtimes expose `getSetCookie()`; fall back to a single `set-cookie`.
  const gsc = (r.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  const lines = typeof gsc === "function" ? gsc.call(r.headers) : [];
  if (lines.length === 0) {
    const sc = r.headers.get("set-cookie");
    if (sc) lines.push(sc);
  }
  for (const line of lines) {
    const m = line.match(/^([^=;\s]+)=([^;]*)/);
    if (!m) continue;
    const [, name, value] = m as unknown as [string, string, string];
    // Expires in the past → delete.
    const expires = /expires=([^;]+)/i.exec(line);
    if (expires) {
      const t = Date.parse(expires[1] ?? "");
      if (Number.isFinite(t) && t < Date.now()) {
        jar.delete(name);
        continue;
      }
    }
    jar.set(name, value);
  }
}
