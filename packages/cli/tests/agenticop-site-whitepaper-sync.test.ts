import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("agenticop-site", () => {
  test("agenticop-site/whitepaper.md matches docs/WHITEPAPER.md", () => {
    const canonical = readFileSync(resolve(ROOT, "docs/WHITEPAPER.md"), "utf8");
    const hosted = readFileSync(resolve(ROOT, "agenticop-site/whitepaper.md"), "utf8");
    expect(hosted).toBe(canonical);
  });
});
