import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import { computeTaint } from "../src/taint.js";
import { buildModule } from "./helpers.js";

describe("taint primitive", () => {
  it("marks request.field as a source and propagates through concat", () => {
    const nodes: { concatId?: string; fieldId?: string; root?: string } = {};
    const m = buildModule(({ data, loc }) => {
      const field = data.requestField({ source: "query", name: "q", type: T.string, origin: loc() });
      const lit = data.literal({ value: "hello ", type: T.string, origin: loc() });
      const concat = data.concat({ parts: [lit, field], origin: loc() });
      nodes.fieldId = field;
      nodes.concatId = concat;
      nodes.root = concat;
      return concat;
    });
    const handler = findHandler(m);
    const body = handler.operands[0]!;
    const { taint, sources } = computeTaint(m, body);
    expect(sources.has(nodes.fieldId!)).toBe(true);
    expect(taint.get(nodes.fieldId!)).toBe("tainted");
    expect(taint.get(nodes.concatId!)).toBe("tainted");
  });

  it("treats htmlspecialchars as a sanitizer", () => {
    const ids: { escaped?: string; field?: string } = {};
    const m = buildModule(({ data, loc }) => {
      const field = data.requestField({ source: "query", name: "q", type: T.string, origin: loc() });
      const escaped = data.call({
        callee: "htmlspecialchars",
        args: [field],
        type: T.string,
        origin: loc(),
      });
      ids.field = field;
      ids.escaped = escaped;
      return escaped;
    });
    const handler = findHandler(m);
    const body = handler.operands[0]!;
    const { taint } = computeTaint(m, body);
    expect(taint.get(ids.field!)).toBe("tainted");
    expect(taint.get(ids.escaped!)).toBe("clean");
  });

  it("treats boolean comparisons as producing clean values", () => {
    const ids: { field?: string; cmp?: string } = {};
    const m = buildModule(({ data, loc }) => {
      const field = data.requestField({ source: "query", name: "role", type: T.string, origin: loc() });
      const lit = data.literal({ value: "admin", type: T.string, origin: loc() });
      const cmp = data.binOp({ operator: "===", left: field, right: lit, type: T.bool, origin: loc() });
      ids.field = field;
      ids.cmp = cmp;
      return cmp;
    });
    const handler = findHandler(m);
    const body = handler.operands[0]!;
    const { taint } = computeTaint(m, body);
    expect(taint.get(ids.cmp!)).toBe("clean");
  });

  it("resolves param bindings through __assign to track variable taint", () => {
    const ids: { use?: string } = {};
    const m = buildModule(({ data, loc }) => {
      const field = data.requestField({ source: "query", name: "q", type: T.string, origin: loc() });
      const assign = data.call({
        callee: "__assign",
        args: [data.literal({ value: "name", type: T.string, origin: loc() }), field],
        type: T.void,
        origin: loc(),
      });
      const use = data.param({ name: "name", type: T.string, origin: loc() });
      ids.use = use;
      return data.block({ statements: [assign, use], origin: loc() });
    });
    const handler = findHandler(m);
    const body = handler.operands[0]!;
    const { taint } = computeTaint(m, body);
    expect(taint.get(ids.use!)).toBe("tainted");
  });
});

function findHandler(m: import("@chrysalis/webir").Module) {
  const handler = Array.from(m.nodes.values()).find(
    (n) => n.dialect === "web.request" && n.op === "handler",
  );
  if (!handler) throw new Error("handler not found in module");
  return handler;
}
