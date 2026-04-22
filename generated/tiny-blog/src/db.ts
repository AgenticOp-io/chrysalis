import { DatabaseSync } from "node:sqlite";

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
  return db().prepare(sql).all(...(params as never[])) as T[];
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): T | null {
  const row = db().prepare(sql).get(...(params as never[]));
  return (row as T | undefined) ?? null;
}

export function execSql(sql: string, params: ReadonlyArray<unknown> = []): number {
  const info = db().prepare(sql).run(...(params as never[]));
  return Number(info.lastInsertRowid);
}
