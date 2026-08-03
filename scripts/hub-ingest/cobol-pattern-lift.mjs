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
/** IBM MQ MQI CALL targets (CMQ* copybooks expand only when licensed drop on disk). */
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
  // G10099 — CICS FILE / QUEUE literal catalogs on hole attrs (no VSAM/TDQ invent).
  if (inv?.execCicsFiles?.length) attrs.execCicsFiles = [...inv.execCicsFiles];
  if (inv?.execCicsQueues?.length) attrs.execCicsQueues = [...inv.execCicsQueues];
  // G10100 — TD vs TS queue split (union kept above).
  if (inv?.execCicsTdQueues?.length) attrs.execCicsTdQueues = [...inv.execCicsTdQueues];
  if (inv?.execCicsTsQueues?.length) attrs.execCicsTsQueues = [...inv.execCicsTsQueues];
  if (inv?.selectAssign?.length) attrs.selectAssign = [...inv.selectAssign];
  if (inv?.assignDdNames?.length) attrs.assignDdNames = [...inv.assignDdNames];
  if (inv?.callTargets?.length) attrs.callTargets = [...inv.callTargets];
  if (inv?.acceptFrom?.length) attrs.acceptFrom = [...inv.acceptFrom];
  if (inv?.displayLiterals?.length) attrs.displayLiterals = [...inv.displayLiterals];
  // G10101 — HANDLE CONDITION names + STRING/UNSTRING/INSPECT + OPEN modes (catalog only).
  if (inv?.handleConditionNames?.length) {
    attrs.handleConditionNames = [...inv.handleConditionNames];
  }
  if (inv?.handleConditionTargets?.length) {
    attrs.handleConditionTargets = [...inv.handleConditionTargets];
  }
  // G10102 — HANDLE AID / ABEND + ORGANIZATION / FD catalogs.
  if (inv?.handleAidNames?.length) attrs.handleAidNames = [...inv.handleAidNames];
  if (inv?.handleAidTargets?.length) {
    attrs.handleAidTargets = [...inv.handleAidTargets];
  }
  if (inv?.handleAbendLabels?.length) {
    attrs.handleAbendLabels = [...inv.handleAbendLabels];
  }
  if (inv?.organizations?.length) attrs.organizations = [...inv.organizations];
  if (inv?.fdNames?.length) attrs.fdNames = [...inv.fdNames];
  if (typeof inv?.invalidKey === "number" && inv.invalidKey > 0) {
    attrs.invalidKey = inv.invalidKey;
  }
  // G10103 — SQL cursor names + JCL DD crosswalk opts.
  if (inv?.sqlCursorNames?.length) attrs.sqlCursorNames = [...inv.sqlCursorNames];
  // G10104 — CICS ASSIGN option names + EIB/COMMAREA symbols.
  if (inv?.cicsAssignOptions?.length) {
    attrs.cicsAssignOptions = [...inv.cicsAssignOptions];
  }
  if (inv?.cicsEibSymbols?.length) attrs.cicsEibSymbols = [...inv.cicsEibSymbols];
  // G10105 — procedure / data-division verb + USAGE catalogs.
  if (typeof inv?.initializeOps === "number" && inv.initializeOps > 0) {
    attrs.initializeOps = inv.initializeOps;
  }
  if (typeof inv?.setToTrue === "number" && inv.setToTrue > 0) {
    attrs.setToTrue = inv.setToTrue;
  }
  if (typeof inv?.goback === "number" && inv.goback > 0) attrs.goback = inv.goback;
  if (typeof inv?.stopRun === "number" && inv.stopRun > 0) attrs.stopRun = inv.stopRun;
  if (typeof inv?.exitProgram === "number" && inv.exitProgram > 0) {
    attrs.exitProgram = inv.exitProgram;
  }
  if (typeof inv?.lengthOf === "number" && inv.lengthOf > 0) attrs.lengthOf = inv.lengthOf;
  if (typeof inv?.redefines === "number" && inv.redefines > 0) {
    attrs.redefines = inv.redefines;
  }
  if (inv?.usageTokens?.length) attrs.usageTokens = [...inv.usageTokens];
  // G10106 — CICS INTO/FROM data areas.
  if (inv?.cicsIntoAreas?.length) attrs.cicsIntoAreas = [...inv.cicsIntoAreas];
  if (inv?.cicsFromAreas?.length) attrs.cicsFromAreas = [...inv.cicsFromAreas];
  // G10112 — CICS control / time / storage / sync option catalogs.
  if (inv?.cicsReturnTransids?.length) {
    attrs.cicsReturnTransids = [...inv.cicsReturnTransids];
  }
  if (inv?.cicsReturnOptions?.length) {
    attrs.cicsReturnOptions = [...inv.cicsReturnOptions];
  }
  if (inv?.cicsFormtimeOptions?.length) {
    attrs.cicsFormtimeOptions = [...inv.cicsFormtimeOptions];
  }
  if (inv?.cicsAsktimeOptions?.length) {
    attrs.cicsAsktimeOptions = [...inv.cicsAsktimeOptions];
  }
  if (inv?.cicsAbendAbcodes?.length) {
    attrs.cicsAbendAbcodes = [...inv.cicsAbendAbcodes];
  }
  if (inv?.cicsGetmainOptions?.length) {
    attrs.cicsGetmainOptions = [...inv.cicsGetmainOptions];
  }
  if (inv?.cicsFreemainOptions?.length) {
    attrs.cicsFreemainOptions = [...inv.cicsFreemainOptions];
  }
  if (inv?.cicsDelayOptions?.length) {
    attrs.cicsDelayOptions = [...inv.cicsDelayOptions];
  }
  if (inv?.cicsInquireFiles?.length) {
    attrs.cicsInquireFiles = [...inv.cicsInquireFiles];
  }
  if (inv?.cicsRetrieveInto?.length) {
    attrs.cicsRetrieveInto = [...inv.cicsRetrieveInto];
  }
  if (inv?.cicsEnqResources?.length) {
    attrs.cicsEnqResources = [...inv.cicsEnqResources];
  }
  if (inv?.cicsDeqResources?.length) {
    attrs.cicsDeqResources = [...inv.cicsDeqResources];
  }
  if (typeof inv?.cicsSyncpoint === "number" && inv.cicsSyncpoint > 0) {
    attrs.cicsSyncpoint = inv.cicsSyncpoint;
  }
  if (typeof inv?.cicsReturnOps === "number" && inv.cicsReturnOps > 0) {
    attrs.cicsReturnOps = inv.cicsReturnOps;
  }
  if (typeof inv?.stringOps === "number" && inv.stringOps > 0) attrs.stringOps = inv.stringOps;
  if (typeof inv?.unstringOps === "number" && inv.unstringOps > 0) {
    attrs.unstringOps = inv.unstringOps;
  }
  if (typeof inv?.inspectOps === "number" && inv.inspectOps > 0) {
    attrs.inspectOps = inv.inspectOps;
  }
  if (inv?.openModes?.length) attrs.openModes = [...inv.openModes];
  if (opts.jclPgmMatched?.length) attrs.jclPgmMatched = [...opts.jclPgmMatched];
  if (opts.jclPgmHole?.length) attrs.jclPgmHole = [...opts.jclPgmHole];
  if (opts.jclDdMatched?.length) attrs.jclDdMatched = [...opts.jclDdMatched];
  if (opts.jclDdHole?.length) attrs.jclDdHole = [...opts.jclDdHole];
  if (inv?.execSqlOps?.length) attrs.execSqlOps = [...inv.execSqlOps];
  if (inv?.execSqlIncludes?.length) attrs.execSqlIncludes = [...inv.execSqlIncludes];
  if (inv?.execDliOps?.length) attrs.execDliOps = [...inv.execDliOps];
  if (inv?.ibmMqCallOps?.length) attrs.ibmMqCallOps = [...inv.ibmMqCallOps];
  if (inv?.cicsAidSymbols?.length) attrs.cicsAidSymbols = [...inv.cicsAidSymbols];
  if (inv?.bmsAttrSymbols?.length) attrs.bmsAttrSymbols = [...inv.bmsAttrSymbols];
  // G10094 — catalog inventoried file-io / indexed / EVALUATE surface on hole attrs (no runtime).
  if (inv?.recordKeys?.length) attrs.recordKeys = [...inv.recordKeys];
  if (inv?.alternateRecordKeys?.length) {
    attrs.alternateRecordKeys = [...inv.alternateRecordKeys];
  }
  if (inv?.accessModes?.length) attrs.accessModes = [...inv.accessModes];
  if (typeof inv?.organizationIndexed === "number" && inv.organizationIndexed > 0) {
    attrs.organizationIndexed = inv.organizationIndexed;
  }
  if (typeof inv?.fileIo === "number" && inv.fileIo > 0) attrs.fileIo = inv.fileIo;
  if (inv?.evaluateWhens?.length) attrs.evaluateWhens = [...inv.evaluateWhens];
  if (typeof inv?.evaluateTrue === "number" && inv.evaluateTrue > 0) {
    attrs.evaluateTrue = inv.evaluateTrue;
  }
  // G10098 — attach already-inventoried control/online surface (no runtime invent).
  if (typeof inv?.handleCondition === "number" && inv.handleCondition > 0) {
    attrs.handleCondition = inv.handleCondition;
  }
  if (typeof inv?.handleAid === "number" && inv.handleAid > 0) {
    attrs.handleAid = inv.handleAid;
  }
  if (typeof inv?.respClauses === "number" && inv.respClauses > 0) {
    attrs.respClauses = inv.respClauses;
  }
  if (typeof inv?.occurs === "number" && inv.occurs > 0) attrs.occurs = inv.occurs;
  if (typeof inv?.search === "number" && inv.search > 0) attrs.search = inv.search;
  if (inv?.evaluateNumericWhens?.length) {
    attrs.evaluateNumericWhens = [...inv.evaluateNumericWhens];
  }
  if (typeof inv?.evaluateAny === "number" && inv.evaluateAny > 0) {
    attrs.evaluateAny = inv.evaluateAny;
  }
  if (inv?.procedureUsingArgs?.length) {
    attrs.procedureUsingArgs = [...inv.procedureUsingArgs];
  }
  if (inv?.entryNames?.length) attrs.entryNames = [...inv.entryNames];
  if (inv?.sectionNames?.length) attrs.sectionNames = [...inv.sectionNames];
  if (inv?.performs?.length) attrs.performs = [...inv.performs];
  if (typeof inv?.computes === "number" && inv.computes > 0) attrs.computes = inv.computes;
  // G10099 — optional BMS MAP/MAPSET crosswalk result (matched vs honest holes).
  if (opts.bmsMapMatched?.length) attrs.bmsMapMatched = [...opts.bmsMapMatched];
  if (opts.bmsMapHole?.length) attrs.bmsMapHole = [...opts.bmsMapHole];
  if (opts.bmsMapsetMatched?.length) attrs.bmsMapsetMatched = [...opts.bmsMapsetMatched];
  if (opts.bmsMapsetHole?.length) attrs.bmsMapsetHole = [...opts.bmsMapsetHole];
  if (opts.cicsLinkMatched?.length) attrs.cicsLinkMatched = [...opts.cicsLinkMatched];
  if (opts.cicsLinkHole?.length) attrs.cicsLinkHole = [...opts.cicsLinkHole];
  if (opts.cicsXctlMatched?.length) attrs.cicsXctlMatched = [...opts.cicsXctlMatched];
  if (opts.cicsXctlHole?.length) attrs.cicsXctlHole = [...opts.cicsXctlHole];
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
  const execCicsFiles = parseExecCicsFiles(code);
  const queueCatalog = parseExecCicsQueueCatalog(code);
  const execCicsQueues = queueCatalog.all;
  const execCicsTdQueues = queueCatalog.td;
  const execCicsTsQueues = queueCatalog.ts;
  const selectAssign = parseCobolSelectAssign(code);
  const assignDdNames = [...new Set(selectAssign.map((s) => s.assign))];
  const callTargets = parseCobolCallTargets(code);
  const acceptFrom = parseCobolAcceptFrom(code);
  const displayLiterals = parseCobolDisplayLiterals(code);
  const ibmMqCallOps = parseIbmMqCallOps(code);
  const cicsAidSymbols = parseCicsAidSymbols(code);
  const bmsAttrSymbols = parseBmsAttrSymbols(code);
  const handleCondition = (code.match(HANDLE_CONDITION_RE) || []).length;
  const handleAid = (code.match(HANDLE_AID_RE) || []).length;
  const handleCondCatalog = parseExecCicsHandleConditions(code);
  const handleConditionNames = handleCondCatalog.names;
  const handleConditionTargets = handleCondCatalog.targets;
  const handleAidCatalog = parseExecCicsHandleAid(code);
  const handleAidNames = handleAidCatalog.names;
  const handleAidTargets = handleAidCatalog.targets;
  const handleAbendLabels = parseExecCicsHandleAbendLabels(code);
  const stringUnstringInspect = parseCobolStringUnstringInspect(code);
  const openModes = parseCobolOpenModes(code);
  const organizations = parseCobolOrganizations(code);
  const fdNames = parseCobolFdNames(code);
  const invalidKey = (code.match(/\bINVALID\s+KEY\b/gi) || []).length;
  const sqlCursorNames = parseExecSqlCursorNames(code);
  const cicsAssignOptions = parseExecCicsAssignOptions(code);
  const cicsEibSymbols = parseCicsEibSymbols(code);
  const procedureDataCatalog = parseCobolProcedureDataCatalog(code);
  const cicsIntoFrom = parseExecCicsIntoFrom(code);
  const cicsControl = parseExecCicsControlCatalog(code);
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
    execCicsFiles,
    execCicsQueues,
    execCicsTdQueues,
    execCicsTsQueues,
    selectAssign,
    assignDdNames,
    callTargets,
    acceptFrom,
    displayLiterals,
    ibmMqCallOps,
    cicsAidSymbols,
    bmsAttrSymbols,
    handleCondition,
    handleAid,
    handleConditionNames,
    handleConditionTargets,
    handleAidNames,
    handleAidTargets,
    handleAbendLabels,
    stringOps: stringUnstringInspect.string,
    unstringOps: stringUnstringInspect.unstring,
    inspectOps: stringUnstringInspect.inspect,
    openModes,
    organizations,
    fdNames,
    invalidKey,
    sqlCursorNames,
    cicsAssignOptions,
    cicsEibSymbols,
    initializeOps: procedureDataCatalog.initializeOps,
    setToTrue: procedureDataCatalog.setToTrue,
    goback: procedureDataCatalog.goback,
    stopRun: procedureDataCatalog.stopRun,
    exitProgram: procedureDataCatalog.exitProgram,
    lengthOf: procedureDataCatalog.lengthOf,
    redefines: procedureDataCatalog.redefines,
    usageTokens: procedureDataCatalog.usageTokens,
    cicsIntoAreas: cicsIntoFrom.into,
    cicsFromAreas: cicsIntoFrom.from,
    cicsReturnTransids: cicsControl.returnTransids,
    cicsReturnOptions: cicsControl.returnOptions,
    cicsFormtimeOptions: cicsControl.formtimeOptions,
    cicsAsktimeOptions: cicsControl.asktimeOptions,
    cicsAbendAbcodes: cicsControl.abendAbcodes,
    cicsGetmainOptions: cicsControl.getmainOptions,
    cicsFreemainOptions: cicsControl.freemainOptions,
    cicsDelayOptions: cicsControl.delayOptions,
    cicsInquireFiles: cicsControl.inquireFiles,
    cicsRetrieveInto: cicsControl.retrieveInto,
    cicsEnqResources: cicsControl.enqResources,
    cicsDeqResources: cicsControl.deqResources,
    cicsSyncpoint: cicsControl.syncpoint,
    cicsReturnOps: cicsControl.returnOps,
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
 * Literal `FILE('…')` names from any EXEC CICS block (READ/WRITE/STARTBR/…).
 * Does not invent VSAM — catalog only (G10099).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecCicsFiles(source) {
  return parseExecCicsNamedClause(source);
}

