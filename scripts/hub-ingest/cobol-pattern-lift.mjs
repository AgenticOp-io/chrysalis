/**
 * COBOL pattern-lift: PROGRAM-ID / PROCEDURE paragraphs / hub annotations → WebIR routes.
 * Honest holes for CALL / ACCEPT / non-literal DISPLAY when no return can be lowered.
 *
 * Annotations (optional, in `*` or `*>` comments):
 *   chrysalis-route: METHOD /path
 *   chrysalis-return: <json-or-literal>
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

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

/** Fixed-form (`PROGRAM-ID. NAME.`) and free-form / missing final period.
 * Also `PROGRAM-ID. NAME IS RECURSIVE.` / `IS INITIAL` / `IS COMMON`. */
const PROGRAM_ID_RE =
  /\bPROGRAM-ID\s*\.\s*([A-Za-z0-9][A-Za-z0-9-]*)(?:\s+IS\s+(?:RECURSIVE|INITIAL|COMMON(?:\s+INITIAL)?))*\s*(?:\.|(?:\r?\n)|$)/gi;
const ROUTE_ANN_RE =
  /(?:\*>|\*)\s*chrysalis-route\s*:\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^\s*]*)/gi;
const RETURN_ANN_RE = /(?:\*>|\*)\s*chrysalis-return\s*:\s*(.+?)\s*$/gim;
const MOVE_LITERAL_RE =
  /\bMOVE\s+(TRUE|FALSE|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')\s+TO\b/i;
const DISPLAY_LITERAL_RE = /\bDISPLAY\s+("[^"]*"|'[^']*'|TRUE|FALSE|-?\d+(?:\.\d+)?)\s*\.?/i;
const CALL_RE = /\bCALL\s+/i;
const ACCEPT_RE = /\bACCEPT\s+/i;
const DISPLAY_RE = /\bDISPLAY\s+/i;
const COPY_RE = /\bCOPY\s+([A-Za-z][A-Za-z0-9-]*)\s*\./gi;
const EXEC_CICS_RE = /\bEXEC\s+CICS\b/gi;
const EXEC_SQL_RE = /\bEXEC\s+SQL\b/gi;
/** EXEC SQL … END-EXEC bodies (multi-line DML / cursors / txn). */
const EXEC_SQL_BLOCK_RE = /\bEXEC\s+SQL\b([\s\S]*?)\bEND-EXEC\b/gi;
/** EXEC CICS … END-EXEC bodies (multi-line SEND MAP / SEND TEXT / LINK / XCTL). */
const EXEC_CICS_BLOCK_RE = /\bEXEC\s+CICS\b([\s\S]*?)\bEND-EXEC\b/gi;
/** EXEC DLI … END-EXEC bodies (IMS DL/I — structural hole inventory only). */
const EXEC_DLI_RE = /\bEXEC\s+DLI\b/gi;
const EXEC_DLI_BLOCK_RE = /\bEXEC\s+DLI\b([\s\S]*?)\bEND-EXEC\b/gi;
/** IBM MQ MQI CALL targets (CMQ* copybooks stay unresolved — not in CardDemo). */
const IBM_MQ_CALL_RE =
  /\bCALL\s+(?:'([^']+)'|"([^"]+)")/gi;
const IBM_MQ_API_NAMES = new Set([
  "MQOPEN",
  "MQCLOSE",
  "MQGET",
  "MQPUT",
  "MQPUT1",
  "MQINQ",
  "MQSET",
  "MQCMIT",
  "MQBACK",
  "MQCONN",
  "MQCONNX",
  "MQDISC",
]);
/** CICS DFHAID symbol names referenced in source (books stay IBM-proprietary holes). */
const CICS_AID_SYMBOL_RE =
  /\b(DFH(?:NULL|ENTER|CLEAR|CLRP|PEN|OPID|MSRE|STRF|TRIG|PA[1-3]|PF(?:[1-9]|1\d|2[0-4])))\b/gi;
/** CICS DFHBMSCA attribute symbol names referenced in source. */
const BMS_ATTR_SYMBOL_RE =
  /\b(DFHBM[A-Z0-9]+|DFHDS[A-Z0-9]+|DFHPRO[A-Z0-9]+|DFH(?:BLUE|RED|PINK|GREEN|TURQ|YELLOW|NEUTR))\b/gi;
