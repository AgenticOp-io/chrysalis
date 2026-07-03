/**
 * C# hub ingest — route parse via @chrysalis/hub-native-bridge; lift in-process.
 */
import { parseCsharpRoutes } from "../../packages/hub-native-bridge/dist/csharp.js";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
  lowerHubObjectLiteral,
  lowerHubStatusOnly,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { lowerHubDbQuery } from "./hub-native-sql-effects.mjs";

export { parseCsharpRoutes };

const CSHARP_MAP_LAMBDA_RE = /\(\)\s*=>\s*(true|false|-?\d+(?:\.\d+)?)/;
const CSHARP_CREATED_RE = /Results\.Created\s*\(/;
const CSHARP_JSON_ANON_RE =
  /Results\.Json\s*\(\s*new\s*\{([\s\S]*?)\}\s*\)/;
const CSHARP_JSON_DICT_RE =
  /Results\.Json\s*\(\s*new\s+Dictionary<string,\s*object>\s*\{([\s\S]*?)\}\s*\)/;
const CSHARP_SQL_CALL_RE = /\w+\.(?:Execute|Query|ExecuteReader)\(\s*"([^"]+)"(?:\s*,\s*([^)]+))?\s*\)/gi;

/**
 * @param {string} language
 * @param {string} ext
 */
export function canCsharpAstIngest(language, ext) {
  return language === "csharp" && ext.toLowerCase() === ".cs";
}

/**
 * @param {string} raw
 */
function parseLiteralToken(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return Number.parseFloat(raw);
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return null;
}

/**
 * @param {string} lambdaParams
 * @param {string} routePath
 */
