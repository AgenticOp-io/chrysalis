#!/usr/bin/env node
/**
 * Patch WISP CWL routes that lift static Svelte "redirecting…" shells without onMount goto.
 * Without this, chimera native CWL (`cwlNativePrefixes: *`) serves dead-end HTML (e.g. root auth spinner).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  cwlHtmlReturn,
  replaceRouteHandlerBlock,
  routesPath,
} from "./cwl-apply-surfaces.mjs";

export const WISP_CLIENT_REDIRECT_MANIFEST_KIND = "chrysalis.wisp.client-redirect-manifest";
export const WISP_CLIENT_REDIRECT_MANIFEST_SCHEMA_VERSION = 1;

/** @typedef {{ path: string; pageName: string; target?: string; message: string; dynamic?: boolean }} ClientRedirectRoute */

/** Svelte onMount targets for routes that lift to static HTML only. */
export const WISP_CLIENT_REDIRECT_ROUTES = /** @type {ClientRedirectRoute[]} */ ([
  { path: "/", pageName: "root_page", target: "/login", message: "Checking authentication…" },
  // /modules is a Module Manager directory (G9951) — not a redirect
  {
    path: "/modules/customers/portal",
    pageName: "modules_customers_portal_page",
    target: "/modules/customers/portal/login",
    message: "Redirecting…",
  },
  {
    path: "/modules/monitor",
    pageName: "modules_monitor_page",
    target: "/modules/monitoring",
    message: "Redirecting to Monitoring…",
  },
  { path: "/portal/:tenantId", pageName: "portal_tenantId_page", dynamic: true, message: "Redirecting to portal…" },
]);

/** @param {string} target @param {string} message */
export function cwlClientRedirectHtml(target, message) {
  const safeTarget = target.replace(/"/g, "&quot;");
  const jsTarget = target.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${safeTarget}"><title>${message}</title></head><body><p>${message}</p><script>location.replace("${jsTarget}");</script><noscript><a href="${safeTarget}">Continue</a></noscript></body></html>`;
}

/** Portal tenant param redirect — mirrors Svelte portal/[tenantId]/+page.svelte. */
export function cwlPortalTenantRedirectHtml(message = "Redirecting to portal…") {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${message}</title></head><body><p>${message}</p><script>var m=location.pathname.match(/^\\/portal\\/([^/]+)/);location.replace(m?"/modules/customers/portal/login?tenant="+encodeURIComponent(m[1]):"/modules/customers/portal/login");</script><noscript><a href="/modules/customers/portal/login">Continue</a></noscript></body></html>`;
}

/** @param {ClientRedirectRoute} route */
export function buildClientRedirectPageBlock(route) {
  const html = route.dynamic ? cwlPortalTenantRedirectHtml(route.message) : cwlClientRedirectHtml(route.target, route.message);
  return `@page GET "${route.path}"
page ${route.pageName} {
  effects: none;
  content-type "text/html; charset=utf-8";
  ${cwlHtmlReturn(html)}
}`;
}

/** True when HTML looks like a dead-end Svelte redirect shell (spinner/message, no navigation). */
export function isDeadEndRedirectHtml(html) {
  const hasRedirectCue =
    /Checking authentication/i.test(html) ||
    /Redirecting to dashboard/i.test(html) ||
    /class=\\"redirecting\\"/.test(html) ||
    /Redirecting to Monitoring/i.test(html) ||
    /Redirecting to portal/i.test(html);
  const hasNavigation =
    /location\.replace/i.test(html) ||
    /http-equiv=\\"refresh\\"/i.test(html) ||
    /meta http-equiv="refresh"/i.test(html);
  return hasRedirectCue && !hasNavigation;
}

/** @param {object} [opts] */
export function applyWispClientRedirects(opts = {}) {
  if (opts.skipRoutes) return { ok: true, skip: "skip-routes", patched: [] };
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl", patched: [] };

  let text = readFileSync(routesPath, "utf8");
  /** @type {string[]} */
  const patched = [];

  for (const route of WISP_CLIENT_REDIRECT_ROUTES) {
    const block = buildClientRedirectPageBlock(route);
    const r = replaceRouteHandlerBlock(
      text,
      [`@page GET "${route.path}"`, `@route GET "${route.path}"`],
      block,
    );
    if (!r.ok) return { ok: false, skip: r.skip, patched };
    if (!r.skipped) {
      text = r.text;
      patched.push(route.path);
    }
  }

  const deadEnds = [];
  for (const route of WISP_CLIENT_REDIRECT_ROUTES) {
    const slice = text.slice(text.indexOf(`@page GET "${route.path}"`));
    const ret = slice.match(/return html "([^"]*(?:\\.[^"]*)*)";/);
    if (ret && isDeadEndRedirectHtml(ret[1])) deadEnds.push(route.path);
  }
  if (deadEnds.length > 0) {
    return { ok: false, skip: "dead-end-redirect-remaining", deadEnds, patched };
  }

  writeFileSync(routesPath, text, "utf8");
  return {
    ok: true,
    routesPath,
    patched,
    kind: WISP_CLIENT_REDIRECT_MANIFEST_KIND,
    schemaVersion: WISP_CLIENT_REDIRECT_MANIFEST_SCHEMA_VERSION,
    routeCount: WISP_CLIENT_REDIRECT_ROUTES.length,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = applyWispClientRedirects();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-client-redirects")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
