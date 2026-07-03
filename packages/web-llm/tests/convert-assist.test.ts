import { describe, expect, test } from "vitest";
import {
  CONVERT_VERIFY_MIN_CORRECTNESS,
  evaluateConvertVerifyApplyPolicy,
} from "../src/convert-assist.js";
import { enrichConvertHoleProposals } from "../src/convert-llm-proposer.js";

describe("convert-assist", () => {
  test("apply requires verify pass and confirmApply", () => {
    const deny = evaluateConvertVerifyApplyPolicy({
      gateOk: true,
      verifyCorrectness: 1,
      confirmApply: false,
    });
    expect(deny.canApply).toBe(true);
    expect(deny.applied).toBe(false);

    const ok = evaluateConvertVerifyApplyPolicy({
      gateOk: true,
      verifyCorrectness: 1,
      confirmApply: true,
    });
    expect(ok.applied).toBe(true);
    expect(CONVERT_VERIFY_MIN_CORRECTNESS).toBe(1);
  });

  test("stub enrich produces patch hints without API key", async () => {
    const prev = process.env.CHRYSALIS_CONVERT_LLM_API_KEY;
    const prevRepair = process.env.CHRYSALIS_REPAIR_LLM_API_KEY;
    delete process.env.CHRYSALIS_CONVERT_LLM_API_KEY;
    delete process.env.CHRYSALIS_REPAIR_LLM_API_KEY;
    const r = await enrichConvertHoleProposals({
      holes: [{ name: "legacy:test-hole" }],
      skipLlm: false,
    });
    if (prev) process.env.CHRYSALIS_CONVERT_LLM_API_KEY = prev;
    if (prevRepair) process.env.CHRYSALIS_REPAIR_LLM_API_KEY = prevRepair;
    expect(r.enrichments).toHaveLength(1);
    expect(r.enrichments[0]?.patchHint).not.toBeNull();
    expect(r.llmUsed).toBe(false);
  });
});
