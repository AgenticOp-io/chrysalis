/**
 * SvelteKit file-based route lift (G1144): +server.ts / +page.server.ts API routes,
 * +page.svelte page shells (explicit holes until component semantics land).
 */
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { liftJavaScriptFileToWebir } from "./javascript-ast-ingest.mjs";
import { emitHubRoute, hubHandlerBodyHole } from "./hub-lift-webir-route.mjs";

const ROUTE_FILES = new Set(["+server.ts", "+server.js", "+page.server.ts", "+page.server.js"]);
const PAGE_FILES = new Set(["+page.svelte"]);

/**
 * @param {string} segment
 */
function svelteKitSegmentToPathPart(segment) {
  if (segment.startsWith("[[") && segment.endsWith("]]")) {
    return `:${segment.slice(2, -2)}`;
  }
  if (segment.startsWith("[...") && segment.endsWith("]")) {
    return `*${segment.slice(4, -1)}`;
  }
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return `:${segment.slice(1, -1)}`;
  }
  return segment;
}

/**
 * @param {string} routesRoot
 * @param {string} filePath
 */
export function svelteKitFileToHttpPath(routesRoot, filePath) {
  const dir = dirname(filePath);
  const rel = relative(routesRoot, dir).replace(/\\/g, "/");
  if (!rel || rel === ".") return "/";
  const parts = rel.split("/").filter(Boolean).map(svelteKitSegmentToPathPart);
  return `/${parts.join("/")}`;
}

/**
 * @param {string} projectDir
 */
export async function findSvelteKitRoutesRoot(projectDir) {
  /** @type {string[]} */
  const hits = [];
  async function walk(dir, depth) {
    if (depth > 12) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "generated") continue;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) await walk(p, depth + 1);
      else if (ROUTE_FILES.has(ent.name) || PAGE_FILES.has(ent.name)) {
        let cur = dirname(p);
        while (basename(cur) !== "routes" && cur !== projectDir && cur !== dirname(cur)) {
          cur = dirname(cur);
        }
        if (basename(cur) === "routes") hits.push(cur);
      }
    }
  }
  await walk(projectDir, 0);
  hits.sort((a, b) => a.length - b.length);
  return hits[0] ?? null;
}

/**
 * @param {string} projectDir
 */
export async function discoverSvelteKitRouteFiles(projectDir) {
  const routesRoot = await findSvelteKitRoutesRoot(projectDir);
  if (!routesRoot) return { routesRoot: null, files: [] };
  /** @type {Array<{ file: string, kind: "api" | "page", path: string, name: string }>} */
  const files = [];
  async function walk(dir, depth) {
    if (depth > 12) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) await walk(p, depth + 1);
      else if (ROUTE_FILES.has(ent.name)) {
        const httpPath = svelteKitFileToHttpPath(routesRoot, p);
        files.push({
          file: p,
          kind: "api",
          path: httpPath,
          name: `${httpPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+/, "") || "root"}_api`,
        });
      } else if (PAGE_FILES.has(ent.name)) {
        const httpPath = svelteKitFileToHttpPath(routesRoot, p);
        files.push({
          file: p,
          kind: "page",
          path: httpPath,
          name: `${httpPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+/, "") || "root"}_page`,
        });
      }
    }
  }
  await walk(routesRoot, 0);
  return { routesRoot, files };
}

/**
 * @param {object} opts
 */
export async function liftSvelteKitProjectToWebir(opts) {
  const { projectDir, webir, builder, wr, language } = opts;
  const wrBuilders = wr ?? webir.webRequest.builders(builder);
  const { routesRoot, files } = await discoverSvelteKitRouteFiles(projectDir);
  if (!routesRoot || files.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false, routesRoot, fileCount: 0 };
  }

  let routeCount = 0;
  for (const spec of files) {
    if (spec.kind === "api") {
      const source = await readFile(spec.file, "utf8");
      const ext = spec.file.endsWith(".js") ? ".js" : ".ts";
      const partial = liftJavaScriptFileToWebir({
        webir,
        builder,
        wr: wrBuilders,
        source,
        file: spec.file,
        language: "typescript",
        ext,
      });
      if (partial.routeCount > 0) {
        routeCount += partial.routeCount;
        continue;
      }
    }
    const data = webir.dataDialect.builders(builder);
    const ctx = { data, webir, file: spec.file };
    const loc = { file: spec.file, line: 1 };
    const reason = spec.kind === "page" ? "hub-svelte:page-component" : "hub-svelte:server-handler";
    const bodyId = hubHandlerBodyHole(ctx, reason, loc);
    emitHubRoute({
      webir,
      builder,
      wr: wrBuilders,
      language,
      file: spec.file,
      route: {
        method: "GET",
        path: spec.path,
        name: spec.name,
        line: 1,
        pathParams: spec.path.includes(":")
          ? (spec.path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? []).map((p) => p.slice(1))
          : [],
      },
      bodyId,
      handlerEffects: [],
    });
    routeCount += 1;
  }

  return {
    routeCount,
    astRouteCount: routeCount,
    usedAst: routeCount > 0,
    routesRoot,
    fileCount: files.length,
  };
}
