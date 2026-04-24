import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import { scatteredValidationRecognizer } from "@chrysalis/insight";
import { applyRewrites, boundaryZodPass } from "../src/index.js";
import { buildModule } from "./helpers.js";

describe("boundary-zod pass", () => {
  it("prepends normalized binding and rewires body field reads to param", () => {
    const m = buildModule(({ data, loc }) => {
      const mkField = () =>
        data.requestField({
          source: "body",
          name: "email",
          type: T.nullable(T.string),
          origin: loc(),
        });
      const isset = data.unaryOp({
        operator: "isset",
        operand: mkField(),
        type: T.bool,
        origin: loc(),
      });
      const empty = data.unaryOp({
        operator: "empty",
        operand: mkField(),
        type: T.bool,
        origin: loc(),
      });
      const trim = data.call({
        callee: "trim",
        args: [mkField()],
        type: T.string,
        origin: loc(),
      });
      return data.block({ statements: [isset, empty, trim], origin: loc() });
    });
    const [op0] = scatteredValidationRecognizer.recognize(m);
    expect(op0).toBeDefined();
    const op = { ...op0!, confidence: 0.95 };
    const { module: next, report } = applyRewrites(m, [op], [boundaryZodPass], {
      minConfidence: 0.5,
      postVerifyRecognizers: [scatteredValidationRecognizer],
    });
    expect(report.applied).toHaveLength(1);
    expect(report.postVerify?.ok).toBe(true);
    const still = scatteredValidationRecognizer.recognize(next);
    expect(still).toHaveLength(0);
  });
});
