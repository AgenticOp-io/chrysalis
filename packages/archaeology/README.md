# @chrysalis/archaeology

## Purpose

Reconstructs the domain types of a legacy app by **unifying** three independent
signals:

1. Database introspection (column types, nullability, FKs, CHECK constraints)
2. HTML/form scans from the PHP templates (field names, validation rules)
3. Observed JSON/form shapes from the `TraceCorpus`

The result is a set of canonical, provenance-tagged WebIR types.

## Public API

- `archaeology(input: ArchaeologyInput): Promise<SchemaReport>`
- `SchemaReport.types` — canonical `WebIRType` per domain entity
- `SchemaReport.provenance` — which signals contributed to each field, and
  how they were reconciled (or conflicted)

## Invariants

- **Provenance per field.** Every field of every generated type has a
  traceable set of provenance entries. No orphan types.
- **Conflicts are reported, not silently resolved.** If the DB says `int` and
  traces show strings, that's a finding, not a guess.
- **Enums from evidence.** String columns with a CHECK constraint OR stable
  observed value sets become literal unions; otherwise they stay `string`
  with a note.

## Non-goals

- Writing migrations or changing the database.
- Inferring application-level invariants beyond per-entity shape.
- Targeting a specific ORM's type conventions (that's the emit backend's job).
