import { describe, expect, test } from "vitest";
import type { NodeBase, WebIRType } from "../src/index.js";
import { nodeId } from "../src/index.js";
import { canonicalWebIRType, mergeDedupeStructuralKey } from "../src/merge-dedupe-key.js";

function minimalNode(overrides: Partial<NodeBase>): NodeBase {
  return {
    id: nodeId("stub"),
    dialect: "data",
    op: "literal",
    type: { kind: "int" },
    effects: [],
    operands: [],
    attrs: {},
    origin: { kind: "php", file: "lib/x.php", line: 10, col: 0 },
    provenance: [],
    ...overrides,
  };
}

describe("mergeDedupeStructuralKey", () => {
  test("same shape and operand keys yield the same key", () => {
    const a = minimalNode({});
    const b = minimalNode({ id: nodeId("other") });
    const k1 = mergeDedupeStructuralKey(a, []);
    const k2 = mergeDedupeStructuralKey(b, []);
    expect(k1).toBe(k2);
  });

  test("different PHP file in origin yields a different key", () => {
    const a = minimalNode({
      origin: { kind: "php", file: "a.php", line: 1, col: 0 },
    });
    const b = minimalNode({
      origin: { kind: "php", file: "b.php", line: 1, col: 0 },
    });
    expect(mergeDedupeStructuralKey(a, [])).not.toBe(mergeDedupeStructuralKey(b, []));
  });

  test("operand subtree keys are order-sensitive", () => {
    const base = minimalNode({ op: "pair" });
    const k1 = mergeDedupeStructuralKey(base, ["aa", "bb"]);
    const k2 = mergeDedupeStructuralKey(base, ["bb", "aa"]);
    expect(k1).not.toBe(k2);
  });
});

describe("canonicalWebIRType", () => {
  test("union members are canonicalized (order-independent)", () => {
    const u1: WebIRType = {
      kind: "union",
      members: [{ kind: "int" }, { kind: "string" }],
    };
    const u2: WebIRType = {
      kind: "union",
      members: [{ kind: "string" }, { kind: "int" }],
    };
    expect(canonicalWebIRType(u1)).toBe(canonicalWebIRType(u2));
  });

  test("record field order is canonicalized", () => {
    const r1: WebIRType = {
      kind: "record",
      fields: { a: { kind: "int" }, b: { kind: "string" } },
    };
    const r2: WebIRType = {
      kind: "record",
      fields: { b: { kind: "string" }, a: { kind: "int" } },
    };
    expect(canonicalWebIRType(r1)).toBe(canonicalWebIRType(r2));
  });
});
