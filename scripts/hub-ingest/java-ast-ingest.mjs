/**
 * Java hub ingest — route parse via @chrysalis/hub-native-bridge; lift in-process.
 */
import { parseJavaRoutes } from "../../packages/hub-native-bridge/dist/java.js";
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

export { parseJavaRoutes };

const LITERAL_RETURN_RE = /return\s+(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')\s*;/;
const MAP_OF_RE = /return\s+java\.util\.Map\.of\s*\(\s*"([^"]+)"\s*,\s*(-?\d+)\s*\)\s*;/;
const JAVA_MAP_OF_RETURN_RE = /return\s+Map\.of\s*\(([\s\S]*?)\)\s*;/;
const JAVA_SQL_CALL_RE = /\w+\.(?:query\w*|execute\w*)\(\s*"([^"]+)"(?:\s*,\s*([^)]*))?\s*\)/g;

/**
 * @param {string} language
 * @param {string} ext
 */
export function canJavaAstIngest(language, ext) {
  return language === "java" && ext.toLowerCase() === ".java";
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
 * @param {string} source
 * @param {number} fromIndex
 * @param {string} file
 */
function literalReturnAfter(source, fromIndex, file) {
  const slice = source.slice(fromIndex, fromIndex + 1200);
  const line = source.slice(0, fromIndex).split("\n").length;
  const mapM = slice.match(MAP_OF_RE);
  if (mapM) {
    const key = mapM[1];
    const val = Number.parseInt(mapM[2], 10);
    return { object: { [key]: val }, line: line + slice.slice(0, mapM.index).split("\n").length - 1 };
  }
  const m = slice.match(LITERAL_RETURN_RE);
  if (!m) return { bodyId: null, line };
  const v = parseLiteralToken(m[1].trim());
  if (v === null) return { bodyId: null, line };
  return { value: v, line: line + slice.slice(0, m.index).split("\n").length - 1 };
}

/**
 * @param {string} paramSource
 */
function parseJavaParamRefs(paramSource) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of paramSource.matchAll(/@PathVariable(?:\([^)]*\))?\s+\w+\s+(\w+)/g)) {
    byVar[m[1]] = { source: "path", name: m[1] };
  }
  for (const m of paramSource.matchAll(/@RequestParam(?:\(([^)]*)\))?\s+\w+\s+(\w+)/g)) {
    const ann = m[1] ?? "";
    const varName = m[2];
    const nameM = ann.match(/name\s*=\s*"([^"]+)"/);
    const defM = ann.match(/defaultValue\s*=\s*"([^"]*)"/);
    byVar[varName] = {
      source: "query",
      name: nameM ? nameM[1] : varName,
      ...(defM ? { default: defM[1] } : {}),
    };
  }
  for (const m of paramSource.matchAll(/@RequestHeader(?:\(\s*"([^"]+)"\s*\))?\s+\w+\s+(\w+)/g)) {
    byVar[m[2]] = { source: "header", name: m[1] ?? m[2] };
  }
  for (const m of paramSource.matchAll(/@CookieValue(?:\(\s*"([^"]+)"\s*\))?\s+\w+\s+(\w+)/g)) {
    byVar[m[2]] = { source: "cookie", name: m[1] ?? m[2] };
  }
  return byVar;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseJavaSqlEffects(bodySlice, paramRefs) {
  /** @type {{ sql: string, params: object[] }[]} */
  const effects = [];
  for (const m of bodySlice.matchAll(JAVA_SQL_CALL_RE)) {
    const sql = m[1];
    const rawParams = m[2]?.trim();
    /** @type {object[]} */
    const params = [];
    if (rawParams) {
      for (const part of rawParams.split(",")) {
        const p = part.trim();
        if (paramRefs[p]) {
          params.push({ t: "ref", ...paramRefs[p] });
        } else {
          const lit = parseLiteralToken(p);
          if (lit !== null) params.push({ t: "lit", v: lit });
        }
      }
    }
    effects.push({ sql, params });
  }
  return effects;
}

/**
 * @param {string} mapInner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseJavaMapOfReturnTree(mapInner, paramRefs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of mapInner.matchAll(/"([^"]+)"\s*,\s*([^,\)]+)/g)) {
    const key = pair[1];
    const rawVal = pair[2].trim();
    if (rawVal === "true" || rawVal === "false") {
      entries.push({ key, value: { t: "lit", v: rawVal === "true" } });
    } else if (/^-?\d+$/.test(rawVal)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(rawVal, 10) } });
    } else if (
      (rawVal.startsWith('"') && rawVal.endsWith('"')) ||
      (rawVal.startsWith("'") && rawVal.endsWith("'"))
    ) {
      entries.push({ key, value: { t: "lit", v: rawVal.slice(1, -1) } });
    } else if (paramRefs[rawVal]) {
      entries.push({ key, value: { t: "ref", ...paramRefs[rawVal] } });
    } else {
      return null;
    }
  }
  if (entries.length === 0) return null;
  return { t: "obj", entries };
}

/**
 * @param {string} source
 * @param {number} fromIndex
 */
function parseJavaHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 4000);
  const methodM = slice.match(/public\s+[\w<>,.\s?]+\s+\w+\s*\(([\s\S]*?)\)\s*\{/);
  if (!methodM) return null;
  const paramRefs = parseJavaParamRefs(methodM[1]);
  const bodyStart = slice.indexOf("{", methodM.index ?? 0);
  const bodySlice = slice.slice(bodyStart);
  const line = source.slice(0, fromIndex).split("\n").length;
  const sqlEffects = parseJavaSqlEffects(bodySlice, paramRefs);
  const mapM = bodySlice.match(JAVA_MAP_OF_RETURN_RE);
  const returnTree = mapM ? parseJavaMapOfReturnTree(mapM[1], paramRefs) : null;
  return { sqlEffects, returnTree, line };
}

/**
 * @param {object} ctx
 * @param {{ sqlEffects: object[], returnTree: object | null, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerJavaHandlerBody(ctx, parsed, loc) {
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
    provenance: [webir.provenance("hub-ingest", "java-handler-body")],
  });
}

/**
 * @param {object} opts
 */
export function liftJavaFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseJavaRoutes(source, file);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const parsed = parseJavaHandlerBody(source, idx);
    let bodyId;
    if (parsed && (parsed.sqlEffects.length > 0 || parsed.returnTree)) {
      bodyId =
        lowerJavaHandlerBody(ctx, parsed, { file, line: parsed.line }) ??
        hubHandlerBodyHole(ctx, "hub-java:handler-body", { file, line: r.line });
    } else {
      const lit = literalReturnAfter(source, idx, file);
      bodyId =
        lit?.object
          ? lowerHubObjectLiteral(ctx, lit.object, { file, line: lit.line })
          : lit?.value !== undefined
            ? lowerHubLiteral(ctx, lit.value, { file, line: lit.line })
            : hubHandlerBodyHole(ctx, "hub-java:handler-body", { file, line: r.line });
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
