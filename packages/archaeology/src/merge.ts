/**
 * Merge DDL schema + observed corpus shapes into a typed, provenanced
 * EntityReport per table.
 *
 * The merge algorithm is intentionally additive:
 *   - Every DDL column becomes an entity field. Source: the schema file.
 *   - Every observed field not already in DDL becomes a field marked
 *     `observedOnly` with a `SampleTraceIds` provenance. That surfaces stale
 *     or view-derived columns, which you want to see, not paper over.
 *   - If DDL and observation agree on the same column, the observation is
 *     merged in as additional provenance. If they disagree on type, we
 *     record both in `conflicts` and keep the DDL type as the declared type
 *     (because it's explicit and the observation is a sample).
 */

import type { ParsedSchema, ColumnSchema, SqlPrimitive } from "./parse-schema.js";
import type { CorpusShapes, ObservedField } from "./corpus-shapes.js";

export type FieldKind = "ddl" | "observed-only" | "ddl-and-observed";

export interface ProvenanceEntry {
  readonly kind: "schema" | "trace";
  readonly detail: string;
}

export interface EntityFieldReport {
  readonly name: string;
  readonly kind: FieldKind;
  readonly ddl: ColumnSchema | null;
  readonly observed: ObservedField | null;
  readonly typescriptType: string;
  readonly nullable: boolean;
  readonly provenance: ReadonlyArray<ProvenanceEntry>;
  readonly conflicts: ReadonlyArray<string>;
}

export interface EntityReport {
  readonly name: string;
  readonly typescriptName: string; // PascalCase singular, e.g. `users` → `User`
  readonly fields: ReadonlyArray<EntityFieldReport>;
  readonly fromSchema: { file: string; line: number };
  readonly observedStatementCount: number;
}

export interface SchemaReport {
  readonly entities: ReadonlyArray<EntityReport>;
  readonly unknownDdl: ReadonlyArray<{ table: string; raw: string; source: { file: string; line: number } }>;
  readonly orphanShapes: ReadonlyArray<{ fields: ReadonlyArray<string>; statementCount: number }>;
}

/**
 * Map normalized SQL table name (lowercase) to the archaeology TypeScript
 * interface name (`EntityReport.typescriptName`). Used by `@chrysalis/emit-hono`
 * for `queryOne<T>` / `queryAll<T>` when ingest tagged exactly one table on
 * the `db.query` node.
 */
export function domainTypesByTable(report: SchemaReport): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of report.entities) {
    out[e.name.toLowerCase()] = e.typescriptName;
  }
  return out;
}

export function mergeSchema(
  ddl: ParsedSchema,
  shapes: CorpusShapes,
): SchemaReport {
  const entities: EntityReport[] = [];
  for (const table of ddl.tables) {
    const observed = shapes.byTable.get(table.name);
    const observedByName = new Map<string, ObservedField>();
    for (const f of observed?.fields ?? []) observedByName.set(f.name, f);

    const fields: EntityFieldReport[] = [];
    // Fields from DDL, merged with observation.
    for (const col of table.columns) {
      const obs = observedByName.get(col.name) ?? null;
      if (obs) observedByName.delete(col.name);
      fields.push(mergeField(col, obs, table.name));
    }
    // Fields observed but not in DDL.
    for (const [, obs] of observedByName) {
      fields.push(buildObservedOnlyField(obs, table.name));
    }

    entities.push({
      name: table.name,
      typescriptName: pascalSingular(table.name),
      fields,
      fromSchema: table.source,
      observedStatementCount: observed?.statementCount ?? 0,
    });
  }
  return {
    entities,
    unknownDdl: ddl.unknownColumns,
    orphanShapes: shapes.orphan.map((o) => ({
      fields: o.fields.map((f) => f.name),
      statementCount: o.statementCount,
    })),
  };
}