const HANDLE_CONDITION_RE = /\bEXEC\s+CICS\s+HANDLE\s+CONDITION\b/gi;
const HANDLE_AID_RE = /\bEXEC\s+CICS\s+HANDLE\s+AID\b/gi;
const RESP_CLAUSE_RE = /\bRESP\s*\(/gi;
const PERFORM_RE = /\bPERFORM\s+([A-Za-z0-9][A-Za-z0-9-]*)/gi;
const EVALUATE_WHEN_RE = /\bWHEN\s+'([^']+)'/gi;
const EVALUATE_TRUE_RE = /\bEVALUATE\s+TRUE\b/gi;
const EVALUATE_ANY_RE = /\bEVALUATE\s+/gi;
const PROCEDURE_USING_RE = /\bPROCEDURE\s+DIVISION\s+USING\b/gi;
/** PROCEDURE DIVISION USING arg1 arg2. / ENTRY 'name' USING … */
const PROCEDURE_USING_ARGS_RE =
  /\bPROCEDURE\s+DIVISION\s+USING\s+([A-Za-z0-9-]+(?:\s+[A-Za-z0-9-]+)*)\s*\./gi;
/** ENTRY 'name' [USING …] — quoted name only (avoid WS-ENTRY false positives). */
const ENTRY_STMT_RE =
  /\bENTRY\s+(?:'([^']+)'|"([^"]+)")(?:\s+USING\b)?/gi;
const READ_WRITE_RE = /\b(READ|WRITE|REWRITE|DELETE|START)\s+/gi;
/** Indexed / VSAM-shaped FILE-CONTROL (structural hole until real VSAM adapter). */
const ORGANIZATION_INDEXED_RE = /\bORGANIZATION\s+IS\s+INDEXED\b/gi;
const ACCESS_MODE_RE = /\bACCESS\s+MODE\s+IS\s+(DYNAMIC|RANDOM|SEQUENTIAL)\b/gi;
const RECORD_KEY_RE = /\bRECORD\s+KEY\s+IS\s+([A-Za-z0-9-]+)/gi;
const ALTERNATE_RECORD_KEY_RE = /\bALTERNATE\s+RECORD\s+KEY\s+IS\s+([A-Za-z0-9-]+)/gi;
const COMPUTE_RE = /\bCOMPUTE\s+/gi;
const OCCURS_RE = /\bOCCURS\s+\d+/gi;
/** SEARCH table — not END-SEARCH. */
const SEARCH_RE = /(?<!END-)\bSEARCH\s+[A-Z0-9-]+/gi;
const EVALUATE_NUMERIC_WHEN_RE = /\bWHEN\s+(\d+)\b/gi;
const PROCEDURE_DIV_RE = /\bPROCEDURE\s+DIVISION\b/i;
/** Paragraph / SECTION headers inside PROCEDURE DIVISION (fixed or free form). */
const PARAGRAPH_RE =
  /(?:^|\n)[ \t]{0,16}([A-Za-z][A-Za-z0-9-]{0,29})(?:\s+SECTION)?\s*\.\s*(?:\r?\n|$)/gm;
/** Same shape but only when the header is an explicit SECTION. */
const SECTION_HEADER_RE =
  /(?:^|\n)[ \t]{0,16}([A-Za-z][A-Za-z0-9-]{0,29})\s+SECTION\s*\.\s*(?:\r?\n|$)/gm;
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
  "EVALUATE",
  "WHEN",
  "OTHER",
  "IF",
  "ELSE",
  "END-IF",
  "END-EVALUATE",
  "END-PERFORM",
  "END-EXEC",
  "EXEC",
  "CICS",
  "SQL",
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
 * @param {string} source
 * @returns {{ body: string, base: number } | null}
 */
function procedureBody(source) {
  PROCEDURE_DIV_RE.lastIndex = 0;
  const proc = PROCEDURE_DIV_RE.exec(source);
  if (!proc || proc.index === undefined) return null;
  return { body: source.slice(proc.index), base: proc.index };
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
  const sliced = procedureBody(source);
  if (!sliced) return;
  const { body, base } = sliced;
  PARAGRAPH_RE.lastIndex = 0;
  let m;
  while ((m = PARAGRAPH_RE.exec(body)) !== null) {
    const name = m[1];
    if (!name || RESERVED_PARAGRAPH.has(name.toUpperCase())) continue;
    if (name.length < 2) continue;
    if (/-EXIT$/i.test(name)) continue;
    const absIndex = base + (m.index ?? 0) + (m[0].startsWith("\n") ? 1 : 0);
    pushRoute(routes, source, "GET", cobolProgramIdToPath(name), absIndex, seen, name);
  }
}

/**
 * Collect PROCEDURE DIVISION SECTION header names (for inventory / prove).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCobolSectionNames(source) {
  const sliced = procedureBody(source);
  if (!sliced) return [];
  /** @type {string[]} */
  const names = [];
  SECTION_HEADER_RE.lastIndex = 0;
  let m;
  while ((m = SECTION_HEADER_RE.exec(sliced.body)) !== null) {
    const name = m[1];
    if (!name || RESERVED_PARAGRAPH.has(name.toUpperCase())) continue;
    if (name.length < 2) continue;
    names.push(name);
  }
  return [...new Set(names)];
}

