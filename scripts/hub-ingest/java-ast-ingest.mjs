/**
 * Java hub ingest v0 — Spring/JAX-RS annotation patterns (source scan, not javac).
 */
import { emitHubRoute, hubHandlerBodyHole, lowerHubLiteral, lowerHubObjectLiteral } from "./hub-lift-webir-route.mjs";

const SPRING_VERB_RE =
  /@(Get|Post|Put|Patch|Delete|Head|Options)Mapping\s*\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']+)["']/gi;

const JAXRS_VERB_PATH_RE =
  /@(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b[\s\S]{0,120}?@Path\s*\(\s*["']([^"']+)["']\s*\)/gi;

const JAXRS_PATH_VERB_RE =
  /@Path\s*\(\s*["']([^"']+)["']\s*\)[\s\S]{0,120}?@(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/gi;

const LITERAL_RETURN_RE = /return\s+(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')\s*;/;
const MAP_OF_RE = /return\s+java\.util\.Map\.of\s*\(\s*"([^"]+)"\s*,\s*(-?\d+)\s*\)\s*;/;

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
 * @param {string} source
 * @param {string} file
 */
export function parseJavaRoutes(source, file) {
  const routes = [];
  const seen = new Set();

  function push(method, path, index, name) {
    const key = `${method}:${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    const line = source.slice(0, index).split("\n").length;
    routes.push({ method: method.toUpperCase(), path, line, name });
  }

  for (const re of [SPRING_VERB_RE, JAXRS_VERB_PATH_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) {
      const verb = m[1];
      const path = m[2];
      push(verb, path, m.index, `handler_${routes.length}`);
    }
  }

  JAXRS_PATH_VERB_RE.lastIndex = 0;
  let m;
  while ((m = JAXRS_PATH_VERB_RE.exec(source)) !== null) {
    push(m[2], m[1], m.index, `handler_${routes.length}`);
  }

  return routes;
}

/**
 * @param {object} opts
 */
export function liftJavaFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const ctx = { data, webir };
  const routes = parseJavaRoutes(source, file);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const lit = literalReturnAfter(source, idx, file);
    const bodyId =
      lit?.object
        ? lowerHubObjectLiteral(ctx, lit.object, { file, line: lit.line })
        : lit?.value !== undefined
          ? lowerHubLiteral(ctx, lit.value, { file, line: lit.line })
          : hubHandlerBodyHole(ctx, "hub-java:handler-body", { file, line: r.line });
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
