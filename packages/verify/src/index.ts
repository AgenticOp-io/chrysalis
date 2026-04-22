/**
 * @chrysalis/verify — replay oracle. Deterministic execution of generated
 * handlers against recorded traces; node-level divergence attribution.
 */

import type { NodeId, Module } from "@chrysalis/webir";
import type { TraceCorpus } from "@chrysalis/oracle";

export interface VerifyInput {
  readonly generatedProject: string;
  readonly module: Module;
  readonly corpus: TraceCorpus;
}

export interface Divergence {
  readonly frameId: string;
  readonly kind:
    | "status-mismatch"
    | "body-mismatch"
    | "header-mismatch"
    | "sql-mismatch"
    | "effect-unexpected"
    | "effect-missing";
  readonly detail: string;
  readonly attributedNodes: ReadonlyArray<NodeId>;
}

export interface EndpointScore {
  readonly route: string;
  readonly framesTotal: number;
  readonly framesPassed: number;
  readonly divergences: ReadonlyArray<Divergence>;
}

export interface CorrectnessReport {
  readonly aggregate: { framesTotal: number; framesPassed: number };
  readonly endpoints: ReadonlyArray<EndpointScore>;
}

export async function verify(_input: VerifyInput): Promise<CorrectnessReport> {
  throw new Error("verify: not implemented (Milestone 1).");
}
