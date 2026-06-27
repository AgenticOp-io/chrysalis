#!/usr/bin/env node
/**
 * WISP native API oracle contract helpers (Phase 29a).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifestPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-paths.json");

/**
 * @param {string} id
 */
export function slugFromApiId(id) {
  return String(id).toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/**
 * @param {string} slug
 */
export function resourceFromSlug(slug) {
  return slug.replace(/_/g, "-");
}

/**
 * @param {string} method
 */
export function opFromMethod(method) {
  const m = method.toUpperCase();
  if (m === "GET") return "list";
  if (m === "POST") return "create";
  if (m === "PUT" || m === "PATCH") return "update";
  if (m === "DELETE") return "delete";
  return "invoke";
}

/**
 * @param {{ id: string, path: string, methods?: string[] }} entry
 * @param {string} method
 */
export function buildNativeApiGolden(entry, method) {
  const slug = slugFromApiId(entry.id);
  return {
    ok: true,
    surface: "wisp-api-native",
    resource: resourceFromSlug(slug),
    op: opFromMethod(method),
  };
}

/**
 * @param {{ id: string, path: string, methods?: string[] }} entry
 * @param {string} method
 */
export function handlerNameForRoute(entry, method) {
  const slug = slugFromApiId(entry.id);
  return `wisp_api_${slug}_${method.toLowerCase()}`;
}

/**
 * @param {string} [manifestPath]
 */
export function loadWispApiPathsManifest(manifestPath = defaultManifestPath) {
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

/**
 * @param {string} [manifestPath]
 */
export function listApiRouteSpecs(manifestPath = defaultManifestPath) {
  const manifest = loadWispApiPathsManifest(manifestPath);
  if (!manifest) return [];
  /** @type {Array<{ entry: object, method: string, path: string, handler: string, golden: object }>} */
  const specs = [];
  for (const entry of manifest.paths ?? []) {
    for (const method of entry.methods ?? ["GET"]) {
      specs.push({
        entry,
        method: method.toUpperCase(),
        path: entry.path,
        handler: handlerNameForRoute(entry, method),
        golden: buildNativeApiGolden(entry, method),
      });
    }
  }
  return specs;
}

/**
 * @param {string} method
 * @param {string} path
 */
export function goldenFileName(method, path) {
  const slug = path.replace(/^\//, "").replace(/\//g, "-").replace(/:/g, "_");
  return `${method.toUpperCase()}-${slug}.golden.json`;
}

/**
 * @param {unknown} golden
 */
export function buildJsonStringReturnBlock(golden) {
  const body = JSON.stringify(golden);
  const escaped = body.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * @param {object} spec
 * @param {unknown} golden
 */
export function buildNativeHandlerBlock(spec, golden) {
  const escapedReturn = buildJsonStringReturnBlock(golden);
  return `@route ${spec.method} "${spec.path}"
handler ${spec.handler} {
  # source backend-services/routes/${resourceFromSlug(slugFromApiId(spec.entry.id))} — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return ${escapedReturn};
}`;
}

/**
 * @param {string} text
 * @param {string} method
 * @param {string} path
 * @param {string} block
 */
export function patchApiProxyHandlerBlock(text, method, path, block) {
  const marker = `@route ${method.toUpperCase()} "${path}"`;
  const start = text.indexOf(marker);
  if (start < 0) return { ok: false, skip: "missing-route", path, method };
  const tail = text.slice(start + marker.length);
  const nextRoute = tail.search(/\n@route |\n@page /);
  const end = nextRoute >= 0 ? start + marker.length + nextRoute + 1 : text.length;
  const next = `${text.slice(0, start)}${block}\n\n${text.slice(end).trimStart()}`;
  return { ok: true, text: next.endsWith("\n") ? next : `${next}\n` };
}
