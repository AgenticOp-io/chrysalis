#!/usr/bin/env node
/**
 * HTTP Archive (HAR) → CWL migration contract (Stage-B "Sink" sibling to OpenAPI import).
 *
 * Observed traffic becomes a reviewable CWL contract: each unique `(method, pathname)`
 * pair is one route with the recorded status, content-type, IDENT-safe queryString /
 * URL query params with observed values as defaults when present (G10074 — never
 * invent when absent), IDENT-safe request headers, IDENT-safe `cookies[]` names
 * (when present — never invented), flat JSON `postData` keys as `body` params,
 * IDENT-safe response headers (hop-by-hop skipped — same policy as request headers),
 * and a flat JSON/text response body when parseable. Non-flat or missing bodies
 * become honest holes — never invented values (DESIGN non-negotiable #6). Paths stay
 * concrete (no `/items/1` → `/items/:id` invent).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCwlRoutes } from "./hub-webir-routes.mjs";
import {
  attachContractResponseBody,
  HAR_SKIP_HEADER_NAMES,
  isFlatRenderable,
  isIdentSafeName,
  sanitizeHandlerName,
} from "./hub-contract-cwl-shared.mjs";

export const HUB_HAR_CWL_KIND = "chrysalis.hub.har-to-cwl";
export const HUB_HAR_CWL_SCHEMA_VERSION = 1;

/**
 * Parse a HAR request URL into pathname + query bindings.
 * @param {object} request
 * @returns {{ pathname: string, query: Array<{ name: string, value?: string }> }}
 */
export function parseHarRequestUrl(request) {
  const url = String(request?.url ?? "");
  /** @type {Array<{ name: string, value?: string }>} */
  const query = [];
  let pathname = "/";
  try {
    const u = new URL(url);
    pathname = u.pathname || "/";
    for (const [name, value] of u.searchParams.entries()) {
      if (isIdentSafeName(name)) query.push({ name, value });
    }
  } catch {
    const qIdx = url.indexOf("?");
    const pathPart = qIdx >= 0 ? url.slice(0, qIdx) : url;
    pathname = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  }
  if (Array.isArray(request?.queryString)) {
    for (const q of request.queryString) {
      const name = String(q?.name ?? "");
      if (!isIdentSafeName(name)) continue;
      if (!query.some((x) => x.name === name)) {
        // Absent/null value → name-only peel (no invent). Empty string is observed.
        if (q?.value === undefined || q?.value === null) {
          query.push({ name });
        } else {
          query.push({ name, value: String(q.value) });
        }
      }
    }
  }
  return { pathname, query };
}

/**
 * IDENT-safe HAR query params → CWL `query` (G10074).
 * Observed values become defaults when present; absent/empty queryString → no invent.
 * Hyphenated names skipped — no invent rename.
 * @param {Array<{ name: string, value?: string }>} query
 * @returns {Array<{ name: string, source: "query", default?: string }>}
 */
