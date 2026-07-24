/**
 * C# hub ingest — route parse via @chrysalis/hub-native-bridge; lift in-process.
 * Deepened for D6448-ST cwl-api flagship: string scalars, statusCode JSON, path-ref returns.
 */
import { parseCsharpRoutes } from "../../packages/hub-native-bridge/dist/csharp.js";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
  lowerHubStatusOnly,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { lowerHubDbQuery } from "./hub-native-sql-effects.mjs";

export { parseCsharpRoutes };

const CSHARP_MAP_LAMBDA_RE =
  /\([^)]*\)\s*=>\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')/;
const CSHARP_CREATED_RE = /Results\.Created\s*\(/;
const CSHARP_JSON_ANON_RE =
  /Results\.Json\s*\(\s*new\s*\{([\s\S]*?)\}\s*(?:,\s*statusCode\s*:\s*(\d+)\s*)?\)/;
const CSHARP_JSON_DICT_RE =
  /Results\.Json\s*\(\s*new\s+Dictionary<string,\s*object>\s*\{([\s\S]*?)\}\s*(?:,\s*statusCode\s*:\s*(\d+)\s*)?\)/;
const CSHARP_CREATED_BODY_RE =
  /Results\.Created\s*\(\s*[^,)]+\s*,\s*new\s*\{([\s\S]*?)\}\s*\)/;
const CSHARP_ACCEPTED_BODY_RE =
  /Results\.Accepted\s*\(\s*[^,)]*\s*,\s*new\s*\{([\s\S]*?)\}\s*\)/;
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
 * Bound Map* lambda body so later routes' Results.Json cannot leak into earlier scalars.
 * @param {string} bodySlice
 */
function boundCsharpMapBody(bodySlice) {
  let rest = bodySlice;
  const nextMap = rest.search(/\n\s*app\.Map(?:Get|Post|Put|Patch|Delete)\b/);
  if (nextMap >= 0) rest = rest.slice(0, nextMap);
  return rest.replace(/\)\s*;\s*$/s, "").trim();
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseCsharpBodyReturn(bodySlice, refs) {
  /** @type {number | undefined} */
  let status;
  /** @type {object | null} */
  let returnTree = null;
  /** @type {"json" | "scalar-lit" | "scalar-ref" | null} */
  let kind = null;

  const litM = bodySlice.match(/^(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')\s*/);
  if (litM) {
    const v = parseLiteralToken(litM[1]);
    if (v !== null) {
      return { status, returnTree: { t: "lit", v }, kind: "scalar-lit" };
    }
  }
  const idM = bodySlice.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*/);
  if (idM && refs[idM[1]] && !bodySlice.startsWith("Results.")) {
    return { status, returnTree: { t: "ref", ...refs[idM[1]] }, kind: "scalar-ref" };
  }

  const anon = bodySlice.match(CSHARP_JSON_ANON_RE);
  const dict = bodySlice.match(CSHARP_JSON_DICT_RE);
  if (anon) {
    returnTree = parseCsharpObjectEntries(anon[1], refs);
    if (anon[2]) status = Number.parseInt(anon[2], 10);
    kind = returnTree ? "json" : null;
  } else if (dict) {
    returnTree = parseCsharpObjectEntries(dict[1], refs);
    if (dict[2]) status = Number.parseInt(dict[2], 10);
    kind = returnTree ? "json" : null;
  } else {
    const createdBody = bodySlice.match(CSHARP_CREATED_BODY_RE);
    const acceptedBody = bodySlice.match(CSHARP_ACCEPTED_BODY_RE);
    if (createdBody) {
      status = 201;
      returnTree = parseCsharpObjectEntries(createdBody[1], refs);
      kind = returnTree ? "json" : null;
    } else if (acceptedBody) {
      status = 202;
      returnTree = parseCsharpObjectEntries(acceptedBody[1], refs);
      kind = returnTree ? "json" : null;
    } else if (CSHARP_CREATED_RE.test(bodySlice)) {
      status = 201;
      kind = "json";
      returnTree = { t: "obj", entries: [] };
    }
  }

  return { status, returnTree, kind };
}

/**
 * @param {object} ctx
 * @param {{ sqlEffects: object[], returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerCsharpHandlerBodyFull(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "csharp-ast:json-status")],
      }),
    );
  }
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
 * Scalar lit + optional non-200 status; 200 → text/plain literal like go/python/express.
 * @param {object} ctx
 * @param {number | undefined} status
 * @param {unknown} value
 * @param {{ file: string, line?: number }} loc
 */
function lowerCsharpScalarLit(ctx, status, value, loc) {
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
    provenance: [webir.provenance("hub-ingest", "csharp-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "csharp-scalar-lit-status")],
  });
}

/**
 * @param {string} slice
 * @returns {string | null}
 */
function boundCsharpControllerBody(slice) {
  const nextAttr = slice.search(/\n\s*\[(?:Http(?:Get|Post|Put|Patch|Delete|Head|Options)|Route)\b/);
  if (nextAttr >= 0) return slice.slice(0, nextAttr).trim();
  return slice.replace(/\)\s*;\s*$/s, "").trim();
}

/**
 * Controller [HttpGet] method body (expression or block return).
 * @param {string} source
 * @param {number} fromIndex
 * @param {string} routePath
 */
function parseCsharpControllerHandlerBody(source, fromIndex, routePath) {
  const slice = source.slice(fromIndex, fromIndex + 4000);
  if (!/^\s*\[(?:Http(?:Get|Post|Put|Patch|Delete|Head|Options))(?:\([^)]*\))?\]/i.test(slice)) {
    return null;
  }
  let rest = slice.replace(
    /^(\s*\[(?:Http(?:Get|Post|Put|Patch|Delete|Head|Options))(?:\([^)]*\))?\]\s*)+/i,
    "",
  );
  rest = rest.replace(/^(\s*\[[^\]]+\]\s*)*/, "");
  const sigM = rest.match(
    /^\s*public\s+(?:async\s+)?(?:[\w<>,.\[\]?]+\s+)+(\w+)\s*\(([^)]*)\)\s*(=>|\{)/s,
  );
  if (!sigM) return null;
  const lambdaParams = sigM[2];
  /** @type {string} */
  let bodySlice;
  if (sigM[3] === "=>") {
    const exprStart = rest.indexOf("=>") + 2;
    const semi = rest.indexOf(";", exprStart);
    bodySlice = boundCsharpControllerBody(rest.slice(exprStart, semi >= 0 ? semi : undefined).trim());
  } else {
    const blockM = rest.match(/\{\s*return\s+([\s\S]*?)\s*;\s*\}/);
    if (!blockM) return null;
    bodySlice = blockM[1].trim();
  }
  const line = source.slice(0, fromIndex).split("\n").length;
  const refs = parseCsharpRequestRefs(bodySlice, parseCsharpParamRefs(lambdaParams, routePath));
  const sqlEffects = parseCsharpSqlEffects(bodySlice, refs);
  const { status, returnTree, kind } = parseCsharpBodyReturn(bodySlice, refs);
  if (sqlEffects.length === 0 && !returnTree && status === undefined) return null;
  return { sqlEffects, returnTree, status, kind, line };
}

