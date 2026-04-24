import type { Edit } from "@chrysalis/rewrite";
import type { Module } from "@chrysalis/webir";
import type { TraceCorpus } from "@chrysalis/oracle";
import type { ReplayOptions, TraceOutcome } from "@chrysalis/verify";

/**
 * Context for a repair proposer (LLM, human tool, or test double).
 */
export interface RepairProposeContext {
  readonly module: Module;
  /** One failing replay outcome chosen by the loop driver. */
  readonly failingOutcome: TraceOutcome;
  /** 1-based iteration index inside {@link runVerifiedRepairLoop}. */
  readonly iteration: number;
}

/**
 * Produces IR edits for a single failing trace. Return `null` or `[]` to abstain.
 * Non-empty edits are applied with `applyModuleEdits` from `@chrysalis/rewrite`
 * and accepted only if full-corpus replay passes.
 */
export interface RepairProposer {
  propose(ctx: RepairProposeContext): Promise<ReadonlyArray<Edit> | null>;
}

export type RepairReplayBase = Omit<ReplayOptions, "module">;

export interface VerifiedRepairLoopOptions {
  readonly corpus: TraceCorpus;
  readonly initialModule: Module;
  /** Replay settings without `module` (the loop supplies the current module). */
  readonly replayBase: RepairReplayBase;
  readonly proposer: RepairProposer;
  readonly maxIterations: number;
  /**
   * When set, only failures whose `TraceOutcome.route` equals this label
   * (e.g. `GET /posts`) are passed to the proposer. Full-corpus verification
   * still applies when judging a patch.
   */
  readonly endpoint?: string;
  /**
   * Test hook: override HTTP replay. Defaults to `replayCorpus` from verify.
   */
  readonly replayCorpusImpl?: (
    corpus: TraceCorpus,
    opts: ReplayOptions,
  ) => Promise<TraceOutcome[]>;
}

export interface VerifiedRepairLoopResult {
  readonly ok: boolean;
  readonly module: Module;
  readonly finalOutcomes: ReadonlyArray<TraceOutcome>;
  /** Number of propose calls (loop iterations attempted). */
  readonly iterationsRun: number;
  /** How many candidate patches failed full replay. */
  readonly rejectedPatches: number;
  /** Set when the proposer abstained on the first failure (no edits). */
  readonly proposerAbstained?: boolean;
  /** Diagnostic when the loop exits without `ok`. */
  readonly message?: string;
}