export function parseHarQueryParams(query) {
  /** @type {Array<{ name: string, source: "query", default?: string }>} */
  const out = [];
  if (!Array.isArray(query)) return out;
  const seen = new Set();
  for (const q of query) {
    const name = String(q?.name ?? "");
    if (!isIdentSafeName(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    /** @type {{ name: string, source: "query", default?: string }} */
    const entry = { name, source: "query" };
    if (q?.value !== undefined && q?.value !== null) entry.default = String(q.value);
    out.push(entry);
  }
  return out;
}

/**
 * IDENT-safe request headers from a HAR request (hyphenated names skipped — no invent rename).
 * @param {object} request
 * @returns {Array<{ name: string, source: "header" }>}
 */
export function parseHarRequestHeaders(request) {
  /** @type {Array<{ name: string, source: "header" }>} */
  const out = [];
  if (!Array.isArray(request?.headers)) return out;
  const seen = new Set();
  for (const h of request.headers) {
    const name = String(h?.name ?? "");
    if (!isIdentSafeName(name)) continue;
    const lower = name.toLowerCase();
    if (HAR_SKIP_HEADER_NAMES.has(lower)) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push({ name, source: "header" });
  }
  return out;
}

/**
 * IDENT-safe response headers from a HAR response (G10054).
 * Skips hop-by-hop noise (`host` / `content-length` / `connection`) and
 * `content-type` (already a dedicated CWL statement). Hyphenated names skipped.
 * Absent/empty → no invent.
 * @param {object} response
 * @returns {Array<{ name: string, default: string }>}
 */
export function parseHarResponseHeaders(response) {
  /** @type {Array<{ name: string, default: string }>} */
  const out = [];
  if (!Array.isArray(response?.headers)) return out;
  const seen = new Set();
  for (const h of response.headers) {
    const name = String(h?.name ?? "");
    if (!isIdentSafeName(name)) continue;
    const lower = name.toLowerCase();
    if (HAR_SKIP_HEADER_NAMES.has(lower) || lower === "content-type") continue;
    if (seen.has(lower)) continue;
    const value = h?.value;
    if (value === undefined || value === null) continue;
    seen.add(lower);
    out.push({ name, default: String(value) });
  }
  return out;
}

/**
 * IDENT-safe request cookies from a HAR request (absent/empty → no invent).
 * Hyphenated names skipped — no invent rename.
 * @param {object} request
 * @returns {Array<{ name: string, source: "cookie" }>}
 */
export function parseHarRequestCookies(request) {
  /** @type {Array<{ name: string, source: "cookie" }>} */
  const out = [];
  if (!Array.isArray(request?.cookies)) return out;
  const seen = new Set();
  for (const c of request.cookies) {
    const name = String(c?.name ?? "");
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, source: "cookie" });
  }
  return out;
}

/**
 * Flat JSON postData → body params with observed defaults.
 * @param {object} request
 * @returns {Array<{ name: string, source: "body", default?: unknown }>}
 */
export function parseHarPostDataBodyParams(request) {
  /** @type {Array<{ name: string, source: "body", default?: unknown }>} */
  const out = [];
  const post = request?.postData;
  if (!post || typeof post !== "object") return out;
  const mime = String(post.mimeType ?? "");
  const text = post.text;
  if (text === undefined || text === null || text === "") return out;
  if (!mime.includes("json")) return out;
  try {
    const parsed = JSON.parse(text);
    if (!isFlatRenderable(parsed) || typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return out;
    }
    for (const [k, v] of Object.entries(parsed)) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) continue;
      const entry = { name: k, source: "body" };
      if (v === null || ["string", "number", "boolean"].includes(typeof v)) entry.default = v;
      out.push(entry);
    }
  } catch {
    return out;
  }
  return out;
}

/**
 * @param {object | null | undefined} content
 * @param {number} status
 */
export function parseHarResponseBody(content, status) {
  if (status === 204 || status === 304) return { body: "" };
  const mime = String(content?.mimeType ?? "");
  const text = content?.text;
  if (text === undefined || text === null || text === "") {
    if (Number(content?.size ?? 0) === 0 && (status === 204 || status === 304)) return { body: "" };
    return { holeReason: "har:no-response-body" };
  }
  if (mime.includes("json")) {
    try {
      const parsed = JSON.parse(text);
      if (isFlatRenderable(parsed)) return { body: parsed };
      return { holeReason: "har:nested-response-body" };
    } catch {
      return { holeReason: "har:invalid-json-body" };
    }
  }
  if (typeof text === "string") return { body: text };
  return { holeReason: "har:no-response-body" };
}

/**
 * Convert a HAR document into CWL route objects.
 * @param {object} doc
 */
