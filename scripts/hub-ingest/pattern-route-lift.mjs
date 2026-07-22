/**
 * Lift hub routes from {@link PATTERN_PARSERS} into WebIR.
 */
import { PATTERN_PARSERS } from "./pattern-route-parsers.mjs";
import { emitHubRoute, hubHandlerBodyHole, lowerHubLiteral, lowerHubObjectLiteral, lowerHubStatusOnly } from "./hub-lift-webir-route.mjs";

const LITERAL_RETURN_RE =
  /return\s+(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*'|"""[\s\S]*?"""|`[^`]*`)\s*;/;
const RUBY_BLOCK_LITERAL_RE = /\bdo\s+(true|false|-?\d+(?:\.\d+)?)\s+end\b/;
const CSHARP_MAP_LAMBDA_RE = /\(\)\s*=>\s*(true|false|-?\d+(?:\.\d+)?)/;
const RUST_RESPONDER_STR_RE = /\{\s*"([^"]*)"\s*\}/;
const RUST_JSON_MACRO_RE = /serde_json::json!\s*\(\s*\{([^}]*)\}\s*\)/;
const KTOR_RESPOND_RE = /call\.respond(?:Text)?\s*\(\s*(true|false|-?\d+(?:\.\d+)?)/;
const SCALA_COMPLETE_RE = /\bcomplete\s*\(\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*")\s*\)/;
const KOTLIN_FUN_EXPR_RE = /=\s*(true|false|-?\d+(?:\.\d+)?)\s*$/m;
const SWIFT_RETURN_RE = /\breturn\s+("([^"]*)"|true|false|-?\d+(?:\.\d+)?)\s*$/m;
const KOTLIN_MAP_PAIR_RE = /"([^"]+)"\s+to\s+(true|false|-?\d+(?:\.\d+)?|"[^"]*")/g;
const JSON_OBJECT_PAIR_RE = /"([^"]+)"\s*:\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*")/g;
const SCALA_MAP_PAIR_RE = /"([^"]+)"\s*->\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*")/g;
const SWIFT_DICT_PAIR_RE = /"([^"]+)"\s*:\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*")/g;
const RUBY_HASH_RE = /\{[\s\n]*:?(\w+)[\s\n]*:[\s\n]*(-?\d+)[\s\n]*\}/;
const CSHARP_CREATED_RE = /Results\.Created\s*\(/;

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
 * @param {string} source
 * @param {number} fromIndex
 */
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

function rustResponderLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 600);
  const m = slice.match(RUST_RESPONDER_STR_RE);
  if (!m) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { value: m[1], line };
}

function ktorRespondLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 400);
  const m = slice.match(KTOR_RESPOND_RE);
  if (!m) return null;
  const v = parseLiteralToken(m[1]);
  if (v === null) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { value: v, line };
}

function scalaCompleteLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 400);
  const m = slice.match(SCALA_COMPLETE_RE);
  if (!m) return null;
  const v = parseLiteralToken(m[1]);
  if (v === null) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { value: v, line };
}

function kotlinFunExprLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 400);
  const m = slice.match(KOTLIN_FUN_EXPR_RE);
  if (!m) return null;
  const v = parseLiteralToken(m[1]);
  if (v === null) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { value: v, line };
}

function swiftReturnLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 400);
  const m = slice.match(SWIFT_RETURN_RE);
  if (!m) return null;
  const raw = m[1];
  const v = raw.startsWith('"') ? raw.slice(1, -1) : parseLiteralToken(raw);
  if (v === null) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { value: v, line };
}

/**
 * @param {string} inner
 * @param {RegExp} pairRe
 */
function parseObjectPairs(inner, pairRe) {
  /** @type {Record<string, string | number | boolean>} */
  const object = {};
  pairRe.lastIndex = 0;
  let pm;
  while ((pm = pairRe.exec(inner))) {
    const v = parseLiteralToken(pm[2]);
    if (v === null) continue;
    object[pm[1]] = v;
  }
  return Object.keys(object).length > 0 ? object : null;
}

function kotlinMapOfAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 800);
  const m = slice.match(/mapOf\s*\(/);
  if (!m || m.index === undefined) return null;
  const openIdx = m.index + m[0].length - 1;
  let depth = 0;
  let end = -1;
  for (let i = openIdx; i < slice.length; i++) {
    const ch = slice[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const inner = slice.slice(openIdx + 1, end);
  const object = parseObjectPairs(inner, KOTLIN_MAP_PAIR_RE);
  if (!object) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { object, line };
}

function rustJsonObjectAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 800);
  const m = slice.match(RUST_JSON_MACRO_RE);
  if (!m || m.index === undefined) return null;
  const object = parseObjectPairs(m[1], JSON_OBJECT_PAIR_RE);
  if (!object) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { object, line };
}

function rubyHashAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 400);
  const m = slice.match(RUBY_HASH_RE);
  if (!m) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { object: { [m[1]]: Number.parseInt(m[2], 10) }, line };
}

function csharpCreatedAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 120);
  const m = slice.match(CSHARP_CREATED_RE);
  if (!m) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { status: 201, line };
}

function scalaMapCompleteAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 800);
  const m = slice.match(/complete\s*\(\s*Map\s*\(/);
  if (!m || m.index === undefined) return null;
  const openIdx = m.index + m[0].length - 1;
  let depth = 0;
  let end = -1;
  for (let i = openIdx; i < slice.length; i++) {
    const ch = slice[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const inner = slice.slice(openIdx + 1, end);
  const object = parseObjectPairs(inner, SCALA_MAP_PAIR_RE);
  if (!object) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { object, line };
}

function swiftDictReturnAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 600);
  const m = slice.match(/\breturn\s*\[/);
  if (!m || m.index === undefined) return null;
  const openIdx = m.index + m[0].length - 1;
  let depth = 0;
  let end = -1;
  for (let i = openIdx; i < slice.length; i++) {
    const ch = slice[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const inner = slice.slice(openIdx + 1, end);
  const object = parseObjectPairs(inner, SWIFT_DICT_PAIR_RE);
  if (!object) return null;
  const baseLine = source.slice(0, fromIndex).split("\n").length;
  const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
  return { object, line };
}

function rubyBlockLiteralAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 200);
  const m = slice.match(RUBY_BLOCK_LITERAL_RE);
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
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const statusOnly = language === "csharp" ? csharpCreatedAfter(source, idx) : null;
    const objectLit =
      language === "kotlin"
        ? kotlinMapOfAfter(source, idx)
        : language === "rust"
          ? rustJsonObjectAfter(source, idx)
          : language === "ruby"
            ? rubyHashAfter(source, idx)
            : language === "scala"
              ? scalaMapCompleteAfter(source, idx)
              : language === "swift"
                ? swiftDictReturnAfter(source, idx)
                : null;
    const lit =
      literalReturnAfter(source, idx) ??
      (language === "ruby"
        ? rubyBlockLiteralAfter(source, idx)
        : language === "csharp"
          ? csharpMapLiteralAfter(source, idx)
          : language === "rust"
            ? rustResponderLiteralAfter(source, idx)
            : language === "kotlin"
              ? (ktorRespondLiteralAfter(source, idx) ?? kotlinFunExprLiteralAfter(source, idx))
              : language === "scala"
                ? scalaCompleteLiteralAfter(source, idx)
                : language === "swift"
                  ? swiftReturnLiteralAfter(source, idx)
                  : null);
    const bodyId = statusOnly
      ? lowerHubStatusOnly(ctx, statusOnly.status, { file, line: statusOnly.line })
      : objectLit?.object
        ? lowerHubObjectLiteral(ctx, objectLit.object, { file, line: objectLit.line })
        : lit?.value !== undefined
          ? lowerHubLiteral(ctx, lit.value, { file, line: lit.line })
          : hubHandlerBodyHole(ctx, `hub-${language}:handler-body`, { file, line: r.line });
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