/**
 * Literal `QUEUE('…')` names from EXEC CICS blocks (TD+TS union).
 * Prefer {@link parseExecCicsQueueCatalog} for TD vs TS split (G10100).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecCicsQueues(source) {
  return parseExecCicsQueueCatalog(source).all;
}

/**
 * Split TD vs TS temporary-storage / transient-data queue names (G10100).
 * Does not invent TDQ/TSQ runtime — catalog only.
 *
 * @param {string} source
 * @returns {{ td: string[], ts: string[], all: string[] }}
 */
export function parseExecCicsQueueCatalog(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const td = [];
  /** @type {string[]} */
  const ts = [];
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    const isTd =
      /\bTD\s+QUEUE\b/.test(body) ||
      /\b(?:WRITEQ|READQ|DELETEQ)\s+TD\b/.test(body);
    const isTs =
      /\b(?:WRITEQ|READQ|DELETEQ)\s+TS\b/.test(body) ||
      (/\bQUEUE\s*\(/.test(body) && !isTd && !/\bTD\b/.test(body));
    const clauseRe = /\b(?:TD\s+)?QUEUE\s*\(\s*(?:'([^']+)'|"([^"]+)")\s*\)/gi;
    let c;
    while ((c = clauseRe.exec(body)) !== null) {
      const name = (c[1] || c[2] || "").toUpperCase();
      if (!name) continue;
      if (isTd) td.push(name);
      else if (isTs || /\bQUEUE\s*\(/.test(body)) ts.push(name);
    }
  }
  const tdU = [...new Set(td)];
  const tsU = [...new Set(ts)];
  return { td: tdU, ts: tsU, all: [...new Set([...tdU, ...tsU])] };
}

/**
 * FILE-CONTROL `SELECT … ASSIGN TO …` pairs (batch dual of CICS FILE) — G10100.
 *
 * @param {string} source
 * @returns {Array<{ select: string, assign: string }>}
 */
export function parseCobolSelectAssign(source) {
  const code = String(source || "");
  /** @type {Array<{ select: string, assign: string }>} */
  const out = [];
  const re =
    /\bSELECT\s+([A-Z][A-Z0-9-]*)\s+ASSIGN\s+TO\s+([A-Z][A-Z0-9-]*)/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    out.push({
      select: String(m[1]).toUpperCase(),
      assign: String(m[2]).toUpperCase(),
    });
  }
  return out;
}

