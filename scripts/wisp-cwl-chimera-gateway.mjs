#!/usr/bin/env node
/**
 * WISP chimera gateway: CWL UI routes + /api upstream proxy + optional SvelteKit fallback.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadWispPipelineConfig } from "./wisp-cwl-pipeline.mjs";

export const WISP_CHIMERA_GATEWAY_KIND = "chrysalis.wisp.chimera-gateway";
export const WISP_CHIMERA_GATEWAY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function resolveRepoRoot(opts) {
  if (opts.repoRoot) return resolve(opts.repoRoot);
  if (process.env.CHRYSALIS_REPO) return resolve(process.env.CHRYSALIS_REPO);
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const gceDefault = join(home, "chrysalis-test");
  if (home && existsSync(join(gceDefault, "packages/runtime-cwl/dist/index.js"))) return gceDefault;
  return scriptRoot;
}
const HOP = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade", "host", "content-length"]);

/** @type {Record<string, { file: string; contentType: string }>} */
export const WISP_CHIMERA_STATIC_ASSETS = {
  "/favicon.ico": { file: "favicon.svg", contentType: "image/svg+xml" },
  "/favicon.svg": { file: "favicon.svg", contentType: "image/svg+xml" },
};

/**
 * @param {string} pathname
 * @param {string} staticDir
 * @param {import("node:http").ServerResponse} res
 * @param {string} [method]
 * @returns {boolean}
 */
export function serveWispChimeraStaticAsset(pathname, staticDir, res, method = "GET") {
  const spec = WISP_CHIMERA_STATIC_ASSETS[pathname];
  if (!spec) return false;
  const fp = join(staticDir, spec.file);
  if (!existsSync(fp)) return false;
  res.statusCode = 200;
  res.setHeader("content-type", spec.contentType);
  res.setHeader("cache-control", "public, max-age=86400");
  res.setHeader("x-chrysalis-wisp-proxy", "static");
  if (method === "HEAD") res.end();
  else res.end(readFileSync(fp));
  return true;
}

/** @param {string} cwlPath */
function resolveStaticDir(cwlPath) {
  if (process.env.WISP_STATIC_DIR) return resolve(process.env.WISP_STATIC_DIR);
  return dirname(resolve(cwlPath));
}

/** @param {string} path */
function isCwlNativePath(path) {
  const raw = process.env.WISP_CWL_NATIVE_PREFIXES ?? "*";
  const prefixes = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (prefixes.includes("*")) return !path.startsWith("/api/");
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/** @param {import("node:http").IncomingMessage} req */
function cloneHeaders(req, targetUrl) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null || HOP.has(k.toLowerCase())) continue;
    out[k] = Array.isArray(v) ? v.join(", ") : v;
  }
  out.host = targetUrl.host;
  return out;
}

/** @param {import("node:http").IncomingMessage} req */
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} targetBase
 */
export async function proxyHttp(req, res, targetBase, proxyKind = "backend") {
  res.setHeader("x-chrysalis-wisp-proxy", proxyKind);
  const host = req.headers.host ?? "127.0.0.1";
  const incoming = new URL(req.url ?? "/", `http://${host}`);
  const target = new URL(incoming.pathname + incoming.search, targetBase.replace(/\/$/, ""));
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
  const headers = cloneHeaders(req, target);
  try {
    const upstream = await fetch(target, { method: req.method ?? "GET", headers, body, redirect: "manual" });
    res.statusCode = upstream.status;
    upstream.headers.forEach((v, k) => {
      if (!HOP.has(k.toLowerCase())) res.setHeader(k, v);
    });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "upstream-unreachable", detail: String(e) }));
  }
}

/** @param {object} opts */
export function shouldUseWispNativeApi(opts = {}) {
  if (opts.nativeApi === true) return true;
  if (opts.nativeApi === false) return false;
  if (process.env.WISP_CWL_NATIVE_API === "1") return true;
  const pipeline = loadWispPipelineConfig();
  return pipeline.gce?.nativeApi === true || pipeline.gce?.apiMode === "runtime-cwl-native";
}

