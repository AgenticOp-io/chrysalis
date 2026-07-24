/**
 * Dart hub ingest — Shelf + shelf_router for foundation gold (G9954).
 * Peels `router.get|post|…('/path', (Request …) { … })` + same-file named handlers
 * (`router.get('/x', myHandler)` → `Response myHandler(Request …) { … }`, G10007) +
 * `Response.ok` / `Response(status, body: …)` + `jsonEncode` + query/body peels.
 * Does not invent Flutter / Dart Frog / Pipeline runtime (D6447).
 */
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { extractBalancedBraceInner } from "./go-ast-ingest.mjs";

const DART_ROUTE_RE =
  /\brouter\.(get|post|put|patch|delete|head|options)\s*\(\s*(['"])([^'"]+)\2\s*,/gi;

const METHOD_MAP = {
  get: "GET",
  post: "POST",
  put: "PUT",
  patch: "PATCH",
  delete: "DELETE",
  head: "HEAD",
  options: "OPTIONS",
};

/**
 * @param {string} language
 * @param {string} ext
 */
export function canDartAstIngest(language, ext) {
  return language === "dart" && ext.toLowerCase() === ".dart";
}

/**
 * Normalize shelf_router `<id>` path templates to CWL `{id}` form.
 * @param {string} path
 */
export function normalizeDartRoutePath(path) {
  return path.replace(/<([A-Za-z_][A-Za-z0-9_]*)>/g, "{$1}");
}

/**
 * @param {string} path
 */
function pathParamRefsFromPath(path) {
  /** @type {Record<string, { source: string, name: string }>} */
  const refs = {};
  for (const m of path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
    refs[m[1]] = { source: "path", name: m[1] };
  }
  return refs;
}

/**
 * @param {string} raw
 */
function parseLiteralToken(raw) {
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10);
  if (/^-?\d+\.\d+$/.test(t)) return Number.parseFloat(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return null;
}

/**
 * Extract balanced `( … )` starting at openIdx (`(`).
 * @param {string} source
 * @param {number} openIdx
 */
function extractBalancedParenInner(source, openIdx) {
  if (source[openIdx] !== "(") return null;
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
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        return { inner: source.slice(openIdx + 1, i), end: i };
      }
    }
  }
  return null;
}

/**
 * @typedef {{ method: string, path: string, line: number, pathParams?: string[] }} HubRoute
 */

/**
 * @param {HubRoute[]} routes
 * @param {string} source
 * @param {string} method
 * @param {string} path
 * @param {number} index
 * @param {Set<string>} seen
 */
function pushRoute(routes, source, method, path, index, seen) {
  const key = `${method} ${path}`;
  if (seen.has(key)) return;
  seen.add(key);
  const line = source.slice(0, index).split("\n").length;
  const norm = normalizeDartRoutePath(path);
  const pathParams = [...norm.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((m) => m[1]);
  routes.push({ method, path: norm, line, pathParams });
}

/**
 * @param {string} source
 * @returns {HubRoute[]}
 */
export function parseDartShelfRoutes(source) {
  const routes = [];
  const seen = new Set();
  DART_ROUTE_RE.lastIndex = 0;
  let m;
  while ((m = DART_ROUTE_RE.exec(source)) !== null) {
    const verb = METHOD_MAP[m[1].toLowerCase()];
    if (!verb) continue;
    pushRoute(routes, source, verb, m[3], m.index, seen);
  }
  return routes;
}

/**
 * Resolve a same-file named Shelf handler `Response name(Request …) { … }` /
 * `Future<Response> name(Request …) async { … }` referenced from
 * `router.get('/path', name)` (Axum/Go Gin named-func parallel).
 * @param {string} source
 * @param {string} handlerName
 */
export function extractDartNamedHandlerBody(source, handlerName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(handlerName)) return null;
  const headRe = new RegExp(
    String.raw`(?:Future\s*<\s*Response\s*>\s+|Response\s+)?${handlerName}\s*\(`,
  );
  const headM = headRe.exec(source);
  if (!headM || headM.index === undefined) return null;
  const parenOpen = headM.index + headM[0].length - 1;
  const params = extractBalancedParenInner(source, parenOpen);
  if (!params) return null;
  let i = params.end + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source.startsWith("async", i) && /\W/.test(source[i + 5] ?? " ")) {
    i += 5;
    while (i < source.length && /\s/.test(source[i])) i += 1;
  }
  if (source[i] !== "{") return null;
  const bal = extractBalancedBraceInner(source, i);
  if (!bal) return null;
  const line = source.slice(0, i).split("\n").length;
  return {
    bodySlice: bal.inner,
    paramSource: params.inner,
    line,
    absOpen: i,
    absEnd: bal.end,
    kind: "dart-named",
    named: handlerName,
  };
}

/**
 * After `router.verb('path',` find inline `(Request …) { … }` / `async { … }` body,
 * or resolve same-file named handler refs (`router.get('/x', myHandler)`).
 * @param {string} source
 * @param {number} fromIndex — start of `router.verb` match
 */
