import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { moduleToGoldenSnapshot } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");
const GOLDEN = resolve(__dirname, "golden/tiny-blog.webir.json");

describe("golden WebIR snapshots", () => {
  test("tiny-blog ingest matches committed golden fixture", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const actual = moduleToGoldenSnapshot(mod, { relativizeProjectRoot: FIXTURE });
    // Git on Windows may check out the golden with CRLF; JSON.stringify uses LF only.
    const expected = readFileSync(GOLDEN, "utf8").replace(/\r\n/g, "\n");
    expect(actual).toBe(expected);
  });
});
