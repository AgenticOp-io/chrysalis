import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { ingestDirectory } from "../src/index.js";
import { countHoles } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-n1");

describe("ingest: tiny-n1 fixture", () => {
  test("has five routes and zero IR holes (preg_match lowered to data.call)", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(5);
    expect(countHoles(mod)).toBe(0);
  });
});