/**
 * Literal `CALL '…'` targets (dynamic CALL identifiers stay unlisted) — G10100.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCobolCallTargets(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  const re = /\bCALL\s+(?:'([^']+)'|"([^"]+)")/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    const name = m[1] || m[2];
    if (name) names.push(name.toUpperCase());
  }
  return [...new Set(names)];
}

/**
 * `ACCEPT … FROM` special registers / mnemonic names — G10100.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCobolAcceptFrom(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  const re = /\bACCEPT\s+[A-Z0-9-]+\s+FROM\s+([A-Z][A-Z0-9-]*)/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[1]) names.push(String(m[1]).toUpperCase());
  }
  return [...new Set(names)];
}

/**
 * Literal operands of `DISPLAY '…'` (non-literal DISPLAY stays hole) — G10100.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCobolDisplayLiterals(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const vals = [];
  const re = /\bDISPLAY\s+(?:'([^']*)'|"([^"]*)")/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    const v = m[1] != null ? m[1] : m[2];
    if (v != null && v !== "") vals.push(v);
  }
  return [...new Set(vals)].slice(0, 40);
}

/**
 * Crosswalk LINK/XCTL PROGRAM targets against known PROGRAM-IDs in the tree (G10100).
 *
 * @param {{ link?: string[], xctl?: string[] }} referenced
 * @param {Iterable<string>} programIds
 * @returns {{
 *   cicsLinkMatched: string[],
 *   cicsLinkHole: string[],
 *   cicsXctlMatched: string[],
 *   cicsXctlHole: string[],
 * }}
 */