/**
 * Collect ENTRY statement names (alternate entry points).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCobolEntryNames(source) {
  /** @type {string[]} */
  const names = [];
  ENTRY_STMT_RE.lastIndex = 0;
  let m;
  while ((m = ENTRY_STMT_RE.exec(source)) !== null) {
    const name = m[1] || m[2];
    if (name) names.push(name);
  }
  return [...new Set(names)];
}

/**
 * Collect PROCEDURE DIVISION USING linkage / parameter names.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCobolProcedureUsingArgs(source) {
  /** @type {string[]} */
  const args = [];
  PROCEDURE_USING_ARGS_RE.lastIndex = 0;
  let m;
  while ((m = PROCEDURE_USING_ARGS_RE.exec(source)) !== null) {
    for (const tok of String(m[1] || "").split(/\s+/)) {
      if (tok && !RESERVED_PARAGRAPH.has(tok.toUpperCase())) args.push(tok);
    }
  }
  return [...new Set(args)];
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

  if (
    CALL_RE.test(slice) ||
    ACCEPT_RE.test(slice) ||
    DISPLAY_RE.test(slice) ||
    /\bEXEC\s+CICS\b/i.test(slice) ||
    /\bEXEC\s+SQL\b/i.test(slice) ||
    /\bEXEC\s+DLI\b/i.test(slice)
  ) {
    return null;
  }

  return null;
}

/**
 * Shape WebIR hole attrs from {@link inventoryCobolSource} (G10085).
 * Catalogs already prove-gated — attach to holes instead of opaque `handler-body`.
 * Does not invent runtimes; lists inventoried ops / COPY / MAP names only.
 *
 * @param {ReturnType<typeof inventoryCobolSource>} inv
 * @param {{ emitPatternKind?: string | null }} [opts]
 * @returns {Record<string, unknown>}
 */
export function buildCobolWebIrHoleAttrs(inv, opts = {}) {
  /** @type {Record<string, unknown>} */
  const attrs = {
    unresolved: [...(inv?.unresolved || [])],
  };
  if (inv?.programIds?.length) attrs.programIds = [...inv.programIds];
  if (inv?.copybooks?.length) attrs.copybooks = [...inv.copybooks];
  if (inv?.execCicsOps?.length) attrs.execCicsOps = [...inv.execCicsOps];
  if (inv?.execCicsMaps?.length) attrs.execCicsMaps = [...inv.execCicsMaps];
  if (inv?.execCicsMapsets?.length) attrs.execCicsMapsets = [...inv.execCicsMapsets];
  if (inv?.execCicsLinkPrograms?.length) {
    attrs.execCicsLinkPrograms = [...inv.execCicsLinkPrograms];
  }
  if (inv?.execCicsXctlPrograms?.length) {
    attrs.execCicsXctlPrograms = [...inv.execCicsXctlPrograms];
  }
  if (inv?.execSqlOps?.length) attrs.execSqlOps = [...inv.execSqlOps];
  if (inv?.execSqlIncludes?.length) attrs.execSqlIncludes = [...inv.execSqlIncludes];
  if (inv?.execDliOps?.length) attrs.execDliOps = [...inv.execDliOps];
  if (inv?.ibmMqCallOps?.length) attrs.ibmMqCallOps = [...inv.ibmMqCallOps];
  if (inv?.cicsAidSymbols?.length) attrs.cicsAidSymbols = [...inv.cicsAidSymbols];
  if (inv?.bmsAttrSymbols?.length) attrs.bmsAttrSymbols = [...inv.bmsAttrSymbols];
  if (opts.emitPatternKind) attrs.emitPatternKind = opts.emitPatternKind;
  if (opts.copyExpanded?.length) attrs.copyExpanded = [...opts.copyExpanded];
  if (opts.copySkipped?.length) attrs.copySkipped = [...opts.copySkipped];
  if (opts.copyMissing?.length) attrs.copyMissing = [...opts.copyMissing];
  return attrs;
}

/**
 * Drop `*` / `*>` comment lines so inventory keywords are not false-positive.
 * @param {string} source
 */
function stripCobolCommentLines(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trimStart();
      return !(t.startsWith("*>") || t.startsWith("*"));
    })
    .join("\n");
}

/**
 * Inventory CLBS-shaped COBOL idioms (structural completeness / hole planning).
 *
 * @param {string} source
 * @param {string} [file]
 */
