/**
 * IR Helper Program v1 catalog — authoritative coverage surface for program close (G7200).
 * Inline callee registry: ir-helper-inline-registry.ts (P1).
 */

import { IR_HELPER_INLINE_CALLEE_IDS } from "./ir-helper-inline-registry.js";

export {
  IR_HELPER_INLINE_CALLEE_IDS,
  IR_HELPER_INLINE_REGISTRY,
  IR_HELPER_GENERIC_CALLEE_MAP,
  IR_HELPER_SKIPPABLE_PRELUDE_CALLEES,
  isIrHelperSkippablePreludeCallee,
  registryEntryForHelperId,
  irHelperEmitCallee,
  type IrHelperInlineRegistryEntry,
  type IrHelperInlinePatternKind,
} from "./ir-helper-inline-registry.js";

export const IR_HELPER_PROGRAM_VERSION = 1 as const;
export const IR_HELPER_PROGRAM_CLOSE_GATE = "G7200" as const;

/** Body shapes for call-site SQL helper inlining (Track B). */
export type IrHelperBodyShapeId =
  | "I0_direct_return"
  | "I1_literal_assign"
  | "I2_formal_passthrough"
  | "I3_formal_wrapper"
  | "I4_assign_chain"
  | "I5_coalesce_formal_literal"
  | "H1_multi_local"
  | "H2_effectful_prelude";

export type IrHelperBodyShapeStatus = "supported" | "hole";

export type IrHelperBodyShape = {
  readonly id: IrHelperBodyShapeId;
  readonly status: IrHelperBodyShapeStatus;
  readonly fixture?: string;
  readonly note?: string;
};

export const IR_HELPER_BODY_SHAPES: readonly IrHelperBodyShape[] = [
  { id: "I0_direct_return", status: "supported", fixture: "sql_param.php" },
  { id: "I1_literal_assign", status: "supported", fixture: "sql_param_literal.php" },
  { id: "I2_formal_passthrough", status: "supported", fixture: "sql_param_local.php" },
  { id: "I3_formal_wrapper", status: "supported", note: "B6–B75 callee registry on formal assign" },
  { id: "I4_assign_chain", status: "supported", fixture: "sql_param_chain.php" },
  { id: "I5_coalesce_formal_literal", status: "supported", fixture: "sql_param_coalesce.php" },
  { id: "H1_multi_local", status: "hole", fixture: "sql_param_noinline.php" },
  { id: "H2_effectful_prelude", status: "hole", fixture: "sql_param_sideeffect.php" },
] as const;

/** Cross-file lift track (Track A) — closed baseline B0–B5.5. */
export const IR_HELPER_CROSS_FILE_TRACK = {
  status: "closed" as const,
  tiers: "B0–B5.5",
  deferred: "non-B5 semantic widening beyond documented rules (D2404)",
} as const;

/** Explicit program holes — chartered out of v1 scope (emit hole or lib-helpers fallback). */
export const IR_HELPER_PROGRAM_HOLES = [
  { id: "legacy:helper_multi_local", shape: "H1_multi_local", reason: "multi-local assign before query" },
  { id: "legacy:helper_effectful_prelude", shape: "H2_effectful_prelude", reason: "ir effect before return query" },
  { id: "legacy:helper_random", callee: "str_shuffle", reason: "requires ctx.random" },
  { id: "legacy:helper_mbstring", callee: "mb_*", reason: "extension; separate charter" },
  { id: "legacy:helper_dynamic_operands", reason: "non-literal non-formal RHS operands" },
  { id: "legacy:helper_branching", reason: "branch / early return in helper body" },
  { id: "legacy:helper_multi_query", reason: "multiple db.query effects in one helper" },
] as const;

export type IrHelperProgramCoverage = {
  readonly kind: "chrysalis.ir-helper-program-coverage";
  readonly schemaVersion: typeof IR_HELPER_PROGRAM_VERSION;
  readonly programCloseGate: typeof IR_HELPER_PROGRAM_CLOSE_GATE;
  readonly crossFileTrack: typeof IR_HELPER_CROSS_FILE_TRACK;
  readonly bodyShapes: readonly IrHelperBodyShape[];
  readonly inlineCalleeCount: number;
  readonly inlineCalleeIds: readonly string[];
  readonly inlineRegistryCount: number;
  readonly programHoles: typeof IR_HELPER_PROGRAM_HOLES;
};

export function buildIrHelperProgramCoverage(): IrHelperProgramCoverage {
  return {
    kind: "chrysalis.ir-helper-program-coverage",
    schemaVersion: IR_HELPER_PROGRAM_VERSION,
    programCloseGate: IR_HELPER_PROGRAM_CLOSE_GATE,
    crossFileTrack: IR_HELPER_CROSS_FILE_TRACK,
    bodyShapes: IR_HELPER_BODY_SHAPES,
    inlineCalleeCount: IR_HELPER_INLINE_CALLEE_IDS.length,
    inlineCalleeIds: [...IR_HELPER_INLINE_CALLEE_IDS],
    inlineRegistryCount: IR_HELPER_INLINE_CALLEE_IDS.length,
    programHoles: IR_HELPER_PROGRAM_HOLES,
  };
}
