/**
 * @chrysalis/archaeology — reconstruct typed domain models from DB schema,
 * observed corpus shapes, and (later) template form scans.
 *
 * Milestone 1 scope: DDL + corpus shapes → TypeScript interfaces with
 * `@chrysalis-provenance` JSDoc. Form scanning is deferred to Milestone 2.
 */

import { readFileSync } from "node:fs";
import { parseSchema } from "./parse-schema.js";
import { summarizeShapes } from "./corpus-shapes.js";
import { mergeSchema } from "./merge.js";
import type { TraceCorpus } from "@chrysalis/oracle";

export { parseSchema, type TableSchema, type ColumnSchema, type SqlPrimitive, type ParsedSchema } from "./parse-schema.js";
export { summarizeShapes, extractTableNames, type CorpusShapes, type ObservedShape, type ObservedField } from "./corpus-shapes.js";
export {
  mergeSchema,
  domainTypesByTable,
  type SchemaReport,
  type EntityReport,
  type EntityFieldReport,
  type FieldKind,
  type ProvenanceEntry,
} from "./merge.js";
export { emitTypes, type EmitTypesOptions } from "./emit-types.js";

export interface RunArchaeologyInput {
  readonly schemaPath: string;
  readonly corpus?: TraceCorpus;
}

/**
 * Convenience: read `schemaPath`, optionally merge with a corpus, and return
 * the full SchemaReport. Does not write to disk — callers choose whether to
 * persist via `emitTypes`.
 */
export function runArchaeology(input: RunArchaeologyInput) {
  const ddl = parseSchema(readFileSync(input.schemaPath, "utf8"), input.schemaPath);
  const shapes = input.corpus
    ? summarizeShapes(input.corpus)
    : ({ byTable: new Map(), orphan: [] } as const);
  return mergeSchema(ddl, shapes);
}
