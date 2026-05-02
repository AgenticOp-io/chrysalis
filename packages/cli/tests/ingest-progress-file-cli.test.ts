import { readFileSync, unlinkSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/tiny-blog");

describe("ingest --ingest-progress-file", () => {
  test("writes progress JSON and rejects merge-all-shards combination", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-ingest-progress-"));
    const progressPath = join(dir, "progress.json");
    try {
      const r = spawnSync(
        process.execPath,
        [BIN, "ingest", FIXTURE, "--ingest-progress-file", progressPath],
        { encoding: "utf8", cwd: ROOT },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("progress JSON:");
      const j = JSON.parse(readFileSync(progressPath, "utf8")) as { kind: string; completedRouteKeys: string[] };
      expect(j.kind).toBe("chrysalis.ingest.progress");
      expect(j.completedRouteKeys.length).toBeGreaterThan(0);
    } finally {
      try {
        unlinkSync(progressPath);
      } catch {
        /* dir cleanup */
      }
    }

    const bad = spawnSync(
      process.execPath,
      [
        BIN,
        "ingest",
        FIXTURE,
        "--merge-all-shards",
        "--shard-count",
        "2",
        "--ingest-progress-file",
        join(dir, "x.json"),
      ],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(bad.status).toBe(2);
    expect(bad.stderr).toContain("cannot be used with --merge-all-shards");
  });
});
