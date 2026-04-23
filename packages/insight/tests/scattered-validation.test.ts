import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import { scatteredValidationRecognizer } from "../src/recognizers/scattered-validation.js";
import { buildModule } from "./helpers.js";

describe("scattered-validation recognizer", () => {
  it("fires when one field is touched by ≥2 distinct guard kinds", () => {
    const m = buildModule(({ data, loc }) => {
      const mkField = () =>
        data.requestField({
          source: "body",
          name: "email",
          type: T.nullable(T.string),
          origin: loc(),
        });
      const isset = data.unaryOp({ operator: "isset", operand: mkField(), type: T.bool, origin: loc() });
      const empty = data.unaryOp({ operator: "empty", operand: mkField(), type: T.bool, origin: loc() });
      const trim = data.call({ callee: "trim", args: [mkField()], type: T.string, origin: loc() });
      return data.block({ statements: [isset, empty, trim], origin: loc() });
    });
    const [op] = scatteredValidationRecognizer.recognize(m);
    expect(op).toBeDefined();
    expect(op!.recognizer).toBe("scattered-validation");
    expect(op!.evidence["name"]).toBe("email");
    expect(op!.evidence["source"]).toBe("body");
    expect((op!.evidence["distinctGuardKinds"] as string[]).length).toBeGreaterThanOrEqual(3);
    expect(op!.severity).toBe("strong");
  });

  it("does not fire when only one guard is present", () => {
    const m = buildModule(({ data, loc }) => {
      const field = data.requestField({ source: "body", name: "email", type: T.string, origin: loc() });
      const trim = data.call({ callee: "trim", args: [field], type: T.string, origin: loc() });
      return data.block({ statements: [trim], origin: loc() });
    });
    expect(scatteredValidationRecognizer.recognize(m)).toHaveLength(0);
  });

  it("does not cross-link guards across different fields", () => {
    const m = buildModule(({ data, loc }) => {
      const email = data.requestField({ source: "body", name: "email", type: T.string, origin: loc() });
      const password = data.requestField({ source: "body", name: "password", type: T.string, origin: loc() });
      const isset = data.unaryOp({ operator: "isset", operand: email, type: T.bool, origin: loc() });
      const empty = data.unaryOp({ operator: "empty", operand: password, type: T.bool, origin: loc() });
      return data.block({ statements: [isset, empty], origin: loc() });
    });
    expect(scatteredValidationRecognizer.recognize(m)).toHaveLength(0);
  });

  it("counts compare-to-literal as its own guard kind", () => {
    const m = buildModule(({ data, loc }) => {
      const field = () =>
        data.requestField({ source: "body", name: "role", type: T.string, origin: loc() });
      const lit = data.literal({ value: "admin", type: T.string, origin: loc() });
      const cmp = data.binOp({ operator: "===", left: field(), right: lit, type: T.bool, origin: loc() });
      const trim = data.call({ callee: "trim", args: [field()], type: T.string, origin: loc() });
      return data.block({ statements: [cmp, trim], origin: loc() });
    });
    const [op] = scatteredValidationRecognizer.recognize(m);
    expect(op).toBeDefined();
    const kinds = op!.evidence["distinctGuardKinds"] as string[];
    expect(kinds).toEqual(expect.arrayContaining(["compare:===:lit", "call:trim"]));
  });
});
