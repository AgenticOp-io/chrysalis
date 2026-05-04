import type { HttpRequestEvent, HttpResponseEvent, Trace } from "@chrysalis/oracle";
import { attributeDivergenceToNodes } from "./attribute.js";
import { diffResponse, type ReplayedResponse } from "./diff.js";
import type { ReplayOptions, TraceOutcome } from "./replay-types.js";
import { traceDeterminismSeed } from "./replay-types.js";
import { buildSqlReplayTapeFromTrace, canSqlReplayTrace, encodeSqlTapeHeader } from "./sql-replay.js";

export async function replaySingleTrace(trace: Trace, opts: ReplayOptions): Promise<TraceOutcome | null> {
  return replayOne(trace, new Map(), opts);
}

export async function replayOne(
  trace: Trace,
  cookieJar: Map<string, string>,
  opts: ReplayOptions,
): Promise<TraceOutcome | null> {
  const req = trace.events.find((e) => e.type === "http.request") as HttpRequestEvent | undefined;
  const resp = trace.events.find((e) => e.type === "http.response") as HttpResponseEvent | undefined;
  if (!req || !resp) return null;

  const url = buildUrl(opts.baseUrl, req);
  const { body, contentType } = buildBody(req);
  const headers: Record<string, string> = {};
  if (contentType) headers["content-type"] = contentType;
  const accept = req.headers["accept"];
  if (accept) headers["accept"] = accept;

  // Jar chains Set-Cookie across traces; values on this trace win so the
  // replayed Cookie header matches the oracle request when the trace recorded
  // cookie names (including cleared or rotated session ids).
  const mergedCookies = new Map<string, string>();
  if (!opts.disableCookieChain) {
    for (const [k, v] of cookieJar) mergedCookies.set(k, v);
  }
  // `chrysalis_sid` is environment-specific; oracle traces carry PHP's id but
  // replay targets a fresh emitted server — chaining via the jar matches
  // sequential in-process replay (e.g. second GET /session/visit).
  for (const [k, v] of Object.entries(req.cookies)) {
    if (k === "chrysalis_sid") continue;
    if (v == null) continue;
    const s = typeof v === "string" ? v : String(v);
    if (s.length > 0) mergedCookies.set(k, s);
  }
  if (mergedCookies.size > 0) {
    headers["cookie"] = [...mergedCookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  if (opts.recordedSqlReplay === true && canSqlReplayTrace(trace)) {
    const tape = buildSqlReplayTapeFromTrace(trace);
    headers["x-chrysalis-sql-tape"] = encodeSqlTapeHeader(tape);
  }

  if (opts.injectDeterminismHeaders !== false) {
    headers["x-chrysalis-now-iso"] = trace.header.startedAt;
    headers["x-chrysalis-random-seed"] = String(traceDeterminismSeed(trace.header.traceId));
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
  const doFetch = opts.fetch ?? globalThis.fetch;
  const fetchInit: RequestInit = { ...init, signal: controller.signal };
  let actualResp: Response;
  try {
    const raw = await doFetch(url, fetchInit);
    actualResp = coerceFetchResultToResponse(raw, resp, url);
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
  const ok = diff.divergences.length === 0;
  let attributedNodeIds: readonly string[] | undefined;
  if (!ok && opts.module) {
    const ids = attributeDivergenceToNodes(opts.module, `${req.method} ${req.path}`, diff.divergences);
    if (ids.length > 0) attributedNodeIds = ids;
  }
  return {
    traceId: trace.header.traceId,
    route: `${req.method} ${req.path}`,
    expected: resp,
    actual,
    diff,
    ok,
    ...(attributedNodeIds ? { attributedNodeIds } : {}),
  };
}

/**
 * Hono in-process `app.fetch` may resolve to a bare body value when a handler
 * returns a string instead of a `Response`. Normalize so replay/diff always
 * sees a Fetch `Response` (status/Content-Type aligned with the oracle frame).
 */
function coerceFetchResultToResponse(raw: unknown, oracleResp: HttpResponseEvent, url: string): Response {
  if (raw instanceof globalThis.Response) return raw;
  if (typeof raw === "string") {
    const h = new Headers();
    const ctKey = Object.keys(oracleResp.headers).find((k) => k.toLowerCase() === "content-type");
    if (ctKey) {
      const ct = String(oracleResp.headers[ctKey] ?? "");
      if (ct) h.set("content-type", ct);
    }
    return new Response(raw, { status: oracleResp.status, headers: h });
  }
  throw new Error(
    `replay-http: fetch for ${url} returned ${raw === null || raw === undefined ? String(raw) : typeof raw} (expected Response)`,
  );
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