export function inventoryCobolSource(source, file = "") {
  const code = stripCobolCommentLines(source);
  const programIds = [];
  PROGRAM_ID_RE.lastIndex = 0;
  let m;
  while ((m = PROGRAM_ID_RE.exec(code)) !== null) programIds.push(m[1]);

  const copybooks = [];
  COPY_RE.lastIndex = 0;
  while ((m = COPY_RE.exec(code)) !== null) copybooks.push(m[1]);

  const performs = [];
  PERFORM_RE.lastIndex = 0;
  while ((m = PERFORM_RE.exec(code)) !== null) {
    const name = m[1];
    if (name && !RESERVED_PARAGRAPH.has(name.toUpperCase())) performs.push(name);
  }

  const evaluateWhens = [];
  EVALUATE_WHEN_RE.lastIndex = 0;
  while ((m = EVALUATE_WHEN_RE.exec(code)) !== null) evaluateWhens.push(m[1]);

  const evaluateNumericWhens = [];
  EVALUATE_NUMERIC_WHEN_RE.lastIndex = 0;
  while ((m = EVALUATE_NUMERIC_WHEN_RE.exec(code)) !== null) {
    evaluateNumericWhens.push(m[1]);
  }

  const evaluateTrue = (code.match(EVALUATE_TRUE_RE) || []).length;
  const evaluateAny = (code.match(EVALUATE_ANY_RE) || []).length;
  const occurs = (code.match(OCCURS_RE) || []).length;
  const search = (code.match(SEARCH_RE) || []).length;
  const procedureUsing = (code.match(PROCEDURE_USING_RE) || []).length;
  const procedureUsingArgs = parseCobolProcedureUsingArgs(code);
  const entryNames = parseCobolEntryNames(code);
  const sectionNames = parseCobolSectionNames(code);

  const execCics = (code.match(EXEC_CICS_RE) || []).length;
  const execSql = (code.match(EXEC_SQL_RE) || []).length;
  const execDli = (code.match(EXEC_DLI_RE) || []).length;
  const execSqlOps = parseExecSqlOps(code);
  const execSqlIncludes = parseExecSqlIncludeNames(code);
  const execDliOps = parseExecDliOps(code);
  const execCicsOps = parseExecCicsOps(code);
  const execCicsMaps = parseExecCicsMaps(code);
  const execCicsMapsets = parseExecCicsMapsets(code);
  const execCicsLinkPrograms = parseExecCicsLinkPrograms(code);
  const execCicsXctlPrograms = parseExecCicsXctlPrograms(code);
  const ibmMqCallOps = parseIbmMqCallOps(code);
  const cicsAidSymbols = parseCicsAidSymbols(code);
  const bmsAttrSymbols = parseBmsAttrSymbols(code);
  const handleCondition = (code.match(HANDLE_CONDITION_RE) || []).length;
  const handleAid = (code.match(HANDLE_AID_RE) || []).length;
  const respClauses = (code.match(RESP_CLAUSE_RE) || []).length;
  const fileIo = (code.match(READ_WRITE_RE) || []).length;
  const organizationIndexed = (code.match(ORGANIZATION_INDEXED_RE) || []).length;
  const accessModes = [];
  ACCESS_MODE_RE.lastIndex = 0;
  while ((m = ACCESS_MODE_RE.exec(code)) !== null) {
    if (m[1]) accessModes.push(m[1].toUpperCase());
  }
  const recordKeys = [];
  RECORD_KEY_RE.lastIndex = 0;
  while ((m = RECORD_KEY_RE.exec(code)) !== null) {
    if (m[1]) recordKeys.push(m[1]);
  }
  const alternateRecordKeys = [];
  ALTERNATE_RECORD_KEY_RE.lastIndex = 0;
  while ((m = ALTERNATE_RECORD_KEY_RE.exec(code)) !== null) {
    if (m[1]) alternateRecordKeys.push(m[1]);
  }
  const computes = (code.match(COMPUTE_RE) || []).length;
  const routes = parseCobolRoutes(source, file);
  const unresolved = cobolUnresolvedOps(code);

  const commentLines = source.split(/\r?\n/).filter((l) => /^\s*\*/.test(l) || /^\s*\*>/.test(l)).length;
  const totalLines = Math.max(1, source.split(/\r?\n/).length);
  const commentRatio = commentLines / totalLines;

  return {
    file,
    programIds,
    routes,
    routeCount: routes.length,
    copybooks: [...new Set(copybooks)],
    performs: [...new Set(performs)],
    evaluateWhens: [...new Set(evaluateWhens)],
    evaluateNumericWhens: [...new Set(evaluateNumericWhens)],
    evaluateTrue,
    evaluateAny,
    occurs,
    search,
    procedureUsing,
    procedureUsingArgs,
    entryNames,
    entryCount: entryNames.length,
    sectionNames,
    sectionCount: sectionNames.length,
    execCics,
    execCicsOps,
    execCicsMaps,
    execCicsMapsets,
    execCicsLinkPrograms,
    execCicsXctlPrograms,
    ibmMqCallOps,
    cicsAidSymbols,
    bmsAttrSymbols,
    handleCondition,
    handleAid,
    respClauses,
    execSql,
    execSqlOps,
    execSqlIncludes,
    execDli,
    execDliOps,
    fileIo,
    organizationIndexed,
    accessModes: [...new Set(accessModes)],
    recordKeys: [...new Set(recordKeys)],
    alternateRecordKeys: [...new Set(alternateRecordKeys)],
    computes,
    unresolved,
    commentLines,
    totalLines,
    commentRatio,
    hasIdentificationHeader: /\bIDENTIFICATION\s+DIVISION\b/i.test(source),
    looksLikeCopybook: programIds.length === 0 && /\b01\s+/.test(code) && !PROCEDURE_DIV_RE.test(code),
  };
}

