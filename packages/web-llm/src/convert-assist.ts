import { evaluateVerifyGatePolicy } from "./policy.js";

export const CONVERT_VERIFY_MIN_CORRECTNESS = 1;

export type ConvertVerifyApplyInput = {
  gateOk: boolean;
  verifyCorrectness?: number | null;
  confirmApply: boolean;
  holeCount?: number;
};

export type ConvertVerifyApplyResult = {
  ok: boolean;
  canApply: boolean;
  applied: boolean;
  reasons: string[];
};

/** Operator apply requires verify gate pass + explicit confirmApply. */
export function evaluateConvertVerifyApplyPolicy(input: ConvertVerifyApplyInput): ConvertVerifyApplyResult {
  const verify = evaluateVerifyGatePolicy({
    gateOk: input.gateOk,
    ...(input.verifyCorrectness != null ? { verifyCorrectness: input.verifyCorrectness } : {}),
    minCorrectness: CONVERT_VERIFY_MIN_CORRECTNESS,
  });
  const reasons = [...verify.reasons];
  if (input.confirmApply !== true) {
    reasons.push("apply:not-confirmed");
  }
  const canApply = verify.ok === true;
  const ok = canApply && input.confirmApply === true;
  return {
    ok,
    canApply,
    applied: ok,
    reasons,
  };
}
