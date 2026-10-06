/**
 * Named tables and bound row operations (tip 1.0.74).
 * CWL names the table, the columns, and the comparison.
 * Request values stay parameters. This module does not accept a SQL string.
 */

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Engines the host can run. The statements stay the same. The dialect changes. */
export const CWL_DB_ENGINES = Object.freeze([
  "sqlite",
  "postgres",
  "mysql",
  "mariadb",
  "sqlserver",
  "oracle",
]);

/** Package the host loads for each engine. SQLite is built into Node. */
export const CWL_DB_DRIVER = Object.freeze({
  sqlite: "node:sqlite",
  postgres: "pg",
  mysql: "mysql2",
  mariadb: "mysql2",
  sqlserver: "mssql",
  oracle: "oracledb",
});
const TABLE_RE = /^table\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/;
const COLUMN_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s+(text|int|real|bool)(\s+key)?\s*;$/;
const HOLE_RE = /^hole\s+([A-Za-z0-9_:.-]+)\s*;$/;

/**
 * @param {string} expr
 * @param {string} op
 */
function splitTop(expr, op) {
  /** @type {string[]} */
  const parts = [];
  let buf = "";
  let quote = "";
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i];
    if (quote) {
      buf += ch;
      if (ch === quote && expr[i - 1] !== "\\") quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (expr.startsWith(op, i)) {
      parts.push(buf);
      buf = "";
      i += op.length - 1;
      continue;
    }
    buf += ch;
  }
  parts.push(buf);
  return parts;
}

/**
 * @param {string} source
 * @param {string} word
 */
function findKeyword(source, word) {
  let quote = "";
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === quote && source[i - 1] !== "\\") quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (!source.startsWith(word, i)) continue;
    const before = i === 0 ? " " : source[i - 1];
    const after = source[i + word.length] ?? " ";
    if (/[\s]/.test(before) && /[\s]/.test(after)) return i;
  }
  return -1;
}

/**
 * @param {string} token
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 */
function parseValue(token, bindings) {
  const name = token.trim();
  if (name === "null") return { kind: "literal", value: null };
  if (name === "true") return { kind: "literal", value: true };
  if (name === "false") return { kind: "literal", value: false };
  if (
    (name.startsWith('"') && name.endsWith('"') && name.length >= 2) ||
    (name.startsWith("'") && name.endsWith("'") && name.length >= 2)
  ) {
    return { kind: "literal", value: name.slice(1, -1) };
  }
  if (/^-?\d+$/.test(name)) return { kind: "literal", value: Number(name) };
  if (IDENT.test(name)) {
    if (bindings.path.includes(name)) return { kind: "binding", source: "path", name };
    if (bindings.query.includes(name)) return { kind: "binding", source: "query", name };
    if (bindings.body.includes(name)) return { kind: "binding", source: "body", name };
    return { error: "cwl:db-unbound-value" };
  }
  const dot = name.split(".");
  if (dot.length === 2 && IDENT.test(dot[0]) && IDENT.test(dot[1])) {
    return { kind: "row", collection: dot[0], field: dot[1] };
  }
  return { error: "cwl:db-unbound-value" };
}

/**
 * @param {string} source
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 */
function parseWhere(source, bindings) {
  const text = source.trim();
  if (!text) return { error: "cwl:db-where-required" };
  if (/[()[\]]/.test(text)) return { error: "cwl:db-where" };
  const hasAnd = splitTop(text, "&&").length > 1;
  const hasOr = splitTop(text, "||").length > 1;
  if (hasAnd && hasOr) return { error: "cwl:db-where" };
  const join = hasOr ? "||" : hasAnd ? "&&" : null;
  const pieces = splitTop(text, join ?? "&&").map((part) => part.trim());
  /** @type {object[]} */
  const parts = [];
  for (const piece of pieces) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=)\s*(.+)$/.exec(piece);
    if (!m) return { error: "cwl:db-where" };
    const value = parseValue(m[3], bindings);
    if (value.error) return value;
    parts.push({ column: m[1], cmp: m[2], value });
  }
  return { parts, join };
}

