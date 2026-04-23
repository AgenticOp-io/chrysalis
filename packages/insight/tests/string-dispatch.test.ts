import { describe, expect, it } from "vitest";
import { T, type NodeId } from "@chrysalis/webir";
import { stringDispatchRecognizer } from "../src/recognizers/string-dispatch.js";
import { buildModule } from "./helpers.js";

describe("string-dispatch recognizer", () => {
  it("fires on a 3-branch if/elseif chain over one request field", () => {
    const m = buildModule(({ data, loc }) => {
      const field = () =>
        data.requestField({ source: "body", name: "action", type: T.string, origin: loc() });
      const mkBranch = (literal: string): { cond: NodeId; body: NodeId } => ({
        cond: data.binOp({
          operator: "===",
          left: field(),
          right: data.literal({ value: literal, type: T.string, origin: loc() }),
          type: T.bool,
          origin: loc(),
        }),
        body: data.block({ statements: [], origin: loc() }),
      });
      const a = mkBranch("login");
      const b = mkBranch("logout");
      const c = mkBranch("register");
      const inner2 = data.ifElse({ cond: c.cond, then: c.body, origin: loc() });
      const inner1 = data.ifElse({ cond: b.cond, then: b.body, else: inner2, origin: loc() });
      return data.ifElse({ cond: a.cond, then: a.body, else: inner1, origin: loc() });
    });
    const [op] = stringDispatchRecognizer.recognize(m);
    expect(op).toBeDefined();
    expect(op!.recognizer).toBe("string-dispatch");
    expect(op!.evidence["name"]).toBe("action");
    expect(op!.evidence["branches"]).toEqual(["login", "logout", "register"]);
    expect(op!.evidence["branchCount"]).toBe(3);
  });

  it("does not fire when the chain compares different fields", () => {
    const m = buildModule(({ data, loc }) => {
      const a = data.requestField({ source: "body", name: "x", type: T.string, origin: loc() });
      const b = data.requestField({ source: "body", name: "y", type: T.string, origin: loc() });
      const cond1 = data.binOp({
        operator: "===",
        left: a,
        right: data.literal({ value: "one", type: T.string, origin: loc() }),
        type: T.bool,
        origin: loc(),
      });
      const cond2 = data.binOp({
        operator: "===",
        left: b,
        right: data.literal({ value: "two", type: T.string, origin: loc() }),
        type: T.bool,
        origin: loc(),
      });
      const inner = data.ifElse({
        cond: cond2,
        then: data.block({ statements: [], origin: loc() }),
        origin: loc(),
      });
      return data.ifElse({
        cond: cond1,
        then: data.block({ statements: [], origin: loc() }),
        else: inner,
        origin: loc(),
      });
    });
    expect(stringDispatchRecognizer.recognize(m)).toHaveLength(0);
  });

  it("does not fire for a single if (branchCount < 2)", () => {
    const m = buildModule(({ data, loc }) => {
      const f = data.requestField({ source: "body", name: "action", type: T.string, origin: loc() });
      const cond = data.binOp({
        operator: "===",
        left: f,
        right: data.literal({ value: "login", type: T.string, origin: loc() }),
        type: T.bool,
        origin: loc(),
      });
      return data.ifElse({
        cond,
        then: data.block({ statements: [], origin: loc() }),
        origin: loc(),
      });
    });
    expect(stringDispatchRecognizer.recognize(m)).toHaveLength(0);
  });
});
