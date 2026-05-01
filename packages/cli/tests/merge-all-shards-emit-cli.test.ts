import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/tiny-blog");

describe("chrysalis emit --merge-all-shards", () => {
  test("runs K shard ingests, merges, and emits (stdout mentions merge + handlers)", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-merge-emit-"));
    try {
      const r = spawnSync(
        process.execPath,
        [
          BIN,
          "emit",
          FIXTURE,
          "--out",
          out,
          "--target",
          "hono",
          "--merge-all-shards",
          "--shard-count",
          "2",
        ],
        {
          encoding: "utf8",
          cwd: ROOT,
        },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("merge-all-shards");
      expect(r.stdout).toContain("handlers:");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
