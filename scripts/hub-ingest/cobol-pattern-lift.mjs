/**
 * COBOL pattern-lift: PROGRAM-ID / PROCEDURE paragraphs / hub annotations → WebIR routes.
 * Honest holes for CALL / ACCEPT / non-literal DISPLAY when no return can be lowered.
 *
 * Annotations (optional, in `*` or `*>` comments):
 *   chrysalis-route: METHOD /path
 *   chrysalis-return: <json-or-literal>
 */

/**
 * @typedef {{ method: string, path: string, line: number, name?: string }} HubRoute
 */

/**
 * @param {string} source
 * @param {number} index
 */
function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

const PROGRAM_ID_RE = /\bPROGRAM-ID\s*\.\s*([A-Za-z0-9][A-Za-z0-9-]*)\s*\./gi;
const ROUTE_ANN_RE =
  /(?:\*>|\*)\s*chrysalis-route\s*:\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^\s*]*)/gi;
const RETURN_ANN_RE = /(?:\*>|\*)\s*chrysalis-return\s*:\s*(.+?)\s*$/gim;
const MOVE_LITERAL_RE =
  /\bMOVE\s+(TRUE|FALSE|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')\s+TO\b/i;
const DISPLAY_LITERAL_RE = /\bDISPLAY\s+("[^"]*"|'[^']*'|TRUE|FALSE|-?\d+(?:\.\d+)?)\s*\.?/i;
const CALL_RE = /\bCALL\s+/i;
const ACCEPT_RE = /\bACCEPT\s+/i;
const DISPLAY_RE = /\bDISPLAY\s+/i;
const PROCEDURE_DIV_RE = /\bPROCEDURE\s+DIVISION\b/i;
/** Paragraph / SECTION headers inside PROCEDURE DIVISION (fixed or free form). */
const PARAGRAPH_RE =
  /(?:^|\n)[ \t]{0,16}([A-Za-z][A-Za-z0-9-]{0,29})(?:\s+SECTION)?\s*\.\s*(?:\r?\n|$)/gm;
const RESERVED_PARAGRAPH = new Set([
  "IDENTIFICATION",
  "ENVIRONMENT",
  "DATA",
  "PROCEDURE",
  "WORKING-STORAGE",
  "LINKAGE",
  "FILE",
  "CONFIGURATION",
  "INPUT-OUTPUT",
  "DIVISION",
  "SECTION",
  "PROGRAM-ID",
  "AUTHOR",
  "DATE-WRITTEN",
  "DATE-COMPILED",
  "INSTALLATION",
  "SECURITY",
  "EXIT",
  "GOBACK",
  "STOP",
  "END",
  "COPY",
  "REPLACE",
]);

/**
 * @param {string} programId
 */
export function cobolProgramIdToPath(programId) {
  const raw = String(programId || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (!raw) return "/program";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * @param {HubRoute[]} routes
 * @param {string} source
 * @param {string} method
 * @param {string} path
 * @param {number} index
 * @param {Set<string>} seen
 * @param {string} [name]
 */
function pushRoute(routes, source, method, path, index, seen, name) {
  const normPath = path.startsWith("/") ? path : `/${path}`;
  const key = `${method.toUpperCase()}:${normPath}`;
  if (seen.has(key)) return;
  seen.add(key);
  routes.push({
    method: method.toUpperCase(),
    path: normPath,
    line: lineAt(source, index),
    name: name ?? `r_${routes.length}`,
  });
}

/**
 * PROCEDURE DIVISION paragraph / SECTION names → GET /name routes.
 * Skips reserved words and single-letter noise.
 *
 * @param {string} source
 * @param {HubRoute[]} routes
 * @param {Set<string>} seen
 */
function pushProcedureParagraphRoutes(source, routes, seen) {
  const proc = PROCEDURE_DIV_RE.exec(source);
  if (!proc || proc.index === undefined) return;
  const body = source.slice(proc.index);
  const base = proc.index;
  PARAGRAPH_RE.lastIndex = 0;
  let m;
  while ((m = PARAGRAPH_RE.exec(body)) !== null) {
    const name = m[1];
    if (!name || RESERVED_PARAGRAPH.has(name.toUpperCase())) continue;
    if (name.length < 2) continue;
    const absIndex = base + (m.index ?? 0) + (m[0].startsWith("\n") ? 1 : 0);
    pushRoute(routes, source, "GET", cobolProgramIdToPath(name), absIndex, seen, name);
  }
}

/**
 * Parse COBOL source into hub HTTP routes.
 * Order: chrysalis-route annotations → PROCEDURE paragraphs → PROGRAM-ID.
 *
 * @param {string} source
 * @param {string} [_file]
 * @returns {HubRoute[]}
 */
export function parseCobolRoutes(source, _file) {
  const routes = [];
  const seen = new Set();
  let m;

  ROUTE_ANN_RE.lastIndex = 0;
  while ((m = ROUTE_ANN_RE.exec(source)) !== null) {
    pushRoute(routes, source, m[1], m[2], m.index, seen, `cobol_ann_${routes.length}`);
  }

  if (routes.length > 0) return routes;

  pushProcedureParagraphRoutes(source, routes, seen);
  if (routes.length > 0) return routes;

  PROGRAM_ID_RE.lastIndex = 0;
  while ((m = PROGRAM_ID_RE.exec(source)) !== null) {
    pushRoute(routes, source, "GET", cobolProgramIdToPath(m[1]), m.index, seen, m[1]);
  }

  return routes;
}

/**
 * @param {string} raw
 */
function parseReturnToken(raw) {
  const t = String(raw || "").trim().replace(/\.?\s*$/, "");
  if (!t) return null;
  if (t === "true" || t.toUpperCase() === "TRUE") return { kind: "literal", value: true };
  if (t === "false" || t.toUpperCase() === "FALSE") return { kind: "literal", value: false };
  if (/^-?\d+$/.test(t)) return { kind: "literal", value: Number.parseInt(t, 10) };
  if (/^-?\d+\.\d+$/.test(t)) return { kind: "literal", value: Number.parseFloat(t) };
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return { kind: "literal", value: t.slice(1, -1) };
  }
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const v = JSON.parse(t);
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        return { kind: "object", value: v };
      }
      return { kind: "literal", value: v };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {string} token
 */
function coerceCobolLiteralToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return null;
  if (raw.toUpperCase() === "TRUE") return true;
  if (raw.toUpperCase() === "FALSE") return false;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return Number.parseFloat(raw);
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return null;
}

/**
 * Body lowering near a route line: chrysalis-return, MOVE literal, DISPLAY literal.
 * Returns null when CALL/ACCEPT/non-literal DISPLAY should stay an honest hole.
 *
 * @param {string} source
 * @param {number} fromIndex
 * @returns {{ kind: "literal"|"object", value: unknown, line: number } | null}
 */
export function cobolBodyAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 2400);
  const baseLine = source.slice(0, fromIndex).split("\n").length;

  RETURN_ANN_RE.lastIndex = 0;
  const ret = RETURN_ANN_RE.exec(slice);
  if (ret) {
    const parsed = parseReturnToken(ret[1]);
    if (parsed) {
      const line = baseLine + slice.slice(0, ret.index).split("\n").length - 1;
      return { ...parsed, line };
    }
  }

  const move = slice.match(MOVE_LITERAL_RE);
  if (move) {
    const value = coerceCobolLiteralToken(move[1]);
    if (value !== null) {
      const line = baseLine + slice.slice(0, move.index).split("\n").length - 1;
      return { kind: "literal", value, line };
    }
  }

  const displayLit = slice.match(DISPLAY_LITERAL_RE);
  if (displayLit) {
    const value = coerceCobolLiteralToken(displayLit[1]);
    if (value !== null) {
      const line = baseLine + slice.slice(0, displayLit.index).split("\n").length - 1;
      return { kind: "literal", value, line };
    }
  }

  if (CALL_RE.test(slice) || ACCEPT_RE.test(slice) || DISPLAY_RE.test(slice)) {
    return null;
  }

  return null;
}

/**
 * Classify unresolved COBOL ops in a source slice (for hole-honesty smokes).
 *
 * @param {string} source
 * @param {number} [fromIndex]
 */
export function cobolUnresolvedOps(source, fromIndex = 0) {
  const slice = source.slice(fromIndex, fromIndex + 4000);
  /** @type {string[]} */
  const ops = [];
  if (CALL_RE.test(slice)) ops.push("call");
  if (ACCEPT_RE.test(slice)) ops.push("accept");
  if (DISPLAY_RE.test(slice) && !DISPLAY_LITERAL_RE.test(slice)) ops.push("display");
  return ops;
}
