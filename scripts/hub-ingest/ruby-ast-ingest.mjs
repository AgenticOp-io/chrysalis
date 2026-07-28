/**
 * Ruby hub ingest — Sinatra routes via pattern + semantic body lowering.
 * Deepened for D6448-ST cwl-api flagship: string scalars, status+json depth,
 * path/query refs (hub-flagship-ruby).
 * G10022 / D6484: shallow Roda `r.get|post` + Hash / response.status / block
 * captures / r.params (nested `r.on` stays honest hole).
 * G10032 / D6494: flat Grape `class API < Grape::API` + `get "/path" do`
 * reuses Sinatra peels (`/:id`, `params[]`, `status N`, bare Hash); nested
 * `route_param` / `present` / `params do` stay honest holes.
 * G10062 / D6524: flat Padrino `Padrino::Application` + `get "/path" do`
 * likewise reuses Sinatra peels; symbol controllers / mount stay honest holes.
 * G10073 / D6535: Sinatra `namespace '/api' do` literal path join (deepens ST;
 * Rack map / conditions / invented base.path stay honest holes).
 */
import { parseRubyRoutes } from "../../packages/hub-native-bridge/dist/ruby.js";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { lowerHubDbQuery } from "./hub-native-sql-effects.mjs";

export { parseRubyRoutes };

const RUBY_JSON_HASH_RE = /json\s+(?:\{([\s\S]*?)\}|(.+?))\s*$/m;
/** Roda json plugin: bare `{ key: val }` as the handler return. */
const RUBY_BARE_HASH_RE = /\{([\s\S]*?)\}\s*$/m;
const RUBY_SQL_CALL_RE = /\w+\.(?:execute|query|exec)\(\s*"([^"]+)"(?:\s*,\s*([^)]+))?\s*\)/gi;
const RUBY_STATUS_RE = /(?:\bstatus\s+(\d+)\b|response\.status\s*=\s*(\d+))/;
const RUBY_SCALAR_LIT_RE =
  /(?:^|\n)\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')\s*(?:\n|$)/;