export function extractDartShelfHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 12000);
  const commaIdx = slice.indexOf(",");
  if (commaIdx < 0) return null;
  let i = fromIndex + commaIdx + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source[i] !== "(") {
    const namedM = slice.slice(commaIdx).match(/,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/);
    if (!namedM) return null;
    return extractDartNamedHandlerBody(source, namedM[1]);
  }
  // Optional async keyword before params
  if (source.startsWith("async", i) && /\W/.test(source[i + 5] ?? " ")) {
    i += 5;
    while (i < source.length && /\s/.test(source[i])) i += 1;
  }
  const params = extractBalancedParenInner(source, i);
  if (!params) return null;
  i = params.end + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  // async after params: (Request r) async {
  if (source.startsWith("async", i) && /\W/.test(source[i + 5] ?? " ")) {
    i += 5;
    while (i < source.length && /\s/.test(source[i])) i += 1;
  }
  if (source[i] !== "{") return null;
  const bal = extractBalancedBraceInner(source, i);
  if (!bal) return null;
  const line = source.slice(0, i).split("\n").length;
  return {
    bodySlice: bal.inner,
    paramSource: params.inner,
    line,
    absOpen: i,
    absEnd: bal.end,
  };
}

/**
 * Path params from `String id` (and typed variants) in handler signature.
 * @param {string} paramSource
 * @param {Record<string, { source: string, name: string }>} pathRefs
 */
function parseDartHandlerParams(paramSource, pathRefs) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = { ...pathRefs };
  for (const m of paramSource.matchAll(/\b(?:String|int|num|double|bool|Object|dynamic)\s+(\w+)\b/g)) {
    const name = m[1];
    if (name === "request" || name === "Request") continue;
    if (pathRefs[name] || Object.values(pathRefs).some((r) => r.name === name)) {
      byVar[name] = { source: "path", name };
    }
  }
  // Untyped trailing: (Request request, id) — rare; skip
  return byVar;
}

/**
 * Bindings: queryParameters / body map peels.
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} pathRefs
 */
function parseDartParamBindings(bodySlice, pathRefs) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = { ...pathRefs };

  const queryBind =
    /(\w+)\s*=\s*request\.url\.queryParameters\[["']([^"']+)["']\](?:\s*\?\?\s*("([^"]*)"|'([^']*)'|true|false|-?\d+))?/g;
  let m;
  while ((m = queryBind.exec(bodySlice)) !== null) {
    const ref = { source: "query", name: m[2] };
    if (m[3] !== undefined) {
      const def = parseLiteralToken(m[3]);
      if (def !== null) ref.default = def;
    }
    byVar[m[1]] = ref;
    byVar[m[2]] = ref;
  }

  // final body = jsonDecode(await request.readAsString()) as Map;
  // final kind = body['kind'] ?? 'plain';
  const bodyMapBind =
    /(?:final|var|const)\s+(\w+)\s*=\s*jsonDecode\s*\(\s*await\s+request\.readAsString\s*\(\s*\)\s*\)\s*(?:as\s+Map(?:<[^>]*>)?)?/g;
  const bodyMaps = new Set();
  while ((m = bodyMapBind.exec(bodySlice)) !== null) {
    bodyMaps.add(m[1]);
  }
  for (const mapName of bodyMaps) {
    const fieldRe = new RegExp(
      String.raw`(\w+)\s*=\s*${mapName}\[["']([^"']+)["']\](?:\s*\?\?\s*("([^"]*)"|'([^']*)'|true|false|-?\d+))?`,
      "g",
    );
    let fm;
    while ((fm = fieldRe.exec(bodySlice)) !== null) {
      const ref = { source: "body", name: fm[2] };
      if (fm[3] !== undefined) {
        const def = parseLiteralToken(fm[3]);
        if (def !== null) ref.default = def;
      }
      byVar[fm[1]] = ref;
      byVar[fm[2]] = ref;
    }
  }

  // Inline query without bind
  for (const im of bodySlice.matchAll(
    /request\.url\.queryParameters\[["']([^"']+)["']\](?:\s*\?\?\s*("([^"]*)"|'([^']*)'|true|false|-?\d+))?/g,
  )) {
    const field = im[1];
    if (byVar[field]) {
      if (im[2] !== undefined && byVar[field].default === undefined) {
        const def = parseLiteralToken(im[2]);
        if (def !== null) byVar[field].default = def;
      }
      continue;
    }
    const ref = { source: "query", name: field };
    if (im[2] !== undefined) {
      const def = parseLiteralToken(im[2]);
      if (def !== null) ref.default = def;
    }
    byVar[field] = ref;
  }

  return byVar;
}