export function crosswalkOnlineCicsPrograms(referenced, programIds) {
  const known = new Set(
    [...(programIds || [])].map((p) => String(p).toUpperCase()),
  );
  const link = [...new Set((referenced?.link || []).map((p) => String(p).toUpperCase()))];
  const xctl = [...new Set((referenced?.xctl || []).map((p) => String(p).toUpperCase()))];
  return {
    cicsLinkMatched: link.filter((p) => known.has(p)).sort(),
    cicsLinkHole: link.filter((p) => !known.has(p)).sort(),
    cicsXctlMatched: xctl.filter((p) => known.has(p)).sort(),
    cicsXctlHole: xctl.filter((p) => !known.has(p)).sort(),
  };
}

/**
 * Named conditions + paragraph targets from `EXEC CICS HANDLE CONDITION …` (G10101).
 * Does not invent CICS condition handling — catalog only.
 *
 * @param {string} source
 * @returns {{ names: string[], targets: Array<{ condition: string, paragraph: string }> }}
 */
export function parseExecCicsHandleConditions(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  /** @type {Array<{ condition: string, paragraph: string }>} */
  const targets = [];
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    if (!/^HANDLE\s+CONDITION\b/.test(body)) continue;
    const after = body.replace(/^HANDLE\s+CONDITION\b/, "").trim();
    const pairRe = /\b([A-Z][A-Z0-9-]*)\s*\(\s*([A-Z][A-Z0-9-]*)\s*\)/g;
    let p;
    while ((p = pairRe.exec(after)) !== null) {
      const condition = String(p[1]).toUpperCase();
      const paragraph = String(p[2]).toUpperCase();
      names.push(condition);
      targets.push({ condition, paragraph });
    }
  }
  return {
    names: [...new Set(names)].sort(),
    targets,
  };
}

/**
 * AID keys + paragraph targets from `EXEC CICS HANDLE AID …` (G10102).
 *
 * @param {string} source
 * @returns {{ names: string[], targets: Array<{ aid: string, paragraph: string }> }}
 */
export function parseExecCicsHandleAid(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  /** @type {Array<{ aid: string, paragraph: string }>} */
  const targets = [];
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    if (!/^HANDLE\s+AID\b/.test(body)) continue;
    const after = body.replace(/^HANDLE\s+AID\b/, "").trim();
    const pairRe = /\b([A-Z][A-Z0-9-]*)\s*\(\s*([A-Z][A-Z0-9-]*)\s*\)/g;
    let p;
    while ((p = pairRe.exec(after)) !== null) {
      const aid = String(p[1]).toUpperCase();
      const paragraph = String(p[2]).toUpperCase();
      names.push(aid);
      targets.push({ aid, paragraph });
    }
  }
  return {
    names: [...new Set(names)].sort(),
    targets,
  };
}

/**
 * `HANDLE ABEND LABEL(paragraph)` targets (G10102).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecCicsHandleAbendLabels(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const labels = [];
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    if (!/^HANDLE\s+ABEND\b/.test(body)) continue;
    const labelRe = /\bLABEL\s*\(\s*([A-Z][A-Z0-9-]*)\s*\)/g;
    let p;
    while ((p = labelRe.exec(body)) !== null) {
      if (p[1]) labels.push(String(p[1]).toUpperCase());
    }
  }
  return [...new Set(labels)].sort();
}

/**
 * FILE-CONTROL `ORGANIZATION IS …` tokens (G10102).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCobolOrganizations(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const orgs = [];
  const re =
    /\bORGANIZATION\s+IS\s+(LINE\s+SEQUENTIAL|SEQUENTIAL|INDEXED|RELATIVE)\b/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[1]) orgs.push(String(m[1]).toUpperCase().replace(/\s+/g, " "));
  }
  return [...new Set(orgs)].sort();
}

/**
 * FD entry names (G10102).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCobolFdNames(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  const re = /\bFD\s+([A-Z][A-Z0-9-]*)/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[1]) names.push(String(m[1]).toUpperCase());
  }
  return [...new Set(names)].sort();
}

/**
 * Cursor names from `EXEC SQL DECLARE … CURSOR` (G10103). No Db2 invent.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecSqlCursorNames(source) {
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
    const cm = /^DECLARE\s+([A-Z][A-Z0-9-]*)\s+CURSOR\b/.exec(body);
    if (cm?.[1]) names.push(cm[1]);
  }
  return [...new Set(names)].sort();
}

/**
 * Option names from `EXEC CICS ASSIGN option(…)` (G10104). Skips RESP/RESP2.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseExecCicsAssignOptions(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const opts = [];
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    if (!/^ASSIGN\b/.test(body)) continue;
    const after = body.replace(/^ASSIGN\b/, "").trim();
    const optRe = /\b([A-Z][A-Z0-9-]*)\s*\(/g;
    let p;
    while ((p = optRe.exec(after)) !== null) {
      const name = String(p[1]).toUpperCase();
      if (name === "RESP" || name === "RESP2") continue;
      opts.push(name);
    }
  }
  return [...new Set(opts)].sort();
}

/** Common CICS EIB / COMMAREA symbols referenced in online programs. */
const CICS_EIB_SYMBOLS = [
  "DFHCOMMAREA",
  "DFHRESP",
  "EIBCALEN",
  "EIBAID",
  "EIBRESP",
  "EIBRESP2",
  "EIBRCODE",
  "EIBFN",
  "EIBTRNID",
  "EIBTASKN",
  "EIBTRMID",
];

