/**
 * Next.js App Router file-route lift v0 (G1167/G1183): app route.ts handlers + page.tsx shells + page.server.ts load.
 */
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { CWL_FULLSTACK_HOLE_CATALOG } from "./cwl-fullstack-holes.mjs";
import {
  liftNextAppRouteHandlerBodies,
  liftSvelteKitPageLoadFunction,
} from "./javascript-ast-ingest.mjs";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  lowerHubHtmlPageBody,
  lowerHubPageWithLoadBody,
} from "./hub-lift-webir-route.mjs";

const HOLE_PAGE = "hub-next:page-component";
const HOLE_ROUTE = "hub-next:route-handler";
const HOLE_LOAD = "hub-next:load-function";
if (!CWL_FULLSTACK_HOLE_CATALOG[HOLE_PAGE] || !CWL_FULLSTACK_HOLE_CATALOG[HOLE_ROUTE]) {
  throw new Error("nextjs-route-lift: RFC-0012 hole catalog missing next entries");
}

const ROUTE_FILES = new Set(["route.ts", "route.js"]);
const PAGE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js"]);
const PAGE_SERVER_FILES = new Set(["page.server.ts", "page.server.js"]);

/**
 * @param {string} segment
 */
function nextSegmentToPathPart(segment) {
  if (segment.startsWith("[[...") && segment.endsWith("]]")) {
    return `:${segment.slice(5, -2)}`;
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
 * @param {string} appRoot
 * @param {string} filePath
 */
export function nextAppFileToHttpPath(appRoot, filePath) {
  const dir = dirname(filePath);
  const rel = relative(appRoot, dir).replace(/\\/g, "/");
  if (!rel || rel === ".") return "/";
  const parts = rel.split("/").filter(Boolean).map(nextSegmentToPathPart);
  return `/${parts.join("/")}`;
}

/**
 * @param {string} projectDir
 */
export async function findNextAppRoot(projectDir) {
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
      if (ent.isDirectory()) {
        if (ent.name === "app") hits.push(p);
        else await walk(p, depth + 1);
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
export async function discoverNextAppRouteFiles(projectDir) {
  const appRoot = await findNextAppRoot(projectDir);
  if (!appRoot) return { appRoot: null, files: [] };
  /** @type {Set<string>} */
  const pageServerDirs = new Set();
  async function walkServers(dir, depth) {
    if (depth > 12) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) await walkServers(p, depth + 1);
      else if (PAGE_SERVER_FILES.has(ent.name)) pageServerDirs.add(dirname(p));
    }
  }
  await walkServers(appRoot, 0);
  /** @type {Array<{ file: string, kind: "api" | "page", path: string, name: string, hasPageServer?: boolean }>} */
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
        const httpPath = nextAppFileToHttpPath(appRoot, p);
        files.push({
          file: p,
          kind: "api",
          path: httpPath,
          name: `${httpPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+/, "") || "root"}_api`,
        });
      } else if (PAGE_FILES.has(ent.name)) {
        const httpPath = nextAppFileToHttpPath(appRoot, p);
        files.push({
          file: p,
          kind: "page",
          path: httpPath,
          name: `${httpPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+/, "") || "root"}_page`,
          hasPageServer: pageServerDirs.has(dirname(p)),
        });
      }
    }
  }
  await walk(appRoot, 0);
  return { appRoot, files };
}

/**
 * @param {string} source
 */
export function liftStaticJsxPageHtml(source) {
  let s = source.replace(/^import[\s\S]*?;\s*/gm, "");
  const ret = /return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*\}/.exec(s);
  if (ret) s = ret[1];
  else {
    s = s.replace(/^export\s+default\s+function[\s\S]*?\{([\s\S]*)\}\s*$/m, "$1");
  }
  if (/\{/.test(s)) return null;
  s = s.replace(/\/>/g, ">").trim();
  if (!s || !/<[a-z]/i.test(s)) return null;
  return s;
}

/**
 * @param {object} opts
 */
export async function liftNextAppProjectToWebir(opts) {
  const { projectDir, webir, builder, wr, language } = opts;
  const wrBuilders = wr ?? webir.webRequest.builders(builder);
  const { appRoot, files } = await discoverNextAppRouteFiles(projectDir);
  if (!appRoot || files.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false, appRoot, fileCount: 0 };
  }

  let routeCount = 0;
  let astLiftCount = 0;
  for (const spec of files) {
    const data = webir.dataDialect.builders(builder);
    const ctx = { data, webir, file: spec.file };
    const loc = { file: spec.file, line: 1 };
    const pathParams = spec.path.includes(":")
      ? (spec.path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? []).map((p) => p.slice(1))
      : [];

    if (spec.kind === "api") {
      const source = await readFile(spec.file, "utf8");
      const lifted = liftNextAppRouteHandlerBodies({
        source,
        file: spec.file,
        webir,
        builder,
        wr: wrBuilders,
      });
      if (lifted.ok) {
        for (const h of lifted.handlers) {
          const suffix = h.method === "GET" ? "api" : `${h.method.toLowerCase()}_api`;
          emitHubRoute({
            webir,
            builder,
            wr: wrBuilders,
            language,
            file: spec.file,
            route: {
              method: h.method,
              path: spec.path,
              name: `${spec.name.replace(/_api$/, "")}_${suffix}`.replace(/__+/g, "_"),
              line: 1,
              pathParams,
            },
            bodyId: h.bodyId,
            handlerEffects: [],
          });
          routeCount += 1;
          astLiftCount += 1;
        }
        continue;
      }
    }

    if (spec.kind === "page") {
      const source = await readFile(spec.file, "utf8");
      if (spec.hasPageServer) {
        const dir = dirname(spec.file);
        const serverTs = join(dir, "page.server.ts");
        const serverJs = join(dir, "page.server.js");
        const serverFile = existsSync(serverTs) ? serverTs : existsSync(serverJs) ? serverJs : null;
        const loaded =
          serverFile != null
            ? liftSvelteKitPageLoadFunction({
                source: await readFile(serverFile, "utf8"),
                file: serverFile,
                webir,
                builder,
              })
            : { ok: false, reason: "missing-page-server" };
        const html = liftStaticJsxPageHtml(source);
        if (loaded.ok && html) {
          const bodyId = lowerHubPageWithLoadBody(ctx, loaded.loadValueId, html, loc, wrBuilders);
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
              pathParams,
            },
            bodyId,
            handlerEffects: [],
          });
          routeCount += 1;
          astLiftCount += 1;
          continue;
        }
        const bodyId = hubHandlerBodyHole(ctx, HOLE_LOAD, loc);
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
            pathParams,
          },
          bodyId,
          handlerEffects: [],
        });
        routeCount += 1;
        continue;
      }
      const html = liftStaticJsxPageHtml(source);
      if (html) {
        const bodyId = lowerHubHtmlPageBody(ctx, html, loc, wrBuilders);
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
            pathParams,
          },
          bodyId,
          handlerEffects: [],
        });
        routeCount += 1;
        astLiftCount += 1;
        continue;
      }
    }

    const reason = spec.kind === "page" ? HOLE_PAGE : HOLE_ROUTE;
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
        pathParams,
      },
      bodyId,
      handlerEffects: [],
    });
    routeCount += 1;
  }

  return {
    routeCount,
    astRouteCount: routeCount,
    astLiftCount,
    usedAst: astLiftCount > 0,
    appRoot,
    fileCount: files.length,
  };
}