/**
 * @param {string} source
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 */
function parseFields(source, bindings) {
  const body = source.trim().replace(/^\{/, "").replace(/\}$/, "").trim();
  if (!body) return { error: "cwl:db-empty-write" };
  /** @type {string[]} */
  const pieces = [];
  let buf = "";
  let quote = "";
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) {
      buf += ch;
      if (ch === quote && body[i - 1] !== "\\") quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === ",") {
      pieces.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) pieces.push(buf);
  /** @type {object[]} */
  const fields = [];
  for (const piece of pieces) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(piece.trim());
    if (!m) return { error: "cwl:db-statement" };
    const value = parseValue(m[2], bindings);
    if (value.error) return value;
    if (value.kind === "row") return { error: "cwl:db-unbound-value" };
    fields.push({ column: m[1], value });
  }
  if (fields.length === 0) return { error: "cwl:db-empty-write" };
  return { fields };
}

/**
 * @param {string[]} lines
 * @param {number} startIdx
 */
export function parseCwlTableBlock(lines, startIdx) {
  const header = TABLE_RE.exec(lines[startIdx].trim());
  if (!header) return { ok: false, consumed: startIdx + 1, reason: "cwl:db-table" };
  /** @type {{ name: string, type: string, key: boolean }[]} */
  const columns = [];
  /** @type {string[]} */
  const holes = [];
  let i = startIdx + 1;
  let closed = false;
  while (i < lines.length) {
    const inner = lines[i].trim();
    i += 1;
    if (inner === "}") {
      closed = true;
      break;
    }
    if (!inner || inner.startsWith("#") || inner.startsWith("//")) continue;
    const hole = HOLE_RE.exec(inner);
    if (hole) {
      holes.push(hole[1]);
      continue;
    }
    const col = COLUMN_RE.exec(inner);
    if (!col) {
      holes.push("cwl:db-column");
      continue;
    }
    columns.push({ name: col[1], type: col[2], key: Boolean(col[3]) });
  }
  if (!closed) holes.push("cwl:db-table");
  const keys = columns.filter((col) => col.key);
  if (keys.length > 1) {
    holes.push("cwl:db-extra-key");
    let seen = false;
    for (const col of columns) {
      if (!col.key) continue;
      if (seen) col.key = false;
      seen = true;
    }
  }
  if (columns.length === 0) holes.push("cwl:db-empty-table");
  return {
    ok: columns.length > 0,
    consumed: i,
    table: { name: header[1], columns, holes },
  };
}

/**
 * @param {string} line
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 * @returns {{ ok: true, op: object } | { ok: false, reason: string } | null}
 */
export function parseCwlDbStatement(line, bindings) {
  const text = line.trim();
  if (!/^db\s+/.test(text)) return null;
  const m = /^db\s+(select|insert|update|delete)\s+([\s\S]+);$/.exec(text);
  if (!m) return { ok: false, reason: "cwl:db-statement" };
  const kind = m[1];
  const rest = m[2].trim();
  if (kind === "select") return parseSelect(rest, bindings);
  if (kind === "insert") return parseInsert(rest, bindings);
  if (kind === "update") return parseUpdate(rest, bindings);
  return parseDelete(rest, bindings);
}

/**
 * @param {string} rest
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 */
function parseSelect(rest, bindings) {
  let one = false;
  let source = rest;
  if (source.startsWith("one ")) {
    one = true;
    source = source.slice(4).trim();
  }
  const intoAt = findKeyword(source, "into");
  const asAt = findKeyword(source, "as");
  /** @type {{ collection: string, field: string } | null} */
  let into = null;
  /** @type {string | null} */
  let as = null;
  let head = source;
  if (intoAt >= 0) {
    head = source.slice(0, intoAt).trim();
    const target = source.slice(intoAt + 4).trim();
    const found = /^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(target);
    if (!found) return { ok: false, reason: "cwl:db-statement" };
    into = { collection: found[1], field: found[2] };
  } else if (asAt >= 0) {
    head = source.slice(0, asAt).trim();
    const target = source.slice(asAt + 2).trim();
    if (!IDENT.test(target)) return { ok: false, reason: "cwl:db-statement" };
    as = target;
  } else return { ok: false, reason: "cwl:db-statement" };
  if (one && into) return { ok: false, reason: "cwl:db-statement" };
  let whereSrc = null;
  const whereAt = findKeyword(head, "where");
  let subject = head;
  if (whereAt >= 0) {
    subject = head.slice(0, whereAt).trim();
    whereSrc = head.slice(whereAt + 5).trim();
  }
  const sub = /^([A-Za-z_][A-Za-z0-9_]*)(?:\.([A-Za-z_][A-Za-z0-9_]*))?$/.exec(subject);
  if (!sub) return { ok: false, reason: "cwl:db-statement" };
  const where = whereSrc == null ? { parts: [], join: null } : parseWhere(whereSrc, bindings);
  if (where.error) return { ok: false, reason: where.error };
  return {
    ok: true,
    op: {
      op: "select",
      one,
      table: sub[1],
      column: sub[2] ?? null,
      where: where.parts,
      join: where.join,
      as,
      into,
      fields: [],
    },
  };
}

