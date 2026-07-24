/**
 * Nuxt Nitro / h3 file-route lift: server/api (and server/routes) defineEventHandler,
 * plus server/middleware (including nested dirs) as global middleware roots.
 * Secondary Vue/Nuxt dialect — does not replace Express-in-SFC hub-flagship-vue D6448-ST.
 */
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { simple as walkSimple } from "acorn-walk";
import { CWL_FULLSTACK_HOLE_CATALOG } from "./cwl-fullstack-holes.mjs";
import { liftNitroEventHandlerBody, parseJavaScriptSource } from "./javascript-ast-ingest.mjs";
import { emitHubRoute, hubHandlerBodyHole } from "./hub-lift-webir-route.mjs";

const HOLE_ROUTE = "hub-nuxt:nitro-handler";
const HOLE_MW = "hub-nuxt:nitro-middleware";
if (!CWL_FULLSTACK_HOLE_CATALOG[HOLE_ROUTE]) {
  throw new Error("nitro-route-lift: RFC-0012 hole catalog missing nuxt nitro entry");
}
if (!CWL_FULLSTACK_HOLE_CATALOG[HOLE_MW]) {
  throw new Error("nitro-route-lift: RFC-0012 hole catalog missing nuxt nitro middleware entry");
}

const METHOD_SUFFIXES = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
const SERVER_FILE_RE = /\.(ts|js|mjs|cjs)$/i;

/**
 * @param {string} segment
 */
function nitroSegmentToPathPart(segment) {
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
 * Map a Nitro server file to HTTP method + path.
 * `server/api/items/[id].get.ts` → { method: "GET", path: "/api/items/:id" }
 * `server/routes/health.get.ts` → { method: "GET", path: "/health" }
 *
 * @param {string} serverRoot parent of `api` or `routes` (the `server` dir)
 * @param {"api" | "routes"} kind
 * @param {string} filePath
 */
export function nitroServerFileToRoute(serverRoot, kind, filePath) {
  const kindRoot = join(serverRoot, kind);
  const rel = relative(kindRoot, filePath).replace(/\\/g, "/");
  let base = rel.replace(SERVER_FILE_RE, "");
  let method = "GET";
  const parts = base.split(".");
  if (parts.length >= 2) {
    const maybeMethod = parts[parts.length - 1].toLowerCase();
    if (METHOD_SUFFIXES.has(maybeMethod)) {
      method = maybeMethod.toUpperCase();
      base = parts.slice(0, -1).join(".");
    }
  }
  const segments = base
    .split("/")
    .filter(Boolean)
    .flatMap((seg) => (seg === "index" ? [] : [nitroSegmentToPathPart(seg)]));
  const prefix = kind === "api" ? "/api" : "";
  const path = segments.length === 0 ? prefix || "/" : `${prefix}/${segments.join("/")}`.replace(/\/+/g, "/");
  return { method, path: path || "/" };
}

/**
 * @param {string} projectDir
 */
export async function findNitroServerRoot(projectDir) {
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
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "generated" || ent.name === ".chrysalis") {
        continue;
      }
      const p = join(dir, ent.name);
      if (!ent.isDirectory()) continue;
      if (ent.name === "server") {
        let hasSurface = false;
        for (const sub of ["api", "routes", "middleware"]) {
          try {
            const kids = await readdir(join(p, sub));
            if (kids.length > 0) {
              hasSurface = true;
              break;
            }
          } catch {
            /* missing */
          }
        }
        if (hasSurface) hits.push(p);
      } else {
        await walk(p, depth + 1);
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
export async function discoverNitroServerRouteFiles(projectDir) {
  const serverRoot = await findNitroServerRoot(projectDir);
  if (!serverRoot) return { serverRoot: null, files: [] };
  /** @type {Array<{ file: string, kind: "api" | "routes", method: string, path: string, name: string }>} */
  const files = [];

  /**
   * @param {"api" | "routes"} kind
   */
  async function walkKind(kind) {
    const kindRoot = join(serverRoot, kind);
    async function walk(dir, depth) {
      if (depth > 14) return;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const ent of entries) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) await walk(p, depth + 1);
        else if (ent.isFile() && SERVER_FILE_RE.test(ent.name)) {
          const { method, path } = nitroServerFileToRoute(serverRoot, kind, p);
          files.push({
            file: p,
            kind,
            method,
            path,
            name: `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root"}`,
          });
        }
      }
    }
    await walk(kindRoot, 0);
  }

  await walkKind("api");
  await walkKind("routes");
  return { serverRoot, files };
}

/**
 * Discover Nitro server/middleware files (nested dirs included).
 * Nitro runs these globally; nested path does not imply an Express-style mount.
 *
 * @param {string} serverRoot
 */
export async function discoverNitroMiddlewareFiles(serverRoot) {
  const mwRoot = join(serverRoot, "middleware");
  /** @type {Array<{ file: string, rel: string }>} */
  const files = [];
  async function walk(dir, depth) {
    if (depth > 14) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) await walk(p, depth + 1);
      else if (ent.isFile() && SERVER_FILE_RE.test(ent.name)) {
        files.push({
          file: p,
          rel: relative(mwRoot, p).replace(/\\/g, "/"),
        });
      }
    }
  }
  await walk(mwRoot, 0);
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return files;
}

