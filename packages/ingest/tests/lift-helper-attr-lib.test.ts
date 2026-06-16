import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countHoles } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-attr-lib");

describe("ingest: lift-helper-attr-lib (G2286)", () => {
  it("ingests route with no holes", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(1);
    expect(countHoles(mod)).toBe(0);
  });

  it("attaches lib FunctionDecl attributes to helper call sites", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const calls = [...mod.nodes.values()].filter(
      (n) => n.dialect === "data" && n.op === "call" && String(n.attrs.callee) === "chrysalis_tagged_answer",
    );
    expect(calls.length).toBeGreaterThan(0);
    expect(
      (calls[0]!.attrs as { phpAttributes?: ReadonlyArray<{ name: string; args: ReadonlyArray<unknown> }> })
        .phpAttributes,
    ).toEqual([{ name: "\\Chrysalis\\Probe", args: ["lib"] }]);
  });
});