/** @param {object} opts */
export async function createWispChimeraGateway(opts) {
  const repoRoot = resolveRepoRoot(opts);
  const cwlPath = resolve(opts.cwlPath);
  const backendUrl = (opts.backendUrl ?? "http://127.0.0.1:3001").replace(/\/$/, "");
  const pipeline = loadWispPipelineConfig();
  const nativeApi = shouldUseWispNativeApi(opts);
  const svelteFallbackRaw = opts.svelteFallback ?? process.env.WISP_SVELTE_FALLBACK ?? "";
  const svelteFallback =
    pipeline.gce?.svelteSidecar === false || nativeApi
      ? ""
      : svelteFallbackRaw.replace(/\/$/, "");
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port === undefined ? 19100 : opts.port;

  const runtimeMod = await import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  const { createCwlRuntime, loadModuleFromCwlFile } = runtimeMod;
  const module = loadModuleFromCwlFile(cwlPath, repoRoot);
  const runtime = createCwlRuntime({ module });
  const apiCwlPath = join(dirname(cwlPath), "api-proxy.cwl");
  /** @type {Awaited<ReturnType<typeof createCwlRuntime>> | null} */
  let apiRuntime = null;
  if (nativeApi && existsSync(apiCwlPath)) {
    const apiModule = loadModuleFromCwlFile(apiCwlPath, repoRoot);
    apiRuntime = createCwlRuntime({ module: apiModule });
  }
  const staticDir = resolveStaticDir(cwlPath);

  const server = createServer(async (req, res) => {
    try {
      const hostHdr = req.headers.host ?? `${host}:${port}`;
      const url = new URL(req.url ?? "/", `http://${hostHdr}`);
      const path = url.pathname;

      if ((path.startsWith("/api/") || path === "/api") && apiRuntime) {
        const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
        const cwlRes = await apiRuntime.fetch({
          method: req.method ?? "GET",
          url: `http://${hostHdr}${path}${url.search}`,
          headers: req.headers,
          body: body?.length ? body.toString("utf8") : undefined,
        });
        res.statusCode = cwlRes.status;
        cwlRes.headers.forEach((v, k) => res.setHeader(k, v));
        res.setHeader("x-chrysalis-wisp-proxy", "cwl-native-api");
        res.end(Buffer.from(await cwlRes.arrayBuffer()));
        return;
      }

      if (path.startsWith("/api/") || path === "/api") {
        await proxyHttp(req, res, backendUrl);
        return;
      }

      if (
        (req.method === "GET" || req.method === "HEAD") &&
        serveWispChimeraStaticAsset(path, staticDir, res, req.method ?? "GET")
      ) {
        return;
      }

      if (
        svelteFallback &&
        !path.startsWith("/api/") &&
        path !== "/api" &&
        !isCwlNativePath(path)
      ) {
        await proxyHttp(req, res, svelteFallback, "svelte");
        return;
      }

      const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
      const cwlRes = await runtime.fetch({
        method: req.method ?? "GET",
        url: `http://${hostHdr}${path}${url.search}`,
        headers: req.headers,
        body: body?.length ? body.toString("utf8") : undefined,
      });

      if ((cwlRes.status === 501 || cwlRes.status === 404) && svelteFallback) {
        await proxyHttp(req, res, svelteFallback);
        return;
      }

      res.statusCode = cwlRes.status;
      cwlRes.headers.forEach((v, k) => res.setHeader(k, v));
      res.setHeader("x-chrysalis-wisp-proxy", "cwl");
      res.end(Buffer.from(await cwlRes.arrayBuffer()));
    } catch (e) {
      res.statusCode = 502;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "wisp-chimera-gateway", detail: String(e) }));
    }
  });

  await new Promise((resolveP) => server.listen(port, host, resolveP));
  const addr = server.address();
  const boundPort = typeof addr === "object" && addr ? addr.port : port;

  return {
    kind: WISP_CHIMERA_GATEWAY_KIND,
    schemaVersion: WISP_CHIMERA_GATEWAY_SCHEMA_VERSION,
    host,
    port: boundPort,
    cwlPath,
    backendUrl,
    nativeApi,
    svelteFallback: svelteFallback || null,
    async stop() {
      await new Promise((r) => server.close(() => r(undefined)));
      await runtime.stop();
      if (apiRuntime) await apiRuntime.stop();
    },
    server,
  };
}

function parseArgs(argv) {
  let cwlPath = join(scriptRoot, "fixtures/hub-wisp-management/routes.cwl");
  let backendUrl = process.env.WISP_BACKEND_URL ?? "http://127.0.0.1:3001";
  let svelteFallback = process.env.WISP_SVELTE_FALLBACK ?? "";
  let host = "127.0.0.1";
  let port = 19100;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cwl" && argv[i + 1]) cwlPath = argv[++i];
    else if (a === "--backend" && argv[i + 1]) backendUrl = argv[++i];
    else if (a === "--svelte-fallback" && argv[i + 1]) svelteFallback = argv[++i];
    else if (a === "--host" && argv[i + 1]) host = argv[++i];
    else if (a === "--port" && argv[i + 1]) port = Number(argv[++i]);
  }
  return { cwlPath: resolve(cwlPath), backendUrl, svelteFallback, host, port };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!existsSync(args.cwlPath)) {
    console.error(`missing CWL: ${args.cwlPath}`);
    process.exit(1);
  }
  const gw = await createWispChimeraGateway(args);
  console.log(JSON.stringify({ kind: gw.kind, schemaVersion: gw.schemaVersion, host: gw.host, port: gw.port, cwlPath: gw.cwlPath, backendUrl: gw.backendUrl, svelteFallback: gw.svelteFallback }));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/wisp-cwl-chimera-gateway.mjs")) main().catch((e) => { console.error(e); process.exit(1); });