/**
 * @param {string} rest
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 */
function parseInsert(rest, bindings) {
  const brace = rest.indexOf("{");
  if (brace < 0) return { ok: false, reason: "cwl:db-statement" };
  const table = rest.slice(0, brace).trim();
  if (!IDENT.test(table)) return { ok: false, reason: "cwl:db-statement" };
  const fields = parseFields(rest.slice(brace), bindings);
  if (fields.error) return { ok: false, reason: fields.error };
  return {
    ok: true,
    op: {
      op: "insert",
      one: false,
      table,
      column: null,
      where: [],
      join: null,
      as: null,
      into: null,
      fields: fields.fields,
    },
  };
}

/**
 * @param {string} rest
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 */
function parseUpdate(rest, bindings) {
  const brace = rest.indexOf("{");
  if (brace < 0) return { ok: false, reason: "cwl:db-statement" };
  const head = rest.slice(0, brace).trim();
  const named = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+where\s+([\s\S]+))?$/.exec(head);
  if (!named) return { ok: false, reason: "cwl:db-statement" };
  if (!named[2] || !named[2].trim()) return { ok: false, reason: "cwl:db-where-required" };
  const where = parseWhere(named[2], bindings);
  if (where.error) return { ok: false, reason: where.error };
  const fields = parseFields(rest.slice(brace), bindings);
  if (fields.error) return { ok: false, reason: fields.error };
  return {
    ok: true,
    op: {
      op: "update",
      one: false,
      table: named[1],
      column: null,
      where: where.parts,
      join: where.join,
      as: null,
      into: null,
      fields: fields.fields,
    },
  };
}

/**
 * @param {string} rest
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 */
function parseDelete(rest, bindings) {
  const named = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+where\s+([\s\S]+))?$/.exec(rest.trim());
  if (!named) return { ok: false, reason: "cwl:db-statement" };
  if (!named[2] || !named[2].trim()) return { ok: false, reason: "cwl:db-where-required" };
  const where = parseWhere(named[2], bindings);
  if (where.error) return { ok: false, reason: where.error };
  return {
    ok: true,
    op: {
      op: "delete",
      one: false,
      table: named[1],
      column: null,
      where: where.parts,
      join: where.join,
      as: null,
      into: null,
      fields: [],
    },
  };
}

/**
 * @param {object} value
 */
function printValue(value) {
  if (value.kind === "literal") {
    if (typeof value.value === "string") return JSON.stringify(value.value);
    if (value.value == null) return "null";
    return String(value.value);
  }
  if (value.kind === "binding") return value.name;
  return `${value.collection}.${value.field}`;
}

/**
 * @param {object} op
 */
function printWhere(op) {
  if (!op.where?.length) return "";
  const join = op.join === "||" ? " || " : " && ";
  const text = op.where.map((part) => `${part.column} ${part.cmp} ${printValue(part.value)}`).join(join);
  return ` where ${text}`;
}

/**
 * @param {object} op
 */
function printFields(op) {
  const body = op.fields.map((field) => `${field.column}: ${printValue(field.value)}`).join(", ");
  return `{ ${body} }`;
}

/**
 * @param {object} table
 */
export function printCwlTable(table) {
  const lines = [`table ${table.name} {`];
  for (const col of table.columns ?? []) {
    lines.push(`  ${col.name} ${col.type}${col.key ? " key" : ""};`);
  }
  for (const hole of table.holes ?? []) lines.push(`  hole ${hole};`);
  lines.push("}");
  return lines;
}

/**
 * @param {object} op
 */
export function printCwlDbStatement(op) {
  if (op.op === "select") {
    const one = op.one ? "one " : "";
    const subject = op.column ? `${op.table}.${op.column}` : op.table;
    const target = op.into ? ` into ${op.into.collection}.${op.into.field}` : ` as ${op.as}`;
    return `db select ${one}${subject}${printWhere(op)}${target};`;
  }
  if (op.op === "insert") return `db insert ${op.table} ${printFields(op)};`;
  if (op.op === "update") return `db update ${op.table}${printWhere(op)} ${printFields(op)};`;
  return `db delete ${op.table}${printWhere(op)};`;
}

