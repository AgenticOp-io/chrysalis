/**
 * Per-language HTTP route pattern parsers (hub open matrix; bodies via hub-lift-webir-route).
 */
import { detectHttpRoutesInSource } from "./lift-routes-heuristic.mjs";
import { parseJavaRoutes } from "./java-ast-ingest.mjs";

/**
 * @typedef {{ method: string, path: string, line: number, name?: string }} HubRoute
 */

/**
 * @param {string} source
 * @param {number} index
 */
export function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

/**
 * @param {HubRoute[]} routes
 * @param {string} source
 * @param {string} method
 * @param {string} path
 * @param {number} index
 * @param {Set<string>} seen
 */
function pushRoute(routes, source, method, path, index, seen) {
  const key = `${method.toUpperCase()}:${path}`;
  if (seen.has(key)) return;
  seen.add(key);
  routes.push({
    method: method.toUpperCase(),
    path,
    line: lineAt(source, index),
    name: `r_${routes.length}`,
  });
}

const RUBY_VERB_RE = /\b(get|post|put|patch|delete|head|options)\s+['"]([^'"]+)['"]/gi;
const CSHARP_HTTP_ATTR_RE = /\[(Http(Get|Post|Put|Patch|Delete|Head|Options))\s*\(\s*"([^"]+)"\s*\)\]/gi;
const CSHARP_MAP_RE = /\bapp\.Map(Get|Post|Put|Delete|Patch)\s*\(\s*"([^"]+)"/gi;
const RUST_ROUTE_RE =
  /\.route\s*\(\s*"([^"]+)"\s*,\s*(?:web::)?(get|post|put|patch|delete|head|options)\s*\(/gi;
const RUST_MACRO_RE = /#\[(\w+)\s*\(\s*"([^"]+)"\s*\)\]/g;
const SCALA_PLAY_RE = /\(\s*"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)"\s*,\s*"([^"]+)"\s*\)/g;
const SCALA_SIRD_RE = /\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(\s*p"([^"]+)"\s*\)/gi;
const SWIFT_VERB_RE = /\bapp\.(get|post|put|patch|delete|head)\s*\(\s*"([^"]+)"/gi;

export function parseRubyRoutes(source) {
  const routes = [];
  const seen = new Set();
  let m;
  RUBY_VERB_RE.lastIndex = 0;
  while ((m = RUBY_VERB_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  return routes;
}

export function parseCsharpRoutes(source) {
  const routes = [];
  const seen = new Set();
  let m;
  CSHARP_HTTP_ATTR_RE.lastIndex = 0;
  while ((m = CSHARP_HTTP_ATTR_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[2], m[3], m.index, seen);
  }
  CSHARP_MAP_RE.lastIndex = 0;
  while ((m = CSHARP_MAP_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  return routes;
}

export const parseKotlinRoutes = parseJavaRoutes;

export function parseRustRoutes(source) {
  const routes = [];
  const seen = new Set();
  const methodMap = { get: "GET", post: "POST", put: "PUT", delete: "DELETE", patch: "PATCH" };
  let m;
  RUST_ROUTE_RE.lastIndex = 0;
  while ((m = RUST_ROUTE_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[2], m[1], m.index, seen);
  }
  RUST_MACRO_RE.lastIndex = 0;
  while ((m = RUST_MACRO_RE.exec(source)) !== null) {
    const verb = methodMap[m[1].toLowerCase()];
    if (verb) pushRoute(routes, source, verb, m[2], m.index, seen);
  }
  return routes;
}

export function parseScalaRoutes(source) {
  const routes = [];
  const seen = new Set();
  let m;
  while ((m = SCALA_PLAY_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  SCALA_SIRD_RE.lastIndex = 0;
  while ((m = SCALA_SIRD_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  return routes;
}

export function parseSwiftRoutes(source) {
  const routes = [];
  const seen = new Set();
  let m;
  while ((m = SWIFT_VERB_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  return routes;
}

export function extractVueScript(source) {
  const m = source.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  return m?.[1] ?? "";
}

export function parseVueRoutes(source, file) {
  const script = extractVueScript(source);
  if (!script.trim()) return [];
  return detectHttpRoutesInSource(script, file).map((r) => ({
    method: r.method,
    path: r.path,
    line: r.line ?? 1,
    name: r.file,
  }));
}

/** @type {Record<string, (source: string, file: string) => HubRoute[]>} */
export const PATTERN_PARSERS = {
  ruby: (s) => parseRubyRoutes(s),
  csharp: (s) => parseCsharpRoutes(s),
  kotlin: (s) => parseKotlinRoutes(s),
  rust: (s) => parseRustRoutes(s),
  scala: (s) => parseScalaRoutes(s),
  swift: (s) => parseSwiftRoutes(s),
  vue: (s, f) => parseVueRoutes(s, f),
};

export const PATTERN_LIFT_LANGUAGE_IDS = Object.keys(PATTERN_PARSERS);
