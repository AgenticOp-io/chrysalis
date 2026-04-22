/**
 * Summarize the row shapes observed in a TraceCorpus, grouping by the source
 * table where possible.
 *
 * The table-attribution heuristic is intentionally small and explicit:
 *   - For each SELECT's rowShape, we extract every `FROM <tbl>` and
 *     `JOIN <tbl>` name; the shape is attributed to each mentioned table.
 *   - Ambiguous joins (the row shape's column belongs to only *one* of the
 *     joined tables) are resolved when we merge against the DDL schema, not
 *     here. This module just records the observation.
 *
 * This gives us a weaker signal than a proper SQL parser would, but it's
 * enough to (a) confirm that a DDL column is actually read, and (b) surface
 * columns that *appear* in observed shapes but are not in the DDL (stale
 * schema, views, JSON expressions).
 */

import type { SqlQueryEvent, TraceCorpus } from "@chrysalis/oracle";

export interface ObservedField {
  readonly name: string;
  readonly typeTagCounts: Record<string, number>;
  readonly sampleTraceIds: ReadonlyArray<string>; // up to 3 examples
}

export interface ObservedShape {
  /** Table(s) this shape was attributed to. May be empty for complex SQL. */
  readonly tables: ReadonlyArray<string>;
  readonly fields: ReadonlyArray<ObservedField>;
  /** Number of distinct SQL statements this shape came from. */
  readonly statementCount: number;
}

export interface CorpusShapes {
  /** Indexed by table name. Not every table may be present. */
  readonly byTable: Map<string, ObservedShape>;
  /** Shapes we could not attribute to a table — useful to surface in reports. */
  readonly orphan: ReadonlyArray<ObservedShape>;
}

export function summarizeShapes(corpus: TraceCorpus): CorpusShapes {
  const byTable = new Map<string, Map<string, Aggregator>>();
  const orphan: Aggregator[] = [];

  for (const trace of corpus.traces) {
    for (const ev of trace.events) {
      if (ev.type !== "sql.query") continue;
      const sq = ev as SqlQueryEvent;
      if (sq.rowShape.length === 0) continue;
      const tables = extractTableNames(sq.sql);
      if (tables.length === 0) {
        const agg = new Aggregator([]);
        agg.absorb(sq, trace.header.traceId);
        orphan.push(agg);
        continue;
      }
      for (const t of tables) {
        let tMap = byTable.get(t);
        if (!tMap) {
          tMap = new Map();
          byTable.set(t, tMap);
        }
        const key = sq.rowShape.map((f) => f.name).join("|");
        let agg = tMap.get(key);
        if (!agg) {
          agg = new Aggregator([t]);
          tMap.set(key, agg);
        }
        agg.absorb(sq, trace.header.traceId);
      }
    }
  }

  // Collapse per-table aggregators into a single ObservedShape per table,
  // merging all observed columns (different SELECTs pick different columns).
  const flat = new Map<string, ObservedShape>();
  for (const [table, shapes] of byTable) {
    const collapsed = Aggregator.merge([table], [...shapes.values()]);
    flat.set(table, collapsed.toObserved());
  }

  return { byTable: flat, orphan: orphan.map((a) => a.toObserved()) };
}

class Aggregator {
  private readonly fields: Map<string, { typeTagCounts: Record<string, number>; samples: string[] }> = new Map();
  private statementCount = 0;

  constructor(private readonly tables: ReadonlyArray<string>) {}

  absorb(sq: SqlQueryEvent, traceId: string): void {
    this.statementCount += 1;
    for (const f of sq.rowShape) {
      let entry = this.fields.get(f.name);
      if (!entry) {
        entry = { typeTagCounts: {}, samples: [] };
        this.fields.set(f.name, entry);
      }
      entry.typeTagCounts[f.typeTag] = (entry.typeTagCounts[f.typeTag] ?? 0) + 1;
      if (entry.samples.length < 3 && !entry.samples.includes(traceId)) {
        entry.samples.push(traceId);
      }
    }
  }

  toObserved(): ObservedShape {
    const fields: ObservedField[] = [];
    for (const [name, entry] of [...this.fields.entries()].sort()) {
      fields.push({
        name,
        typeTagCounts: { ...entry.typeTagCounts },
        sampleTraceIds: [...entry.samples],
      });
    }
    return {
      tables: [...this.tables],
      fields,
      statementCount: this.statementCount,
    };
  }

  static merge(tables: ReadonlyArray<string>, aggs: ReadonlyArray<Aggregator>): Aggregator {
    const out = new Aggregator(tables);
    for (const a of aggs) {
      out.statementCount += a.statementCount;
      for (const [name, entry] of a.fields) {
        let target = out.fields.get(name);
        if (!target) {
          target = { typeTagCounts: {}, samples: [] };
          out.fields.set(name, target);
        }
        for (const [tag, n] of Object.entries(entry.typeTagCounts)) {
          target.typeTagCounts[tag] = (target.typeTagCounts[tag] ?? 0) + n;
        }
        for (const s of entry.samples) {
          if (target.samples.length < 3 && !target.samples.includes(s)) target.samples.push(s);
        }
      }
    }
    return out;
  }
}

/**
 * Lift table names referenced in a SQL statement via naive FROM/JOIN regex.
 * Lowercases and dedupes; returns identifiers only (strips aliases, schema
 * qualifiers, and quoting).
 */
export function extractTableNames(sql: string): string[] {
  const out = new Set<string>();
  // Strip quoted string literals so table tokens inside strings don't leak in.
  const cleaned = sql
    .replace(/'(?:[^']|'')*'/g, "")
    .replace(/"(?:[^"]|"")*"/g, "");
  const re = /\b(?:FROM|JOIN)\s+((?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const qualified = m[1]!.toLowerCase();
    const bare = qualified.includes(".") ? qualified.split(".", 2)[1]! : qualified;
    out.add(bare);
  }
  return [...out];
}