/**
 * Inventoried CICS EIB / DFHCOMMAREA symbol references (G10104). Catalog only.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCicsEibSymbols(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const hit = [];
  for (const sym of CICS_EIB_SYMBOLS) {
    const re = new RegExp(`\\b${sym}\\b`, "i");
    if (re.test(code)) hit.push(sym);
  }
  return hit.sort();
}

/**
 * Procedure / data-division verb + USAGE token catalogs (G10105). Exhaust peel.
 *
 * @param {string} source
 * @returns {{
 *   initializeOps: number,
 *   setToTrue: number,
 *   goback: number,
 *   stopRun: number,
 *   exitProgram: number,
 *   lengthOf: number,
 *   redefines: number,
 *   usageTokens: string[],
 * }}
 */
export function parseCobolProcedureDataCatalog(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const usage = [];
  const usageRe =
    /\b(?:USAGE\s+IS\s+)?(COMP-3|COMP-5|COMP-4|COMP|PACKED-DECIMAL|BINARY|DISPLAY|INDEX|POINTER)\b/gi;
  let m;
  while ((m = usageRe.exec(code)) !== null) {
    if (m[1]) usage.push(String(m[1]).toUpperCase());
  }
  return {
    initializeOps: (code.match(/\bINITIALIZE\b/gi) || []).length,
    setToTrue: (code.match(/\bSET\s+[A-Z0-9-]+\s+TO\s+TRUE\b/gi) || []).length,
    goback: (code.match(/\bGOBACK\b/gi) || []).length,
    stopRun: (code.match(/\bSTOP\s+RUN\b/gi) || []).length,
    exitProgram: (code.match(/\bEXIT\s+PROGRAM\b/gi) || []).length,
    lengthOf: (code.match(/\bLENGTH\s+OF\b/gi) || []).length,
    redefines: (code.match(/\bREDEFINES\b/gi) || []).length,
    usageTokens: [...new Set(usage)].sort(),
  };
}

/**
 * INTO/FROM data-area names on EXEC CICS READ/WRITE/REWRITE/browse (G10106).
 *
 * @param {string} source
 * @returns {{ into: string[], from: string[] }}
 */
