import { AsyncLocalStorage } from "node:async_hooks";
import type { MiddlewareHandler } from "hono";
import { DatabaseSync } from "node:sqlite";

/**
 * Recorded SELECT results from the Oracle (verify / Milestone 2). When the
 * `x-chrysalis-sql-tape` header is present, `queryOne` / `queryAll` serve
 * from the tape in order instead of SQLite.
 */
export interface SqlReplayTape {
  readonly queries: ReadonlyArray<{
    readonly sql: string;
    readonly params: ReadonlyArray<unknown>;
    readonly rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  }>;
}

interface SqlReplaySlot {
  tape: SqlReplayTape;
  index: number;
}

const sqlReplayAls = new AsyncLocalStorage<SqlReplaySlot | undefined>();

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function paramsMatch(a: ReadonlyArray<unknown>, b: ReadonlyArray<unknown>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
  }
  return true;
}

/** Per-request middleware: decode tape from `x-chrysalis-sql-tape` (base64url). */
export const sqlTapeMiddleware: MiddlewareHandler = async (c, next) => {
  const raw = c.req.header("x-chrysalis-sql-tape");
  if (!raw) {
    return sqlReplayAls.run(undefined, () => next());
  }
  let tape: SqlReplayTape;
  try {
    tape = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SqlReplayTape;
  } catch {
    return sqlReplayAls.run(undefined, () => next());
  }
  return sqlReplayAls.run({ tape, index: 0 }, () => next());
};

function tryReplaySelect(
  sql: string,
  params: ReadonlyArray<unknown>,
): ReadonlyArray<Readonly<Record<string, unknown>>> | null {
  const slot = sqlReplayAls.getStore();
  if (!slot) return null;
  const q = slot.tape.queries[slot.index];
  if (!q) {
    throw new Error(
      `chrysalis sql replay: exhausted tape at index ${slot.index} (sql=${sql.slice(0, 80)})`,
    );
  }
  if (normalizeSql(q.sql) !== normalizeSql(sql)) {
    throw new Error(
      `chrysalis sql replay: SQL mismatch at tape ${slot.index}: expected ${q.sql.slice(0, 120)}, got ${sql.slice(0, 120)}`,
    );
  }
  if (!paramsMatch(q.params, params)) {
    throw new Error(`chrysalis sql replay: param mismatch at tape ${slot.index}`);
  }
  slot.index += 1;
  return q.rows;
}

let _db: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (_db === null) {
    const path = process.env.CHRYSALIS_DB_PATH ?? "blog.sqlite";
    _db = new DatabaseSync(path);
  }
  return _db;
}

export function queryAll<T = Record<string, unknown>>(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): T[] {
  const replayed = tryReplaySelect(sql, params);
  if (replayed != null) {
    return [...replayed] as T[];
  }
  return db().prepare(sql).all(...(params as never[])) as T[];
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): T | null {
  const replayed = tryReplaySelect(sql, params);
  if (replayed != null) {
    const row = replayed[0];
    return (row as T | undefined) ?? null;
  }
  const row = db().prepare(sql).get(...(params as never[]));
  return (row as T | undefined) ?? null;
}

export function execSql(sql: string, params: ReadonlyArray<unknown> = []): number {
  const info = db().prepare(sql).run(...(params as never[]));
  return Number(info.lastInsertRowid);
}
