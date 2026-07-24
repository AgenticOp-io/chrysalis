/**
 * Per-language HTTP route pattern parsers (hub open matrix; bodies via hub-lift-webir-route).
 */
import { detectHttpRoutesInSource } from "./lift-routes-heuristic.mjs";
import { parseJavaRoutes } from "../../packages/hub-native-bridge/dist/java.js";
import { parseRubyRoutes } from "../../packages/hub-native-bridge/dist/ruby.js";
import { parseCsharpRoutes } from "../../packages/hub-native-bridge/dist/csharp.js";
import { parseCobolRoutes } from "./cobol-pattern-lift.mjs";

export { parseRubyRoutes, parseCsharpRoutes, parseCobolRoutes };

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

const RUST_ROUTE_RE =
  /\.route\s*\(\s*"([^"]+)"\s*,\s*(?:web::)?(get|post|put|patch|delete|head|options)\s*\(/gi;
const RUST_MACRO_RE = /#\[(\w+)\s*\(\s*"([^"]+)"\s*\)\]/g;
const SCALA_PLAY_RE = /\(\s*"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)"\s*,\s*"([^"]+)"\s*\)/g;
const SCALA_SIRD_RE = /\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(\s*p"([^"]+)"\s*\)/gi;
const SCALA_AKKA_ROUTE_RE =
  /\b(get|post|put|patch|delete|head|options)\s*\(\s*path\s*\(\s*"([^"]+)"\s*\)\s*\)/gi;
/** Http4s: `case GET -> Root / "items" / id =>` (optional `req @`, `Method.`). */
const SCALA_HTTP4S_CASE_RE =
  /\bcase\s+(?:(?:[A-Za-z_][A-Za-z0-9_]*)\s*@\s*)?(?:Method\.)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*->\s*Root((?:\s*\/\s*(?:"[^"]+"|(?:IntVar|LongVar|UUIDVar)\(\s*[A-Za-z_][A-Za-z0-9_]*\s*\)|[A-Za-z_][A-Za-z0-9_]*))+)\s*=>/gi;
const KTOR_ROUTE_RE = /\b(get|post|put|patch|delete|head|options)\s*\(\s*"([^"]+)"\s*\)/gi;
const SWIFT_VERB_HEAD_RE = /\bapp\.(get|post|put|patch|delete|head)\s*\(/gi;

/**
 * @param {string} source
 * @param {number} openIdx — index of `(`
 * @returns {{ inner: string, end: number } | null}
 */
function extractBalancedParenInner(source, openIdx) {
  if (source[openIdx] !== "(") return null;
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
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
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return { inner: source.slice(openIdx + 1, i), end: i };
    }
  }
  return null;
}

/**
 * Join Http4s `Root / "a" / id` chain to CWL-ish `/a/{id}`.
 * @param {string} chain
 */
export function http4sPathFromRootChain(chain) {
  const segs = [];
  const re =
    /\/\s*(?:"([^"]+)"|(?:IntVar|LongVar|UUIDVar)\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)|([A-Za-z_][A-Za-z0-9_]*))/g;
  let m;
  while ((m = re.exec(chain)) !== null) {
    if (m[1] !== undefined) segs.push(m[1]);
    else if (m[2] !== undefined) segs.push(`{${m[2]}}`);
    else segs.push(`{${m[3]}}`);
  }
  if (segs.length === 0) return "/";
  return `/${segs.join("/")}`;
}

/**
 * Join Vapor PathComponent string args: `"items", ":id"` → `/items/:id`.
 * @param {string} parenInner
 */
export function vaporPathFromComponentArgs(parenInner) {
  const segs = [];
  let i = 0;
  const inner = parenInner;
  while (i < inner.length) {
    while (i < inner.length && /[\s,]/.test(inner[i])) i += 1;
    if (i >= inner.length) break;
    if (inner[i] !== '"') break;
    i += 1;
    let s = "";
    while (i < inner.length && inner[i] !== '"') {
      if (inner[i] === "\\") {
        s += inner[i + 1] ?? "";
        i += 2;
        continue;
      }
      s += inner[i];
      i += 1;
    }
    if (inner[i] === '"') i += 1;
    segs.push(s);
  }
  if (segs.length === 0) return null;
  if (segs.length === 1) {
    const only = segs[0];
    if (only.startsWith("/")) return only;
    if (only.includes("/")) return only.startsWith("/") ? only : `/${only}`;
    return `/${only}`;
  }
  return `/${segs.map((s) => s.replace(/^\//, "")).join("/")}`;
}

export function parseKotlinRoutes(source, file) {
  const routes = parseJavaRoutes(source, file);
  const seen = new Set(routes.map((r) => `${r.method}:${r.path}`));
  let m;
  KTOR_ROUTE_RE.lastIndex = 0;
  while ((m = KTOR_ROUTE_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  return routes;
}

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
  SCALA_AKKA_ROUTE_RE.lastIndex = 0;
  while ((m = SCALA_AKKA_ROUTE_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen);
  }
  SCALA_HTTP4S_CASE_RE.lastIndex = 0;
  while ((m = SCALA_HTTP4S_CASE_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], http4sPathFromRootChain(m[2]), m.index, seen);
  }
  return routes;
}

export function parseSwiftRoutes(source) {
  const routes = [];
  const seen = new Set();
  let m;
  SWIFT_VERB_HEAD_RE.lastIndex = 0;
  while ((m = SWIFT_VERB_HEAD_RE.exec(source)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    const bal = extractBalancedParenInner(source, openIdx);
    if (!bal) continue;
    const path = vaporPathFromComponentArgs(bal.inner);
    if (!path) continue;
    pushRoute(routes, source, m[1], path, m.index, seen);
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
  cobol: (s, f) => parseCobolRoutes(s, f),
};

export const PATTERN_LIFT_LANGUAGE_IDS = Object.keys(PATTERN_PARSERS);
