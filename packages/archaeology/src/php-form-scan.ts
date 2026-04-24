/**
 * Heuristic extraction of HTML form control names from PHP sources (inline
 * strings, echoes, comments). Milestone 1 archaeology v2 — complements DDL +
 * trace shapes when templates live in PHP files.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ParsedSchema } from "./parse-schema.js";

/**
 * Column names we never resolve via global-unique-only heuristic (many tables
 * share them, or they are too generic). File-local SQL refs still disambiguate.
 */
const GLOBAL_UNIQUE_BLOCKLIST = new Set([
  "id",
  "created_at",
  "updated_at",
  "body",
  "status",
  "password",
  "email",
]);

export interface FormControlHit {
  readonly name: string;
  readonly phpFile: string;
  readonly line: number;
  readonly tag: "input" | "select" | "textarea";
  /** Lowercased `type` attribute when tag is `input`. */
  readonly inputType: string | null;
}

export interface UnattributedFormField {
  readonly name: string;
  readonly phpFile: string;
  readonly line: number;
  readonly reason: string;
}

export interface FormEvidenceAttribution {
  readonly table: string;
  readonly column: string;
  readonly provenanceDetail: string;
}

function listPhpFilesRecursive(rootAbs: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.endsWith(".php")) out.push(p);
    }
  };
  walk(rootAbs);
  return out;
}

/**
 * SQL table identifiers mentioned in PHP source (INSERT/UPDATE/FROM/JOIN).
 * Lowercased, order not preserved, duplicates removed.
 */
export function extractSqlTableRefsFromPhp(source: string): string[] {
  const found = new Set<string>();
  const patterns: RegExp[] = [
    /\bINSERT\s+INTO\s+`?(\w+)`?/gi,
    /\bUPDATE\s+`?(\w+)`?/gi,
    /\bDELETE\s+FROM\s+`?(\w+)`?/gi,
    /\bFROM\s+`?(\w+)`?/gi,
    /\bJOIN\s+`?(\w+)`?/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      const t = m[1]!.toLowerCase();
      if (t.length > 0 && !RESERVED_SQL.has(t)) found.add(t);
    }
  }
  return [...found];
}

/** Tables targeted by INSERT / UPDATE in source (lowercased). */
export function extractWriteTableRefsFromPhp(source: string): string[] {
  const found = new Set<string>();
  const patterns = [/\bINSERT\s+INTO\s+`?(\w+)`?/gi, /\bUPDATE\s+`?(\w+)`?/gi];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      const t = m[1]!.toLowerCase();
      if (t.length > 0 && !RESERVED_SQL.has(t)) found.add(t);
    }
  }
  return [...found];
}

const RESERVED_SQL = new Set(
  [
    "select",
    "where",
    "group",
    "order",
    "having",
    "limit",
    "offset",
    "inner",
    "left",
    "right",
    "outer",
    "cross",
    "natural",
    "join",
    "on",
    "and",
    "or",
    "not",
    "null",
    "true",
    "false",
    "dual",
    "values",
  ].map((s) => s.toLowerCase()),
);

const CONTROL_RE =
  /<(input|select|textarea)\b([^>]{0,4000}?)>/gis;

