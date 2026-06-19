import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { ingestDirectory } from "@chrysalis/ingest";
import { normalizeSimValue, simulateHandler, DEFAULT_STUB_DB } from "../src/simulate.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/session-resolve-probe");

describe("rewrite: session.read echo (G6226)", () => {
  it("normalizes loose session kind labels", () => {
    expect(normalizeSimValue({ kind: "string", value: "42" } as never)).toEqual({
      kind: "str",
      value: "42",
    });
    expect(normalizeSimValue({ kind: "int", value: 7 } as never)).toEqual({
      kind: "num",
      value: 7,
    });
  });

  it("echoes $_SESSION via effect.session.read", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const sim = simulateHandler(
      mod,
      mod.roots[0]!,
      {
        method: "GET",
        path: "/whoami",
        query: {},
        post: {},
        cookies: {},
        session: { user_id: { kind: "string", value: "42" } as never },
        pathParams: {},
      },
      DEFAULT_STUB_DB,
    );
    expect(sim.errors).toEqual([]);
    expect(sim.body).toBe('{"user_id":"42"}');
  });
});
