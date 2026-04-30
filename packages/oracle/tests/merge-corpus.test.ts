import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { mergeCorpusDirectories } from "../src/index.js";

describe("mergeCorpusDirectories", () => {
  test("copies day-bucket NDJSON into a single readCorpus root", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-merge-"));
    try {
      const a = join(base, "a");
      const b = join(base, "b");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      mkdirSync(join(b, day), { recursive: true });
      writeFileSync(join(a, day, "t1.ndjson"), '{"type":"header"}\n');
      writeFileSync(join(b, day, "t2.ndjson"), '{"type":"header"}\n');
      const out = join(base, "merged");
      const r = mergeCorpusDirectories({ sources: [a, b], outDir: out });
      expect(r.copiedFiles).toBe(2);
      expect(r.skippedDuplicates).toBe(0);
      expect(existsSync(join(out, day, "t1.ndjson"))).toBe(true);
      expect(existsSync(join(out, day, "t2.ndjson"))).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("onDuplicate error throws when the same relative path exists", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-merge-dup-"));
    try {
      const a = join(base, "a");
      const b = join(base, "b");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      mkdirSync(join(b, day), { recursive: true });
      writeFileSync(join(a, day, "same.ndjson"), "a\n");
      writeFileSync(join(b, day, "same.ndjson"), "b\n");
      const out = join(base, "merged");
      mergeCorpusDirectories({ sources: [a], outDir: out });
      expect(() =>
        mergeCorpusDirectories({ sources: [b], outDir: out, onDuplicate: "error" }),
      ).toThrow(/duplicate trace path/);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("onDuplicate skip keeps the first copy", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-merge-skip-"));
    try {
      const a = join(base, "a");
      const b = join(base, "b");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      mkdirSync(join(b, day), { recursive: true });
      writeFileSync(join(a, day, "same.ndjson"), "first\n");
      writeFileSync(join(b, day, "same.ndjson"), "second\n");
      const out = join(base, "merged");
      const r = mergeCorpusDirectories({ sources: [a, b], outDir: out, onDuplicate: "skip" });
      expect(r.copiedFiles).toBe(1);
      expect(r.skippedDuplicates).toBe(1);
      expect(readFileSync(join(out, day, "same.ndjson"), "utf8")).toBe("first\n");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
