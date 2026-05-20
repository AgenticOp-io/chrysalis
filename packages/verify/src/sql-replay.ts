/**
 * Build a per-trace SQL replay tape from oracle events for HTTP verify.
 * SELECT-shaped queries (non-empty rowShape) must include captured `rows`
 * (oracle-php Statement buffering). Mutations (empty rowShape) are not
 * replayed at the SQL layer; the emitted app still runs them against SQLite.
 */

import type { SqlQueryEvent, Trace } from "@chrysalis/oracle";

export interface SqlReplayTape {
  readonly queries: ReadonlyArray<{
    readonly sql: string;
    readonly params: ReadonlyArray<unknown>;
    readonly rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  }>;
}

/** Oracle redaction placeholders must not be replayed as live column values. */
function rowValueIsRedactedPlaceholder(v: unknown): boolean {
  if (typeof v !== "string") return false;
  if (v.startsWith("sha256:")) return true;
  if (v.includes("REDACTED")) return true;
  return false;
}

function sqlRowsAreReplaySafe(rows: ReadonlyArray<Readonly<Record<string, unknown>>>): boolean {
  for (const row of rows) {
    for (const v of Object.values(row)) {
      if (rowValueIsRedactedPlaceholder(v)) return false;
    }
  }
  return true;
}

/** True when every SELECT-shaped sql.query has complete `rows` (no truncation). */
export function canSqlReplayTrace(trace: Trace): boolean {
  for (const e of trace.events) {
    if (e.type !== "sql.query") continue;
    const q = e as SqlQueryEvent;
    if (q.rowShape.length === 0) continue;
    if (q.rows === undefined) return false;
    if (q.rowsTruncated === true) return false;
    if (!sqlRowsAreReplaySafe(q.rows ?? [])) return false;
  }
  return true;
}

export function buildSqlReplayTapeFromTrace(trace: Trace): SqlReplayTape {
  const queries: Array<{
    sql: string;
    params: unknown[];
    rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  }> = [];
  for (const e of trace.events) {
    if (e.type !== "sql.query") continue;
    const q = e as SqlQueryEvent;
    if (q.rowShape.length === 0) continue;
    queries.push({
      sql: q.sql,
      params: [...q.params],
      rows: q.rows ?? [],
    });
  }
  return { queries };
}

export function encodeSqlTapeHeader(tape: SqlReplayTape): string {
  return Buffer.from(JSON.stringify(tape), "utf8").toString("base64url");
}
