/**
 * In-process fetch for WPTP-emitted Next.js App Router route.ts handlers (hub gold trace replay).
 */
import { access } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * @param {string} nextjsOutDir absolute path to generated/nextjs
 * @param {string} pathname URL pathname (e.g. /health)
 * @returns {string} route module path
 */
export function hubNextjsRouteModulePath(nextjsOutDir, pathname) {
  const norm = pathname.replace(/\/+$/, "") || "/";
  if (norm === "/") return join(nextjsOutDir, "app", "route.ts");
  const segs = norm.slice(1).split("/").filter(Boolean);
  return join(nextjsOutDir, "app", ...segs, "route.ts");
}

/**
 * @param {string} nextjsOutDir
 * @returns {() => Promise<(url: string, init?: RequestInit) => Promise<Response>>}
 */
export async function createChrysalisNextjsInProcessFetch(nextjsOutDir) {
  return async function chrysalisNextjsInProcessFetch(url, init) {
    const u = new URL(url);
    const method = (init?.method ?? "GET").toUpperCase();
    const routeFile = hubNextjsRouteModulePath(nextjsOutDir, u.pathname);
    try {
      await access(routeFile);
    } catch {
      return new Response("Not Found", { status: 404 });
    }
    const mod = await import(pathToFileURL(routeFile).href);
    const handler = mod[method];
    if (typeof handler !== "function") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    let resp;
    try {
      resp = await handler(new Request(url, init));
    } catch {
      resp = await handler();
    }
    if (resp instanceof Response) return resp;
    return new Response(String(resp ?? ""), { status: 200 });
  };
}
