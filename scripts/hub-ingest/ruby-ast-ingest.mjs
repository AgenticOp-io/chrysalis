/**
 * Ruby hub ingest — Sinatra routes via pattern + semantic body lowering.
 */
import { parseRubyRoutes } from "../../packages/hub-native-bridge/dist/ruby.js";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
  lowerHubObjectLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { lowerHubDbQuery } from "./hub-native-sql-effects.mjs";

export { parseRubyRoutes };

const RUBY_JSON_HASH_RE = /json\s+(?:\{([\s\S]*?)\}|(.+?))\s*$/m;
const RUBY_SQL_CALL_RE = /\w+\.(?:execute|query|exec)\(\s*"([^"]+)"(?:\s*,\s*([^)]+))?\s*\)/gi;

/**
 * @param {string} language
 * @param {string} ext
 */
export function canRubyAstIngest(language, ext) {
  return language === "ruby" && ext.toLowerCase() === ".rb";
}

/**
 * @param {string} bodySlice
 * @param {string} [routePath]
 */
function parseRubyParamRefs(bodySlice, routePath = "") {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  const pathNames = new Set([...routePath.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));
  for (const m of bodySlice.matchAll(/params\[(?:'|:)([^'"]+)(?:'|\])\]/g)) {
    const name = m[1];
    byVar[name] = { source: pathNames.has(name) ? "path" : "query", name };
  }
  for (const m of bodySlice.matchAll(/params\[["']([^"']+)["']\]/g)) {
    const name = m[1];
    if (!byVar[name]) {
      byVar[name] = { source: pathNames.has(name) ? "path" : "query", name };
    }
  }
  for (const m of bodySlice.matchAll(/params\.fetch\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/g)) {
    byVar[m[1]] = { source: "query", name: m[1], default: m[2] };
  }
  for (const m of bodySlice.matchAll(/params\[['"]([^'"]+)['"]\]/g)) {
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
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} refs
 */
function parseRubyJsonReturnTree(bodySlice, refs) {
  const m = bodySlice.match(RUBY_JSON_HASH_RE);
  if (!m) return null;
  const inner = (m[1] ?? m[2] ?? "").trim();
  if (!inner) return null;
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of inner.matchAll(/(\w+)\s*:\s*([^,\n}]+)/g)) {
    const key = pair[1];
    const rawVal = pair[2].trim();
    if (refs[rawVal]) {
      entries.push({ key, value: { t: "ref", ...refs[rawVal] } });
    } else if (rawVal.startsWith("params[") || rawVal.startsWith("params.fetch")) {
      const q = rawVal.match(/['"]([^'"]+)['"]/);
      if (q) {
        const name = q[1];
        const ref = refs[name];
        entries.push({
          key,
          value: ref ? { t: "ref", ...ref } : { t: "ref", source: "query", name },
        });
      } else return null;
    } else if (rawVal.includes("request.env")) {
      const h = rawVal.match(/HTTP_([^'"]+)/);
      if (h) {
        const name = h[1].toLowerCase().replace(/_/g, "-");
        entries.push({ key, value: { t: "ref", source: "header", name } });
      } else return null;
    } else if (rawVal.includes("request.cookies")) {
      const c = rawVal.match(/['"]([^'"]+)['"]/);
      if (c) entries.push({ key, value: { t: "ref", source: "cookie", name: c[1] } });
      else return null;
    } else if (rawVal === "true" || rawVal === "false") {
      entries.push({ key, value: { t: "lit", v: rawVal === "true" } });
    } else if (/^-?\d+$/.test(rawVal)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(rawVal, 10) } });
    } else if (rawVal.startsWith('"') || rawVal.startsWith("'")) {
      entries.push({ key, value: { t: "lit", v: rawVal.slice(1, -1) } });
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
 * @param {string} source
 * @param {number} fromIndex
 * @param {string} [routePath]
 */
function parseRubyHandlerBody(source, fromIndex, routePath = "") {
  const slice = source.slice(fromIndex, fromIndex + 3500);
  const blockM = slice.match(/\bdo\s*\n?([\s\S]*?)\nend\b/);
  if (!blockM) return null;
  const bodySlice = blockM[1];
  const line = source.slice(0, fromIndex).split("\n").length;
  const refs = parseRubyParamRefs(bodySlice, routePath);
  const sqlEffects = parseRubySqlEffects(bodySlice, refs);
  const returnTree = parseRubyJsonReturnTree(bodySlice, refs);
  if (sqlEffects.length === 0 && !returnTree) return null;
  return { sqlEffects, returnTree, line };
}

/**
 * @param {object} ctx
 * @param {{ sqlEffects: object[], returnTree: object | null, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerRubyHandlerBody(ctx, parsed, loc) {
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
    provenance: [webir.provenance("hub-ingest", "ruby-handler-body")],
  });
}

function rubyBlockLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 200);
  const m = slice.match(/\bdo\s+(true|false|-?\d+)\s+end\b/);
  if (!m) return null;
  const v = m[1] === "true" ? true : m[1] === "false" ? false : Number.parseInt(m[1], 10);
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { value: v, line };
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
    const parsed = parseRubyHandlerBody(source, idx, r.path);
    let bodyId;
    if (parsed) {
      bodyId =
        lowerRubyHandlerBody(ctx, parsed, { file, line: parsed.line }) ??
        hubHandlerBodyHole(ctx, "hub-ruby:handler-body", { file, line: r.line });
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
