/**
 * The Chimera proxy. A single Node HTTP server that sits in front of both
 * the legacy PHP app and the modern emitted app, dispatching per-request
 * based on the configured mode + routing table.
 *
 * Modes:
 *   - `legacy`   every request → legacy. Baseline; no behavior change.
 *   - `cutover`  routes with target=modern → modern; everything else → legacy.
 *                This is the migration mode: as you cut over a route, you
 *                add a rule.
 *   - `shadow`   every request → legacy (response returned to client);
 *                in parallel, a copy of the request is sent to modern and
 *                its response is diffed against legacy's. Diffs are appended
 *                to `shadowLogDir`/shadow.ndjson as one record per request.
 *                Client never sees modern's output. Modern's errors never
 *                affect the client.
 *   - `canary`   same routing table as cutover, but among requests that match
 *                a `modern` rule, only `canary.percentModern` percent (0–100)
 *                go to modern; the rest stay on legacy. Bucketing is
 *                deterministic from `stickinessCookie` / `stickinessHeader` /
 *                client IP + `salt` so the same user always sees the same stack.
 *
 * Headers:
 *   - Strips `host` and the hop-by-hop headers before forwarding.
 *   - Appends `x-chrysalis-target: legacy|modern` on the response for ops
 *     observability.
 *   - In shadow mode, also appends `x-chrysalis-shadow-diff: <ok|N>` where
 *     N is the number of divergences found.
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { diffResponse, type ReplayedResponse } from "@chrysalis/verify";
import { resolveCanaryTarget } from "./canary.js";
import {
  compileRules,
  routeFor,
  type ChimeraConfig,
  type CompiledRule,
  type Target,
} from "./routing.js";

const HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

export interface ChimeraHandle {
  readonly port: number;
  stop(): Promise<void>;
  /** Live read of counters since start. Useful for tests and dashboards. */
  stats(): ChimeraStats;
}

export interface ChimeraStats {
  readonly total: number;
  readonly byTarget: { legacy: number; modern: number };
  /** Only meaningful in shadow mode (zeros otherwise). */
  readonly shadow: {
    readonly requests: number;
    readonly agreed: number;
    /** Mirror returned a response but differed from legacy (non-empty diff). */
    readonly diverged: number;
    /** Sum of `divergences.length` across diverged shadow mirrors. */
    readonly divergenceLines: number;
    /** Modern mirror threw or fetch failed before a diff could run. */
    readonly mirrorErrors: number;
  };
  /** Only meaningful in canary mode (zeros otherwise). */
  readonly canary: {
    readonly modernRuleMatches: number;
    readonly servedModern: number;
    readonly servedLegacyWhileModernRule: number;
    readonly noModernRule: number;
  };
}

export async function startChimera(config: ChimeraConfig): Promise<ChimeraHandle> {
  if (config.mode === "canary" && !config.canary) {
    throw new Error("chimera: mode 'canary' requires config.canary settings");
  }
  const rules = compileRules(config.rules);
  const stats = {
    total: 0,
    byTarget: { legacy: 0, modern: 0 },
    shadow: { requests: 0, agreed: 0, diverged: 0, divergenceLines: 0, mirrorErrors: 0 },
    canary: {
      modernRuleMatches: 0,
      servedModern: 0,
      servedLegacyWhileModernRule: 0,
      noModernRule: 0,
    },
  };

  const shadowLogPath =
    config.mode === "shadow" && config.shadowLogDir
      ? join(config.shadowLogDir, "shadow.ndjson")
      : null;
  if (shadowLogPath) mkdirSync(dirname(shadowLogPath), { recursive: true });

  const server: Server = createServer(async (req, res) => {
    stats.total += 1;
    try {
      await handle(req, res, config, rules, stats, shadowLogPath);
    } catch (err) {
      // Defensive: the proxy itself must never crash the client connection.
      if (!res.headersSent) {
        res.statusCode = 502;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end(`chimera proxy error: ${(err as Error).message}`);
      } else {
        try {
          res.end();
        } catch {
          /* already closed */
        }
      }
    }
  });

  const listenHost = config.host ?? "127.0.0.1";
  const listenPort = config.port ?? 0;
  const port = await new Promise<number>((resolve, reject) => {
    server.listen(listenPort, listenHost, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") resolve(addr.port);
      else reject(new Error("chimera: could not determine listening port"));
    });
  });

  return {
    port,
    stats: () => ({
      total: stats.total,
      byTarget: { ...stats.byTarget },
      shadow: { ...stats.shadow },
      canary: { ...stats.canary },
    }),
    stop: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  config: ChimeraConfig,
  rules: ReadonlyArray<CompiledRule>,
  stats: {
    total: number;
    byTarget: { legacy: number; modern: number };
    shadow: {
      requests: number;
      agreed: number;
      diverged: number;
      divergenceLines: number;
      mirrorErrors: number;
    };
    canary: {
      modernRuleMatches: number;
      servedModern: number;
      servedLegacyWhileModernRule: number;
      noModernRule: number;
    };
  },
  shadowLogPath: string | null,
): Promise<void> {
  const method = req.method ?? "GET";
  const path = (req.url ?? "/").split("?")[0] ?? "/";
  const body = await readBody(req);

  // Resolve target.
  let target: Target;
  if (config.mode === "legacy" || config.mode === "shadow") {
    target = "legacy";
  } else if (config.mode === "canary") {
    const m = routeFor(rules, method, path);
    const ruleTarget = m?.target ?? "legacy";
    const r = resolveCanaryTarget({
      eligibleModern: ruleTarget === "modern",
      settings: config.canary!,
      req,
    });
    target = r.target;
    res.setHeader("x-chrysalis-canary", r.canaryTag);
    if (ruleTarget === "modern") {
      stats.canary.modernRuleMatches += 1;
      if (target === "modern") stats.canary.servedModern += 1;
      else stats.canary.servedLegacyWhileModernRule += 1;
    } else {
      stats.canary.noModernRule += 1;
    }
  } else {
    // cutover: routes with target=modern beat the default; default is legacy.
    const m = routeFor(rules, method, path);
    target = m?.target ?? "legacy";
  }

  const primary = await forward(target, req, body, config);
  stats.byTarget[target] += 1;

  if (config.mode === "shadow") {
    stats.shadow.requests += 1;
    // Fire-and-observe the modern side. We intentionally do not await this
    // before returning the client response — shadow diff must never
    // increase user-visible latency.
    void shadowDiffInBackground(
      req,
      body,
      primary,
      config,
      stats,
      shadowLogPath,
      path,
      method,
    );
    res.setHeader("x-chrysalis-target", "legacy-shadow");
  } else {
    res.setHeader("x-chrysalis-target", target);
  }

  writeResponse(res, primary);
}

