import { describe, expect, it, vi } from "vitest";
import { NO_EFFECTS, nodeId, synthetic, type Module, type NodeBase } from "@chrysalis/webir";
import type { TraceOutcome } from "@chrysalis/verify";
import {
  createHttpChatRepairProposer,
  tryParseRepairEditsFromLlmJson,
} from "../src/http-chat-repair-proposer.js";

const origin = synthetic("http-chat-repair-test");

function literalNode(id: string, value: string): NodeBase {
  return {
    id: nodeId(id),
    dialect: "data",
    op: "literal",
    type: { kind: "literal", value },
    effects: NO_EFFECTS,
    operands: [],
    attrs: { value },
    origin,
    provenance: [],
  };
}

function parentNode(id: string, childId: string): NodeBase {
  return {
    id: nodeId(id),
    dialect: "data",
    op: "tuple",
    type: { kind: "unknown" },
    effects: NO_EFFECTS,
    operands: [nodeId(childId)],
    attrs: {},
    origin,
    provenance: [],
  };
}

describe("tryParseRepairEditsFromLlmJson", () => {
  it("accepts valid replaceOperand edits", () => {
    const a = literalNode("a", "x");
    const b = literalNode("b", "y");
    const p = parentNode("p", "a");
    const mod = {
      nodes: new Map([
        [a.id, a],
        [b.id, b],
        [p.id, p],
      ]),
      roots: [p.id],
      meta: { sourceApp: "t", createdAt: "", chrysalisVersion: "" },
    } as unknown as Module;
    const edits = tryParseRepairEditsFromLlmJson(mod, {
      edits: [{ kind: "replaceOperand", nodeId: "p", index: 0, newOperandId: "b" }],
    });
    expect(edits).toEqual([
      { kind: "replaceOperand", nodeId: "p", index: 0, newOperandId: "b" },
    ]);
  });

  it("rejects unknown nodes and bad indices", () => {
    const a = literalNode("a", "x");
    const p = parentNode("p", "a");
    const mod = {
      nodes: new Map([
        [a.id, a],
        [p.id, p],
      ]),
      roots: [p.id],
      meta: { sourceApp: "t", createdAt: "", chrysalisVersion: "" },
    } as unknown as Module;
    expect(
      tryParseRepairEditsFromLlmJson(mod, {
        edits: [{ kind: "replaceOperand", nodeId: "p", index: 0, newOperandId: "missing" }],
      }),
    ).toBe(null);
    expect(
      tryParseRepairEditsFromLlmJson(mod, {
        edits: [{ kind: "replaceOperand", nodeId: "p", index: 9, newOperandId: "a" }],
      }),
    ).toBe(null);
    expect(tryParseRepairEditsFromLlmJson(mod, { edits: [] })).toBe(null);
  });
});

describe("createHttpChatRepairProposer", () => {
  it("parses model JSON from chat response body", async () => {
    const a = literalNode("a", "x");
    const b = literalNode("b", "y");
    const p = parentNode("p", "a");
    const mod = {
      nodes: new Map([
        [a.id, a],
        [b.id, b],
        [p.id, p],
      ]),
      roots: [p.id],
      meta: { sourceApp: "t", createdAt: "", chrysalisVersion: "" },
    } as unknown as Module;

    const failing: TraceOutcome = {
      traceId: "t1",
      route: "GET /x",
      expected: { type: "http.response", status: 200, headers: {}, body: "", bodyTruncated: false, session: {} },
      actual: { status: 500, headers: {}, body: "" },
      diff: {
        divergences: [
          { kind: "status-mismatch", detail: "d", expected: "200", actual: "500" },
        ],
        bodySimilarity: 0,
        appliedTags: [],
      },
      ok: false,
      attributedNodeIds: ["p"],
    };

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                edits: [{ kind: "replaceOperand", nodeId: "p", index: 0, newOperandId: "b" }],
              }),
            },
          },
        ],
      }),
    });

    const proposer = createHttpChatRepairProposer({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      apiKey: "test-key",
      baseUrl: "https://example.invalid/v1/chat/completions",
      useJsonResponseFormat: false,
    });

    const edits = await proposer.propose({
      module: mod,
      failingOutcome: failing,
      iteration: 1,
    });
    expect(edits).toEqual([
      { kind: "replaceOperand", nodeId: "p", index: 0, newOperandId: "b" },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-key",
    });
  });

  it("abstains when there are no attributed nodes", async () => {
    const proposer = createHttpChatRepairProposer({
      fetchImpl: vi.fn() as unknown as typeof fetch,
      apiKey: "k",
      useJsonResponseFormat: false,
    });
    const failing: TraceOutcome = {
      traceId: "t1",
      route: "GET /x",
      expected: { type: "http.response", status: 200, headers: {}, body: "", bodyTruncated: false, session: {} },
      actual: { status: 500, headers: {}, body: "" },
      diff: { divergences: [], bodySimilarity: 0, appliedTags: [] },
      ok: false,
    };
    const edits = await proposer.propose({
      module: { nodes: new Map(), roots: [], meta: { sourceApp: "t", createdAt: "", chrysalisVersion: "" } } as Module,
      failingOutcome: failing,
      iteration: 1,
    });
    expect(edits).toBe(null);
  });
});
