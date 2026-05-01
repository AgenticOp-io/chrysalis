import { readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCRIPT = resolve(ROOT, "scripts/migration-debt.mjs");

describe("migration-debt --json-out", () => {
  test("writes summary JSON alongside human output", () => {
    const outPath = join(tmpdir(), `chrysalis-migration-debt-${Date.now()}.json`);
    const r = spawnSync(process.execPath, [SCRIPT, "--project", "fixtures/tiny-blog", "--json-out", outPath], {
      cwd: ROOT,
      encoding: "utf8",
    });
    try {
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("migration debt");
      expect(r.stdout).toContain("ingest:        monolithic");
      expect(r.stdout).toContain("wrote JSON summary:");
      const j = JSON.parse(readFileSync(outPath, "utf8")) as {
        kind: string;
        schemaVersion: number;
        toolVersion: string;
        generatedAt: string;
        corpus: unknown;
        correctness: unknown;
        residualLegacy: unknown;
        migration: unknown;
        oracleFootprintRouteCount: number;
        ingestSharding: { mode: string; shardCount?: number; shardIndex?: number } | null;
      };
      expect(j.kind).toBe("chrysalis.migration-debt.summary");
      expect(j.schemaVersion).toBe(1);
      expect(typeof j.toolVersion).toBe("string");
      expect(j.toolVersion.length).toBeGreaterThan(0);
      expect(typeof j.generatedAt).toBe("string");
      expect(j).toHaveProperty("corpus");
      expect(j).toHaveProperty("correctness");
      expect(j).toHaveProperty("residualLegacy");
      expect(j).toHaveProperty("migration");
      expect(typeof j.oracleFootprintRouteCount).toBe("number");
      expect(j).toHaveProperty("ingestSharding");
      expect(j.ingestSharding).toEqual({ mode: "monolithic" });
    } finally {
      try {
        unlinkSync(outPath);
      } catch {
        /* ignore */
      }
    }
  });

  test("forwards merge-all-shards and writes ingestSharding in JSON", () => {
    const outPath = join(tmpdir(), `chrysalis-migration-debt-shard-${Date.now()}.json`);
    const r = spawnSync(
      process.execPath,
      [
        SCRIPT,
        "--project",
        "fixtures/tiny-blog",
        "--merge-all-shards",
        "--shard-count",
        "2",
        "--json-out",
        outPath,
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
      },
    );
    try {
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("merge-all-shards K=2");
      const j = JSON.parse(readFileSync(outPath, "utf8")) as {
        ingestSharding: { mode: string; shardCount: number };
      };
      expect(j.ingestSharding).toEqual({ mode: "mergedShards", shardCount: 2 });
    } finally {
      try {
        unlinkSync(outPath);
      } catch {
        /* ignore */
      }
    }
  });

  test("forwards route shard flags and writes routeShard in JSON", () => {
    const outPath = join(tmpdir(), `chrysalis-migration-debt-rshard-${Date.now()}.json`);
    const r = spawnSync(
      process.execPath,
      [
        SCRIPT,
        "--project",
        "fixtures/tiny-blog",
        "--shard-index",
        "0",
        "--shard-count",
        "2",
        "--json-out",
        outPath,
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
      },
    );
    try {
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("route shard 0/2");
      const j = JSON.parse(readFileSync(outPath, "utf8")) as {
        ingestSharding: { mode: string; shardIndex: number; shardCount: number };
      };
      expect(j.ingestSharding).toEqual({ mode: "routeShard", shardIndex: 0, shardCount: 2 });
    } finally {
      try {
        unlinkSync(outPath);
      } catch {
        /* ignore */
      }
    }
  });
});