/**
 * @param {string} source
 * @param {number} fromIndex
 * @param {string} routePath
 */
function parseCsharpHandlerBody(source, fromIndex, routePath) {
  const controller = parseCsharpControllerHandlerBody(source, fromIndex, routePath);
  if (controller) return controller;

  const slice = source.slice(fromIndex, fromIndex + 4000);
  const mapM = slice.match(/Map(?:Get|Post|Put|Patch|Delete)\s*\(\s*"[^"]+"\s*,\s*\(([^)]*)\)\s*=>\s*/i);
  if (!mapM) return null;
  const lambdaParams = mapM[1];
  const bodyStart = slice.indexOf("=>", mapM.index ?? 0) + 2;
  const bodySlice = boundCsharpMapBody(slice.slice(bodyStart));
  const line = source.slice(0, fromIndex).split("\n").length;
  const refs = parseCsharpRequestRefs(bodySlice, parseCsharpParamRefs(lambdaParams, routePath));
  const sqlEffects = parseCsharpSqlEffects(bodySlice, refs);
  const { status, returnTree, kind } = parseCsharpBodyReturn(bodySlice, refs);
  if (sqlEffects.length === 0 && !returnTree && status === undefined) return null;
  return { sqlEffects, returnTree, status, kind, line };
}

function csharpMapLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 200);
  const m = slice.match(CSHARP_MAP_LAMBDA_RE);
  if (!m) return null;
  const v = parseLiteralToken(m[1]);
  if (v === null) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { value: v, line };
}

function csharpCreatedAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 200);
  const m = slice.match(CSHARP_CREATED_RE);
  if (!m) return null;
  // Prefer Created+body / Json+statusCode paths in parseCsharpHandlerBody.
  if (CSHARP_CREATED_BODY_RE.test(slice) || CSHARP_JSON_ANON_RE.test(slice)) return null;
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
    const loc = { file, line: parsed?.line ?? r.line };
    if (parsed?.kind === "scalar-lit" && parsed.returnTree?.t === "lit") {
      bodyId = lowerCsharpScalarLit(ctx, parsed.status, parsed.returnTree.v, loc);
    } else if (parsed && (parsed.sqlEffects.length > 0 || parsed.returnTree || parsed.status)) {
      bodyId =
        lowerCsharpHandlerBodyFull(ctx, parsed, loc) ??
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