export function parseExecCicsIntoFrom(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const into = [];
  /** @type {string[]} */
  const from = [];
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    if (
      !/^(?:READ|WRITE|REWRITE|READNEXT|READPREV|STARTBR)\b/.test(body)
    ) {
      continue;
    }
    const intoRe = /\bINTO\s*\(\s*([A-Z][A-Z0-9-]*)/g;
    const fromRe = /\bFROM\s*\(\s*([A-Z][A-Z0-9-]*)/g;
    let p;
    while ((p = intoRe.exec(body)) !== null) {
      if (p[1]) into.push(String(p[1]).toUpperCase());
    }
    while ((p = fromRe.exec(body)) !== null) {
      if (p[1]) from.push(String(p[1]).toUpperCase());
    }
  }
  return {
    into: [...new Set(into)].sort(),
    from: [...new Set(from)].sort(),
  };
}

/**
 * CICS control / time / storage / sync option catalogs (G10112).
 * RETURN TRANSID + options, FORMATTIME/ASKTIME options, SYNCPOINT, ABEND ABCODE,
 * GETMAIN/FREEMAIN/DELAY options, INQUIRE FILE, RETRIEVE INTO, ENQ/DEQ RESOURCE.
 * Catalog only — no CICS region invent.
 *
 * @param {string} source
 */
export function parseExecCicsControlCatalog(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const returnTransids = [];
  /** @type {string[]} */
  const returnOptions = [];
  /** @type {string[]} */
  const formtimeOptions = [];
  /** @type {string[]} */
  const asktimeOptions = [];
  /** @type {string[]} */
  const abendAbcodes = [];
  /** @type {string[]} */
  const getmainOptions = [];
  /** @type {string[]} */
  const freemainOptions = [];
  /** @type {string[]} */
  const delayOptions = [];
  /** @type {string[]} */
  const inquireFiles = [];
  /** @type {string[]} */
  const retrieveInto = [];
  /** @type {string[]} */
  const enqResources = [];
  /** @type {string[]} */
  const deqResources = [];
  let syncpoint = 0;
  let returnOps = 0;

  /**
   * @param {string} after
   * @param {string[]} into
   */
  function pushParenOptions(after, into) {
    const optRe = /\b([A-Z][A-Z0-9-]*)\s*\(/g;
    let p;
    while ((p = optRe.exec(after)) !== null) {
      const name = String(p[1]).toUpperCase();
      if (name === "RESP" || name === "RESP2") continue;
      into.push(name);
    }
  }

  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
    if (!body) continue;

    if (/^RETURN\b/.test(body)) {
      returnOps += 1;
      const after = body.replace(/^RETURN\b/, "").trim();
      pushParenOptions(after, returnOptions);
      const tidRe = /\bTRANSID\s*\(\s*(?:'([^']+)'|"([^"]+)")\s*\)/g;
      let t;
      while ((t = tidRe.exec(body)) !== null) {
        const id = (t[1] || t[2] || "").toUpperCase();
        if (id) returnTransids.push(id);
      }
    } else if (/^FORMATTIME\b/.test(body)) {
      const after = body.replace(/^FORMATTIME\b/, "").trim();
      pushParenOptions(after, formtimeOptions);
      if (/\bTIMESEP\b/.test(after) && !/\bTIMESEP\s*\(/.test(after)) {
        formtimeOptions.push("TIMESEP");
      }
    } else if (/^ASKTIME\b/.test(body)) {
      pushParenOptions(body.replace(/^ASKTIME\b/, "").trim(), asktimeOptions);
    } else if (/^SYNCPOINT\b/.test(body)) {
      syncpoint += 1;
    } else if (/^ABEND\b/.test(body)) {
      const abRe = /\bABCODE\s*\(\s*(?:'([^']+)'|"([^"]+)")\s*\)/g;
      let a;
      while ((a = abRe.exec(body)) !== null) {
        const codeLit = (a[1] || a[2] || "").toUpperCase();
        if (codeLit) abendAbcodes.push(codeLit);
      }
    } else if (/^GETMAIN\b/.test(body)) {
      pushParenOptions(body.replace(/^GETMAIN\b/, "").trim(), getmainOptions);
    } else if (/^FREEMAIN\b/.test(body)) {
      pushParenOptions(body.replace(/^FREEMAIN\b/, "").trim(), freemainOptions);
    } else if (/^DELAY\b/.test(body)) {
      pushParenOptions(body.replace(/^DELAY\b/, "").trim(), delayOptions);
    } else if (/^INQUIRE\b/.test(body)) {
      const fileRe = /\bFILE\s*\(\s*(?:'([^']+)'|"([^"]+)")\s*\)/g;
      let f;
      while ((f = fileRe.exec(body)) !== null) {
        const name = (f[1] || f[2] || "").toUpperCase();
        if (name) inquireFiles.push(name);
      }
    } else if (/^RETRIEVE\b/.test(body)) {
      const intoRe = /\bINTO\s*\(\s*([A-Z][A-Z0-9-]*)/g;
      let p;
      while ((p = intoRe.exec(body)) !== null) {
        if (p[1]) retrieveInto.push(String(p[1]).toUpperCase());
      }
    } else if (/^ENQ\b/.test(body)) {
      const resRe =
        /\bRESOURCE\s*\(\s*(?:'([^']+)'|"([^"]+)"|([A-Z][A-Z0-9-]*))/g;
      let r;
      while ((r = resRe.exec(body)) !== null) {
        const name = (r[1] || r[2] || r[3] || "").toUpperCase();
        if (name) enqResources.push(name);
      }
    } else if (/^DEQ\b/.test(body)) {
      const resRe =
        /\bRESOURCE\s*\(\s*(?:'([^']+)'|"([^"]+)"|([A-Z][A-Z0-9-]*))/g;
      let r;
      while ((r = resRe.exec(body)) !== null) {
        const name = (r[1] || r[2] || r[3] || "").toUpperCase();
        if (name) deqResources.push(name);
      }
    }
  }

  return {
    returnTransids: [...new Set(returnTransids)].sort(),
    returnOptions: [...new Set(returnOptions)].sort(),
    formtimeOptions: [...new Set(formtimeOptions)].sort(),
    asktimeOptions: [...new Set(asktimeOptions)].sort(),
    abendAbcodes: [...new Set(abendAbcodes)].sort(),
    getmainOptions: [...new Set(getmainOptions)].sort(),
    freemainOptions: [...new Set(freemainOptions)].sort(),
    delayOptions: [...new Set(delayOptions)].sort(),
    inquireFiles: [...new Set(inquireFiles)].sort(),
    retrieveInto: [...new Set(retrieveInto)].sort(),
    enqResources: [...new Set(enqResources)].sort(),
    deqResources: [...new Set(deqResources)].sort(),
    syncpoint,
    returnOps,
  };
}

/**
 * Counts of STRING / UNSTRING / INSPECT verbs (G10101). Catalog only — no invent.
 *
 * @param {string} source
 * @returns {{ string: number, unstring: number, inspect: number }}
 */
export function parseCobolStringUnstringInspect(source) {
  const code = String(source || "");
  return {
    string: (code.match(/\bSTRING\b/gi) || []).length,
    unstring: (code.match(/\bUNSTRING\b/gi) || []).length,
    inspect: (code.match(/\bINSPECT\b/gi) || []).length,
  };
}

/**
 * `OPEN INPUT|OUTPUT|I-O|EXTEND` mode tokens (G10101).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseCobolOpenModes(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const modes = [];
  const re = /\bOPEN\s+(INPUT|OUTPUT|I-O|EXTEND)\b/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[1]) modes.push(String(m[1]).toUpperCase());
  }
  return [...new Set(modes)].sort();
}

/**
 * `EXEC PGM=` names from a JCL body (G10101). No JES invent.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseJclExecPrograms(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const pgms = [];
  const re = /\bEXEC\s+PGM=([A-Z0-9$#@]+)/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[1]) pgms.push(String(m[1]).toUpperCase());
  }
  return [...new Set(pgms)].sort();
}

/**
 * Crosswalk JCL `EXEC PGM=` against known PROGRAM-IDs (G10101).
 * Utility PGMs (IDCAMS, IKJEFT01, …) remain honest holes.
 *
 * @param {Iterable<string>} jclPgms
 * @param {Iterable<string>} programIds
 * @returns {{ jclPgmMatched: string[], jclPgmHole: string[] }}
 */
export function crosswalkJclPrograms(jclPgms, programIds) {
  const known = new Set(
    [...(programIds || [])].map((p) => String(p).toUpperCase()),
  );
  const pgms = [...new Set([...(jclPgms || [])].map((p) => String(p).toUpperCase()))];
  return {
    jclPgmMatched: pgms.filter((p) => known.has(p)).sort(),
    jclPgmHole: pgms.filter((p) => !known.has(p)).sort(),
  };
}

/** System / utility DD names that are not COBOL ASSIGN targets. */
const JCL_DD_SYSTEM = new Set([
  "SYSPRINT",
  "SYSIN",
  "SYSOUT",
  "STEPLIB",
  "JOBLIB",
  "SYSTSPRT",
  "SYSTSIN",
  "SYSUDUMP",
  "CEEDUMP",
  "SORTIN",
  "SORTOUT",
  "SYSABOUT",
  "SYSDBOUT",
  "SYSTERM",
]);

/**
 * JCL `DD` ddnames (G10103). Skips `*` and `DATA` inline markers. No JES invent.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function parseJclDdNames(source) {
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  // //DDNAME DD … or DDNAME DD … (card images without //)
  const re = /(?:^|\n)\s*(?:\/\/)?([A-Z][A-Z0-9$#@]*)\s+DD\b/gim;
  let m;
  while ((m = re.exec(code)) !== null) {
    const name = String(m[1]).toUpperCase();
    if (!name || name === "DATA" || name.startsWith("*")) continue;
    names.push(name);
  }
  return [...new Set(names)].sort();
}

/**
 * Crosswalk application JCL DD names against COBOL `ASSIGN TO` ddnames (G10103).
 * System DDs stay in hole set when not assigned in COBOL.
 *
 * @param {Iterable<string>} jclDds
 * @param {Iterable<string>} assignDdNames
 * @returns {{ jclDdMatched: string[], jclDdHole: string[] }}
 */
export function crosswalkJclDdAssign(jclDds, assignDdNames) {
  const known = new Set(
    [...(assignDdNames || [])].map((p) => String(p).toUpperCase()),
  );
  const dds = [...new Set([...(jclDds || [])].map((p) => String(p).toUpperCase()))].filter(
    (d) => !JCL_DD_SYSTEM.has(d),
  );
  return {
    jclDdMatched: dds.filter((d) => known.has(d)).sort(),
    jclDdHole: dds.filter((d) => !known.has(d)).sort(),
  };
}

/**
 * @param {string} source
 * @returns {string[]}
 */
function parseExecCicsNamedClause(source) {
  // FILE path only — QUEUE uses parseExecCicsQueueCatalog (G10100).
  const code = String(source || "");
  /** @type {string[]} */
  const names = [];
  const clauseRe = /\bFILE\s*\(\s*(?:'([^']+)'|"([^"]+)")\s*\)/gi;
  EXEC_CICS_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = EXEC_CICS_BLOCK_RE.exec(code)) !== null) {
    const body = normalizeExecCicsBody(m[1]);
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
 * Crosswalk online MAP/MAPSET references against inventoried BMS labels (G10080/G10099).
 * Does not invent missing maps — returns matched vs hole lists only.
 *
 * @param {{ maps?: string[], mapsets?: string[] }} referenced
 * @param {{ maps?: Iterable<string>, mapsets?: Iterable<string> }} bmsLabels
 * @returns {{
 *   bmsMapMatched: string[],
 *   bmsMapHole: string[],
 *   bmsMapsetMatched: string[],
 *   bmsMapsetHole: string[],
 * }}
 */
export function crosswalkOnlineBmsMaps(referenced, bmsLabels) {
  const mapSet = new Set(
    [...(bmsLabels?.maps || [])].map((m) => String(m).toUpperCase()),
  );
  const mapsetSet = new Set(
    [...(bmsLabels?.mapsets || [])].map((m) => String(m).toUpperCase()),
  );
  const maps = [...new Set((referenced?.maps || []).map((m) => String(m).toUpperCase()))];
  const mapsets = [
    ...new Set((referenced?.mapsets || []).map((m) => String(m).toUpperCase())),
  ];
  return {
    bmsMapMatched: maps.filter((m) => mapSet.has(m) || mapsetSet.has(m)).sort(),
    bmsMapHole: maps.filter((m) => !mapSet.has(m) && !mapsetSet.has(m)).sort(),
    bmsMapsetMatched: mapsets.filter((m) => mapsetSet.has(m)).sort(),
    bmsMapsetHole: mapsets.filter((m) => !mapsetSet.has(m)).sort(),
  };
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
 * Literal IBM MQ MQI CALL targets (`CALL 'MQOPEN'` …). CMQ* copybooks expand only when licensed drop on disk.
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
 * Inline resolved `COPY name.` and `EXEC SQL INCLUDE name` bodies from search
 * dirs (G10087 / G10098). Proprietary IBM/MQ names expand **only** when a
 * licensed file is already on disk under a search dir (operator SDFHCOB/MQ
 * drop). Missing proprietary books stay honest skips — never invent stubs
 * (**D6442** / **D6447**). `EXEC SQL INCLUDE` is the Db2 precompiler dual of
 * `COPY`; expanding it does not invent a Db2 runtime.
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
   * @param {string} name
   * @param {string} full
   * @param {number} depth
   */
  function tryExpandName(name, full, depth) {
    const key = String(name || "").toUpperCase();
    if (!key || visited.has(key)) return full;
    const hit = resolveCobolCopybooks([key], searchDirs)[0];
    if (!hit?.resolved) {
      if (shouldSkipCobolCopyExpand(key)) {
        if (!skipped.includes(key)) skipped.push(key);
      } else if (!missing.includes(key)) {
        missing.push(key);
      }
      return full;
    }
    visited.add(key);
    if (!expanded.includes(key)) expanded.push(key);
    let body = "";
    try {
      body = readFileSync(hit.resolved, "utf8");
    } catch {
      if (shouldSkipCobolCopyExpand(key)) {
        if (!skipped.includes(key)) skipped.push(key);
      } else if (!missing.includes(key)) {
        missing.push(key);
      }
      return full;
    }
    const nested = expandOnce(body, depth + 1);
    return `\n*> BEGIN-COPY ${key}\n${nested}\n*> END-COPY ${key}\n`;
  }

  /**
   * @param {string} text
   * @param {number} depth
   */
  function expandOnce(text, depth) {
    if (depth > maxDepth) return text;
    let out = String(text || "");
    out = out.replace(/\bCOPY\s+([A-Za-z][A-Za-z0-9-]*)\s*\./gi, (full, rawName) =>
      tryExpandName(rawName, full, depth),
    );
    // G10098 — EXEC SQL INCLUDE is the Db2 precompiler dual of COPY (no runtime).
    out = out.replace(
      /\bEXEC\s+SQL\s+INCLUDE\s+([A-Za-z][A-Za-z0-9-]*)\s+END-EXEC\s*\.?/gi,
      (full, rawName) => tryExpandName(rawName, full, depth),
    );
    return out;
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

/**
 * Inventory CICS CSD DEFINE text (structural only — no region invent).
 * CardDemo CRDDEMO*.csd: PROGRAM / TRANSACTION / MAPSET / LIBRARY / DB2ENTRY / DB2TRAN.
 *
 * @param {string} source
 * @param {string} [file]
 */
export function inventoryCsdSource(source, file = "") {
  const code = String(source || "").replace(/\r\n/g, "\n");
  /** @type {string[]} */
  const programs = [];
  /** @type {string[]} */
  const transactions = [];
  /** @type {string[]} */
  const mapsets = [];
  /** @type {string[]} */
  const libraries = [];
  /** @type {string[]} */
  const db2Entries = [];
  /** @type {string[]} */
  const db2Trans = [];
  /** @type {string[]} */
  const files = [];
  /** @type {string[]} */
  const groups = [];
  /** @type {{ transaction: string, program: string }[]} */
  const transactionPrograms = [];
  /** @type {{ program: string, transid: string }[]} */
  const programTransids = [];

  const defineRe =
    /DEFINE\s+([A-Z0-9]+)\(([^)]+)\)([\s\S]*?)(?=DEFINE\s+[A-Z0-9]+\(|$)/gi;
  let m;
  defineRe.lastIndex = 0;
  while ((m = defineRe.exec(code)) !== null) {
    const kind = String(m[1] || "").toUpperCase();
    const name = String(m[2] || "")
      .trim()
      .toUpperCase();
    const body = String(m[3] || "");
    const groupM = /\bGROUP\s*\(\s*([^)\s]+)\s*\)/i.exec(body);
    if (groupM?.[1]) groups.push(groupM[1].toUpperCase());
    if (!name) continue;
    if (kind === "PROGRAM") {
      programs.push(name);
      const tid = /\bTRANSID\s*\(\s*([^)\s]+)\s*\)/i.exec(body);
      if (tid?.[1]) {
        programTransids.push({
          program: name,
          transid: tid[1].toUpperCase(),
        });
      }
    } else if (kind === "TRANSACTION") {
      transactions.push(name);
      const prog = /\bPROGRAM\s*\(\s*([^)\s]+)\s*\)/i.exec(body);
      if (prog?.[1]) {
        transactionPrograms.push({
          transaction: name,
          program: prog[1].toUpperCase(),
        });
      }
    } else if (kind === "MAPSET") {
      mapsets.push(name);
    } else if (kind === "LIBRARY") {
      libraries.push(name);
    } else if (kind === "DB2ENTRY") {
      db2Entries.push(name);
    } else if (kind === "DB2TRAN") {
      db2Trans.push(name);
    } else if (kind === "FILE") {
      files.push(name);
    }
  }

  return {
    file,
    programs: [...new Set(programs)],
    transactions: [...new Set(transactions)],
    mapsets: [...new Set(mapsets)],
    libraries: [...new Set(libraries)],
    db2Entries: [...new Set(db2Entries)],
    db2Trans: [...new Set(db2Trans)],
    files: [...new Set(files)],
    groups: [...new Set(groups)],
    transactionPrograms,
    programTransids,
    defineCount:
      programs.length +
      transactions.length +
      mapsets.length +
      libraries.length +
      db2Entries.length +
      db2Trans.length +
      files.length,
  };
}

/**
 * Inventory Db2 DCLGEN / DECLARE TABLE copybooks (structural — no Db2 connect).
 *
 * @param {string} source
 * @param {string} [file]
 */
export function inventoryDclgenSource(source, file = "") {
  const code = String(source || "").replace(/\r\n/g, "\n");
  /** @type {string[]} */
  const tables = [];
  /** @type {string[]} */
  const columns = [];
  /** @type {string[]} */
  const cobolGroups = [];
  /** @type {{ table: string, columns: string[] }[]} */
  const tableColumns = [];

  const declRe =
    /DECLARE\s+([A-Z0-9_.]+)\s+TABLE\s*\(([\s\S]*?)\)\s*END-EXEC/gi;
  let m;
  declRe.lastIndex = 0;
  while ((m = declRe.exec(code)) !== null) {
    const table = String(m[1] || "")
      .trim()
      .toUpperCase();
    const body = String(m[2] || "");
    if (table) tables.push(table);
    /** @type {string[]} */
    const cols = [];
    // Split on commas that separate column defs (ignore commas inside DECIMAL(p, s)).
    const parts = [];
    let cur = "";
    let depth = 0;
    for (const ch of body) {
      if (ch === "(") depth += 1;
      else if (ch === ")") depth = Math.max(0, depth - 1);
      if (ch === "," && depth === 0) {
        parts.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    for (const part of parts) {
      const colM =
        /^\s*([A-Z][A-Z0-9_]*)\s+(CHAR|VARCHAR|DECIMAL|SMALLINT|INTEGER|INT|DATE|TIMESTAMP|BIGINT|FLOAT|REAL|DOUBLE|GRAPHIC|VARGRAPHIC|BLOB|CLOB|DBCLOB)\b/i.exec(
          part,
        );
      if (colM?.[1]) {
        const col = colM[1].toUpperCase();
        cols.push(col);
        columns.push(col);
      }
    }
    if (table) tableColumns.push({ table, columns: [...new Set(cols)] });
  }

  const groupRe = /^\s*01\s+([A-Z0-9][A-Z0-9-]*)\s*\./gim;
  groupRe.lastIndex = 0;
  while ((m = groupRe.exec(code)) !== null) {
    if (m[1]) cobolGroups.push(m[1].toUpperCase());
  }

  return {
    file,
    tables: [...new Set(tables)],
    columns: [...new Set(columns)],
    cobolGroups: [...new Set(cobolGroups)],
    tableColumns,
    tableCount: tables.length,
    columnCount: columns.length,
  };
}

/**
 * Crosswalk CSD PROGRAM names ↔ COBOL PROGRAM-ID inventory.
 *
 * @param {string[]} csdPrograms
 * @param {string[]} programIds
 */
export function crosswalkCsdPrograms(csdPrograms, programIds) {
  const idSet = new Set(
    [...(programIds || [])].map((p) => String(p).toUpperCase()),
  );
  const programs = [
    ...new Set([...(csdPrograms || [])].map((p) => String(p).toUpperCase())),
  ];
  return {
    csdProgramMatched: programs.filter((p) => idSet.has(p)).sort(),
    csdProgramHole: programs.filter((p) => !idSet.has(p)).sort(),
  };
}

/**
 * Crosswalk CSD MAPSET names ↔ BMS DFHMSD labels.
 *
 * @param {string[]} csdMapsets
 * @param {string[]} bmsMapsets
 */
export function crosswalkCsdMapsets(csdMapsets, bmsMapsets) {
  const bmsSet = new Set(
    [...(bmsMapsets || [])].map((m) => String(m).toUpperCase()),
  );
  const mapsets = [
    ...new Set([...(csdMapsets || [])].map((m) => String(m).toUpperCase())),
  ];
  return {
    csdMapsetMatched: mapsets.filter((m) => bmsSet.has(m)).sort(),
    csdMapsetHole: mapsets.filter((m) => !bmsSet.has(m)).sort(),
  };
}