/**
 * Normalize an EXEC CICS … END-EXEC body to a single-line uppercase string.
 * @param {string} body
 */
function normalizeExecCicsBody(body) {
  return String(body || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Catalog EXEC CICS verbs between EXEC CICS … END-EXEC (structural hole inventory).
 * Distinguishes **SEND-TEXT** from **SEND-MAP** (and **RECEIVE-MAP**) so first-token
 * collapse does not hide BMS TEXT vs MAP. Family tokens SEND/RECEIVE are also kept
 * for existing gates. Does not invent a CICS runtime — ops stay `exec-cics` holes.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecCicsOps(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const ops = [];
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    if (!body) continue;
    if (/^SEND\s+TEXT\b/.test(body)) {
      ops.push("SEND-TEXT", "SEND");
    } else if (/^SEND\s+MAP\b/.test(body)) {
      ops.push("SEND-MAP", "SEND");
    } else if (/^SEND\b/.test(body)) {
      ops.push("SEND");
    } else if (/^RECEIVE\s+MAP\b/.test(body)) {
      ops.push("RECEIVE-MAP", "RECEIVE");
    } else if (/^RECEIVE\b/.test(body)) {
      ops.push("RECEIVE");
    } else if (/^HANDLE\b/.test(body)) {
      ops.push("HANDLE");
    } else {
      const verb = /^([A-Z][A-Z0-9-]*)/.exec(body);
      if (verb?.[1]) ops.push(verb[1]);
    }
  }
  return [...new Set(ops)];
}

/**
 * Literal `MAP('…')` names from EXEC CICS SEND / RECEIVE blocks only.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecCicsMaps(source) {
  return parseExecCicsSendReceiveLiterals(source, "MAP");
}

/**
 * Literal `MAPSET('…')` names from EXEC CICS SEND / RECEIVE blocks only.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecCicsMapsets(source) {
  return parseExecCicsSendReceiveLiterals(source, "MAPSET");
}

/**
 * @param {string} source
 * @param {"MAP"|"MAPSET"} kind
 * @returns {string[]}
 */
function parseExecCicsSendReceiveLiterals(source, kind) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  const clauseRe =
    kind === "MAPSET"
      ? /\bMAPSET\s*\(\s*(?:'([^']+)'|"([^"]+)")\s*\)/gi
      : /\bMAP\s*\(\s*(?:'([^']+)'|"([^"]+)")\s*\)/gi;
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    if (!/^(SEND|RECEIVE)\b/.test(body)) continue;
    clauseRe.lastIndex = 0;
    let c;
    while ((c = clauseRe.exec(body)) !== null) {
      const name = c[1] || c[2];
      if (name) names.push(name.toUpperCase());
    }
  }
  return [...new Set(names)];
}

/**
 * Literal `LINK PROGRAM('…')` targets from EXEC CICS blocks.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecCicsLinkPrograms(source) {
  return parseExecCicsProgramClause(source, "LINK");
}

/**
 * Literal `XCTL PROGRAM('…')` targets from EXEC CICS blocks.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecCicsXctlPrograms(source) {
  return parseExecCicsProgramClause(source, "XCTL");
}

/**
 * @param {string} source
 * @param {"LINK"|"XCTL"} verb
 * @returns {string[]}
 */
function parseExecCicsProgramClause(source, verb) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  const verbRe = new RegExp(`^${verb}\\b`);
  const progRe = /\bPROGRAM\s*\(\s*(?:'([^']+)'|"([^"]+)")\s*\)/gi;
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    if (!verbRe.test(body)) continue;
    progRe.lastIndex = 0;
    let p;
    while ((p = progRe.exec(body)) !== null) {
      const name = p[1] || p[2];
      if (name) names.push(name.toUpperCase());
    }
  }
  return [...new Set(names)];
}

