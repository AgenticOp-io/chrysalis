import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");

describe("corpus-merge CLI", () => {
  test("merges two trace roots with --out", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-corpus-merge-cli-"));
    try {
      const a = join(base, "a");
      const b = join(base, "b");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      mkdirSync(join(b, day), { recursive: true });
      writeFileSync(join(a, day, "one.ndjson"), "x\n");
      writeFileSync(join(b, day, "two.ndjson"), "y\n");
      const out = join(base, "merged");
      const r = spawnSync(process.execPath, [BIN, "corpus-merge", a, b, "--out", out], {
        encoding: "utf8",
        cwd: ROOT,
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/copied 2 trace file/);
      expect(existsSync(join(out, day, "one.ndjson"))).toBe(true);
      expect(existsSync(join(out, day, "two.ndjson"))).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("supports --dedupe-trace-id skip", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-corpus-merge-cli-dedupe-"));
    try {
      const a = join(base, "a");
      const b = join(base, "b");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      mkdirSync(join(b, day), { recursive: true });
      writeFileSync(join(a, day, "one.ndjson"), '{"type":"header","traceId":"same"}\n');
      writeFileSync(join(b, day, "two.ndjson"), '{"type":"header","traceId":"same"}\n');
      const out = join(base, "merged");
      const r = spawnSync(
        process.execPath,
        [BIN, "corpus-merge", a, b, "--out", out, "--dedupe-trace-id", "skip"],
        {
          encoding: "utf8",
          cwd: ROOT,
        },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/skipped 1 duplicate traceId/);
      expect(existsSync(join(out, day, "one.ndjson"))).toBe(true);
      expect(existsSync(join(out, day, "two.ndjson"))).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("supports deterministic sampling flags", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-corpus-merge-cli-sample-"));
    try {
      const a = join(base, "a");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      writeFileSync(join(a, day, "a.ndjson"), '{"type":"header","traceId":"alpha"}\n');
      writeFileSync(join(a, day, "b.ndjson"), '{"type":"header","traceId":"beta"}\n');
      writeFileSync(join(a, day, "c.ndjson"), '{"type":"header","traceId":"gamma"}\n');
      const out = join(base, "merged");
      const r = spawnSync(
        process.execPath,
        [BIN, "corpus-merge", a, "--out", out, "--sample-modulo", "2", "--sample-remainder", "0"],
        {
          encoding: "utf8",
          cwd: ROOT,
        },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/skipped .* by sampling/);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("supports --dry-run without writing output", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-corpus-merge-cli-dryrun-"));
    try {
      const a = join(base, "a");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      writeFileSync(join(a, day, "a.ndjson"), '{"type":"header","traceId":"alpha"}\n');
      const out = join(base, "merged");
      const r = spawnSync(
        process.execPath,
        [BIN, "corpus-merge", a, "--out", out, "--dry-run"],
        {
          encoding: "utf8",
          cwd: ROOT,
        },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/dry-run: no files written/);
      expect(existsSync(out)).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("writes summary JSON with --json-out", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-corpus-merge-cli-json-"));
    try {
      const a = join(base, "a");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      writeFileSync(join(a, day, "a.ndjson"), '{"type":"header","traceId":"alpha"}\n');
      const out = join(base, "merged");
      const jsonOut = join(base, "summary.json");
      const r = spawnSync(
        process.execPath,
        [BIN, "corpus-merge", a, "--out", out, "--json-out", jsonOut],
        {
          encoding: "utf8",
          cwd: ROOT,
        },
      );
      expect(r.status).toBe(0);
      expect(existsSync(jsonOut)).toBe(true);
      const j = JSON.parse(readFileSync(jsonOut, "utf8")) as {
        kind: string;
        schemaVersion: number;
        toolVersion: string;
        generatedAt: string;
        options: { outDir: string; onDuplicate: string; dedupeTraceId: string; dryRun: boolean };
        sources: string[];
        counts: { copiedFiles: number };
      };
      expect(j.kind).toBe("chrysalis.corpus-merge.summary");
      expect(j.schemaVersion).toBe(1);
      expect(typeof j.toolVersion).toBe("string");
      expect(j.toolVersion.length).toBeGreaterThan(0);
      expect(typeof j.generatedAt).toBe("string");
      expect(j.generatedAt.length).toBeGreaterThan(0);
      expect(j.options.onDuplicate).toBe("error");
      expect(j.options.dedupeTraceId).toBe("off");
      expect(j.options.dryRun).toBe(false);
      expect(j.sources.length).toBe(1);
      expect(j.counts.copiedFiles).toBe(1);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("writes summary JSON with --dry-run and --json-out (no files copied to out)", () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-corpus-merge-cli-json-dry-"));
    try {
      const a = join(base, "a");
      const day = "2026-04-29";
      mkdirSync(join(a, day), { recursive: true });
      writeFileSync(join(a, day, "a.ndjson"), '{"type":"header","traceId":"alpha"}\n');
      const out = join(base, "merged");
      const jsonOut = join(base, "summary.json");
      const r = spawnSync(
        process.execPath,
        [BIN, "corpus-merge", a, "--out", out, "--dry-run", "--json-out", jsonOut],
        {
          encoding: "utf8",
          cwd: ROOT,
        },
      );
      expect(r.status).toBe(0);
      expect(existsSync(out)).toBe(false);
      expect(existsSync(jsonOut)).toBe(true);
      const j = JSON.parse(readFileSync(jsonOut, "utf8")) as {
        options: { dryRun: boolean };
        counts: { copiedFiles: number };
      };
      expect(j.options.dryRun).toBe(true);
      expect(j.counts.copiedFiles).toBe(1);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
