import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { summarizeEmittedTypeScriptLayout } from "../src/emitted-ts-layout.js";

describe("summarizeEmittedTypeScriptLayout", () => {
  test("counts .ts files, lines, and largest file (tie: lexicographically first path)", () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-emit-layout-"));
    try {
      mkdirSync(join(root, "src", "routes"), { recursive: true });
      writeFileSync(join(root, "src", "a.ts"), "1\n2\n3", "utf8");
      writeFileSync(join(root, "src", "routes", "b.ts"), "x\ny", "utf8");
      mkdirSync(join(root, "node_modules", "x"), { recursive: true });
      writeFileSync(join(root, "node_modules", "x", "bad.ts"), "ignored\n", "utf8");
      const s = summarizeEmittedTypeScriptLayout(root);
      expect(s.tsFileCount).toBe(2);
      expect(s.tsLineCount).toBe(3 + 2);
      expect(s.largestFileLineCount).toBe(3);
      expect(s.largestFileRelativePath).toBe("src/a.ts");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("missing directory yields zeros", () => {
    const s = summarizeEmittedTypeScriptLayout(join(tmpdir(), "chrysalis-missing-emit-root-xyz"));
    expect(s.tsFileCount).toBe(0);
    expect(s.largestFileRelativePath).toBeNull();
  });

  test("counts src/chrysalis-deduped/*.ts like any other emitted .ts", () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-emit-layout-dedupe-dir-"));
    try {
      mkdirSync(join(root, "src", "chrysalis-deduped"), { recursive: true });
      writeFileSync(
        join(root, "src", "chrysalis-deduped", "chrysalisBodyDedupe_abcd0123ef456789.ts"),
        `export async function chrysalisBodyDedupe_abcd0123ef456789(c: Context): Promise<Response> {\n  return __hole("x");\n}\n`,
        "utf8",
      );
      const s = summarizeEmittedTypeScriptLayout(root);
      expect(s.tsFileCount).toBe(1);
      expect(s.tsLineCount).toBeGreaterThanOrEqual(1);
      expect(s.largestFileRelativePath).toBe(
        "src/chrysalis-deduped/chrysalisBodyDedupe_abcd0123ef456789.ts",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("counts src/chrysalis-runtime-imports.ts like any other emitted .ts", () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-emit-layout-sri-file-"));
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      writeFileSync(
        join(root, "src", "chrysalis-runtime-imports.ts"),
        `export { escapeHtml } from "./runtime.js";\n`,
        "utf8",
      );
      const s = summarizeEmittedTypeScriptLayout(root);
      expect(s.tsFileCount).toBe(1);
      expect(s.tsLineCount).toBeGreaterThanOrEqual(1);
      expect(s.largestFileRelativePath).toBe("src/chrysalis-runtime-imports.ts");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