/**
 * Parse Dart map literal entries `'key': val` / `"key": val`.
 * @param {string} inner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseDartMapEntries(inner, refs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of inner.matchAll(/(['"])([^'"]+)\1\s*:\s*([^,\n}]+)/g)) {
    const key = pair[2];
    const rawVal = pair[3].trim();
    if (refs[rawVal]) {
      entries.push({ key, value: { t: "ref", ...refs[rawVal] } });
    } else if (/^request\.url\.queryParameters\[/.test(rawVal)) {
      const q = rawVal.match(/\[["']([^"']+)["']\](?:\s*\?\?\s*("([^"]*)"|'([^']*)'))?/);
      if (!q) return null;
      const name = q[1];
      const value = { t: "ref", source: "query", name };
      if (q[2] !== undefined) {
        const def = parseLiteralToken(q[2]);
        if (def !== null) value.default = def;
      }
      entries.push({ key, value });
    } else {
      const lit = parseLiteralToken(rawVal);
      if (lit === null) return null;
      entries.push({ key, value: { t: "lit", v: lit } });
    }
  }
  if (entries.length === 0) return null;
  return { t: "obj", entries };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseDartBodyReturn(bodySlice, refs) {
  let status = 200;
  /** @type {object | null} */
  let returnTree = null;
  /** @type {string | null} */
  let kind = null;

  const okJsonMap = [
    ...bodySlice.matchAll(
      /Response\.ok\s*\(\s*jsonEncode\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
    ),
  ].pop();
  const okJsonLit = [
    ...bodySlice.matchAll(
      /Response\.ok\s*\(\s*jsonEncode\s*\(\s*(true|false|-?\d+|"[^"]*"|'[^']*')\s*\)/g,
    ),
  ].pop();
  const okJsonRef = [
    ...bodySlice.matchAll(/Response\.ok\s*\(\s*jsonEncode\s*\(\s*(\w+)\s*\)/g),
  ].pop();
  const okRawRef = [...bodySlice.matchAll(/Response\.ok\s*\(\s*(\w+)\s*[,)]/g)].pop();
  const statusJsonMap = [
    ...bodySlice.matchAll(
      /Response\s*\(\s*(\d+)\s*,\s*body:\s*jsonEncode\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
    ),
  ].pop();
  const statusJsonLit = [
    ...bodySlice.matchAll(
      /Response\s*\(\s*(\d+)\s*,\s*body:\s*jsonEncode\s*\(\s*(true|false|-?\d+|"[^"]*"|'[^']*')\s*\)/g,
    ),
  ].pop();

  if (statusJsonMap) {
    status = Number.parseInt(statusJsonMap[1], 10);
    returnTree = parseDartMapEntries(statusJsonMap[2], refs);
    kind = returnTree ? "json" : null;
  } else if (statusJsonLit) {
    status = Number.parseInt(statusJsonLit[1], 10);
    const v = parseLiteralToken(statusJsonLit[2]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (okJsonMap) {
    status = 200;
    returnTree = parseDartMapEntries(okJsonMap[1], refs);
    kind = returnTree ? "json" : null;
  } else if (okJsonLit) {
    status = 200;
    const v = parseLiteralToken(okJsonLit[1]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (okJsonRef && refs[okJsonRef[1]]) {
    status = 200;
    returnTree = { t: "ref", ...refs[okJsonRef[1]] };
    kind = "scalar-ref";
  } else if (okRawRef && refs[okRawRef[1]]) {
    status = 200;
    returnTree = { t: "ref", ...refs[okRawRef[1]] };
    kind = "scalar-ref";
  }

  return { status, returnTree, kind };
}

/**
 * @param {object} ctx
 * @param {{ returnTree: object | null, status?: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerDartHandlerBodyFull(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "dart-ast:response-status")],
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
    provenance: [webir.provenance("hub-ingest", "dart-handler-body")],
  });
}

/**
 * @param {object} opts
 */
export function liftDartFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseDartShelfRoutes(source);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  DART_ROUTE_RE.lastIndex = 0;
  /** @type {Map<string, { bodySlice: string, paramSource: string, line: number }>} */
  const bodiesByKey = new Map();
  let m;
  while ((m = DART_ROUTE_RE.exec(source)) !== null) {
    const verb = METHOD_MAP[m[1].toLowerCase()];
    if (!verb) continue;
    const path = normalizeDartRoutePath(m[3]);
    const extracted = extractDartShelfHandlerBody(source, m.index);
    if (!extracted) continue;
    bodiesByKey.set(`${verb} ${path}`, {
      bodySlice: extracted.bodySlice,
      paramSource: extracted.paramSource,
      line: extracted.line,
    });
  }

  for (const r of routes) {
    const extracted = bodiesByKey.get(`${r.method} ${r.path}`);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-dart:handler-body", { file, line: r.line });
    } else {
      const { bodySlice, paramSource, line } = extracted;
      const loc = { file, line };
      const pathRefs = pathParamRefsFromPath(r.path);
      const paramRefs = parseDartHandlerParams(paramSource, pathRefs);
      const refs = parseDartParamBindings(bodySlice, paramRefs);
      const { status, returnTree, kind } = parseDartBodyReturn(bodySlice, refs);

      if (kind === "scalar-lit" && returnTree?.t === "lit" && status === 200) {
        bodyId = lowerHubLiteral(ctx, returnTree.v, loc);
      } else if (returnTree || (typeof status === "number" && status !== 200)) {
        bodyId =
          lowerDartHandlerBodyFull(ctx, { returnTree, status }, loc) ??
          hubHandlerBodyHole(ctx, "hub-dart:handler-body", loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-dart:handler-body", loc);
      }
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
