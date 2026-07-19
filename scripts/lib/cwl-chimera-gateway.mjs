#!/usr/bin/env node
/**
 * WISP chimera gateway: CWL UI routes + /api upstream proxy + optional SvelteKit fallback.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, basename, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadWispPipelineConfig } from "./cwl-gateway-config.mjs";
import { resolveWispPreviewSession } from "../wisp-cwl-post-g7790.mjs";

export const WISP_CHIMERA_GATEWAY_KIND = "chrysalis.wisp.chimera-gateway";
export const WISP_CHIMERA_GATEWAY_SCHEMA_VERSION = 1;

const moduleDir = dirname(fileURLToPath(import.meta.url));
// scripts/lib → repo root; GCE POC layout is <poc>/lib → <poc> (routes.cwl lives there).
const scriptRoot = existsSync(join(moduleDir, "../routes.cwl"))
  ? resolve(moduleDir, "..")
  : resolve(moduleDir, "../..");

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
  '<script>(function(){try{' +
  'var q=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)");' +
  'function mode(){var m=localStorage.getItem("theme-mode")||localStorage.getItem("theme");return /^(light|dark|system)$/.test(m)?m:"system"}' +
  'function apply(m,save){if(!/^(light|dark|system)$/.test(m))m="system";if(save){localStorage.setItem("theme-mode",m);localStorage.setItem("theme",m)}var r=m==="system"?(q&&q.matches?"dark":"light"):m;var h=document.documentElement;h.setAttribute("data-theme",r);h.setAttribute("data-theme-mode",m);h.classList.toggle("dark",r==="dark");h.classList.toggle("light",r==="light");var meta=document.querySelector(\'meta[name="theme-color"]\');if(!meta){meta=document.createElement("meta");meta.name="theme-color";document.head.appendChild(meta)}meta.content=r==="dark"?"#1e293b":"#ffffff";var l=document.getElementById("wisp-arcgis-theme");if(!l){l=document.createElement("link");l.id="wisp-arcgis-theme";l.rel="stylesheet";document.head.appendChild(l)}l.href="https://js.arcgis.com/4.32/esri/themes/"+r+"/main.css";window.dispatchEvent(new CustomEvent("wisp-theme-change",{detail:{mode:m,resolved:r}}));return r}' +
  'window.__wispTheme={set:function(m){return apply(m,true)},getMode:mode,apply:function(){return apply(mode(),false)}};' +
  'apply(mode(),false);if(q&&q.addEventListener)q.addEventListener("change",function(){if(mode()==="system")apply("system",false)});window.addEventListener("storage",function(e){if(e.key==="theme-mode"||e.key==="theme")apply(mode(),false)});' +
  '}catch(e){}})();</' + 'script>';

/** Cache-bust additive CWL assets when [hidden] / client wiring changes (D6443). */
export const WISP_CWL_ASSET_BUST = "20260719m";
const WISP_APP_CSS = `/assets/wisp-cwl-app.css?v=${WISP_CWL_ASSET_BUST}`;
const WISP_CLIENT_JS = `/assets/wisp-cwl-client.js?v=${WISP_CWL_ASSET_BUST}`;

export function scrubEvaluatedCwlHtml(html) {
  return String(html ?? "")
    .replace(
      /<\/[a-z][\w/-]*\s+((?:d|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|fill-rule|clip-rule|transform|opacity)=)/gi,
      "<path $1",
    )
    .replace(/<\/\/[a-z][\w/-]*>/gi, "</path>");
}


/**
 * Route-scoped original CSS (D6365 / D6368 / G9470 / D6407).
 * Prefer map beside the gateway (GCE POC dir), then repo fixtures.
 */
let wispStyleMap;
function loadWispStyleMap() {
  if (wispStyleMap !== undefined) return wispStyleMap;
  const gatewayDir = moduleDir;
  const candidates = [
    join(scriptRoot, "wisp-cwl-original-css-map.json"),
    join(gatewayDir, "wisp-cwl-original-css-map.json"),
    join(gatewayDir, "..", "wisp-cwl-original-css-map.json"),
    join(scriptRoot, "fixtures/hub-wisp-management/wisp-cwl-original-css-map.json"),
    join(gatewayDir, "fixtures/hub-wisp-management/wisp-cwl-original-css-map.json"),
  ];
  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue;
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      if (parsed.kind === "chrysalis.ui.route-style-map" && parsed.schemaVersion === 1) {
        wispStyleMap = parsed;
        return wispStyleMap;
      }
    } catch {
      /* try next */
    }
  }
  wispStyleMap = null;
  return null;
}

