# @chrysalis/archaeology

## Purpose

Reconstructs the domain types of a legacy app by **unifying** up to three
independent signals:

1. Database DDL (column types, nullability, FKs, `CHECK (col IN (...))`)
2. Observed SQL row shapes from the `TraceCorpus` (attributed to tables
   via a `FROM`/`JOIN` regex), plus **bounded distinct string literals**
   from captured `sql.query.rows` when the PHP oracle recorded result rows
3. Optional **heuristic HTML form scans** of `.php` trees (`phpRoots`):
   `<input|select|textarea` with `name=…`, attributed to DDL columns using
   SQL table refs in the same file; **INSERT/UPDATE** targets break ties when
   the same column name exists on multiple tables (e.g. `body` on `posts` vs
   `comments`). Unresolved controls surface in `SchemaReport.unattributedFormFields`
   and as comments in `emitTypes` output.

Each field on each entity carries `@chrysalis-provenance` JSDoc citing the
schema file/line and any trace IDs that confirmed the column.

## Public API

```ts
import {
  runArchaeology,      // schema path [+ corpus + phpRoots] → SchemaReport
  emitTypes,           // SchemaReport → TypeScript interfaces (`domain.ts`)
  emitDrizzleSchema,  // SchemaReport → Drizzle sqlite-core `schema.ts`
  domainTypesByTable,  // SchemaReport → map for emit-hono row generics (D22)
  parseSchema,       // low-level DDL parser
  summarizeShapes,   // low-level corpus → per-table observed shapes
  mergeSchema,       // DDL + shapes [+ php scan options] → SchemaReport
  extractTableNames, // heuristic FROM/JOIN extractor
  collectFormFieldEvidence, // PHP roots → attributed / unattributed form hits
} from "@chrysalis/archaeology";
```

- `runArchaeology({ schemaPath, corpus?, phpRoots? })` → `SchemaReport` with one
  `EntityReport` per table.
- `emitTypes(report)` → a TypeScript source string containing one
  `interface` per entity, with provenance JSDoc on every field.
- `emitDrizzleSchema(report)` → a TypeScript module of `sqliteTable(...)`
  definitions (for `src/schema.ts` in emit-hono).
- `domainTypesByTable(report)` → `{ users: "User", ... }` (keys lowercase)
  for `EmitInput.domainTypesByTable` in `@chrysalis/emit-hono`. Callers
  should write `emitTypes` to `src/domain.ts` before `tsc`. The CLI command
  `chrysalis emit <dir> --out <out> --schema <schema.sql>` does both.

## Invariants (Milestone 1)

- **Every field has provenance.** At minimum one `@chrysalis-provenance
  schema <file>:<line>` entry; trace-confirmed fields gain
  `@chrysalis-provenance trace — observed in N statements, samples=[...]`.
  Form-matched fields add `@chrysalis-provenance form — <php>:<line> …`.
- **Conflicts surface, don't resolve.** If DDL says `int` and traces show
  strings, the field carries `@chrysalis-conflict ddl=int vs observed=string`
  and keeps the DDL type as authoritative.
- **Enums from evidence.** TEXT columns with a `CHECK (col IN ('a','b'))`
  constraint become `"a" | "b"` string-literal unions. Plain TEXT without
  CHECK may be promoted to a small literal union when traces include
  `sql.query.rows` with 2..`MAX_TRACE_STRING_ENUM_DISTINCT` distinct short
  strings; larger cardinality is ignored (treated as free text). Values not
  listed in a DDL enum produce `@chrysalis-conflict` entries.
- **Nothing disappears silently.** DDL the parser doesn't recognize appears
  in `report.unknownDdl`; observed SQL that can't be table-attributed
  appears in `report.orphanShapes`; both are rendered as comment blocks in
  the emitted types.

## Non-goals

- Writing migrations or changing the database.
- Inferring application-level invariants beyond per-entity shape.
- Choosing how emitted apps open DB connections (emit backends own drivers).
- Full Blade/Twig/Smarty parsing; only inline markup text inside `.php` files
  is scanned heuristically.
