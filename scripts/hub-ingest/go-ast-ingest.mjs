/**
 * Go hub ingest v0 — net/http, gin, echo, chi, mux-style route registration patterns.
 */
import { emitHubRoute, hubHandlerBodyHole, lowerHubLiteral, lowerHubStatusOnly } from "./hub-lift-webir-route.mjs";

const GO_VERB_RE =
  /\b([a-zA-Z_][\w]*)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/g;

const GO_HANDLE_FUNC_RE = /\bhttp\.HandleFunc\s*\(\s*"([^"]+)"/g;

const LITERAL_RETURN_RE = /return\s+("([^"]*)"|'([^']*)'|true|false|-?\d+)\b/;
const GIN_STRING_RE = /c\.String\s*\(\s*\d+\s*,\s*"([^"]*)"\s*\)/;
const GIN_STATUS_RE = /c\.Status\s*\(\s*(\d+)\s*\)/;

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
 * @param {string} source
 */
export function parseGoRoutes(source) {
  const routes = [];
  const seen = new Set();

  function push(method, path, index) {
    const key = `${method}:${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({
      method: method.toUpperCase(),
      path,
      line: source.slice(0, index).split("\n").length,
      name: `go_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
    });
  }

  GO_VERB_RE.lastIndex = 0;
  let m;
  while ((m = GO_VERB_RE.exec(source)) !== null) {
    push(m[2], m[3], m.index);
  }

  GO_HANDLE_FUNC_RE.lastIndex = 0;
  while ((m = GO_HANDLE_FUNC_RE.exec(source)) !== null) {
    push("GET", m[1], m.index);
  }

  return routes;
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
    const lit = literalReturnAfter(source, idx) ?? ginStringLiteralAfter(source, idx);
    const statusOnly = lit ? null : ginStatusAfter(source, idx);
    const bodyId =
      lit?.value !== undefined
        ? lowerHubLiteral(ctx, lit.value, { file, line: lit.line })
        : statusOnly
          ? lowerHubStatusOnly(ctx, statusOnly.status, { file, line: statusOnly.line })
          : hubHandlerBodyHole(ctx, "hub-go:handler-body", { file, line: r.line });
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
