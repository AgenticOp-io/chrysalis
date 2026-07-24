/**
 * COBOL pattern-lift: PROGRAM-ID / PROCEDURE paragraphs / hub annotations → WebIR routes.
 * Honest holes for CALL / ACCEPT / non-literal DISPLAY when no return can be lowered.
 *
 * Annotations (optional, in `*` or `*>` comments):
 *   chrysalis-route: METHOD /path
 *   chrysalis-return: <json-or-literal>
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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
/** First verb after EXEC CICS (HANDLE CONDITION → HANDLE). */
const EXEC_CICS_OP_RE = /\bEXEC\s+CICS\s+([A-Z][A-Z0-9-]*)/gi;
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
    /\bEXEC\s+SQL\b/i.test(slice)
  ) {
    return null;
  }

  return null;
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
  const execSqlOps = parseExecSqlOps(code);
  const execSqlIncludes = parseExecSqlIncludeNames(code);
  /** @type {string[]} */
  const execCicsOps = [];
  EXEC_CICS_OP_RE.lastIndex = 0;
  while ((m = EXEC_CICS_OP_RE.exec(code)) !== null) {
    if (m[1]) execCicsOps.push(m[1].toUpperCase());
  }
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
    execCicsOps: [...new Set(execCicsOps)],
    handleCondition,
    handleAid,
    respClauses,
    execSql,
    execSqlOps,
    execSqlIncludes,
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

