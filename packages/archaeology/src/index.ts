/**
 * @chrysalis/archaeology — reconstruct typed domain models from DB schema,
 * observed corpus shapes, and optional heuristic scans of inline HTML in PHP.
 */

import { readFileSync } from "node:fs";
import { parseSchema } from "./parse-schema.js";
import { summarizeShapes } from "./corpus-shapes.js";
import { mergeSchema } from "./merge.js";
import type { TraceCorpus } from "@chrysalis/oracle";

export { parseSchema, type TableSchema, type ColumnSchema, type SqlPrimitive, type ParsedSchema } from "./parse-schema.js";
export {
  summarizeShapes,
  extractTableNames,
  MAX_TRACE_STRING_ENUM_DISTINCT,
  type CorpusShapes,
  type ObservedShape,
  type ObservedField,
} from "./corpus-shapes.js";
export {
  mergeSchema,
  domainTypesByTable,
  TRACE_LITERAL_UNION_PROVENANCE_PREFIX,
  type SchemaReport,
  type EntityReport,
  type EntityFieldReport,
  type FieldKind,
  type ProvenanceEntry,
  type MergeSchemaOptions,
  type UnattributedFormField,
} from "./merge.js";
export { emitTypes, type EmitTypesOptions } from "./emit-types.js";
export { emitDrizzleSchema, type EmitDrizzleSchemaOptions } from "./emit-drizzle-schema.js";
export {
  scanPhpTreeForFormControls,
  extractFormControlHits,
  extractSqlTableRefsFromPhp,
  extractWriteTableRefsFromPhp,
  collectFormFieldEvidence,
  type FormControlHit,
  type FormEvidenceAttribution,
} from "./php-form-scan.js";

export interface RunArchaeologyInput {
  readonly schemaPath: string;
  readonly corpus?: TraceCorpus;
  /** Absolute or cwd-relative roots scanned for `<input|select|textarea name=…>`. */
  readonly phpRoots?: ReadonlyArray<string>;
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
  return mergeSchema(
    ddl,
    shapes,
    input.phpRoots && input.phpRoots.length > 0 ? { phpRoots: input.phpRoots } : undefined,
  );
}
