import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { moduleToGoldenSnapshot } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(testDir, "../../../fixtures/tiny-blog");
const GOLDEN = resolve(testDir, "golden/tiny-blog.webir.json");

describe("golden WebIR snapshots", () => {
  test("tiny-blog ingest matches committed golden fixture", async () => {
    const fixtureRoot = resolve(FIXTURE);
    const mod = await ingestDirectory(fixtureRoot);
    const actual = moduleToGoldenSnapshot(mod, { relativizeProjectRoot: fixtureRoot });
    // Git on Windows may check out the golden with CRLF; JSON.stringify uses LF only.
    const expected = readFileSync(GOLDEN, "utf8").replace(/\r\n/g, "\n");
    expect(actual).toBe(expected);
  });
});
