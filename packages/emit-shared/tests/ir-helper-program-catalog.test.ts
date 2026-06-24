import { describe, expect, it } from "vitest";
import {
  IR_HELPER_BODY_SHAPES,
  IR_HELPER_INLINE_CALLEE_IDS,
  IR_HELPER_INLINE_REGISTRY,
  IR_HELPER_PROGRAM_CLOSE_GATE,
  buildIrHelperProgramCoverage,
  registryEntryForHelperId,
} from "../src/ir-helper-program-catalog.js";

describe("ir-helper-program-catalog (G7200)", () => {
  it("declares program close gate G7200", () => {
    const cov = buildIrHelperProgramCoverage();
    expect(cov.programCloseGate).toBe("G7200");
    expect(cov.kind).toBe("chrysalis.ir-helper-program-coverage");
  });

  it("covers all chartered I3 inline callees (102)", () => {
    expect(IR_HELPER_INLINE_CALLEE_IDS.length).toBe(102);
    expect(new Set(IR_HELPER_INLINE_CALLEE_IDS).size).toBe(102);
  });

  it("registry drives callee ids and prelude skips", () => {
    expect(IR_HELPER_INLINE_REGISTRY.length).toBe(102);
    expect(registryEntryForHelperId("chrysalis_sql_param_trim")?.resolveKind).toBe("trimFormal");
  });

  it("documents supported body shapes and explicit holes", () => {
    const supported = IR_HELPER_BODY_SHAPES.filter((s) => s.status === "supported");
    const holes = IR_HELPER_BODY_SHAPES.filter((s) => s.status === "hole");
    expect(supported.length).toBeGreaterThanOrEqual(6);
    expect(holes.map((h) => h.id)).toEqual(["H1_multi_local", "H2_effectful_prelude"]);
  });
});