/** @param {string} pathname */
export function wispOriginalCssLink(pathname) {
  const map = loadWispStyleMap();
  const clean = (pathname || "/").split("?")[0] || "/";
  /** Root +layout.svelte imports app.css on every route. */
  const hrefs = ["/assets/original-css/wisp-origin-global.css"];
  if (map) {
    for (const r of map.routes ?? []) {
      if (r && typeof r.pattern === "string" && typeof r.href === "string" && new RegExp(r.pattern).test(clean)) {
        hrefs.push(r.href);
        break;
      }
    }
    if (typeof map.fallbackHref === "string" && !hrefs.includes(map.fallbackHref)) {
      hrefs.push(map.fallbackHref);
    }
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
  "/assets/wisp-cwl-cors.js": { file: "wisp-cwl-cors.js", contentType: "application/javascript; charset=utf-8" },
  "/assets/wisp-cwl-modules.css": { file: "wisp-cwl-modules.css", contentType: "text/css; charset=utf-8" },
  "/assets/wisp-cwl-modules.js": { file: "wisp-cwl-modules.js", contentType: "application/javascript; charset=utf-8" },
  "/assets/wisp-cwl-map.js": { file: "wisp-cwl-map.js", contentType: "application/javascript; charset=utf-8" },
  "/assets/wisp-cwl-map-island.css": {
    file: "wisp-cwl-map-island.css",
    contentType: "text/css; charset=utf-8",
  },
  "/assets/wisp-cwl-arcgis.bundle.js": {
    file: "wisp-cwl-arcgis.bundle.js",
    contentType: "application/javascript; charset=utf-8",
  },
  "/assets/wisp-cwl-arcgis.bundle.css": {
    file: "wisp-cwl-arcgis.bundle.css",
    contentType: "text/css; charset=utf-8",
  },
  "/assets/wisp-firebase-config.json": {
    file: "wisp-firebase-config.json",
    contentType: "application/json; charset=utf-8",
  },
  "/assets/wisp-arcgis-config.json": {
    file: "wisp-arcgis-config.json",
    contentType: "application/json; charset=utf-8",
  },
  "/assets/wisp-module-tips.json": {
    file: "wisp-module-tips.json",
    contentType: "application/json; charset=utf-8",
  },
  "/assets/wisp-wizard-catalog.json": {
    file: "wisp-wizard-catalog.json",
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
  const isRootRedirect =
    pathname === "/" ||
    (trimmed.includes("location.replace(\"/login\")") && !trimmed.includes("data-wisp-page"));
  const isPlanModule =
    pathname === "/modules/plan" || trimmed.includes('data-wisp-page="plan"') || trimmed.includes("wisp-plan-app");
  const isDeployModule =
    pathname === "/modules/deploy" || trimmed.includes('data-wisp-page="deploy"') || trimmed.includes("wisp-deploy-app");
  const isCoverageMap =
    pathname === "/modules/coverage-map" ||
    trimmed.includes('data-wisp-page="coverage-map"') ||
    trimmed.includes("wisp-coverage-map");
  const isPciMap =
    pathname === "/modules/pci-resolution" ||
    pathname.startsWith("/modules/pci-resolution/") ||
    trimmed.includes("LTE PCI Mapper") ||
    trimmed.includes('data-wisp-page="pci-resolution"');

  // Original Module_Manager CSS first (look authority); CWL overlays last (additive only).
  const corsAndClient =
    `<script src="/assets/wisp-cwl-cors.js"></script><script src="${WISP_CLIENT_JS}" defer></script>`;

  if (isRootRedirect) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=/login"><title>${title}</title><link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml"></head><body>${body}</body></html>`;
  }

  if (isLogin) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>${wispOriginalCssLink(pathname)}<link rel="stylesheet" href="/assets/wisp-cwl-login.css"><link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}${corsAndClient}</body></html>`;
  }

  if (isDashboard) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>${wispOriginalCssLink(pathname)}<link rel="stylesheet" href="${WISP_APP_CSS}"><link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}${corsAndClient}</body></html>`;
  }

  if (isPlanModule) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Plan – WISP Management</title>${wispOriginalCssLink(pathname)}<link rel="stylesheet" href="/assets/wisp-cwl-modules.css"><link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}${corsAndClient}<script src="/assets/wisp-cwl-modules.js?v=${WISP_CWL_ASSET_BUST}" defer></script></body></html>`;
  }

  if (isDeployModule) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Deploy – WISP Management</title>${wispOriginalCssLink(pathname)}<link rel="stylesheet" href="/assets/wisp-cwl-modules.css"><link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}${corsAndClient}<script src="/assets/wisp-cwl-modules.js?v=${WISP_CWL_ASSET_BUST}" defer></script></body></html>`;
  }

  if (isCoverageMap || isPciMap) {
    // D6443: origin CSS only for coverage-map — do not load wisp-cwl-modules.css
    // (it redefines origin selectors / invented chrome). Island host uses origin
    // `.coverage-map-container` / `.map-container` classes from markup lift.
    const title = isPciMap ? "PCI Resolution" : "Coverage Map";
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>${wispOriginalCssLink(pathname)}<link rel="stylesheet" href="/assets/wisp-cwl-map-island.css"><link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${body}${corsAndClient}<script src="/assets/wisp-cwl-map.js" defer></script></body></html>`;
  }

  const isDocsShell = trimmed.includes("wisp-docs-shell");
  if (isDocsShell) {
    return `<!DOCTYPE html><html lang="en" class="wisp-docs-mode"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} – WISP Docs</title>${wispOriginalCssLink(pathname)}<link rel="stylesheet" href="${WISP_APP_CSS}"><link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body class="wisp-docs-mode">${body}${corsAndClient}</body></html>`;
  }

  // Original lifted markup already carries page chrome (page-header, etc.).
  // Only invent a thin nav for residual demo shells — never wrap lifted pages
  // in CWL-only chrome that fights Module_Manager CSS (UT fidelity).
  const isModuleDemo =
    trimmed.includes("wisp-module-demo") || trimmed.includes("wisp-demo-content");
  const hasOriginalChrome =
    /\b(page-header|dashboard-container|hardware-page|login-page|wisp-plan-app|wisp-deploy-app)\b/.test(
      trimmed,
    );
  const moduleNav =
    isModuleDemo && !hasOriginalChrome
      ? `<div class="wisp-module-page"><nav class="wisp-module-nav"><a href="/dashboard">← Dashboard</a> · <a href="/help">Help</a></nav>`
      : "";
  const moduleNavClose = moduleNav ? "</div>" : "";
  const moduleAssets = isModuleDemo
    ? `<link rel="stylesheet" href="/assets/wisp-cwl-modules.css">`
    : "";
  const moduleScripts = isModuleDemo
    ? `<script src="/assets/wisp-cwl-modules.js?v=${WISP_CWL_ASSET_BUST}" defer></script>`
    : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>${wispOriginalCssLink(pathname)}<link rel="stylesheet" href="${WISP_APP_CSS}">${moduleAssets}<link rel="icon" href="/wisptools-logo.svg" type="image/svg+xml">${WISP_THEME_BOOT_SCRIPT}</head><body>${moduleNav}${body}${moduleNavClose}${corsAndClient}${moduleScripts}</body></html>`;
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

/** @param {string | string[] | undefined} cookieHeader */
function parseCookieHeader(cookieHeader) {
  /** @type {Record<string, string>} */
  const out = {};
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader ?? "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/** @param {string} email */
function sessionCookieHeader(email) {
  const token = encodeURIComponent(email || "preview@wisptools.local");
  return `chrysalis_session=${token}; Path=/; HttpOnly; SameSite=Lax`;
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

/** Firebase web config staged beside the gateway (bundle root) or in fixtures. */
function loadWispFirebaseClientConfig() {
  const candidates = [
    join(scriptRoot, "wisp-firebase-config.json"),
    join(moduleDir, "wisp-firebase-config.json"),
    join(scriptRoot, "fixtures/hub-wisp-management/wisp-firebase-config.json"),
  ];
  for (const path of candidates) {
    try {
      if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Live backend auth: the gateway signs into Firebase with the demo account and
 * attaches the bearer + tenant to upstream /api calls, so pages serve real
 * HSS/MongoDB data instead of seeded fixtures. Token cached ~55 min.
 */
export function createWispLiveApiAuth() {
  const cfg = loadWispFirebaseClientConfig();
  const apiKey = process.env.CHRYSALIS_FIREBASE_API_KEY || cfg?.apiKey || "";
  const email = process.env.CHRYSALIS_WISP_DEMO_EMAIL || "demo@wisptools.io";
  const password = process.env.CHRYSALIS_WISP_DEMO_PASSWORD || "WisptoolsDemo2026!";
  const tenantId = process.env.CHRYSALIS_HSS_TENANT_ID || cfg?.defaultTenantId || "";
  let cached = { token: "", exp: 0 };
  /** @type {Promise<string> | null} */
  let pending = null;
  async function login() {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    const body = await res.json();
    if (!res.ok || !body.idToken) throw new Error(`wisp-firebase-login-failed:${res.status}`);
    const ttlSec = Math.max(300, Number(body.expiresIn || 3600) - 300);
    cached = { token: body.idToken, exp: Date.now() + ttlSec * 1000 };
    return cached.token;
  }
  return {
    enabled: Boolean(apiKey),
    tenantId,
    email,
    /** @param {boolean} [force] refresh even if a cached token remains valid */
    async bearer(force = false) {
      if (!apiKey) return "";
      if (!force && cached.token && Date.now() < cached.exp) return cached.token;
      if (!pending) {
        pending = login().finally(() => {
          pending = null;
        });
      }
      try {
        return await pending;
      } catch {
        return "";
      }
    },
  };
}

/**
 * Proxy one /api request to the live backend with demo auth attached.
 * Returns true when the upstream answer was served; false → caller falls back
 * to the CWL-native seeded API (route missing upstream, auth dead, unreachable).
 */
async function serveWispLiveUpstream(req, res, url, backendUrl, liveAuth, bodyBuf) {
  const target = new URL(url.pathname + url.search, backendUrl.replace(/\/$/, ""));
  let bearer = await liveAuth.bearer();
  if (!bearer) return false;
  const doFetch = (token) => {
    const headers = cloneHeaders(req, target);
    delete headers.cookie;
    if (!headers.authorization && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
    if (liveAuth.tenantId && !headers["x-tenant-id"] && !headers["X-Tenant-ID"]) {
      headers["X-Tenant-ID"] = liveAuth.tenantId;
    }
    return fetch(target, {
      method: req.method ?? "GET",
      headers,
      body: bodyBuf?.length ? bodyBuf : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(25_000),
    });
  };
  try {
    let upstream = await doFetch(bearer);
    if (upstream.status === 401) {
      bearer = await liveAuth.bearer(true);
      if (bearer) upstream = await doFetch(bearer);
    }
    // Routes the live backend doesn't expose (or auth it refuses) fall back to
    // the CWL-native API so demo-only surfaces keep working.
    if (
      upstream.status === 401 ||
      upstream.status === 403 ||
      upstream.status === 404 ||
      upstream.status === 405 ||
      upstream.status >= 500
    ) {
      return false;
    }
    res.statusCode = upstream.status;
    upstream.headers.forEach((v, k) => {
      if (!HOP.has(k.toLowerCase())) res.setHeader(k, v);
    });
    res.setHeader("x-chrysalis-wisp-proxy", "live-backend");
    res.end(Buffer.from(await upstream.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

/** @param {object} opts */
export function shouldUseWispLiveApi(opts = {}) {
  if (opts.liveApi === true) return true;
  if (opts.liveApi === false) return false;
  if (process.env.WISP_CWL_LIVE_API === "0") return false;
  if (process.env.WISP_CWL_LIVE_API === "1") return true;
  const pipeline = loadWispPipelineConfig();
  return pipeline.gce?.liveApi !== false;
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
  /** Empty string must not block env/config (?? only skips null/undefined). */
  const nonEmpty = (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const svelteFallbackRaw = svelteSidecarOff
    ? (nonEmpty(opts.svelteFallback) ?? nonEmpty(pipeline.gce?.svelteFallback) ?? "")
    : (nonEmpty(opts.svelteFallback) ??
      nonEmpty(process.env.WISP_SVELTE_FALLBACK) ??
      nonEmpty(pipeline.gce?.svelteFallback) ??
      "");
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
  const liveApi = shouldUseWispLiveApi(opts);
  const liveAuth = createWispLiveApiAuth();
  const staticDir = resolveStaticDir(cwlPath);

  const server = createServer(async (req, res) => {
    try {
      const hostHdr = req.headers.host ?? `${host}:${port}`;
      const url = new URL(req.url ?? "/", `http://${hostHdr}`);
      const path = url.pathname;

      // Session me must not hit api-proxy catchall — live under routes.cwl otherwise 404s.
      if (path === "/api/me" && (req.method === "GET" || req.method === "HEAD")) {
        const session = resolveWispPreviewSession({
          cookies: parseCookieHeader(req.headers.cookie),
        });
        const body = JSON.stringify({
          ok: true,
          authenticated: session.authenticated === true,
          email: session.email ?? null,
          userId: session.userId ?? null,
          tenantId: session.tenantId ?? null,
          surface: "wisp-auth-native",
        });
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("x-chrysalis-wisp-proxy", "cwl-native-api");
        if (req.method === "HEAD") res.end();
        else res.end(body);
        return;
      }

      // Live-first (D6450): real HSS backend + MongoDB with gateway-held demo
      // auth; CWL-native seeded API only covers routes the backend lacks.
      if ((path.startsWith("/api/") || path === "/api") && liveApi && liveAuth.enabled) {
        const bodyBuf = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
        const servedLive = await serveWispLiveUpstream(req, res, url, backendUrl, liveAuth, bodyBuf);
        if (servedLive) return;
        if (apiRuntime) {
          const cwlRes = await apiRuntime.fetch({
            method: req.method ?? "GET",
            url: `http://${hostHdr}${path}${url.search}`,
            headers: req.headers,
            body: bodyBuf?.length ? bodyBuf.toString("utf8") : undefined,
          });
          res.statusCode = cwlRes.status;
          cwlRes.headers.forEach((v, k) => res.setHeader(k, v));
          res.setHeader("x-chrysalis-wisp-proxy", "cwl-native-api-fallback");
          res.end(Buffer.from(await cwlRes.arrayBuffer()));
          return;
        }
        await proxyHttp(req, res, backendUrl);
        return;
      }

      if ((path.startsWith("/api/") || path === "/api") && apiRuntime) {
        const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
        const cwlRes = await apiRuntime.fetch({
          method: req.method ?? "GET",
          url: `http://${hostHdr}${path}${url.search}`,
          headers: req.headers,
          body: body?.length ? body.toString("utf8") : undefined,
        });
        // D6442 deepen: contract stubs (`surface: wisp-api-native`) and simulation
        // holes (501) are not live product data — prefer origin backend-services/HSS.
        let preferUpstream = cwlRes.status === 501;
        if (!preferUpstream && cwlRes.status >= 200 && cwlRes.status < 300) {
          try {
            const text = Buffer.from(await cwlRes.clone().arrayBuffer()).toString("utf8");
            const j = JSON.parse(text);
            if (
              j &&
              j.surface === "wisp-api-native" &&
              j.ok === true &&
              j.items === undefined &&
              j.data === undefined &&
              j.sites === undefined &&
              j.results === undefined
            ) {
              preferUpstream = true;
            }
          } catch {
            /* keep CWL body */
          }
        }
        if (preferUpstream) {
          await proxyHttp(req, res, backendUrl);
          return;
        }
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

      // Origin alias with no dedicated page — converted surface lives under tenant-management.
      if (
        (req.method === "GET" || req.method === "HEAD") &&
        (path === "/admin/tenants" || path === "/admin/tenants/")
      ) {
        res.statusCode = 302;
        res.setHeader("Location", "/admin/tenant-management");
        res.setHeader("x-chrysalis-wisp-proxy", "cwl-alias");
        res.end();
        return;
      }

      if (
        (req.method === "GET" || req.method === "HEAD") &&
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

      // Preview login: attach session cookie so /api/me and resolveSession work.
      if (path === "/login" && req.method === "POST" && cwlRes.status >= 200 && cwlRes.status < 300) {
        let email = "demo@wisptools.io";
        try {
          const parsed = JSON.parse(body?.toString("utf8") || "{}");
          if (typeof parsed.email === "string" && parsed.email) email = parsed.email;
        } catch {
          /* ignore */
        }
        res.setHeader("Set-Cookie", sessionCookieHeader(email));
      }

      let outBody = Buffer.from(await cwlRes.arrayBuffer());
      const ct = cwlRes.headers.get("content-type") ?? "";
      if ((req.method === "GET" || req.method === "HEAD") && ct.includes("text/html") && cwlRes.status >= 200 && cwlRes.status < 400) {
        const cleanHtml = scrubEvaluatedCwlHtml(outBody.toString("utf8"));
        outBody = Buffer.from(wrapWispCwlHtmlDocument(cleanHtml, "WISP Management", path), "utf8");
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
