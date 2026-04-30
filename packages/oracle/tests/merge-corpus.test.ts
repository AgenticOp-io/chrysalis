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
      expect(r.skippedBySampling).toBe(0);
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
      expect(r.skippedTraceIdDuplicates).toBe(0);
      expect(r.skippedBySampling).toBe(0);
      expect(readFileSync(join(out, day, "same.ndjson"), "utf8")).toBe("first\n");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("dedupeTraceId skip keeps first traceId regardless of destination path", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-merge-traceid-"));
    try {
      const a = join(base, "a");
      const b = join(base, "b");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      mkdirSync(join(b, day), { recursive: true });
      writeFileSync(join(a, day, "one.ndjson"), '{"type":"header","traceId":"t-1"}\n');
      writeFileSync(join(b, day, "two.ndjson"), '{"type":"header","traceId":"t-1"}\n');
      const out = join(base, "merged");
      const r = mergeCorpusDirectories({
        sources: [a, b],
        outDir: out,
        dedupeTraceId: "skip",
      });
      expect(r.copiedFiles).toBe(1);
      expect(r.skippedDuplicates).toBe(0);
      expect(r.skippedTraceIdDuplicates).toBe(1);
      expect(r.skippedBySampling).toBe(0);
      expect(existsSync(join(out, day, "one.ndjson"))).toBe(true);
      expect(existsSync(join(out, day, "two.ndjson"))).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("sampleModulo/sampleRemainder deterministically keep only matching traceIds", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-merge-sample-"));
    try {
      const a = join(base, "a");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      writeFileSync(join(a, day, "a.ndjson"), '{"type":"header","traceId":"alpha"}\n');
      writeFileSync(join(a, day, "b.ndjson"), '{"type":"header","traceId":"beta"}\n');
      writeFileSync(join(a, day, "c.ndjson"), '{"type":"header","traceId":"gamma"}\n');
      const out = join(base, "merged");
      const r = mergeCorpusDirectories({
        sources: [a],
        outDir: out,
        sampleModulo: 2,
        sampleRemainder: 0,
      });
      expect(r.copiedFiles + r.skippedBySampling).toBe(3);
      expect(r.skippedBySampling).toBeGreaterThanOrEqual(1);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("dryRun computes stats without writing files", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-merge-dryrun-"));
    try {
      const a = join(base, "a");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      writeFileSync(join(a, day, "a.ndjson"), '{"type":"header","traceId":"alpha"}\n');
      const out = join(base, "merged");
      const r = mergeCorpusDirectories({
        sources: [a],
        outDir: out,
        dryRun: true,
      });
      expect(r.copiedFiles).toBe(1);
      expect(existsSync(out)).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("dryRun counters match a live merge for the same sources and flags", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-merge-dryrun-parity-"));
    try {
      const a = join(base, "a");
      const b = join(base, "b");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      mkdirSync(join(b, day), { recursive: true });
      writeFileSync(join(a, day, "one.ndjson"), '{"type":"header","traceId":"x"}\n');
      writeFileSync(join(b, day, "one.ndjson"), '{"type":"header","traceId":"y"}\n');
      const outLive = join(base, "live");
      const outDry = join(base, "dry");
      const live = mergeCorpusDirectories({
        sources: [a, b],
        outDir: outLive,
        onDuplicate: "skip",
        dedupeTraceId: "skip",
      });
      const dry = mergeCorpusDirectories({
        sources: [a, b],
        outDir: outDry,
        onDuplicate: "skip",
        dedupeTraceId: "skip",
        dryRun: true,
      });
      expect(dry).toEqual(live);
      expect(existsSync(outLive)).toBe(true);
      expect(existsSync(outDry)).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