const NAME_ATTR_RE = /\bname\s*=\s*(["'])((?:(?!\1).)*?)\1/i;
const NAME_ATTR_UNQUOTED = /\bname\s*=\s*([^\s/>]+)/i;
const TYPE_ATTR_RE = /\btype\s*=\s*(["'])((?:(?!\1).)*?)\1/i;

export function extractFormControlHits(phpSource: string, phpFile: string): FormControlHit[] {
  const hits: FormControlHit[] = [];
  CONTROL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CONTROL_RE.exec(phpSource)) !== null) {
    const tag = m[1]!.toLowerCase() as FormControlHit["tag"];
    const attrBlob = m[2] ?? "";
    const nameMatch = NAME_ATTR_RE.exec(attrBlob) ?? NAME_ATTR_UNQUOTED.exec(attrBlob);
    if (!nameMatch) continue;
    const name = (nameMatch[2] ?? nameMatch[1])!.trim();
    if (!name || name.length > 256) continue;
    const line = 1 + countNewlines(phpSource.slice(0, m.index));
    let inputType: string | null = null;
    if (tag === "input") {
      const tm = TYPE_ATTR_RE.exec(attrBlob);
      if (tm) inputType = tm[2]!.toLowerCase();
    }
    hits.push({ name, phpFile, line, tag, inputType });
  }
  return hits;
}

function countNewlines(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === "\n") n += 1;
  return n;
}

export function scanPhpTreeForFormControls(phpRoots: readonly string[]): FormControlHit[] {
  const all: FormControlHit[] = [];
  const seen = new Set<string>();
  for (const root of phpRoots) {
    const abs = resolve(root);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    for (const file of listPhpFilesRecursive(abs)) {
      let src: string;
      try {
        src = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const rel = file;
      for (const h of extractFormControlHits(src, rel)) {
        const key = `${h.phpFile}:${h.line}:${h.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(h);
      }
    }
  }
  return all;
}

function ddlColumnsByTable(ddl: ParsedSchema): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const t of ddl.tables) {
    const set = new Set<string>();
    for (const c of t.columns) set.add(c.name.toLowerCase());
    m.set(t.name.toLowerCase(), set);
  }
  return m;
}

/** Map column name -> tables that declare it (lowercase names). */
function columnToTables(ddl: ParsedSchema): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const t of ddl.tables) {
    const tl = t.name.toLowerCase();
    for (const c of t.columns) {
      const cl = c.name.toLowerCase();
      const arr = m.get(cl) ?? [];
      arr.push(tl);
      m.set(cl, arr);
    }
  }
  return m;
}

function pickTableForField(
  fieldLower: string,
  src: string,
  colToTables: Map<string, string[]>,
): string | null {
  const candidates = colToTables.get(fieldLower) ?? [];
  if (candidates.length === 0) return null;

  const writeTables = new Set(extractWriteTableRefsFromPhp(src));
  const writePick = candidates.filter((t) => writeTables.has(t));
  if (writePick.length === 1) return writePick[0]!;

  const tablesInFile = new Set(extractSqlTableRefsFromPhp(src));
  const inFile = candidates.filter((t) => tablesInFile.has(t));
  if (inFile.length === 1) return inFile[0]!;
  if (inFile.length > 1) return null;

  if (GLOBAL_UNIQUE_BLOCKLIST.has(fieldLower)) return null;
  if (candidates.length === 1) return candidates[0]!;

  return null;
}

export function collectFormFieldEvidence(
  ddl: ParsedSchema,
  phpRoots: readonly string[],
): { readonly attributed: ReadonlyArray<FormEvidenceAttribution>; readonly unattributed: ReadonlyArray<UnattributedFormField> } {
  if (phpRoots.length === 0) {
    return { attributed: [], unattributed: [] };
  }

  const hits = scanPhpTreeForFormControls(phpRoots);
  const colToTables = columnToTables(ddl);
  const tablesBySchema = ddlColumnsByTable(ddl);

  const attributed: FormEvidenceAttribution[] = [];
  const unattributed: UnattributedFormField[] = [];

  const files = new Map<string, string>();
  for (const h of hits) {
    if (!files.has(h.phpFile)) {
      try {
        files.set(h.phpFile, readFileSync(h.phpFile, "utf8"));
      } catch {
        files.set(h.phpFile, "");
      }
    }
  }

  for (const h of hits) {
    const fieldLower = h.name.toLowerCase();
    const src = files.get(h.phpFile) ?? "";
    const table = pickTableForField(fieldLower, src, colToTables);
    if (!table) {
      const reason =
        (colToTables.get(fieldLower) ?? []).length === 0
          ? "no DDL column with this name"
          : "ambiguous table (multiple candidates in schema or file context)";
      unattributed.push({ name: h.name, phpFile: h.phpFile, line: h.line, reason });
      continue;
    }

    const cols = tablesBySchema.get(table);
    if (!cols?.has(fieldLower)) {
      unattributed.push({
        name: h.name,
        phpFile: h.phpFile,
        line: h.line,
        reason: "internal: resolved table missing column",
      });
      continue;
    }

    const typeHint =
      h.tag === "input" && h.inputType
        ? `; input type=${JSON.stringify(h.inputType)}`
        : "";
    attributed.push({
      table,
      column: fieldLower,
      provenanceDetail: `${h.phpFile}:${h.line} <${h.tag} name=${JSON.stringify(h.name)}>${typeHint}`,
    });
  }

  return { attributed, unattributed };
}
