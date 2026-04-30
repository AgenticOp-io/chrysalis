import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
});
