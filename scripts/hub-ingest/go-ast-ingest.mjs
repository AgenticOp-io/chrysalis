/**
 * Go hub ingest — route parse via @chrysalis/hub-native-bridge; lift in-process.
 * Handler bodies are brace-bounded so later gin.H / JSON calls cannot bleed
 * into earlier routes (hub-flagship-go / D6448-ST cwl-api). Named Gin handlers
 * (`r.GET("/path", health)` → `func health(c *gin.Context)`) resolve beyond
 * anonymous lambdas (hub-go-routes).
 */
import { parseGoRoutes } from "../../packages/hub-native-bridge/dist/go.js";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  lowerHubLiteral,
  lowerHubStatusOnly,
  hubOrigin,
  HUB_T,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { lowerHubDbQuery } from "./hub-native-sql-effects.mjs";

export { parseGoRoutes };

const LITERAL_RETURN_RE = /return\s+("([^"]*)"|'([^']*)'|true|false|-?\d+)\b/;
const GIN_STRING_RE = /c\.String\s*\(\s*(\d+)\s*,\s*"([^"]*)"\s*\)/;
const GIN_STATUS_RE = /c\.Status\s*\(\s*(\d+)\s*\)/;
const GIN_JSON_H_RE = /c\.JSON\s*\(\s*(\d+)\s*,\s*gin\.H\s*\{([\s\S]*?)\}\s*\)/;
const GIN_JSON_SCALAR_RE =
  /c\.JSON\s*\(\s*(\d+)\s*,\s*(?!gin\.H)(?:(true|false)|(-?\d+)|"([^"]*)"|(\w+))\s*\)/;
const GO_SQL_CALL_RE = /\w+\.(?:Query|QueryRow|Exec)\(\s*"([^"]+)"(?:\s*,\s*([^)]*))?\s*\)/g;
const GIN_H_PAIR_RE = /"([^"]+)"\s*:\s*(?:"([^"]*)"|(true|false|-?\d+)|(\w+))/g;

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
 * Extract the inner text of a balanced `{ ... }` starting at openIdx.
 * Skips quoted Go strings so braces inside literals do not confuse depth.
 * @param {string} source
 * @param {number} openIdx
 */
export function extractBalancedBraceInner(source, openIdx) {
  if (source[openIdx] !== "{") return null;
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
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
 * Resolve a named Gin handler `func name(c *gin.Context) { ... }` (optionally
 * with a receiver) referenced from `r.GET("/path", name)`.
 * @param {string} source
 * @param {string} handlerName
 */
export function extractGoNamedGinHandlerBody(source, handlerName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(handlerName)) return null;
  const defRe = new RegExp(
    String.raw`func\s+(?:\([^)]*\)\s+)?${handlerName}\s*\(\s*c\s*\*gin\.Context\s*\)\s*\{`,
  );
  const defM = source.match(defRe);
  if (!defM || defM.index === undefined) return null;
  const absOpen = defM.index + defM[0].lastIndexOf("{");
  const bal = extractBalancedBraceInner(source, absOpen);
  if (!bal) return null;
  const line = source.slice(0, absOpen).split("\n").length;
  return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end, named: handlerName };
}

/**
 * @param {string} source
 * @param {number} fromIndex — start of route registration line
 */
