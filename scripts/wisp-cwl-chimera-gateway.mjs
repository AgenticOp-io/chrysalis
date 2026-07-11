#!/usr/bin/env node
/**
 * WISP chimera gateway: CWL UI routes + /api upstream proxy + optional SvelteKit fallback.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, basename, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadWispPipelineConfig } from "./wisp-cwl-gateway-config.mjs";
import { resolveWispPreviewSession } from "./wisp-cwl-post-g7790.mjs";

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
/** Mirrors Module_Manager themeStore boot: saved mode or system preference -> data-theme. */
export const WISP_THEME_BOOT_SCRIPT =
  '<script>(function(){try{var m=localStorage.getItem("theme-mode");var d=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches;var r=m==="light"||m==="dark"?m:(d?"dark":"light");document.documentElement.setAttribute("data-theme",r);}catch(e){}})();</' + 'script>';


/**
 * Route-scoped original CSS (D6365 / D6368 / G9470).
 * Uses the same route+fallback link rules as `@chrysalis/emit-shared`
 * `routeStylesheetLinkTag` against the fixture style map.
 */
let wispStyleMap;
function loadWispStyleMap() {
  if (wispStyleMap !== undefined) return wispStyleMap;
  try {
    const raw = readFileSync(join(scriptRoot, "fixtures/hub-wisp-management/wisp-cwl-original-css-map.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.kind === "chrysalis.ui.route-style-map" && parsed.schemaVersion === 1) {
      wispStyleMap = parsed;
      return wispStyleMap;
    }
  } catch {
    /* ignore */
  }
  wispStyleMap = null;
  return null;
}

/** @param {string} pathname */
export function wispOriginalCssLink(pathname) {
  const map = loadWispStyleMap();
  if (!map) return "";
  const clean = (pathname || "/").split("?")[0] || "/";
  /** @type {string[]} */
  const hrefs = [];
  for (const r of map.routes ?? []) {
    if (r && typeof r.pattern === "string" && typeof r.href === "string" && new RegExp(r.pattern).test(clean)) {
      hrefs.push(r.href);
      break;
    }
  }
  if (typeof map.fallbackHref === "string" && map.fallbackHref !== hrefs[0]) {
    hrefs.push(map.fallbackHref);
  }
  return hrefs.map((h) => '<link rel="stylesheet" href="' + h + '">').join("");
}

const HOP = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade", "host", "content-length"]);

/** @type {Record<string, { file: string; contentType: string }>} */
export const WISP_CHIMERA_STATIC_ASSETS = {
  "/favicon.ico": { file: "favicon.svg", contentType: "image/svg+xml" },
  "/favicon.svg": { file: "favicon.svg", contentType: "image/svg+xml" },
  "/wisptools-logo.svg": { file: "wisptools-logo.svg", contentType: "image/svg+xml" },
  "/assets/wisp-cwl-shell.css": { file: "wisp-cwl-shell.css", contentType: "text/css; charset=utf-8" },
  "/assets/wisp-cwl-login.css": { file: "wisp-cwl-login.css", contentType: "text/css; charset=utf-8" },
  "/assets/wisp-cwl-app.css": { file: "wisp-cwl-app.css", contentType: "text/css; charset=utf-8" },
  "/assets/wisp-cwl-client.js": { file: "wisp-cwl-client.js", contentType: "application/javascript; charset=utf-8" },
  "/assets/wisp-cwl-modules.css": { file: "wisp-cwl-modules.css", contentType: "text/css; charset=utf-8" },
  "/assets/wisp-cwl-modules.js": { file: "wisp-cwl-modules.js", contentType: "application/javascript; charset=utf-8" },
  "/assets/wisp-cwl-map.js": { file: "wisp-cwl-map.js", contentType: "application/javascript; charset=utf-8" },
  "/assets/wisp-firebase-config.json": {
    file: "wisp-firebase-config.json",
    contentType: "application/json; charset=utf-8",
  },
  "/assets/wisp-arcgis-config.json": {
    file: "wisp-arcgis-config.json",
    contentType: "application/json; charset=utf-8",
  },
};

/** @param {string} body @param {string} [title] @param {string} [pathname] */
export function wrapWispCwlHtmlDocument(body, title = "WISP Management", pathname = "") {
  const trimmed = body.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) return body;

  const isLogin =
    pathname === "/login" ||
    trimmed.includes('data-wisp-page="login"') ||
    trimmed.includes('class="login-page"');
  const isDashboard =
    pathname === "/dashboard" ||
    trimmed.includes('data-wisp-page="dashboard"') ||
    trimmed.includes('class="dashboard-container"');
  const isPlanModule =
    pathname === "/modules/plan" || trimmed.includes('data-wisp-page="plan"') || trimmed.includes("wisp-plan-app");
  const isDeployModule =
    pathname === "/modules/deploy" || trimmed.includes('data-wisp-page="deploy"') || trimmed.includes("wisp-deploy-app");
  const isCoverageMap =
    pathname === "/modules/coverage-map" ||
    trimmed.includes('data-wisp-page="coverage-map"') ||
    trimmed.includes("wisp-coverage-map");

  if (isLogin) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="/assets/wisp-cwl-login.css">${wispOriginalCssLink(pathname)}<link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}<script src="/assets/wisp-cwl-client.js" defer></script></body></html>`;
  }

  if (isDashboard) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="/assets/wisp-cwl-app.css">${wispOriginalCssLink(pathname)}<link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}<script src="/assets/wisp-cwl-client.js" defer></script></body></html>`;
  }

  if (isPlanModule) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Plan – WISP Management</title><link rel="stylesheet" href="/assets/wisp-cwl-modules.css">${wispOriginalCssLink(pathname)}<link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}<script src="/assets/wisp-cwl-client.js" defer></script><script src="/assets/wisp-cwl-modules.js" defer></script></body></html>`;
  }

  if (isDeployModule) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Deploy – WISP Management</title><link rel="stylesheet" href="/assets/wisp-cwl-modules.css">${wispOriginalCssLink(pathname)}<link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}<script src="/assets/wisp-cwl-client.js" defer></script><script src="/assets/wisp-cwl-modules.js" defer></script></body></html>`;
  }

  if (isCoverageMap) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Coverage Map</title><link rel="stylesheet" href="/assets/wisp-cwl-modules.css">${wispOriginalCssLink(pathname)}<link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}<script src="/assets/wisp-cwl-client.js" defer></script><script src="/assets/wisp-cwl-map.js" defer></script></body></html>`;
  }

  const isDocsShell = trimmed.includes("wisp-docs-shell");
  if (isDocsShell) {
    return `<!DOCTYPE html><html lang="en" class="wisp-docs-mode"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} – WISP Docs</title><link rel="stylesheet" href="/assets/wisp-cwl-app.css">${wispOriginalCssLink(pathname)}<link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body class="wisp-docs-mode">${body}<script src="/assets/wisp-cwl-client.js" defer></script></body></html>`;
  }

  const moduleNav = `<div class="wisp-module-page"><nav class="wisp-module-nav"><a href="/dashboard">← Dashboard</a> · <a href="/help">Help</a></nav>`;
  const isModuleDemo =
    trimmed.includes("wisp-module-demo") || trimmed.includes("wisp-demo-content");
  const moduleAssets = isModuleDemo
    ? `<link rel="stylesheet" href="/assets/wisp-cwl-modules.css">`
    : "";
  const moduleScripts = isModuleDemo
    ? `<script src="/assets/wisp-cwl-modules.js" defer></script>`
    : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="/assets/wisp-cwl-app.css">${wispOriginalCssLink(pathname)}${moduleAssets}<link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${moduleNav}${body}</div><script src="/assets/wisp-cwl-client.js" defer></script>${moduleScripts}</body></html>`;
}

