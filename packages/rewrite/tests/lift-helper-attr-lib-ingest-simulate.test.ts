import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ingestDirectory } from "@chrysalis/ingest";
import { type NodeId } from "@chrysalis/webir";
import { simulateHandler, type RequestInput } from "../src/simulate.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-attr-lib");

const emptyInput: RequestInput = {
  method: "GET",
  path: "/show",
  query: {},
  post: {},
  cookies: {},
  session: {},
  pathParams: {},
};

function routeIdForPath(
  m: {
    nodes: Map<NodeId, { dialect: string; op: string; attrs: Record<string, unknown> }>;
    roots: readonly NodeId[];
  },
  path: string,
): NodeId {
  for (const rootId of m.roots) {
    const route = m.nodes.get(rootId);
    if (route?.dialect === "web.request" && route.op === "route" && route.attrs.path === path) {
      return rootId;
    }
  }
  throw new Error(`no route for ${path}`);
}

describe("simulate: lift-helper-attr-lib ingest e2e (G2290)", () => {
  it("ingested route records lib helper phpAttributes under simulate", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const res = simulateHandler(mod, routeIdForPath(mod, "/show"), emptyInput);
    expect(res.phpAttributedCalls).toEqual([
      {
        callee: "chrysalis_tagged_answer",
        phpAttributes: [{ name: "\\Chrysalis\\Probe", args: ["lib"] }],
      },
    ]);
  });
});
