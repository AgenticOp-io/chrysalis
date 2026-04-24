/**
 * @chrysalis/repair — Milestone 3 verified repair loop.
 *
 * Bridges verify failures to IR edits: every candidate patch is accepted only
 * if full `replayCorpus` passes. Proposers are pluggable (`RepairProposer`).
 */

export {
  runVerifiedRepairLoop,
} from "./loop.js";

export {
  stubRepairProposer,
} from "./stub.js";

export {
  applyHoleClosure,
  applyHoleClosureAndVerify,
  findHoleOperandRef,
  type ApplyHoleClosureOptions,
  type HoleClosureSignOff,
  type HoleClosureVerifyResult,
} from "./hole-closure.js";

export type {
  RepairProposeContext,
  RepairProposer,
  RepairReplayBase,
  VerifiedRepairLoopOptions,
  VerifiedRepairLoopResult,
} from "./types.js";
