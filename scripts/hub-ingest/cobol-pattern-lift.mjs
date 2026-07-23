/**
 * COBOL pattern-lift: PROGRAM-ID / hub annotations → WebIR routes.
 * Honest holes for CALL / ACCEPT / DISPLAY when no literal return is declared.
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
const ROUTE_ANN_RE = /(?:\*>|\*)\s*chrysalis-route\s*:\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^\s*]*)/gi;
const RETURN_ANN_RE = /(?:\*>|\*)\s*chrysalis-return\s*:\s*(.+?)\s*$/gim;
const MOVE_LITERAL_RE = /\bMOVE\s+(TRUE|FALSE|-?\d+(?:\.\d+)?)\s+TO\b/i;
const CALL_RE = /\bCALL\s+/i;
const ACCEPT_RE = /\bACCEPT\s+/i;
const DISPLAY_RE = /\bDISPLAY\s+/i;

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
 * Parse COBOL source into hub HTTP routes.
 * Prefer explicit `chrysalis-route` annotations; else PROGRAM-ID → GET /name.
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
 * Body lowering near a route line: chrysalis-return annotation, else MOVE literal.
 * Returns null when CALL/ACCEPT/DISPLAY (or unknown) should stay an honest hole.
 *
 * @param {string} source
 * @param {number} fromIndex
 * @returns {{ kind: "literal"|"object", value: unknown, line: number } | null}
 */
export function cobolBodyAfter(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 2400);
  const baseLine = source.slice(0, fromIndex).split("\n").length;

  RETURN_ANN_RE.lastIndex = 0;
  let m = RETURN_ANN_RE.exec(slice);
  if (m) {
    const parsed = parseReturnToken(m[1]);
    if (parsed) {
      const line = baseLine + slice.slice(0, m.index).split("\n").length - 1;
      return { ...parsed, line };
    }
  }

  const move = slice.match(MOVE_LITERAL_RE);
  if (move) {
    const raw = move[1];
    const value =
      raw.toUpperCase() === "TRUE"
        ? true
        : raw.toUpperCase() === "FALSE"
          ? false
          : /^-?\d+$/.test(raw)
            ? Number.parseInt(raw, 10)
            : Number.parseFloat(raw);
    const line = baseLine + slice.slice(0, move.index).split("\n").length - 1;
    return { kind: "literal", value, line };
  }

  if (CALL_RE.test(slice) || ACCEPT_RE.test(slice) || DISPLAY_RE.test(slice)) {
    return null;
  }

  return null;
}