export function extractGoGinHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  // Prefer inline anonymous Gin lambdas (hub-flagship-go).
  const fnM = slice.match(/func\s*\(\s*c\s*\*gin\.Context\s*\)\s*\{/);
  if (fnM) {
    const openInSlice = (fnM.index ?? 0) + fnM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    const line = source.slice(0, absOpen).split("\n").length;
    return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end };
  }
  // Named handler refs: r.GET("/path", health) — resolve func health(...) { ... }.
  const namedM = slice.match(
    /\.(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"[^"]*"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/,
  );
  if (!namedM) return null;
  return extractGoNamedGinHandlerBody(source, namedM[1]);
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
function parseGoGinHReturn(bodySlice, byVar) {
  const m = bodySlice.match(GIN_JSON_H_RE);
  if (!m) return null;
  const status = Number.parseInt(m[1], 10);
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  GIN_H_PAIR_RE.lastIndex = 0;
  for (const pair of m[2].matchAll(GIN_H_PAIR_RE)) {
    const key = pair[1];
    if (pair[2] !== undefined) {
      entries.push({ key, value: { t: "lit", v: pair[2] } });
      continue;
    }
    const word = pair[3] ?? pair[4];
    if (word === "true" || word === "false") {
      entries.push({ key, value: { t: "lit", v: word === "true" } });
    } else if (word && /^-?\d+$/.test(word)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(word, 10) } });
    } else if (word && byVar[word]) {
      entries.push({ key, value: { t: "ref", ...byVar[word] } });
    } else {
      return null;
    }
  }
  if (entries.length === 0) return null;
  return { status, returnTree: { t: "obj", entries } };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoJsonScalar(bodySlice, byVar) {
  const m = bodySlice.match(GIN_JSON_SCALAR_RE);
  if (!m) return null;
  const status = Number.parseInt(m[1], 10);
  if (m[2] !== undefined) {
    return { status, kind: "lit", value: m[2] === "true" };
  }
  if (m[3] !== undefined) {
    return { status, kind: "lit", value: Number.parseInt(m[3], 10) };
  }
  if (m[4] !== undefined) {
    return { status, kind: "lit", value: m[4] };
  }
  const varName = m[5];
  if (varName && byVar[varName]) {
    return { status, kind: "ref", returnTree: { t: "ref", ...byVar[varName] } };
  }
  return null;
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
 * @param {object} ctx
 * @param {{ sqlEffects: object[], returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerGoHandlerBody(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "go-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "go-handler-body")],
  });
}

/**
 * Scalar lit + optional non-200 status (rare); 200 → text/plain literal like express/python.
 * @param {object} ctx
 * @param {number} status
 * @param {unknown} value
 * @param {{ file: string, line?: number }} loc
 */
function lowerGoScalarLit(ctx, status, value, loc) {
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
    provenance: [webir.provenance("hub-ingest", "go-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "go-scalar-lit-status")],
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
    const extracted = extractGoGinHandlerBody(source, idx);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-go:handler-body", { file, line: r.line });
    } else {
      const { bodySlice, line } = extracted;
      const loc = { file, line };
      const byVar = parseGoGinRefs(bodySlice);
      const sqlEffects = parseGoSqlEffects(bodySlice, byVar);
      const jsonH = parseGoGinHReturn(bodySlice, byVar);
      const jsonScalar = jsonH ? null : parseGoJsonScalar(bodySlice, byVar);
      const ginStr = !jsonH && !jsonScalar ? bodySlice.match(GIN_STRING_RE) : null;
      const ginStat = !jsonH && !jsonScalar && !ginStr ? bodySlice.match(GIN_STATUS_RE) : null;
      const litRet =
        !jsonH && !jsonScalar && !ginStr && !ginStat ? bodySlice.match(LITERAL_RETURN_RE) : null;

      if (jsonH || sqlEffects.length > 0) {
        bodyId =
          lowerGoHandlerBody(
            ctx,
            {
              sqlEffects,
              returnTree: jsonH?.returnTree ?? null,
              status: jsonH?.status,
              line,
            },
            loc,
          ) ?? hubHandlerBodyHole(ctx, "hub-go:handler-body", loc);
      } else if (jsonScalar?.kind === "ref") {
        bodyId =
          lowerGoHandlerBody(
            ctx,
            {
              sqlEffects: [],
              returnTree: jsonScalar.returnTree,
              status: jsonScalar.status,
              line,
            },
            loc,
          ) ?? hubHandlerBodyHole(ctx, "hub-go:handler-body", loc);
      } else if (jsonScalar?.kind === "lit") {
        bodyId = lowerGoScalarLit(ctx, jsonScalar.status, jsonScalar.value, loc);
      } else if (ginStr) {
        const status = Number.parseInt(ginStr[1], 10);
        const value = ginStr[2];
        bodyId = lowerGoScalarLit(ctx, status, value, loc);
      } else if (ginStat) {
        bodyId = lowerHubStatusOnly(ctx, Number.parseInt(ginStat[1], 10), loc);
      } else if (litRet) {
        bodyId = lowerHubLiteral(ctx, parseGoLiteral(litRet[1]), loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-go:handler-body", loc);
      }
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
