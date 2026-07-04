import { describe, expect, test } from "vitest";
import { buildHoleClosurePatchHint, mergeHoleClosureIntoPatchHint } from "../src/convert-hole-closure-hint.js";
import { enrichConvertHoleProposals } from "../src/convert-llm-proposer.js";

describe("convert hole closure hints", () => {
  test("builds patch when holeId present", () => {
    const hint = buildHoleClosurePatchHint({ name: "legacy:x", holeId: "n1" });
    expect(hint?.kind).toBe("hole-closure");
    expect(hint?.holeId).toBe("n1");
    expect(hint?.operatorComplete).toBe(false);
  });

  test("merge prefers hole-closure over scaffold", () => {
    const merged = mergeHoleClosureIntoPatchHint(null, { name: "legacy:y", holeId: "n2" });
    expect(merged.kind).toBe("hole-closure");
    expect(merged.holeId).toBe("n2");
  });

  test("stub enrich emits hole-closure when holeId provided", async () => {
    const r = await enrichConvertHoleProposals({
      holes: [{ name: "legacy:z", holeId: "n3" }],
      skipLlm: true,
    });
    expect(r.enrichments[0]?.patchHint?.kind).toBe("hole-closure");
  });
});
