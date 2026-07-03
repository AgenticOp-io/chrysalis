import type { IncomingMessage, ServerResponse } from "node:http";
import type { Module } from "@chrysalis/webir";
import { moduleFromGoldenSnapshot } from "@chrysalis/webir";
import { DEFAULT_STUB_DB, simulateHandler, type RequestInput, type SimValue, type StubDb } from "@chrysalis/rewrite";
import { compileCwlRoutes, matchCwlRoute, type CompiledCwlRoute } from "./route-match.js";

export const CWL_RUNTIME_KIND = "chrysalis.cwl.runtime" as const;
export const CWL_RUNTIME_SCHEMA_VERSION = 1 as const;

export interface CwlRuntimeConfig {
  readonly module: Module;
  readonly db?: StubDb;
  readonly nowIso?: string;
  readonly randomSeed?: string;
  /** Injected session map for preview/runtime (Phase 10 — verify remains authoritative). */
  readonly session?: Readonly<Record<string, SimValue>>;
  /** Optional cookie/header → session resolver (overrides `session` when set). */
  readonly resolveSession?: (ctx: {
    readonly cookies: Readonly<Record<string, string>>;
    readonly headers: Headers;
  }) => Readonly<Record<string, SimValue>>;
}

export interface CwlRuntimeHandle {
  readonly kind: typeof CWL_RUNTIME_KIND;
  readonly schemaVersion: typeof CWL_RUNTIME_SCHEMA_VERSION;
  readonly routes: readonly CompiledCwlRoute[];
  fetch(input: Request | { method: string; url: string; headers?: HeadersInit; body?: string }): Promise<Response>;
  handleNodeRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
  stop(): Promise<void>;
}

function parseQuery(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  const q = search.startsWith("?") ? search.slice(1) : search;
  if (!q) return out;
  for (const part of q.split("&")) {
    if (!part) continue;
    const [k, v = ""] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return out;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function simToResponse(sim: ReturnType<typeof simulateHandler>): Response {
  if (sim.redirectTo) {
    return new Response(null, { status: sim.status || 302, headers: { Location: sim.redirectTo } });
  }
  const body = sim.body;
  const headers = new Headers();
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed === "true" || trimmed === "false") {
    headers.set("content-type", "application/json; charset=utf-8");
  } else if (trimmed.startsWith("<")) {
    headers.set("content-type", "text/html; charset=utf-8");
  } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  const status = sim.status || 200;
  if (status === 204 || status === 304) {
    return new Response(null, { status, headers });
  }
  return new Response(body, { status, headers });
}

function buildRequestInput(
  method: string,
  url: URL,
  headers: Headers,
  pathParams: Record<string, string>,
  session: Readonly<Record<string, SimValue>>,
): RequestInput {
  return {
    method: method.toUpperCase(),
    path: url.pathname,
    query: parseQuery(url.search),
    post: {},
    cookies: parseCookies(headers.get("cookie") ?? undefined),
    session: { ...session },
    pathParams,
  };
}

export function createCwlRuntime(config: CwlRuntimeConfig): CwlRuntimeHandle {
  const routes = compileCwlRoutes(config.module);
  const db = config.db ?? DEFAULT_STUB_DB;

  async function dispatch(method: string, url: URL, headers: Headers): Promise<Response> {
    const match = matchCwlRoute(routes, method, url.pathname);
    if (!match) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    const cookies = parseCookies(headers.get("cookie") ?? undefined);
    const session =
      config.resolveSession !== undefined
        ? config.resolveSession({ cookies, headers })
        : { ...(config.session ?? {}) };
    const input = buildRequestInput(method, url, headers, match.pathParams, session);
    const sim = simulateHandler(config.module, match.route.routeNodeId, input, db);
    if (sim.errors.length > 0) {
      return new Response(
        JSON.stringify({ error: "cwl-runtime:simulation-inconclusive", errors: sim.errors }),
        { status: 501, headers: { "content-type": "application/json" } },
      );
    }
    return simToResponse(sim);
  }

  return {
    kind: CWL_RUNTIME_KIND,
    schemaVersion: CWL_RUNTIME_SCHEMA_VERSION,
    routes,
    async fetch(input) {
      if (input instanceof Request) {
        const url = new URL(input.url);
        return dispatch(input.method, url, input.headers);
      }
      const url = new URL(input.url);
      const headers = new Headers(input.headers ?? {});
      return dispatch(input.method, url, headers);
    },
    async handleNodeRequest(req, res) {
      const host = req.headers.host ?? "127.0.0.1";
      const url = new URL(req.url ?? "/", `http://${host}`);
      const response = await dispatch(req.method ?? "GET", url, new Headers(req.headers as HeadersInit));
      res.statusCode = response.status;
      response.headers.forEach((v, k) => {
        res.setHeader(k, v);
      });
      const buf = Buffer.from(await response.arrayBuffer());
      res.end(buf);
    },
    async stop() {
      /* no-op for in-process runtime */
    },
  };
}

export function loadModuleFromGoldenJson(json: string): Module {
  return moduleFromGoldenSnapshot(json);
}