/**
 * Names from `EXEC SQL INCLUDE <book>` (DB2 precompiler dual of `COPY <book>`).
 * Resolve with {@link resolveCobolCopybooks}; does not invent a DB2 runtime.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecSqlIncludeNames(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  EXEC_SQL_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_SQL_BLOCK_RE.exec(code)) !== null) {
    const body = String(m[1] || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    const inc = /^INCLUDE\s+([A-Z][A-Z0-9-]*)/.exec(body);
    if (inc?.[1]) names.push(inc[1]);
  }
  return [...new Set(names)];
}

/**
 * Catalog EXEC SQL verbs between EXEC SQL … END-EXEC (structural hole inventory).
 * Does not invent a DB2 runtime — ops stay unresolved as `exec-sql`.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecSqlOps(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const ops = [];
  EXEC_SQL_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_SQL_BLOCK_RE.exec(code)) !== null) {
    const body = String(m[1] || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    if (!body) {
      ops.push("OTHER");
      continue;
    }
    if (/^BEGIN\s+DECLARE\s+SECTION/.test(body)) ops.push("BEGIN-DECLARE");
    else if (/^END\s+DECLARE\s+SECTION/.test(body)) ops.push("END-DECLARE");
    else if (/^INCLUDE\b/.test(body)) ops.push("INCLUDE");
    else if (/^DECLARE\b[\s\S]*\bCURSOR\b/.test(body)) ops.push("DECLARE-CURSOR");
    else if (/^DECLARE\b/.test(body)) ops.push("DECLARE-TABLE");
    else if (/^INSERT\b/.test(body)) ops.push("INSERT");
    else if (/^UPDATE\b/.test(body)) ops.push("UPDATE");
    else if (/^DELETE\b/.test(body)) ops.push("DELETE");
    else if (/^SELECT\b/.test(body)) ops.push("SELECT");
    else if (/^COMMIT\b/.test(body)) ops.push("COMMIT");
    else if (/^ROLLBACK\b/.test(body)) ops.push("ROLLBACK");
    else if (/^OPEN\b/.test(body)) ops.push("OPEN");
    else if (/^FETCH\b/.test(body)) ops.push("FETCH");
    else if (/^CLOSE\b/.test(body)) ops.push("CLOSE");
    else if (/^WHENEVER\b/.test(body)) ops.push("WHENEVER");
    else if (/^SET\b/.test(body)) ops.push("SET");
    else if (/^CONNECT\b/.test(body)) ops.push("CONNECT");
    else if (/^DISCONNECT\b/.test(body)) ops.push("DISCONNECT");
    else ops.push("OTHER");
  }
  return [...new Set(ops)];
}

/**
 * Classify unresolved COBOL ops in a source slice (for hole-honesty smokes).
 *
 * @param {string} source
 * @param {number} [fromIndex]
 */
export function cobolUnresolvedOps(source, fromIndex = 0) {
  const slice = source.slice(fromIndex);
  /** @type {string[]} */
  const ops = [];
  if (/\bCALL\s+/i.test(slice)) ops.push("call");
  if (/\bACCEPT\s+/i.test(slice)) ops.push("accept");
  if (/\bDISPLAY\s+/i.test(slice) && !DISPLAY_LITERAL_RE.test(slice)) ops.push("display");
  if (/\bEXEC\s+CICS\b/i.test(slice)) ops.push("exec-cics");
  if (/\bEXEC\s+SQL\b/i.test(slice)) ops.push("exec-sql");
  if (/\bEXEC\s+DLI\b/i.test(slice)) ops.push("exec-dli");
  if (parseIbmMqCallOps(slice).length) ops.push("ibm-mq");
  if (/\bCOPY\s+[A-Za-z0-9]/i.test(slice)) ops.push("copy");
  if (/\bPERFORM\s+[A-Za-z0-9]/i.test(slice)) ops.push("perform");
  if (/\b(READ|WRITE|REWRITE|DELETE|START)\s+/i.test(slice)) ops.push("file-io");
  if (/\bORGANIZATION\s+IS\s+INDEXED\b/i.test(slice)) ops.push("indexed-file");
  if (/\bRECORD\s+KEY\s+IS\b/i.test(slice)) ops.push("record-key");
  if (/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(slice)) ops.push("alternate-record-key");
  if (/\bINVALID\s+KEY\b/i.test(slice)) ops.push("invalid-key");
  // Non-deterministic intrinsic — keep as honest hole (no invented façade).
  if (/\bFUNCTION\s+RANDOM\b/i.test(slice)) ops.push("function-random");
  return [...new Set(ops)];
}