async function shadowDiffInBackground(
  req: IncomingMessage,
  body: Buffer,
  primary: ReplayedResponse,
  config: ChimeraConfig,
  stats: {
    shadow: {
      requests: number;
      agreed: number;
      diverged: number;
      divergenceLines: number;
      mirrorErrors: number;
    };
  },
  shadowLogPath: string | null,
  path: string,
  method: string,
): Promise<void> {
  try {
    const mirror = await forward("modern", req, body, config);
    // Synthesize an "expected" HttpResponseEvent shape from the primary so
    // we can reuse @chrysalis/verify's diff.
    const expected = {
      type: "http.response" as const,
      status: primary.status,
      headers: primary.headers,
      body: primary.body,
      bodyTruncated: false,
      session: {},
    };
    const d = diffResponse(expected, mirror);
    if (d.divergences.length === 0) stats.shadow.agreed += 1;
    else {
      stats.shadow.diverged += 1;
      stats.shadow.divergenceLines += d.divergences.length;
    }
    if (shadowLogPath) {
      const record = {
        at: new Date().toISOString(),
        method,
        path,
        legacyStatus: primary.status,
        modernStatus: mirror.status,
        divergences: d.divergences,
        bodySimilarity: d.bodySimilarity,
        appliedTags: d.appliedTags,
      };
      appendFileSync(shadowLogPath, JSON.stringify(record) + "\n");
    }
  } catch (err) {
    stats.shadow.mirrorErrors += 1;
    if (shadowLogPath) {
      appendFileSync(
        shadowLogPath,
        JSON.stringify({
          at: new Date().toISOString(),
          method,
          path,
          error: (err as Error).message,
        }) + "\n",
      );
    }
  }
}

async function forward(
  target: Target,
  req: IncomingMessage,
  body: Buffer,
  config: ChimeraConfig,
): Promise<ReplayedResponse> {
  const base = target === "legacy" ? config.legacy : config.modern;
  const url = new URL(req.url ?? "/", base);
  const method = (req.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    const key = k.toLowerCase();
    if (HOP_HEADERS.has(key)) continue;
    headers[key] = Array.isArray(v) ? v.join(", ") : String(v);
  }

  const init: RequestInit = {
    method,
    headers,
    redirect: "manual",
  };
  if (method !== "GET" && method !== "HEAD" && body.length > 0) {
    init.body = body;
  }

  const response = await fetch(url, init);
  const respHeaders: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    respHeaders[k.toLowerCase()] = v;
  });
  const respBody = await response.text();
  return { status: response.status, headers: respHeaders, body: respBody };
}

function writeResponse(res: ServerResponse, r: ReplayedResponse): void {
  for (const [k, v] of Object.entries(r.headers)) {
    if (HOP_HEADERS.has(k.toLowerCase())) continue;
    res.setHeader(k, v);
  }
  res.statusCode = r.status;
  res.end(r.body);
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
