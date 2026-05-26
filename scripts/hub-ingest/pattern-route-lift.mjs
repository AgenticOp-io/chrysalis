/**
 * Lift hub routes from {@link PATTERN_PARSERS} into WebIR.
 */
import { PATTERN_PARSERS } from "./pattern-route-parsers.mjs";
import { emitHubRoute, hubHandlerBodyHole, lowerHubLiteral } from "./hub-lift-webir-route.mjs";

const LITERAL_RETURN_RE =
  /return\s+(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*'|"""[\s\S]*?"""|`[^`]*`)\s*;/;

/**
 * @param {string} raw
 */
function parseLiteralToken(raw) {
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10);
  if (/^-?\d+\.\d+$/.test(t)) return Number.parseFloat(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return null;
}

/**
 * @param {string} source
 * @param {number} fromIndex
 */
function literalReturnAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 1200);
  const m = slice.match(LITERAL_RETURN_RE);
  if (!m) return null;
  const v = parseLiteralToken(m[1]);
  if (v === null) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { value: v, line };
}

/**
 * @param {string} language
 */
export function canPatternRouteLift(language) {
  return language in PATTERN_PARSERS;
}

/**
 * @param {object} opts
 */
export function liftPatternRoutesFile(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const parse = PATTERN_PARSERS[language];
  if (!parse) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }
  const routes = parse(source, file);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  const data = webir.dataDialect.builders(builder);
  const ctx = { data, webir };
  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const lit = literalReturnAfter(source, idx);
    const bodyId =
      lit?.value !== undefined
        ? lowerHubLiteral(ctx, lit.value, { file, line: lit.line })
        : hubHandlerBodyHole(ctx, `hub-${language}:handler-body`, { file, line: r.line });
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
