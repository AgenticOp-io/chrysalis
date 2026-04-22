/**
 * @chrysalis/archaeology — reconstruct typed domain models from DB, forms,
 * and observed traces.
 */

import type { WebIRType, Provenance } from "@chrysalis/webir";
import type { TraceCorpus } from "@chrysalis/oracle";

export interface ArchaeologyInput {
  readonly dbUrl?: string;
  readonly phpRoot?: string;
  readonly corpus?: TraceCorpus;
}

export interface FieldReport {
  readonly name: string;
  readonly type: WebIRType;
  readonly provenance: ReadonlyArray<Provenance>;
  readonly conflicts: ReadonlyArray<{ a: WebIRType; b: WebIRType; note: string }>;
}

export interface EntityReport {
  readonly name: string;
  readonly fields: ReadonlyArray<FieldReport>;
}

export interface SchemaReport {
  readonly entities: ReadonlyArray<EntityReport>;
}

export async function archaeology(_input: ArchaeologyInput): Promise<SchemaReport> {
  throw new Error("archaeology: not implemented (Milestone 1).");
}