/**
 * Catalog EXEC DLI verbs (IMS DL/I). Does not invent an IMS runtime — ops stay `exec-dli`.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecDliOps(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const ops = [];
  EXEC_DLI_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_DLI_BLOCK_RE.exec(code)) !== null) {
    const body = String(m[1] || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    const verb = /^([A-Z][A-Z0-9-]*)/.exec(body);
    if (verb?.[1]) ops.push(verb[1]);
  }
  return [...new Set(ops)];
}

/**
 * Literal IBM MQ MQI CALL targets (`CALL 'MQOPEN'` …). CMQ* copybooks stay holes.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseIbmMqCallOps(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const ops = [];
  IBM_MQ_CALL_RE.lastIndex = 0;
  let m;
  while ((m = IBM_MQ_CALL_RE.exec(code)) !== null) {
    const name = String(m[1] || m[2] || "").toUpperCase();
    if (IBM_MQ_API_NAMES.has(name)) ops.push(name);
  }
  return [...new Set(ops)];
}

/**
 * DFHAID symbol names referenced in source (DFHENTER / DFHPF3 / …).
 * Does **not** ship or invent `DFHAID.cpy` — IBM SDFHCOB proprietary (G10084).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCicsAidSymbols(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  CICS_AID_SYMBOL_RE.lastIndex = 0;
  let m;
  while ((m = CICS_AID_SYMBOL_RE.exec(code)) !== null) {
    if (m[1]) names.push(m[1].toUpperCase());
  }
  return [...new Set(names)];
}

/**
 * DFHBMSCA attribute symbol names referenced in source (DFHBMPRF / DFHBMUNP / …).
 * Does **not** ship or invent `DFHBMSCA.cpy` — IBM SDFHCOB proprietary (G10084).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseBmsAttrSymbols(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  BMS_ATTR_SYMBOL_RE.lastIndex = 0;
  let m;
  while ((m = BMS_ATTR_SYMBOL_RE.exec(code)) !== null) {
    const n = String(m[1] || "").toUpperCase();
    if (n === "DFHBMSCA") continue;
    names.push(n);
  }
  return [...new Set(names)];
}

/**
 * Resolve COPY book names against CLBS-style copybook directories.
 *
 * @param {string[]} copyNames
 * @param {string[]} searchDirs
 * @returns {{ name: string, resolved: string | null }[]}
 */
export function resolveCobolCopybooks(copyNames, searchDirs) {
  /** @type {{ name: string, resolved: string | null }[]} */
  const out = [];
  for (const name of copyNames) {
    const upper = String(name || "").toUpperCase();
    let resolved = null;
    for (const dir of searchDirs) {
      if (!dir || !existsSync(dir)) continue;
      for (const ext of [".cpy", ".CPY", ".cbl", ".CBL", ".cob", ".COB", ".dcl", ".DCL"]) {
        const p = join(dir, `${upper}${ext}`);
        if (existsSync(p)) {
          resolved = p;
          break;
        }
        const p2 = join(dir, `${name}${ext}`);
        if (existsSync(p2)) {
          resolved = p2;
          break;
        }
      }
      if (resolved) break;
      try {
        for (const sub of readdirSync(dir)) {
          const subDir = join(dir, sub);
          try {
            if (!statSync(subDir).isDirectory()) continue;
          } catch {
            continue;
          }
          for (const ext of [".cpy", ".CPY", ".cbl", ".CBL", ".dcl", ".DCL"]) {
            const p = join(subDir, `${upper}${ext}`);
            if (existsSync(p)) {
              resolved = p;
              break;
            }
          }
          if (resolved) break;
        }
      } catch {
        /* ignore */
      }
      if (resolved) break;
    }
    out.push({ name, resolved });
  }
  return out;
}

/** IBM / MQ proprietary books — never invent or expand (D6442/D6447). */
export const COBOL_COPY_EXPAND_SKIP = new Set([
  "DFHAID",
  "DFHBMSCA",
  "EXTFMAP",
  "DFHATTR",
]);

/**
 * True when COPY name is IBM/MQ proprietary — never invent or expand (D6442/D6447).
 * @param {string} name
 */
export function isProprietaryCobolCopybook(name) {
  const upper = String(name || "").toUpperCase();
  if (!upper) return true;
  if (COBOL_COPY_EXPAND_SKIP.has(upper)) return true;
  if (upper.startsWith("CMQ")) return true; // IBM MQ CMQ* copybooks
  return false;
}

/**
 * @param {string} name
 */
function shouldSkipCobolCopyExpand(name) {
  return isProprietaryCobolCopybook(name);
}

/**
 * Infer `copybook/` / `_upstream` dirs near a COBOL file or project root (G10087).
 *
 * @param {string} filePath
 * @param {string} [projectDir]
 * @returns {string[]}
 */