/**
 * @param {string} pathname
 * @param {string} staticDir
 * @param {import("node:http").ServerResponse} res
 * @param {string} [method]
 * @returns {boolean}
 */
export function serveWispChimeraStaticAsset(pathname, staticDir, res, method = "GET") {
  let spec = WISP_CHIMERA_STATIC_ASSETS[pathname];
  if (!spec) {
    // Lifted original CSS bundles + the fonts/images they reference.
    const prefixed =
      /^\/assets\/original-css\/([a-zA-Z0-9_.-]+\.css)$/.exec(pathname) ??
      /^\/assets\/original\/([a-zA-Z0-9_.-]+)$/.exec(pathname);
    if (!prefixed || prefixed[1].includes("..")) return false;
    const dir = pathname.startsWith("/assets/original-css/") ? "original-css" : "original-assets";
    const types = {
      ".css": "text/css; charset=utf-8",
      ".woff2": "font/woff2",
      ".woff": "font/woff",
      ".ttf": "font/ttf",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
    };
    const ext = extname(prefixed[1]).toLowerCase();
    spec = { file: join(dir, prefixed[1]), contentType: types[ext] ?? "application/octet-stream" };
  }
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

/** @param {Record<string, unknown>} [pipeline] */
function resolveCwlNativePrefixes(pipeline) {
  const fromEnv = process.env.WISP_CWL_NATIVE_PREFIXES?.trim();
  if (fromEnv) return fromEnv;
  const fromConfig = pipeline?.gce?.cwlNativePrefixes;
  if (typeof fromConfig === "string" && fromConfig.trim()) return fromConfig.trim();
  return "*";
}

/** @param {string} path @param {string} [nativePrefixesRaw] */
function isCwlNativePath(path, nativePrefixesRaw = resolveCwlNativePrefixes(loadWispPipelineConfig())) {
  const prefixes = nativePrefixesRaw.split(",").map((s) => s.trim()).filter(Boolean);
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
  const nativePrefixes = resolveCwlNativePrefixes(pipeline);
  const svelteSidecarOff = pipeline.gce?.svelteSidecar === false;
  const svelteFallbackRaw = svelteSidecarOff
    ? (opts.svelteFallback ?? pipeline.gce?.svelteFallback ?? "")
    : (opts.svelteFallback ?? process.env.WISP_SVELTE_FALLBACK ?? pipeline.gce?.svelteFallback ?? "");
  const svelteFallback = String(svelteFallbackRaw ?? "").replace(/\/$/, "");
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port === undefined ? 19100 : opts.port;

  const runtimeMod = await import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  const { createCwlRuntime, loadModuleFromCwlFile, loadModuleFromWebirJsonFile } = runtimeMod;
  const loadModule = (cwlFile) => {
    const webirJson = join(dirname(cwlFile), `${basename(cwlFile, extname(cwlFile))}.webir.json`);
    if (existsSync(webirJson)) return loadModuleFromWebirJsonFile(webirJson);
    return loadModuleFromCwlFile(cwlFile, repoRoot);
  };
  const module = loadModule(cwlPath);
  const runtime = createCwlRuntime({ module, resolveSession: resolveWispPreviewSession });
  const apiCwlPath = join(dirname(cwlPath), "api-proxy.cwl");
  /** @type {Awaited<ReturnType<typeof createCwlRuntime>> | null} */
  let apiRuntime = null;
  if (nativeApi && existsSync(apiCwlPath)) {
    const apiModule = loadModule(apiCwlPath);
    apiRuntime = createCwlRuntime({ module: apiModule, resolveSession: resolveWispPreviewSession });
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
        !isCwlNativePath(path, nativePrefixes)
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
      let outBody = Buffer.from(await cwlRes.arrayBuffer());
      const ct = cwlRes.headers.get("content-type") ?? "";
      if ((req.method === "GET" || req.method === "HEAD") && ct.includes("text/html") && cwlRes.status >= 200 && cwlRes.status < 400) {
        outBody = Buffer.from(wrapWispCwlHtmlDocument(outBody.toString("utf8"), "WISP Management", path), "utf8");
        res.setHeader("content-length", String(outBody.length));
      }
      if (req.method === "HEAD") res.end();
      else res.end(outBody);
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