/**
 * Empty / pass-through `defineEventHandler` body (no statements).
 * @param {string} source
 * @param {string} file
 */
function nitroMiddlewareIsPassThrough(source, file) {
  let ast;
  try {
    ast = parseJavaScriptSource(source, file);
  } catch {
    return false;
  }
  /** @type {import('estree').Function | null} */
  let fn = null;
  walkSimple(ast, {
    ExportDefaultDeclaration(node) {
      if (fn) return;
      const decl = node.declaration;
      if (decl?.type === "CallExpression") {
        const callee = decl.callee;
        const name =
          callee?.type === "Identifier"
            ? callee.name
            : callee?.type === "MemberExpression" && !callee.computed && callee.property?.type === "Identifier"
              ? callee.property.name
              : null;
        if (name !== "defineEventHandler" && name !== "eventHandler") return;
        const arg = decl.arguments[0];
        if (arg?.type === "ArrowFunctionExpression" || arg?.type === "FunctionExpression") fn = arg;
      } else if (
        decl?.type === "ArrowFunctionExpression" ||
        decl?.type === "FunctionExpression" ||
        decl?.type === "FunctionDeclaration"
      ) {
        fn = decl;
      }
    },
  });
  if (!fn) return false;
  const body = fn.body;
  if (!body) return true;
  if (body.type === "BlockStatement") return body.body.length === 0;
  return false;
}

/**
 * @param {object} opts
 */
async function liftNitroMiddlewareFiles(opts) {
  const { serverRoot, webir, builder, wr } = opts;
  const files = await discoverNitroMiddlewareFiles(serverRoot);
  if (files.length === 0) {
    return { middlewareUseCount: 0, middlewareRootCount: 0 };
  }
  const data = webir.dataDialect.builders(builder);
  let order = 0;
  let rootCount = 0;
  for (const spec of files) {
    order += 1;
    const source = await readFile(spec.file, "utf8");
    const loc = { file: spec.file, line: 1, column: 1 };
    const kind = "nitro.middleware";
    /** @type {string} */
    let bodyId;
    if (nitroMiddlewareIsPassThrough(source, spec.file)) {
      bodyId = data.literal({
        value: { preset: kind, path: spec.rel },
        type: { kind: "unknown" },
        origin: loc,
        provenance: [webir.provenance("hub-ingest", `middleware-preset:${kind}`)],
      });
    } else {
      const lifted = liftNitroEventHandlerBody({
        source,
        file: spec.file,
        webir,
        builder,
        wr,
      });
      if (lifted.ok && lifted.bodyId) {
        bodyId = lifted.bodyId;
      } else {
        bodyId = data.hole({
          reason: HOLE_MW,
          input: { kind: "unknown" },
          output: { kind: "unknown" },
          origin: loc,
          provenance: [webir.provenance("hub-ingest", "middleware-shell")],
        });
      }
    }
    const middlewareId = wr.middleware({
      attrs: { kind, mount: "*", order, path: spec.rel },
      body: bodyId,
      origin: loc,
      provenance: [webir.provenance("hub-ingest", `middleware:${kind}`)],
    });
    builder.addRoot(middlewareId);
    rootCount += 1;
  }
  return { middlewareUseCount: files.length, middlewareRootCount: rootCount };
}

/**
 * @param {object} opts
 */
export async function liftNitroProjectToWebir(opts) {
  const { projectDir, webir, builder, wr, language } = opts;
  const wrBuilders = wr ?? webir.webRequest.builders(builder);
  const { serverRoot, files } = await discoverNitroServerRouteFiles(projectDir);
  if (!serverRoot) {
    return {
      routeCount: 0,
      astRouteCount: 0,
      usedAst: false,
      serverRoot: null,
      fileCount: 0,
      middlewareUseCount: 0,
      middlewareRootCount: 0,
    };
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
    const source = await readFile(spec.file, "utf8");
    const lifted = liftNitroEventHandlerBody({
      source,
      file: spec.file,
      webir,
      builder,
      wr: wrBuilders,
    });
    if (lifted.ok && lifted.bodyId) {
      emitHubRoute({
        webir,
        builder,
        wr: wrBuilders,
        language,
        file: spec.file,
        route: {
          method: spec.method,
          path: spec.path,
          name: spec.name,
          line: 1,
          pathParams,
        },
        bodyId: lifted.bodyId,
        handlerEffects: [],
      });
      routeCount += 1;
      astLiftCount += 1;
      continue;
    }
    const bodyId = hubHandlerBodyHole(ctx, HOLE_ROUTE, loc);
    emitHubRoute({
      webir,
      builder,
      wr: wrBuilders,
      language,
      file: spec.file,
      route: {
        method: spec.method,
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

  const mw = await liftNitroMiddlewareFiles({
    serverRoot,
    webir,
    builder,
    wr: wrBuilders,
  });

  return {
    routeCount,
    astRouteCount: routeCount,
    astLiftCount,
    usedAst: astLiftCount > 0,
    serverRoot,
    fileCount: files.length + mw.middlewareUseCount,
    middlewareUseCount: mw.middlewareUseCount,
    middlewareRootCount: mw.middlewareRootCount,
  };
}