function mergeField(col: ColumnSchema, obs: ObservedField | null, table: string): EntityFieldReport {
  const provenance: ProvenanceEntry[] = [
    {
      kind: "schema",
      detail: `${col.source.file}:${col.source.line} (${table}.${col.name} ${describeDdlType(col.type)})`,
    },
  ];
  const conflicts: string[] = [];
  let ts = tsTypeFor(col.type);

  if (obs) {
    provenance.push({
      kind: "trace",
      detail: `observed in ${describeObsCounts(obs)} statements, samples=[${obs.sampleTraceIds.slice(0, 3).join(", ")}]`,
    });
    const observedKind = dominantObservedKind(obs);
    if (observedKind && observedKind !== canonicalKindOf(col.type)) {
      conflicts.push(`ddl=${canonicalKindOf(col.type)} vs observed=${observedKind}`);
    }
  }

  // If DDL says NOT NULL but the column has a DEFAULT that isn't NULL, treat
  // it as not-nullable for downstream code gen. If DDL says NULL-allowed,
  // respect that.
  const nullable = !col.notNull && col.defaultValue !== "NOT NULL";
  if (nullable) ts = `${ts} | null`;

  return {
    name: col.name,
    kind: obs ? "ddl-and-observed" : "ddl",
    ddl: col,
    observed: obs,
    typescriptType: ts,
    nullable,
    provenance,
    conflicts,
  };
}

function buildObservedOnlyField(obs: ObservedField, table: string): EntityFieldReport {
  const kind = dominantObservedKind(obs) ?? "unknown";
  const ts = kind === "int" ? "number"
    : kind === "float" ? "number"
    : kind === "bool" ? "boolean"
    : kind === "string" ? "string"
    : kind === "blob" ? "Uint8Array"
    : "unknown";
  return {
    name: obs.name,
    kind: "observed-only",
    ddl: null,
    observed: obs,
    typescriptType: `${ts} | null`,
    nullable: true,
    provenance: [
      {
        kind: "trace",
        detail: `observed in ${describeObsCounts(obs)} statements for table ${table}, not in DDL`,
      },
    ],
    conflicts: ["not declared in DDL; may be a view, computed column, or stale schema"],
  };
}

function canonicalKindOf(p: SqlPrimitive): string {
  return p.kind;
}

function describeDdlType(p: SqlPrimitive): string {
  if (p.kind === "string") return p.maxLen ? `string(${p.maxLen})` : "string";
  if (p.kind === "enum") return `enum(${p.values.join("|")})`;
  if (p.kind === "unknown") return `unknown(${p.raw})`;
  return p.kind;
}

function tsTypeFor(p: SqlPrimitive): string {
  switch (p.kind) {
    case "int":
    case "float":
      return "number";
    case "bool":
      return "boolean";
    case "string":
      return "string";
    case "timestamp":
    case "date":
      return "string"; // ISO string by convention; keep typed as string for now
    case "blob":
      return "Uint8Array";
    case "enum":
      return p.values.map((v) => JSON.stringify(v)).join(" | ");
    case "unknown":
      return "unknown";
  }
}

function dominantObservedKind(obs: ObservedField): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [tag, count] of Object.entries(obs.typeTagCounts)) {
    if (count > bestCount) {
      best = normalizeTag(tag);
      bestCount = count;
    }
  }
  return best;
}

function normalizeTag(tag: string): string {
  const t = tag.toLowerCase();
  if (t === "integer" || t === "int" || t === "long") return "int";
  if (t === "double" || t === "float" || t === "real" || t === "decimal") return "float";
  if (t === "text" || t === "varchar" || t === "char" || t === "string") return "string";
  if (t === "boolean" || t === "bool") return "bool";
  if (t === "blob" || t === "bytes") return "blob";
  return t;
}

function describeObsCounts(obs: ObservedField): string {
  const total = Object.values(obs.typeTagCounts).reduce((a, b) => a + b, 0);
  const tags = Object.entries(obs.typeTagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t}×${n}`)
    .join(", ");
  return `${total} [${tags}]`;
}

function pascalSingular(name: string): string {
  let base = name;
  if (base.endsWith("ies")) base = base.slice(0, -3) + "y";
  else if (base.endsWith("s") && !base.endsWith("ss")) base = base.slice(0, -1);
  return base
    .split(/[_-]/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join("");
}
