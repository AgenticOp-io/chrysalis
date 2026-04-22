/**
 * Minimal SQL DDL parser for `CREATE TABLE` statements.
 *
 * Scope (Milestone 1):
 *   - SQLite's `CREATE TABLE [IF NOT EXISTS] name ( col type [constraints], ... )`
 *   - Column types: INTEGER, TEXT, REAL, BLOB, NUMERIC, and MySQL-ish aliases
 *     (INT, VARCHAR(n), DATETIME, TIMESTAMP, BOOLEAN, DATE, ENUM('a','b')).
 *   - Per-column constraints we notice: NOT NULL, UNIQUE, PRIMARY KEY, DEFAULT,
 *     REFERENCES <table>(<col>), CHECK (status IN ('a','b','c')).
 *   - Anything else in the column body is preserved as `rawConstraints` so
 *     downstream consumers can render a warning if they care.
 *
 * Out of scope (tracked as follow-ups):
 *   - Table-level constraints (composite PRIMARY KEY, FOREIGN KEY, CHECK).
 *   - Generated/virtual columns.
 *   - COLLATE, COMMENT (MySQL), GENERATED AS, STORED.
 *
 * This parser is intentionally conservative: on unfamiliar syntax it records
 * an `unknownColumn` entry rather than guessing. The archaeology report will
 * surface those so you can file a parser upgrade with a real repro.
 */

export type SqlPrimitive =
  | { kind: "int" }
  | { kind: "float" }
  | { kind: "bool" }
  | { kind: "string"; maxLen?: number }
  | { kind: "blob" }
  | { kind: "timestamp" }
  | { kind: "date" }
  | { kind: "enum"; values: ReadonlyArray<string> }
  | { kind: "unknown"; raw: string };

export interface ColumnSchema {
  readonly name: string;
  readonly type: SqlPrimitive;
  readonly notNull: boolean;
  readonly primaryKey: boolean;
  readonly unique: boolean;
  readonly autoIncrement: boolean;
  readonly defaultValue: string | null;
  readonly references: { table: string; column: string } | null;
  readonly checkIn: ReadonlyArray<string> | null;
  readonly rawConstraints: string;
  readonly source: { file: string; line: number };
}

export interface TableSchema {
  readonly name: string;
  readonly columns: ReadonlyArray<ColumnSchema>;
  readonly source: { file: string; line: number };
}

export interface ParsedSchema {
  readonly tables: ReadonlyArray<TableSchema>;
  readonly unknownColumns: ReadonlyArray<{
    table: string;
    raw: string;
    source: { file: string; line: number };
  }>;
}

/**
 * Parse a DDL string into a structured schema. `file` is recorded in every
 * source locator so downstream reports can link back to exact lines.
 */
export function parseSchema(ddl: string, file = "<inline>"): ParsedSchema {
  const stripped = stripComments(ddl);
  const tables: TableSchema[] = [];
  const unknownColumns: Array<{ table: string; raw: string; source: { file: string; line: number } }> = [];

  const reTable = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s*\(([\s\S]*?)\)\s*;/gi;
  let m: RegExpExecArray | null;
  while ((m = reTable.exec(stripped)) !== null) {
    const name = m[1]!;
    const body = m[2]!;
    const tableLine = lineOf(stripped, m.index);
    const cols: ColumnSchema[] = [];
    for (const rawEntry of splitTopLevel(body)) {
      const trimmed = rawEntry.trim();
      if (!trimmed) continue;
      // Skip table-level constraints (PRIMARY KEY (..), FOREIGN KEY (..), UNIQUE (..), CHECK (..))
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)\b/i.test(trimmed)) continue;
      const parsed = parseColumn(trimmed, file, tableLine);
      if (parsed) cols.push(parsed);
      else unknownColumns.push({ table: name, raw: trimmed, source: { file, line: tableLine } });
    }
    tables.push({ name, columns: cols, source: { file, line: tableLine } });
  }

  return { tables, unknownColumns };
}