function parseCsharpParamRefs(lambdaParams, routePath) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  const pathParams = [...routePath.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)].map((m) => m[1]);
  for (const m of lambdaParams.matchAll(/\bstring\s+(\w+)(?:\s*=\s*"([^"]*)")?/g)) {
    const name = m[1];
    if (pathParams.includes(name)) {
      byVar[name] = { source: "path", name };
    } else if (m[2] !== undefined) {
      byVar[name] = { source: "query", name, default: m[2] };
    } else {
      byVar[name] = { source: "query", name };
    }
  }
  for (const m of lambdaParams.matchAll(/req(?:uest)?\.Query\[("([^"]+)")\]\.ToString\(\)/g)) {
    byVar[`__query_${m[2]}`] = { source: "query", name: m[2] };
  }
  for (const m of lambdaParams.matchAll(/(\w+)\s*=\s*req(?:uest)?\.Query\[("([^"]+)")\]\.ToString\(\)/g)) {
    byVar[m[1]] = { source: "query", name: m[3] };
  }
  return byVar;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseCsharpRequestRefs(bodySlice, baseRefs) {
  const refs = { ...baseRefs };
  for (const m of bodySlice.matchAll(/(\w+)\s*=\s*req(?:uest)?\.Query\[("([^"]+)")\]\.ToString\(\)/g)) {
    refs[m[1]] = { source: "query", name: m[3] };
  }
  for (const m of bodySlice.matchAll(/(\w+)\s*=\s*req(?:uest)?\.Headers\[("([^"]+)")\]\.ToString\(\)/g)) {
    refs[m[1]] = { source: "header", name: m[3] };
  }
  for (const m of bodySlice.matchAll(/(\w+)\s*=\s*req(?:uest)?\.Cookies\[("([^"]+)")\]/g)) {
    refs[m[1]] = { source: "cookie", name: m[3] };
  }
  for (const m of bodySlice.matchAll(/req(?:uest)?\.Query\[("([^"]+)")\]\.ToString\(\)/g)) {
    refs[`__inline_query_${m[2]}`] = { source: "query", name: m[2] };
  }
  for (const m of bodySlice.matchAll(/req(?:uest)?\.Headers\[("([^"]+)")\]\.ToString\(\)/g)) {
    refs[`__inline_header_${m[2]}`] = { source: "header", name: m[2] };
  }
  for (const m of bodySlice.matchAll(/req(?:uest)?\.Cookies\[("([^"]+)")\]/g)) {
    refs[`__inline_cookie_${m[2]}`] = { source: "cookie", name: m[2] };
  }
  return refs;
}

/**
 * @param {string} inner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseCsharpObjectEntries(inner, refs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of inner.matchAll(/(\w+)(?:\s*=\s*([^,}\n]+))?/g)) {
    const key = pair[1];
    const rawVal = (pair[2] ?? pair[1]).trim();
    if (refs[rawVal]) {
      entries.push({ key, value: { t: "ref", ...refs[rawVal] } });
    } else if (rawVal === "true" || rawVal === "false") {
      entries.push({ key, value: { t: "lit", v: rawVal === "true" } });
    } else if (/^-?\d+$/.test(rawVal)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(rawVal, 10) } });
    } else if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
      entries.push({ key, value: { t: "lit", v: rawVal.slice(1, -1) } });
    } else if (rawVal.includes("req.Query") || rawVal.includes("req.Headers") || rawVal.includes("req.Cookies")) {
      const q = rawVal.match(/Query\[("([^"]+)")\]/);
      const h = rawVal.match(/Headers\[("([^"]+)")\]/);
      const c = rawVal.match(/Cookies\[("([^"]+)")\]/);
      if (q) entries.push({ key, value: { t: "ref", source: "query", name: q[2] } });
      else if (h) entries.push({ key, value: { t: "ref", source: "header", name: h[2] } });
      else if (c) entries.push({ key, value: { t: "ref", source: "cookie", name: c[2] } });
      else return null;
    } else {
      return null;
    }
  }
  if (entries.length === 0) return null;
  return { t: "obj", entries };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseCsharpSqlEffects(bodySlice, refs) {
  /** @type {{ sql: string, params: object[] }[]} */
  const effects = [];
  for (const m of bodySlice.matchAll(CSHARP_SQL_CALL_RE)) {
    const sql = m[1];
    const rawParams = m[2]?.trim();
    /** @type {object[]} */
    const params = [];
    if (rawParams) {
      const idM = rawParams.match(/\{\s*id\s*\}/);
      if (idM && refs.id) params.push({ t: "ref", ...refs.id });
      if (/^\w+$/.test(rawParams) && refs[rawParams]) {
        params.push({ t: "ref", ...refs[rawParams] });
      }
      for (const nameM of rawParams.matchAll(/\b(\w+)\s*=/g)) {
        if (refs[nameM[1]]) params.push({ t: "ref", ...refs[nameM[1]] });
      }
    }
    effects.push({ sql, params });
  }
  return effects;
}

/**
 * @param {object} ctx
 * @param {{ sqlEffects: object[], returnTree: object | null, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerCsharpHandlerBodyFull(ctx, parsed, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const statements = [];
  for (const eff of parsed.sqlEffects) {
    statements.push(lowerHubDbQuery(ctx, eff, loc));
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
    provenance: [webir.provenance("hub-ingest", "csharp-handler-body")],
  });
}

/**
 * @param {string} source
 * @param {number} fromIndex
 * @param {string} routePath
 */
function parseCsharpHandlerBody(source, fromIndex, routePath) {
  const slice = source.slice(fromIndex, fromIndex + 4000);
  const mapM = slice.match(/Map(?:Get|Post|Put|Patch|Delete)\s*\(\s*"[^"]+"\s*,\s*\(([^)]*)\)\s*=>\s*/i);
  if (!mapM) {
    const mapNoParam = slice.match(/Map(?:Get|Post|Put|Patch|Delete)\s*\(\s*"[^"]+"\s*,\s*\(\)\s*=>\s*/i);
    if (!mapNoParam) return null;
    const bodyStart = slice.indexOf("=>", mapNoParam.index ?? 0) + 2;
    const bodySlice = slice.slice(bodyStart);
    const line = source.slice(0, fromIndex).split("\n").length;
    const sqlEffects = parseCsharpSqlEffects(bodySlice, {});
    const anon = bodySlice.match(CSHARP_JSON_ANON_RE);
    const inner = anon?.[1];
    const returnTree = inner ? parseCsharpObjectEntries(inner, {}) : null;
    if (sqlEffects.length === 0 && !returnTree) return null;
    return { sqlEffects, returnTree, line };
  }
  const lambdaParams = mapM[1];
  const bodyStart = slice.indexOf("=>", mapM.index ?? 0) + 2;
  const bodySlice = slice.slice(bodyStart);
  const line = source.slice(0, fromIndex).split("\n").length;
  const refs = parseCsharpRequestRefs(bodySlice, parseCsharpParamRefs(lambdaParams, routePath));
  const sqlEffects = parseCsharpSqlEffects(bodySlice, refs);
  const anon = bodySlice.match(CSHARP_JSON_ANON_RE);
  const dict = bodySlice.match(CSHARP_JSON_DICT_RE);
  const inner = anon?.[1] ?? dict?.[1];
  const returnTree = inner ? parseCsharpObjectEntries(inner, refs) : null;
  if (sqlEffects.length === 0 && !returnTree) return null;
  return { sqlEffects, returnTree, line };
}

/**
 * @param {object} ctx
 * @param {{ returnTree: object, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerCsharpHandlerBody(ctx, parsed, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const valId = lowerHubReturnTree(ctx, parsed.returnTree, loc);
  if (valId === null) return null;
  return data.block({
    statements: [
      data.call({
        callee: "__return_json",
        args: [valId],
        type: HUB_T.unknown,
        origin,
        provenance: [webir.provenance("hub-ingest", "return-tree:json")],
      }),
    ],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "csharp-handler-body")],
  });
}

function csharpMapLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 120);
  const m = slice.match(CSHARP_MAP_LAMBDA_RE);
  if (!m) return null;
  const v = parseLiteralToken(m[1]);
  if (v === null) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { value: v, line };
}

function csharpCreatedAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 120);
  const m = slice.match(CSHARP_CREATED_RE);
  if (!m) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { status: 201, line };
}

/**
 * @param {object} opts
 */
export function liftCsharpFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseCsharpRoutes(source);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const parsed = parseCsharpHandlerBody(source, idx, r.path);
    let bodyId;
    if (parsed && (parsed.sqlEffects.length > 0 || parsed.returnTree)) {
      bodyId =
        lowerCsharpHandlerBodyFull(ctx, parsed, { file, line: parsed.line }) ??
        hubHandlerBodyHole(ctx, "hub-csharp:handler-body", { file, line: r.line });
    } else {
      const statusOnly = csharpCreatedAfter(source, idx);
      const lit = csharpMapLiteralAfter(source, idx);
      bodyId =
        statusOnly
          ? lowerHubStatusOnly(ctx, statusOnly.status, { file, line: statusOnly.line })
          : lit?.value !== undefined
            ? lowerHubLiteral(ctx, lit.value, { file, line: lit.line })
            : hubHandlerBodyHole(ctx, "hub-csharp:handler-body", { file, line: r.line });
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