/**
 * @param {object} op
 */
export function printCwlDbTarget(op) {
  if (op.op === "select" && op.into) return `into ${op.into.collection}.${op.into.field}`;
  if (op.op === "select" && op.one) return `one as ${op.as}`;
  if (op.op === "select") return `as ${op.as}`;
  if (op.op === "insert") return printFields(op);
  if (op.op === "update") return `${printWhere(op).trim()} ${printFields(op)}`.trim();
  return printWhere(op).trim();
}

/**
 * Drop operations the declared tables cannot run. The reason stays a hole.
 * @param {{ tables?: object[], routes?: object[] }} mod
 */
export function finalizeCwlDbModule(mod) {
  /** @type {Map<string, { name: string, columns: { name: string, type: string, key: boolean }[] }>} */
  const tables = new Map((mod.tables ?? []).map((table) => [table.name, table]));
  for (const route of mod.routes ?? []) {
    const bindings = {
      path: route.handlerPathParams ?? [],
      query: route.handlerQueryParams ?? [],
      body: route.handlerBodyParams ?? [],
    };
    /** @type {object[]} */
    const kept = [];
    for (const op of route.dbOps ?? []) {
      const reason = validateOp(op, tables, bindings, kept);
      if (reason) {
        route.attachmentHoles = Array.isArray(route.attachmentHoles) ? route.attachmentHoles : [];
        route.attachmentHoleLines = Array.isArray(route.attachmentHoleLines) ? route.attachmentHoleLines : [];
        route.attachmentHoleCharacters = Array.isArray(route.attachmentHoleCharacters) ? route.attachmentHoleCharacters : [];
        route.attachmentHoleEndCharacters = Array.isArray(route.attachmentHoleEndCharacters)
          ? route.attachmentHoleEndCharacters
          : [];
        if (!route.attachmentHoles.includes(reason)) {
          route.attachmentHoles.push(reason);
          route.attachmentHoleLines.push(route.line ?? 1);
          route.attachmentHoleCharacters.push(0);
          route.attachmentHoleEndCharacters.push(4);
        }
        continue;
      }
      kept.push(op);
    }
    route.dbOps = kept;
  }
}

/**
 * @param {object} op
 * @param {Map<string, { columns: { name: string, type: string }[] }>} tables
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 * @param {object[]} earlier
 */
function validateOp(op, tables, bindings, earlier) {
  const table = tables.get(op.table);
  if (!table) return "cwl:unknown-db-table";
  const names = new Set(table.columns.map((col) => col.name));
  if (op.column && !names.has(op.column)) return "cwl:unknown-db-column";
  for (const part of op.where ?? []) {
    if (!names.has(part.column)) return "cwl:unknown-db-column";
    const valueReason = validateValue(part.value, bindings, op, tables, earlier);
    if (valueReason) return valueReason;
  }
  for (const field of op.fields ?? []) {
    if (!names.has(field.column)) return "cwl:unknown-db-column";
    const valueReason = validateValue(field.value, bindings, op, tables, earlier);
    if (valueReason) return valueReason;
  }
  if ((op.op === "update" || op.op === "delete") && !(op.where?.length > 0)) return "cwl:db-where-required";
  return null;
}

/**
 * @param {object} value
 * @param {{ path: string[], query: string[], body: string[] }} bindings
 * @param {object} op
 * @param {Map<string, { columns: { name: string }[] }>} tables
 * @param {object[]} earlier
 */
function validateValue(value, bindings, op, tables, earlier) {
  if (value.kind === "literal") return null;
  if (value.kind === "binding") {
    const bag = bindings[value.source] ?? [];
    if (!bag.includes(value.name)) return "cwl:db-unbound-value";
    return null;
  }
  if (value.kind !== "row") return "cwl:db-unbound-value";
  if (!op.into || op.into.collection !== value.collection) return "cwl:db-into-parent";
  const parent = earlier.find((item) => item.op === "select" && item.as === value.collection && !item.one && !item.column);
  if (!parent) return "cwl:db-into-parent";
  const parentTable = tables.get(parent.table);
  if (!parentTable?.columns.some((col) => col.name === value.field)) return "cwl:unknown-db-column";
  return null;
}
