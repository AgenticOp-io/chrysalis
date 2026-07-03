/**
 * Go hub ingest — route parse via @chrysalis/hub-native-bridge; lift in-process.
 */
import { parseGoRoutes } from "../../packages/hub-native-bridge/dist/go.js";
import { emitHubRoute, hubHandlerBodyHole, lowerHubLiteral, lowerHubStatusOnly, hubOrigin, HUB_T } from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { lowerHubDbQuery } from "./hub-native-sql-effects.mjs";

export { parseGoRoutes };

const LITERAL_RETURN_RE = /return\s+("([^"]*)"|'([^']*)'|true|false|-?\d+)\b/;
const GIN_STRING_RE = /c\.String\s*\(\s*\d+\s*,\s*"([^"]*)"\s*\)/;
const GIN_STATUS_RE = /c\.Status\s*\(\s*(\d+)\s*\)/;
const GIN_JSON_H_RE = /c\.JSON\s*\(\s*\d+\s*,\s*gin\.H\s*\{([\s\S]*?)\}\s*\)/;
const GO_SQL_CALL_RE = /\w+\.(?:Query|QueryRow|Exec)\(\s*"([^"]+)"(?:\s*,\s*([^)]*))?\s*\)/g;

/**
 * @param {string} language
 * @param {string} ext
 */
export function canGoAstIngest(language, ext) {
  return language === "go" && ext.toLowerCase() === ".go";
}

/**
 * @param {string} raw
 */
function parseGoLiteral(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  return raw;
}

/**
 * @param {string} source
 * @param {number} fromIndex
 */
function literalReturnAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 800);
  const m = slice.match(LITERAL_RETURN_RE);
  if (!m) return null;
  const token = m[1];
  const lineOffset = slice.slice(0, m.index).split("\n").length - 1;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  return { value: parseGoLiteral(token), line: baseLine + lineOffset };
}

/**
 * @param {string} source
 * @param {number} fromIndex
 */
function ginStringLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 800);
  const m = slice.match(GIN_STRING_RE);
  if (!m) return null;
  const lineOffset = slice.slice(0, m.index).split("\n").length - 1;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  return { value: m[1], line: baseLine + lineOffset };
}

function ginStatusAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 800);
  const m = slice.match(GIN_STATUS_RE);
  if (!m) return null;
  const lineOffset = slice.slice(0, m.index).split("\n").length - 1;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  return { status: Number.parseInt(m[1], 10), line: baseLine + lineOffset };
}

/**
 * @param {string} bodySlice
 */
function parseGoGinRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*c\.Param\("([^"]+)"\)/g)) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*c\.(?:DefaultQuery|Query)\("([^"]+)"(?:,\s*"([^"]*)")?\)/g)) {
    byVar[m[1]] = {
      source: "query",
      name: m[2],
      ...(m[3] !== undefined ? { default: m[3] } : {}),
    };
  }
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*c\.GetHeader\("([^"]+)"\)/g)) {
    byVar[m[1]] = { source: "header", name: m[2] };
  }
  for (const m of bodySlice.matchAll(/(\w+)(?:\s*,\s*_\s*)?\s*:=\s*c\.Cookie\("([^"]+)"\)/g)) {
    byVar[m[1]] = { source: "cookie", name: m[2] };
  }
  return byVar;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoGinHReturnTree(bodySlice, byVar) {
  const m = bodySlice.match(GIN_JSON_H_RE);
  if (!m) return null;
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of m[1].matchAll(/"([^"]+)"\s*:\s*(\w+)/g)) {
    const key = pair[1];
    const varName = pair[2];
    if (byVar[varName]) {
      entries.push({ key, value: { t: "ref", ...byVar[varName] } });
    } else if (varName === "true" || varName === "false") {
      entries.push({ key, value: { t: "lit", v: varName === "true" } });
    } else if (/^-?\d+$/.test(varName)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(varName, 10) } });
    } else {
      return null;
    }
  }
  if (entries.length === 0) return null;
  return { t: "obj", entries };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoSqlEffects(bodySlice, byVar) {
  /** @type {{ sql: string, params: object[] }[]} */
  const effects = [];
  for (const m of bodySlice.matchAll(GO_SQL_CALL_RE)) {
    const sql = m[1];
    const rawParams = m[2]?.trim();
    /** @type {object[]} */
    const params = [];
    if (rawParams) {
      for (const part of rawParams.split(",")) {
        const p = part.trim();
        if (byVar[p]) {
          params.push({ t: "ref", ...byVar[p] });
        } else if (p === "true" || p === "false") {
          params.push({ t: "lit", v: p === "true" });
        } else if (/^-?\d+$/.test(p)) {
          params.push({ t: "lit", v: Number.parseInt(p, 10) });
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
 */
function parseGoHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 3500);
  const fnM = slice.match(/func\s*\(\s*c\s*\*gin\.Context\s*\)\s*\{/);
  if (!fnM) return null;
  const bodyStart = slice.indexOf("{", fnM.index ?? 0);
  const bodySlice = slice.slice(bodyStart);
  const line = source.slice(0, fromIndex).split("\n").length;
  const byVar = parseGoGinRefs(bodySlice);
  const sqlEffects = parseGoSqlEffects(bodySlice, byVar);
  const returnTree = parseGoGinHReturnTree(bodySlice, byVar);
  if (sqlEffects.length === 0 && !returnTree) return null;
  return { sqlEffects, returnTree, line };
}

/**
 * @param {object} ctx
 * @param {{ sqlEffects: object[], returnTree: object | null, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerGoHandlerBody(ctx, parsed, loc) {
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
    provenance: [webir.provenance("hub-ingest", "go-handler-body")],
  });
}

/**
 * @param {object} opts
 */
export function liftGoFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseGoRoutes(source);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const parsed = parseGoHandlerBody(source, idx);
    let bodyId;
    if (parsed) {
      bodyId =
        lowerGoHandlerBody(ctx, parsed, { file, line: parsed.line }) ??
        hubHandlerBodyHole(ctx, "hub-go:handler-body", { file, line: r.line });
    } else {
      const lit = literalReturnAfter(source, idx) ?? ginStringLiteralAfter(source, idx);
      const statusOnly = lit ? null : ginStatusAfter(source, idx);
      bodyId =
        lit?.value !== undefined
          ? lowerHubLiteral(ctx, lit.value, { file, line: lit.line })
          : statusOnly
            ? lowerHubStatusOnly(ctx, statusOnly.status, { file, line: statusOnly.line })
            : hubHandlerBodyHole(ctx, "hub-go:handler-body", { file, line: r.line });
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