function parseColumn(
  entry: string,
  file: string,
  tableLine: number,
): ColumnSchema | null {
  // Column name: identifier, possibly quoted.
  const idMatch = entry.match(/^["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s+(.*)$/s);
  if (!idMatch) return null;
  const name = idMatch[1]!;
  const rest = idMatch[2]!.trim();

  // Extract the type spec (may include parenthesized args like VARCHAR(255)).
  const typeMatch = rest.match(/^([A-Za-z][A-Za-z0-9_]*)\s*(\([^)]*\))?\s*(.*)$/s);
  if (!typeMatch) return null;
  const typeName = typeMatch[1]!.toUpperCase();
  const typeArgs = typeMatch[2]?.trim() ?? "";
  const constraints = typeMatch[3]!.trim();

  const type = normalizeType(typeName, typeArgs, constraints);

  return {
    name,
    type,
    notNull: /\bNOT\s+NULL\b/i.test(constraints) || /\bPRIMARY\s+KEY\b/i.test(constraints),
    primaryKey: /\bPRIMARY\s+KEY\b/i.test(constraints),
    unique: /\bUNIQUE\b/i.test(constraints),
    autoIncrement: /\bAUTOINCREMENT\b|\bAUTO_INCREMENT\b/i.test(constraints),
    defaultValue: extractDefault(constraints),
    references: extractReferences(constraints),
    checkIn: extractCheckIn(constraints),
    rawConstraints: constraints,
    source: { file, line: tableLine },
  };
}

function normalizeType(typeName: string, typeArgs: string, constraints: string): SqlPrimitive {
  const t = typeName.toUpperCase();
  if (t === "ENUM" && typeArgs) {
    const vals = [...typeArgs.matchAll(/'([^']*)'/g)].map((mm) => mm[1]!);
    return { kind: "enum", values: vals };
  }
  // CHECK (col IN (...)) implies enum-ish, but only when no enum type. We let
  // merge handle that elevation since it might also come from trace data.
  if (t === "INTEGER" || t === "INT" || t === "BIGINT" || t === "SMALLINT" || t === "TINYINT") {
    return { kind: "int" };
  }
  if (t === "REAL" || t === "FLOAT" || t === "DOUBLE" || t === "DECIMAL" || t === "NUMERIC") {
    return { kind: "float" };
  }
  if (t === "BOOLEAN" || t === "BOOL") return { kind: "bool" };
  if (t === "BLOB" || t === "BINARY" || t === "VARBINARY") return { kind: "blob" };
  if (t === "DATE") return { kind: "date" };
  if (t === "DATETIME" || t === "TIMESTAMP") return { kind: "timestamp" };
  if (t === "TEXT" || t === "VARCHAR" || t === "CHAR" || t === "STRING" || t === "CLOB") {
    // CHECK (col IN (...)) promotes a TEXT column to a string-enum.
    const checkVals = extractCheckIn(constraints);
    if (checkVals && checkVals.length > 0) {
      return { kind: "enum", values: checkVals };
    }
    const n = typeArgs.match(/\(\s*(\d+)\s*\)/);
    return { kind: "string", ...(n ? { maxLen: Number.parseInt(n[1]!, 10) } : {}) };
  }
  const vals = extractCheckIn(constraints);
  if (vals) return { kind: "enum", values: vals };
  return { kind: "unknown", raw: `${typeName}${typeArgs}` };
}

function extractDefault(constraints: string): string | null {
  const m = constraints.match(/\bDEFAULT\s+('(?:[^']|'')*'|[A-Za-z_][A-Za-z0-9_]*(?:\([^)]*\))?|-?\d+(?:\.\d+)?)/i);
  return m ? m[1]!.trim() : null;
}

function extractReferences(constraints: string): { table: string; column: string } | null {
  const m = constraints.match(/\bREFERENCES\s+["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s*\(\s*["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s*\)/i);
  if (!m) return null;
  return { table: m[1]!, column: m[2]! };
}

function extractCheckIn(constraints: string): ReadonlyArray<string> | null {
  const m = constraints.match(/\bCHECK\s*\(\s*["`]?[A-Za-z_][A-Za-z0-9_]*["`]?\s+IN\s*\(([^)]*)\)\s*\)/i);
  if (!m) return null;
  return [...m[1]!.matchAll(/'([^']*)'/g)].map((mm) => mm[1]!);
}

function stripComments(s: string): string {
  // Remove `-- ...\n` single-line comments and `/* ... */` blocks.
  return s
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function splitTopLevel(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inString = false;
  let quote = "";
  let buf = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (inString) {
      buf += c;
      if (c === quote) inString = false;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      inString = true;
      quote = c;
      buf += c;
      continue;
    }
    if (c === "(") depth += 1;
    if (c === ")") depth -= 1;
    if (c === "," && depth === 0) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function lineOf(s: string, idx: number): number {
  let line = 1;
  for (let i = 0; i < idx && i < s.length; i++) {
    if (s[i] === "\n") line += 1;
  }
  return line;
}
