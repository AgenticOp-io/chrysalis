/**
 * PHP hub ingest — Slim 4-ish secondary dialect (G10028 / D6490).
 * Route surface only: `$app->get|post|…('/path', function (…) { … })`,
 * `{id}` path templates, `$args['id']`, `$request->getQueryParams()['q']`,
 * `$response->withJson(...)` / `withStatus(n)->withJson` / write+json_encode.
 * No PSR-15 middleware onion invent (D6442 / D6447). Laravel / Symfony /
 * plain-php remain packages/ingest flagships — this path is lift-to-webir only.
 */
import {
  emitHubRoute,
  hubHandlerBodyHole,
  lowerHubLiteral,
  hubOrigin,
  HUB_T,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";

const SLIM_ROUTE_RE =
  /\$app->(get|post|put|patch|delete)\s*\(\s*(['"])([^'"]+)\2\s*,/gi;

const SLIM_WITH_JSON_MAP_RE =
  /(?:return\s+)?\$response->(?:withStatus\s*\(\s*(\d+)\s*\)\s*->\s*)?withJson\s*\(\s*\[([\s\S]*?)\]\s*\)/;
const SLIM_WITH_JSON_SCALAR_RE =
  /(?:return\s+)?\$response->(?:withStatus\s*\(\s*(\d+)\s*\)\s*->\s*)?withJson\s*\(\s*(?:(true|false)|(-?\d+)|(['"])([^'"]*)\4|(\$\w+))\s*\)/;
const SLIM_WRITE_JSON_MAP_RE =
  /\$response->getBody\(\)->write\s*\(\s*json_encode\s*\(\s*\[([\s\S]*?)\]\s*\)\s*\)/;
const SLIM_WRITE_JSON_SCALAR_RE =
  /\$response->getBody\(\)->write\s*\(\s*json_encode\s*\(\s*(?:(true|false)|(-?\d+)|(['"])([^'"]*)\3|(\$\w+))\s*\)\s*\)/;
const SLIM_WITH_STATUS_RE = /\$response->withStatus\s*\(\s*(\d+)\s*\)/;
const PHP_ARRAY_PAIR_RE =
  /(['"])([^'"]+)\1\s*=>\s*(?:(['"])([^'"]*)\3|(true|false|-?\d+)|(\$\w+))/g;

/**
 * @param {string} language
 * @param {string} ext
 */
export function canPhpAstIngest(language, ext) {
  const e = ext.toLowerCase();
  return language === "php" && (e === ".php" || e === ".phtml");
}

/**
 * @param {string} source
 */
export function isPhpSlimSource(source) {
  return (
    /\bSlim\\/.test(source) ||
    /\$app->(?:get|post|put|patch|delete)\s*\(/.test(source)
  );
}

/**
 * Slim `{id}` → keep origin brace form (Gorilla parallel).
 * @param {string} path
 */
export function normalizeSlimPath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * @param {string} source
 * @param {number} openIdx
 */
export function extractBalancedBraceInner(source, openIdx) {
  if (source[openIdx] !== "{") return null;
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === quote) break;
        i += 1;
      }
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return { inner: source.slice(openIdx + 1, i), end: i };
      }
    }
  }
  return null;
}

/**
 * @param {string} source
 * @returns {Array<{ method: string, path: string, line: number, name: string, index: number }>}
 */
export function parseSlimRoutes(source) {
  /** @type {Array<{ method: string, path: string, line: number, name: string, index: number }>} */
  const routes = [];
  const seen = new Set();
  SLIM_ROUTE_RE.lastIndex = 0;
  let m;
  while ((m = SLIM_ROUTE_RE.exec(source)) !== null) {
    const method = (m[1] ?? "get").toUpperCase();
    const path = normalizeSlimPath(m[3] ?? "/");
    const key = `${method}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({
      method,
      path,
      line: source.slice(0, m.index).split("\n").length,
      name: `slim_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      index: m.index,
    });
  }
  return routes;
}

/**
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractSlimHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 12000);
  const fnM = slice.match(/function\s*\([^)]*\)\s*(?:use\s*\([^)]*\)\s*)?\{/);
  if (!fnM || fnM.index === undefined) return null;
  const openInSlice = fnM.index + fnM[0].lastIndexOf("{");
  const absOpen = fromIndex + openInSlice;
  const bal = extractBalancedBraceInner(source, absOpen);
  if (!bal) return null;
  const line = source.slice(0, absOpen).split("\n").length;
  return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end };
}

/**
 * @param {string} raw
 */
function parsePhpLiteral(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  return raw;
}

/**
 * @param {string} bodySlice
 */
function parseSlimRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(
    /\$(\w+)\s*=\s*\$args\s*\[\s*(['"])([^'"]+)\2\s*\]/g,
  )) {
    byVar[m[1]] = { source: "path", name: m[3] };
  }
  for (const m of bodySlice.matchAll(
    /\$(\w+)\s*=\s*\$request->getQueryParams\s*\(\s*\)\s*\[\s*(['"])([^'"]+)\2\s*\](?:\s*\?\?\s*(['"])([^'"]*)\4)?/g,
  )) {
    byVar[m[1]] = {
      source: "query",
      name: m[3],
      default: m[5] !== undefined ? m[5] : "",
    };
  }
  return byVar;
}

/**
 * @param {string} arrayInner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parsePhpArrayEntries(arrayInner, byVar) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  PHP_ARRAY_PAIR_RE.lastIndex = 0;
  for (const pair of arrayInner.matchAll(PHP_ARRAY_PAIR_RE)) {
    const key = pair[2];
    if (pair[4] !== undefined) {
      entries.push({ key, value: { t: "lit", v: pair[4] } });
      continue;
    }
    if (pair[5] !== undefined) {
      entries.push({ key, value: { t: "lit", v: parsePhpLiteral(pair[5]) } });
      continue;
    }
    const varName = pair[6]?.replace(/^\$/, "");
    if (varName && byVar[varName]) {
      entries.push({ key, value: { t: "ref", ...byVar[varName] } });
    } else {
      return null;
    }
  }
  return entries.length > 0 ? entries : null;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseSlimWithJsonMap(bodySlice, byVar) {
  const m = bodySlice.match(SLIM_WITH_JSON_MAP_RE);
  if (!m) return null;
  const status = m[1] !== undefined ? Number.parseInt(m[1], 10) : 200;
  const entries = parsePhpArrayEntries(m[2], byVar);
  if (!entries) return null;
  return { status, returnTree: { t: "obj", entries } };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseSlimWithJsonScalar(bodySlice, byVar) {
  const m = bodySlice.match(SLIM_WITH_JSON_SCALAR_RE);
  if (!m) return null;
  const status = m[1] !== undefined ? Number.parseInt(m[1], 10) : 200;
  if (m[2] !== undefined) {
    return { status, kind: "lit", value: m[2] === "true" };
  }
  if (m[3] !== undefined) {
    return { status, kind: "lit", value: Number.parseInt(m[3], 10) };
  }
  if (m[5] !== undefined) {
    return { status, kind: "lit", value: m[5] };
  }
  const varName = m[6]?.replace(/^\$/, "");
  if (varName && byVar[varName]) {
    return { status, kind: "ref", returnTree: { t: "ref", ...byVar[varName] } };
  }
  return null;
}

/**
 * write(json_encode(...)) + optional withStatus (default 200).
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseSlimWriteJson(bodySlice, byVar) {
  const statusM = bodySlice.match(SLIM_WITH_STATUS_RE);
  const status = statusM ? Number.parseInt(statusM[1], 10) : 200;

  const mapM = bodySlice.match(SLIM_WRITE_JSON_MAP_RE);
  if (mapM) {
    const entries = parsePhpArrayEntries(mapM[1], byVar);
    if (!entries) return null;
    return { kind: "handler", status, returnTree: { t: "obj", entries } };
  }

  const scalarM = bodySlice.match(SLIM_WRITE_JSON_SCALAR_RE);
  if (!scalarM) return null;
  if (scalarM[1] !== undefined) {
    return { kind: "scalar", status, value: scalarM[1] === "true" };
  }
  if (scalarM[2] !== undefined) {
    return { kind: "scalar", status, value: Number.parseInt(scalarM[2], 10) };
  }
  if (scalarM[4] !== undefined) {
    return { kind: "scalar", status, value: scalarM[4] };
  }
  const varName = scalarM[5]?.replace(/^\$/, "");
  if (varName && byVar[varName]) {
    return {
      kind: "handler",
      status,
      returnTree: { t: "ref", ...byVar[varName] },
    };
  }
  return null;
}

/**
 * @param {string} bodySlice
 */
export function parseSlimHandlerBody(bodySlice) {
  const byVar = parseSlimRefs(bodySlice);
  const jsonMap = parseSlimWithJsonMap(bodySlice, byVar);
  if (jsonMap) {
    return {
      kind: "handler",
      sqlEffects: [],
      returnTree: jsonMap.returnTree,
      status: jsonMap.status,
    };
  }
  const jsonScalar = parseSlimWithJsonScalar(bodySlice, byVar);
  if (jsonScalar?.kind === "ref") {
    return {
      kind: "handler",
      sqlEffects: [],
      returnTree: jsonScalar.returnTree,
      status: jsonScalar.status,
    };
  }
  if (jsonScalar?.kind === "lit") {
    return { kind: "scalar", status: jsonScalar.status, value: jsonScalar.value };
  }
  const written = parseSlimWriteJson(bodySlice, byVar);
  if (written) return written;
  return null;
}

/**
 * @param {object} ctx
 * @param {{ returnTree: object | null, status?: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerSlimHandlerBody(ctx, parsed, loc) {
  const { data, effect, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const statements = [];
  const status = parsed.status;
  if (typeof status === "number" && Number.isFinite(status) && status !== 200) {
    statements.push(
      effect.httpError({
        status,
        message: null,
        origin,
        provenance: [webir.provenance("hub-ingest", "php-slim:json-status")],
      }),
    );
  }
  if (parsed.returnTree) {
    const valId = lowerHubReturnTree(ctx, parsed.returnTree, loc);
    if (valId !== null) {
      statements.push(
        data.call({
          callee: "__return_json",
          args: [valId],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "return-tree:json")],
        }),
      );
    }
  }
  if (statements.length === 0) return null;
  return data.block({
    statements,
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "php-slim-handler-body")],
  });
}

/**
 * @param {object} ctx
 * @param {number} status
 * @param {unknown} value
 * @param {{ file: string, line?: number }} loc
 */
function lowerSlimScalarLit(ctx, status, value, loc) {
  if (typeof status !== "number" || !Number.isFinite(status) || status === 200) {
    return lowerHubLiteral(ctx, value, loc);
  }
  const { data, effect, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const type =
    typeof value === "string"
      ? HUB_T.string
      : typeof value === "boolean"
        ? HUB_T.bool
        : typeof value === "number"
          ? HUB_T.int
          : HUB_T.unknown;
  const statusId = effect.httpError({
    status,
    message: null,
    origin,
    provenance: [webir.provenance("hub-ingest", "php-slim:json-status")],
  });
  const litId = data.literal({
    value,
    type,
    origin,
    provenance: [webir.provenance("hub-ingest", "literal-return")],
  });
  return data.block({
    statements: [statusId, litId],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "php-slim-scalar-lit-status")],
  });
}

/**
 * @param {object} opts — webir, builder, wr, source, file, language, ext
 */
export function liftPhpFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  if (!isPhpSlimSource(source)) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseSlimRoutes(source);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const extracted = extractSlimHandlerBody(source, r.index);
    const loc = { file, line: extracted?.line ?? r.line };
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-slim:handler-body", loc);
    } else {
      const parsed = parseSlimHandlerBody(extracted.bodySlice);
      if (parsed?.kind === "handler") {
        bodyId =
          lowerSlimHandlerBody(
            ctx,
            { returnTree: parsed.returnTree, status: parsed.status },
            loc,
          ) ?? hubHandlerBodyHole(ctx, "hub-slim:handler-body", loc);
      } else if (parsed?.kind === "scalar") {
        bodyId = lowerSlimScalarLit(ctx, parsed.status ?? 200, parsed.value, loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-slim:handler-body", loc);
      }
    }
    emitHubRoute({
      webir,
      builder,
      wr,
      language,
      file,
      route: r,
      bodyId,
    });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