export function harDocToCwlRoutes(doc) {
  const entries = doc?.log?.entries;
  if (!Array.isArray(entries)) return [];
  /** @type {Map<string, object>} */
  const seen = new Map();

  for (const entry of entries) {
    const req = entry?.request;
    const res = entry?.response;
    if (!req?.method) continue;
    const method = String(req.method).toUpperCase();
    const { pathname, query } = parseHarRequestUrl(req);
    const key = `${method} ${pathname}`;
    if (seen.has(key)) continue;

    const status = Number(res?.status ?? 200);
    const content = res?.content;
    const mime = String(content?.mimeType ?? "");
    const contentType =
      status === 204 || status === 304
        ? undefined
        : mime.includes("json")
          ? "application/json"
          : mime.includes("html")
            ? "text/html; charset=utf-8"
            : mime
              ? mime
              : "text/plain; charset=utf-8";

    const params = [
      ...parseHarQueryParams(query),
      ...parseHarRequestHeaders(req),
      ...parseHarRequestCookies(req),
      ...parseHarPostDataBodyParams(req),
    ];
    const responseHeaders = parseHarResponseHeaders(res);

    /** @type {object} */
    const route = {
      method,
      path: pathname,
      handlerName: sanitizeHandlerName(null, method, pathname),
      status,
      params,
    };
    if (responseHeaders.length > 0) route.responseHeaders = responseHeaders;

    const parsed = parseHarResponseBody(content, status);
    if (parsed.holeReason) {
      attachContractResponseBody(route, status, contentType, undefined, parsed.holeReason, "har:nested-response-body");
    } else {
      attachContractResponseBody(route, status, contentType, parsed.body, "har:no-response-body", "har:nested-response-body");
    }
    seen.set(key, route);
  }

  return [...seen.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

/**
 * @param {object} doc
 * @param {{ moduleName?: string, title?: string }} [opts]
 */
export function renderHarCwl(doc, opts = {}) {
  const routes = harDocToCwlRoutes(doc);
  const moduleName = (opts.moduleName ?? "imported").replace(/[^a-zA-Z0-9_]+/g, "_") || "imported";
  const title = opts.title ?? "HAR capture";
  const rendered = renderCwlRoutes(routes, {
    header: `# Chrysalis migration contract — imported from HAR (${title})`,
    moduleName,
    surfaceOnHole: true,
  });
  return { ...rendered, routes };
}

/**
 * @param {string} harPath
 * @param {{ out?: string, moduleName?: string }} [opts]
 */
export async function importHarFileToCwl(harPath, opts = {}) {
  const abs = resolve(harPath);
  if (!existsSync(abs)) {
    return { kind: HUB_HAR_CWL_KIND, schemaVersion: HUB_HAR_CWL_SCHEMA_VERSION, ok: false, reason: "no-har", harPath: abs };
  }
  let doc;
  try {
    doc = JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    return {
      kind: HUB_HAR_CWL_KIND,
      schemaVersion: HUB_HAR_CWL_SCHEMA_VERSION,
      ok: false,
      reason: "invalid-json",
      harPath: abs,
      error: String(e?.message ?? e),
    };
  }
  const { text, holeCount, routeCount, routes } = renderHarCwl(doc, { moduleName: opts.moduleName });
  const outPath = opts.out ? resolve(opts.out) : join(dirname(abs), "routes.cwl");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, text, "utf8");
  return {
    kind: HUB_HAR_CWL_KIND,
    schemaVersion: HUB_HAR_CWL_SCHEMA_VERSION,
    ok: true,
    harPath: abs,
    cwlPath: outPath,
    routeCount,
    holeCount,
    holeFree: routeCount - holeCount,
    withStatus: routes.filter((r) => typeof r.status === "number" && r.status !== 200).length,
    withParams: routes.filter((r) => Array.isArray(r.params) && r.params.length > 0).length,
  };
}

function parseArgs(argv) {
  let har = null;
  let out = null;
  let jsonOut = null;
  let moduleName;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--har" && argv[i + 1]) har = resolve(argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--module" && argv[i + 1]) moduleName = argv[++i];
  }
  return { har, out, jsonOut, moduleName };
}

async function main() {
  const { har, out, jsonOut, moduleName } = parseArgs(process.argv);
  if (!har) {
    console.error("usage: hub-har-to-cwl.mjs --har <capture.har.json> [--out routes.cwl] [--module name] [--json-out path]");
    process.exit(1);
  }
  const report = await importHarFileToCwl(har, { out, moduleName });
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
