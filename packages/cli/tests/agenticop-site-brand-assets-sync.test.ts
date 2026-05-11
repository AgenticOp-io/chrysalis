import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("agenticop-site assets", () => {
  test("hosted SVGs match branding/agenticop (canonical marks)", () => {
    const h = readFileSync(resolve(ROOT, "branding/agenticop/logo-horizontal.svg"), "utf8");
    const m = readFileSync(resolve(ROOT, "branding/agenticop/logo-mark.svg"), "utf8");
    expect(readFileSync(resolve(ROOT, "agenticop-site/assets/logo-horizontal.svg"), "utf8")).toBe(h);
    expect(readFileSync(resolve(ROOT, "agenticop-site/assets/logo-mark.svg"), "utf8")).toBe(m);
  });
});
