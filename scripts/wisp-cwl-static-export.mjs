#!/usr/bin/env node
/**
 * Export CWL UI @page routes to static HTML (Phase 29b).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveWispPreviewSession } from "./wisp-cwl-post-g7790.mjs";

export const WISP_CWL_STATIC_EXPORT_KIND = "chrysalis.wisp.cwl-static-export";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routesCwl = join(scriptRoot, "fixtures/hub-wisp-management/routes.cwl");
const outRoot = join(scriptRoot, "fixtures/hub-wisp-management/cwl-static-export");
const manifestPath = join(scriptRoot, "fixtures/hub-wisp-management/chrysalis.wisp-cwl-static-export.v1.json");

/** @param {string} pathPattern */
export function resolvePreviewPath(pathPattern) {
  return pathPattern.replace(/:tenantId/g, "preview-tenant").replace(/:([A-Za-z0-9_]+)/g, "preview");
}

/** @param {string} pathPattern */
export function staticOutRel(pathPattern) {
  const resolved = resolvePreviewPath(pathPattern);
  if (resolved === "/") return "index.html";
  return `${resolved.replace(/^\//, "")}/index.html`;
}

/** @param {string} source */
export function listPageRoutes(source) {
  /** @type {Array<{ method: string, path: string }>} */
  const routes = [];
  for (const line of source.split(/\r?\n/)) {
    const m = /^@page\s+(GET)\s+"([^"]+)"/.exec(line.trim());
    if (m) routes.push({ method: m[1], path: m[2] });
  }
  return routes;
}

async function loadRuntimeCwl(repoRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  }
}

/**
 * @param {object} [opts]
 */
export async function runWispCwlStaticExport(opts = {}) {
  const base = { kind: WISP_CWL_STATIC_EXPORT_KIND, schemaVersion: 1, ok: false };
  if (!existsSync(routesCwl)) return { ...base, skip: "missing-routes-cwl" };

  const source = readFileSync(routesCwl, "utf8");
  const pages = listPageRoutes(source);
  if (!pages.length) return { ...base, skip: "no-page-routes" };

  const runtimeMod = await loadRuntimeCwl(scriptRoot);
  const { createCwlRuntime, loadModuleFromCwlFile, loadCwlUiAssetsFromProject } = runtimeMod;
  const module = loadModuleFromCwlFile(routesCwl, scriptRoot);
  const fixtureDir = dirname(routesCwl);
  const uiAssets =
    typeof loadCwlUiAssetsFromProject === "function" ? loadCwlUiAssetsFromProject(fixtureDir) : null;
  const runtime = createCwlRuntime({
    module,
    resolveSession: resolveWispPreviewSession,
    ...(uiAssets ? { uiAssets } : {}),
  });

  /** @type {Array<{ path: string, out: string, status: number, ok: boolean }>} */
  const exported = [];
  for (const page of pages) {
    const resolved = resolvePreviewPath(page.path);
    const url = `http://127.0.0.1${resolved}`;
    const res = await runtime.fetch({
      method: "GET",
      url,
      headers: { cookie: "chrysalis_session=static-export" },
    });
    const body = await res.text();
    const rel = staticOutRel(page.path);
    const abs = join(outRoot, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body.endsWith("\n") ? body : `${body}\n`, "utf8");
    exported.push({ path: page.path, out: rel, status: res.status, ok: res.status >= 200 && res.status < 400 && body.length > 0 });
  }

  const okCount = exported.filter((e) => e.ok).length;
  const manifest = {
    kind: "chrysalis.wisp.cwl-static-export",
    schemaVersion: 1,
    outRoot: "cwl-static-export",
    pageCount: pages.length,
    exportedCount: okCount,
    routes: exported,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    ...base,
    ok: okCount === pages.length,
    pageCount: pages.length,
    exportedCount: okCount,
    outRoot,
    manifestPath,
  };
}

async function main() {
  const r = await runWispCwlStaticExport();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-static-export")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
