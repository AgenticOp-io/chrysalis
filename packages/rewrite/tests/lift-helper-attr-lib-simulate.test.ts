import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import { simulateHandler, type RequestInput } from "../src/simulate.js";
import { buildModule } from "./helpers.js";

const emptyInput: RequestInput = {
  method: "GET",
  path: "/show",
  query: {},
  post: {},
  cookies: {},
  session: {},
  pathParams: {},
};

function routeIdOf(m: ReturnType<typeof buildModule>) {
  const rootId = m.roots[0];
  if (!rootId) throw new Error("no route");
  return rootId;
}

describe("simulate: phpAttributes on data.call (G2288)", () => {
  it("records phpAttributes before evaluating the callee", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const call = data.call({
        callee: "chrysalis_tagged_answer",
        args: [data.literal({ value: 3, type: T.int, origin: loc() })],
        phpAttributes: [{ name: "\\Chrysalis\\Probe", args: ["lib"] }],
        type: T.int,
        origin: loc(),
      });
      return eff.echo({ value: call, origin: loc() });
    });
    const res = simulateHandler(m, routeIdOf(m), emptyInput);
    expect(res.phpAttributedCalls).toEqual([
      {
        callee: "chrysalis_tagged_answer",
        phpAttributes: [{ name: "\\Chrysalis\\Probe", args: ["lib"] }],
      },
    ]);
  });
});