export function inferCobolCopybookDirs(filePath, projectDir) {
  /** @type {string[]} */
  const candidates = [];
  if (projectDir) {
    candidates.push(
      join(projectDir, "copybook"),
      join(projectDir, "cpy"),
      join(projectDir, "_upstream"),
    );
  }
  let dir = dirname(resolve(String(filePath || ".") || "."));
  for (let i = 0; i < 5; i++) {
    candidates.push(join(dir, "copybook"), join(dir, "cpy"), join(dir, "_upstream"));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return [...new Set(candidates.filter((d) => d && existsSync(d)))];
}

/**
 * Expand in-repo `COPY name.` text into the source for lift/inventory deepen (G10087).
 * Skips IBM AID/BMSCA/EXTFMAP and CMQ* — those stay unresolved COPY holes.
 *
 * @param {string} source
 * @param {string[]} searchDirs
 * @param {{ maxDepth?: number }} [opts]
 * @returns {{
 *   source: string,
 *   expanded: string[],
 *   skipped: string[],
 *   missing: string[],
 * }}
 */
export function expandCobolCopybooks(source, searchDirs, opts = {}) {
  const maxDepth = opts.maxDepth ?? 6;
  /** @type {string[]} */
  const expanded = [];
  /** @type {string[]} */
  const skipped = [];
  /** @type {string[]} */
  const missing = [];
  const visited = new Set();

  /**
   * @param {string} text
   * @param {number} depth
   */
  function expandOnce(text, depth) {
    if (depth > maxDepth) return text;
    return String(text || "").replace(
      /\bCOPY\s+([A-Za-z][A-Za-z0-9-]*)\s*\./gi,
      (full, rawName) => {
        const name = String(rawName || "").toUpperCase();
        if (shouldSkipCobolCopyExpand(name)) {
          if (!skipped.includes(name)) skipped.push(name);
          return full;
        }
        if (visited.has(name)) return full;
        const hit = resolveCobolCopybooks([name], searchDirs)[0];
        if (!hit?.resolved) {
          if (!missing.includes(name)) missing.push(name);
          return full;
        }
        visited.add(name);
        if (!expanded.includes(name)) expanded.push(name);
        let body = "";
        try {
          body = readFileSync(hit.resolved, "utf8");
        } catch {
          if (!missing.includes(name)) missing.push(name);
          return full;
        }
        const nested = expandOnce(body, depth + 1);
        return `\n*> BEGIN-COPY ${name}\n${nested}\n*> END-COPY ${name}\n`;
      },
    );
  }

  return {
    source: expandOnce(String(source || ""), 0),
    expanded,
    skipped,
    missing,
  };
}

/**
 * Structural inventory of BMS map source (DFHMSD / DFHMDI / DFHMDF).
 * Does **not** invent BMS runtime or DFHAID/DFHBMSCA — labels and attribute
 * literals only (G10079).
 *
 * @param {string} source
 * @param {string} [file]
 * @returns {{
 *   file: string,
 *   mapsets: string[],
 *   maps: string[],
 *   fields: string[],
 *   dfhmsd: number,
 *   dfhmdi: number,
 *   dfhmdf: number,
 *   namedFields: number,
 *   withPos: number,
 *   withLength: number,
 *   withAttrb: number,
 *   withInitial: number,
 *   withColor: number,
 * }}
 */
export function inventoryBmsSource(source, file = "") {
  // Join BMS continuation lines ending with `-` (column-72 style).
  const joined = String(source || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .reduce((acc, line) => {
      const trimmedEnd = line.replace(/\s+$/, "");
      if (acc.length && /-$/.test(acc[acc.length - 1])) {
        acc[acc.length - 1] = acc[acc.length - 1].replace(/-\s*$/, "") + " " + line.trim();
      } else {
        acc.push(line);
      }
      return acc;
    }, /** @type {string[]} */ ([]))
    .join("\n");

  /** @type {string[]} */
  const mapsets = [];
  /** @type {string[]} */
  const maps = [];
  /** @type {string[]} */
  const fields = [];
  let dfhmsd = 0;
  let dfhmdi = 0;
  let dfhmdf = 0;
  let withPos = 0;
  let withLength = 0;
  let withAttrb = 0;
  let withInitial = 0;
  let withColor = 0;

  // Per-macro scan (BMS often has blank label for DFHMDF).
  const macroRe = /(?:^|\n)([A-Z0-9@#$]{0,8})\s+(DFHMSD|DFHMDI|DFHMDF)\b([^\n]*(?:\n(?![A-Z0-9@#$]{0,8}\s+DFHM(?:SD|DI|DF)\b)[^\n]*)*)/gi;
  let m;
  macroRe.lastIndex = 0;
  while ((m = macroRe.exec(joined)) !== null) {
    const label = String(m[1] || "").trim().toUpperCase();
    const kind = String(m[2] || "").toUpperCase();
    const body = String(m[3] || "");
    if (kind === "DFHMSD") {
      dfhmsd += 1;
      if (label) mapsets.push(label);
    } else if (kind === "DFHMDI") {
      dfhmdi += 1;
      if (label) maps.push(label);
    } else if (kind === "DFHMDF") {
      dfhmdf += 1;
      if (label) fields.push(label);
      if (/\bPOS\s*=/i.test(body)) withPos += 1;
      if (/\bLENGTH\s*=/i.test(body)) withLength += 1;
      if (/\bATTRB\s*=/i.test(body)) withAttrb += 1;
      if (/\bINITIAL\s*=/i.test(body)) withInitial += 1;
      if (/\bCOLOR\s*=/i.test(body)) withColor += 1;
    }
  }

  return {
    file,
    mapsets: [...new Set(mapsets)],
    maps: [...new Set(maps)],
    fields: [...new Set(fields)],
    dfhmsd,
    dfhmdi,
    dfhmdf,
    namedFields: fields.length,
    withPos,
    withLength,
    withAttrb,
    withInitial,
    withColor,
  };
}