const RUBY_PARAMS_REF_RE =
  /(?:^|\n)\s*(?:r\.)?params\[\s*(?:['"]|:)([^'"]+)['"]?\s*\]\s*(?:\n|$)/;

/**
 * @param {string} language
 * @param {string} ext
 */
export function canRubyAstIngest(language, ext) {
  return language === "ruby" && ext.toLowerCase() === ".rb";
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
 * Strip leading Roda/Sinatra block params (`|id|`) from a handler body.
 * @param {string} bodySlice
 * @returns {{ body: string, blockParams: string[] }}
 */
function peelRubyBlockParams(bodySlice) {
  const m = bodySlice.match(/^\s*\|([^|]+)\|\s*/);
  if (!m) return { body: bodySlice, blockParams: [] };
  const blockParams = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { body: bodySlice.slice(m[0].length), blockParams };
}

/**
 * @param {string} bodySlice
 * @param {string} [routePath]
 * @param {string[]} [blockParams]
 */
function parseRubyParamRefs(bodySlice, routePath = "", blockParams = []) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  const pathNames = new Set([...routePath.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));
  for (const name of blockParams) {
    byVar[name] = { source: "path", name };
    pathNames.add(name);
  }
  for (const m of bodySlice.matchAll(/(?:r\.|request\.)?params\[(?:'|:)([^'"]+)(?:'|\])\]/g)) {
    const name = m[1];
    byVar[name] = { source: pathNames.has(name) ? "path" : "query", name };
  }
  for (const m of bodySlice.matchAll(/(?:r\.|request\.)?params\[["']([^"']+)["']\]/g)) {
    const name = m[1];
    if (!byVar[name]) {
      byVar[name] = { source: pathNames.has(name) ? "path" : "query", name };
    }
  }
  for (const m of bodySlice.matchAll(
    /(?:r\.|request\.)?params\.fetch\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/g,
  )) {
    byVar[m[1]] = { source: "query", name: m[1], default: m[2] };
  }
  for (const m of bodySlice.matchAll(/(?:r\.|request\.)?params\[['"]([^'"]+)['"]\]/g)) {
    if (!byVar[m[1]]) byVar[m[1]] = { source: "query", name: m[1] };
  }
  for (const m of bodySlice.matchAll(/request\.env\[['"]HTTP_([^'"]+)['"]\]/g)) {
    const hdr = m[1].toLowerCase().replace(/_/g, "-");
    byVar[`__hdr_${hdr}`] = { source: "header", name: hdr };
  }
  for (const m of bodySlice.matchAll(/request\.cookies\[['"]([^'"]+)['"]\]/g)) {
    byVar[`__cookie_${m[1]}`] = { source: "cookie", name: m[1] };
  }
  return byVar;
}

/**
 * @param {string} rawVal
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 * @returns {object | null}
 */
function lowerRubyHashValue(rawVal, refs) {
  const v = rawVal.trim();
  if (refs[v]) return { t: "ref", ...refs[v] };
  // Roda: `r.params["q"] || ""` / `r.params["q"].to_s`
  const paramOr = v.match(
    /^(?:r\.|request\.)?params\[\s*['"]([^'"]+)['"]\s*\]\s*(?:\|\|\s*['"]([^'"]*)['"]|\.to_s)?$/,
  );
  if (paramOr) {
    const name = paramOr[1];
    const ref = refs[name];
    if (paramOr[2] !== undefined) {
      return { t: "ref", source: "query", name, default: paramOr[2] };
    }
    return ref ? { t: "ref", ...ref } : { t: "ref", source: "query", name };
  }
  if (
    v.startsWith("params[") ||
    v.startsWith("params.fetch") ||
    v.startsWith("r.params[") ||
    v.startsWith("r.params.fetch") ||
    v.startsWith("request.params[")
  ) {
    const q = v.match(/['"]([^'"]+)['"]/);
    if (!q) return null;
    const name = q[1];
    const fetchDef = v.match(/\.fetch\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]*)['"]\s*\)/);
    if (fetchDef) return { t: "ref", source: "query", name, default: fetchDef[1] };
    const ref = refs[name];
    return ref ? { t: "ref", ...ref } : { t: "ref", source: "query", name };
  }
  if (v.includes("request.env")) {
    const h = v.match(/HTTP_([^'"]+)/);
    if (!h) return null;
    return { t: "ref", source: "header", name: h[1].toLowerCase().replace(/_/g, "-") };
  }
  if (v.includes("request.cookies")) {
    const c = v.match(/['"]([^'"]+)['"]/);
    if (!c) return null;
    return { t: "ref", source: "cookie", name: c[1] };
  }
  if (v === "true" || v === "false") return { t: "lit", v: v === "true" };
  if (/^-?\d+$/.test(v)) return { t: "lit", v: Number.parseInt(v, 10) };
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return { t: "lit", v: v.slice(1, -1) };
  }
  // Bare IDENT path capture (Roda `|id|` / Sinatra path name)
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(v) && refs[v]?.source === "path") {
    return { t: "ref", ...refs[v] };
  }
  return null;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseRubyJsonReturnTree(bodySlice, refs) {
  const m = bodySlice.match(RUBY_JSON_HASH_RE) ?? bodySlice.match(RUBY_BARE_HASH_RE);
  if (!m) return null;
  const inner = (m[1] ?? m[2] ?? "").trim();
  if (!inner) return null;
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of inner.matchAll(/(\w+)\s*:\s*([^,\n}]+)/g)) {
    const key = pair[1];
    const value = lowerRubyHashValue(pair[2], refs);
    if (!value) return null;
    entries.push({ key, value });
  }
  if (entries.length === 0) return null;
  return { t: "obj", entries };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseRubySqlEffects(bodySlice, refs) {
  /** @type {{ sql: string, params: object[] }[]} */
  const effects = [];
  for (const m of bodySlice.matchAll(RUBY_SQL_CALL_RE)) {
    const sql = m[1];
    const rawParams = m[2]?.trim();
    /** @type {object[]} */
    const params = [];
    if (rawParams) {
      for (const part of rawParams.replace(/^\[/, "").replace(/\]$/, "").split(",")) {
        const p = part.trim();
        const paramRef = p.match(/params\[(?:'|:)([^'"]+)/);
        if (paramRef && refs[paramRef[1]]) {
          params.push({ t: "ref", ...refs[paramRef[1]] });
        }
      }
    }
    effects.push({ sql, params });
  }
  return effects;
}

/**
 * Extract Sinatra `do ... end` body after the route verb line.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractRubyHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 3500);
  const blockM = slice.match(/\bdo\b([\s\S]*?)\bend\b/);
  if (!blockM) return null;
  const bodySlice = blockM[1];
  const line = source.slice(0, fromIndex).split("\n").length;
  return { bodySlice, line };
}

/**
 * @param {string} bodySlice
 * @param {string} routePath
 */
function parseRubyBodyReturn(bodySlice, routePath) {
  const peeled = peelRubyBlockParams(bodySlice);
  const body = peeled.body;
  const refs = parseRubyParamRefs(body, routePath, peeled.blockParams);
  // Path capture names from route template also count as path refs for bare IDENT returns
  for (const name of [...routePath.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1])) {
    if (!refs[name]) refs[name] = { source: "path", name };
  }
  const sqlEffects = parseRubySqlEffects(body, refs);
  const statusM = body.match(RUBY_STATUS_RE);
  const status = statusM
    ? Number.parseInt(statusM[1] ?? statusM[2] ?? "", 10)
    : undefined;
  const returnTree = parseRubyJsonReturnTree(body, refs);
  if (returnTree || sqlEffects.length > 0 || status !== undefined) {
    /** @type {"json" | "scalar-lit" | "scalar-ref" | null} */
    let kind = returnTree ? "json" : null;
    if (!returnTree && status !== undefined && sqlEffects.length === 0) kind = null;
    return { sqlEffects, returnTree, status, kind, refs };
  }

  const litM = body.match(RUBY_SCALAR_LIT_RE);
  if (litM) {
    const v = parseLiteralToken(litM[1]);
    if (v !== null) {
      return {
        sqlEffects: [],
        returnTree: { t: "lit", v },
        status,
        kind: "scalar-lit",
        refs,
      };
    }
  }

  // Bare path capture return: `|userId|\n      userId`
  const bareIdent = body.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/);
  if (bareIdent && refs[bareIdent[1]]?.source === "path") {
    return {
      sqlEffects: [],
      returnTree: { t: "ref", ...refs[bareIdent[1]] },
      status,
      kind: "scalar-ref",
      refs,
    };
  }

  const refM = body.match(RUBY_PARAMS_REF_RE);
  if (refM) {
    const name = refM[1];
    const pathNames = new Set([...routePath.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));
    const ref = refs[name] ?? {
      source: pathNames.has(name) ? "path" : "query",
      name,
    };
    return {
      sqlEffects: [],
      returnTree: { t: "ref", ...ref },
      status,
      kind: "scalar-ref",
      refs,
    };
  }

  return null;
}

/**
 * @param {object} ctx
 * @param {{ sqlEffects: object[], returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerRubyHandlerBodyFull(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "ruby-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "ruby-handler-body")],
  });
}

/**
 * @param {object} ctx
 * @param {number | undefined} status
 * @param {unknown} value
 * @param {{ file: string, line?: number }} loc
 */
function lowerRubyScalarLit(ctx, status, value, loc) {
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
    provenance: [webir.provenance("hub-ingest", "ruby-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "ruby-scalar-lit-status")],
  });
}

/**
 * Only match an inline `do <lit> end` for *this* route — do not scan into later routes
 * (a forward scan would steal the next handler's scalar, e.g. stats `3` into users).
 * @param {string} source
 * @param {number} fromIndex
 */
function rubyBlockLiteralAfter(source, fromIndex) {
  const extracted = extractRubyHandlerBody(source, fromIndex);
  if (!extracted) return null;
  const peeled = peelRubyBlockParams(extracted.bodySlice);
  const m = peeled.body.match(/^\s*(true|false|-?\d+|"[^"]*"|'[^']*')\s*$/);
  if (!m) return null;
  const v = parseLiteralToken(m[1]);
  if (v === null) return null;
  return { value: v, line: extracted.line };
}

/**
 * @param {object} opts
 */
export function liftRubyFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseRubyRoutes(source);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const extracted = extractRubyHandlerBody(source, idx);
    let bodyId;
    const parsed = extracted ? parseRubyBodyReturn(extracted.bodySlice, r.path) : null;
    const loc = { file, line: extracted?.line ?? r.line };

    if (parsed?.kind === "scalar-lit" && parsed.returnTree?.t === "lit") {
      bodyId = lowerRubyScalarLit(ctx, parsed.status, parsed.returnTree.v, loc);
    } else if (parsed && (parsed.sqlEffects.length > 0 || parsed.returnTree || parsed.status)) {
      bodyId =
        lowerRubyHandlerBodyFull(
          ctx,
          {
            sqlEffects: parsed.sqlEffects,
            returnTree: parsed.returnTree,
            status: parsed.status,
            line: loc.line,
          },
          loc,
        ) ?? hubHandlerBodyHole(ctx, "hub-ruby:handler-body", { file, line: r.line });
    } else {
      const lit = rubyBlockLiteralAfter(source, idx);
      bodyId =
        lit?.value !== undefined
          ? lowerHubLiteral(ctx, lit.value, { file, line: lit.line })
          : hubHandlerBodyHole(ctx, "hub-ruby:handler-body", { file, line: r.line });
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
