import type { VerifyGatePolicyInput, VerifyGatePolicyResult } from "./types.js";

export const VERIFY_GATE_POLICY = {
  defaultMinCorrectness: 1,
  defaultMaxHoles: 0,
};

export function evaluateVerifyGatePolicy(input: VerifyGatePolicyInput): VerifyGatePolicyResult {
  /** @type {string[]} */
  const reasons = [];
  const minCorrectness = input.minCorrectness ?? VERIFY_GATE_POLICY.defaultMinCorrectness;
  const maxHoles = input.maxHoles ?? VERIFY_GATE_POLICY.defaultMaxHoles;

  if (input.unverified === true) {
    reasons.push("unverified:explicit");
    return { ok: false, reasons };
  }

  if (input.gateOk !== true) {
    reasons.push("gate:not-ok");
  }

  if (typeof input.verifyCorrectness === "number" && input.verifyCorrectness < minCorrectness) {
    reasons.push(`correctness:${input.verifyCorrectness}<${minCorrectness}`);
  }

  if (typeof input.holeCount === "number" && input.holeCount > maxHoles) {
    reasons.push(`holes:${input.holeCount}>${maxHoles}`);
  }

  const ok =
    input.gateOk === true &&
    (input.verifyCorrectness === undefined || input.verifyCorrectness >= minCorrectness) &&
    (input.holeCount === undefined || input.holeCount <= maxHoles);

  return { ok, reasons };
}
