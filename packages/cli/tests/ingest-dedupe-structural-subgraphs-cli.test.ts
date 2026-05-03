import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/tiny-blog");

function parseNodes(stdout: string): number | null {
  const m = stdout.match(/nodes:\s+(\d+)/);
  if (!m) return null;
  return Number.parseInt(m[1]!, 10);
}

describe("chrysalis ingest --ingest-dedupe-structural-subgraphs", () => {
  test("logs D283 line and reports fewer or equal nodes vs default ingest", () => {
    const base = spawnSync(process.execPath, [BIN, "ingest", FIXTURE], {
      encoding: "utf8",
      cwd: ROOT,
    });
    expect(base.status).toBe(0);
    const baseNodes = parseNodes(base.stdout);
    expect(baseNodes).not.toBeNull();

    const deduped = spawnSync(
      process.execPath,
      [BIN, "ingest", FIXTURE, "--ingest-dedupe-structural-subgraphs"],
      {
        encoding: "utf8",
        cwd: ROOT,
      },
    );
    expect(deduped.status).toBe(0);
    expect(deduped.stdout).toContain(
      "[ingest] structural subgraph dedupe: dedupeStructuralSubgraphsInModule (DESIGN D283)",
    );
    const dedupedNodes = parseNodes(deduped.stdout);
    expect(dedupedNodes).not.toBeNull();
    expect(dedupedNodes!).toBeLessThanOrEqual(baseNodes!);
  });

  test("combines with --merge-all-shards (stdout mentions both)", () => {
    const r = spawnSync(
      process.execPath,
      [
        BIN,
        "ingest",
        FIXTURE,
        "--merge-all-shards",
        "--shard-count",
        "2",
        "--ingest-dedupe-structural-subgraphs",
      ],
      {
        encoding: "utf8",
        cwd: ROOT,
      },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("merge-all-shards");
    expect(r.stdout).toContain("structural subgraph dedupe");
    expect(r.stdout).toContain("routes:");
  });
});

describe("chrysalis emit --ingest-dedupe-structural-subgraphs", () => {
  test("ingest phase logs D283 and emit completes (hono)", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-ingest-dedupe-"));
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
          "--ingest-dedupe-structural-subgraphs",
        ],
        {
          encoding: "utf8",
          cwd: ROOT,
        },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toContain(
        "[emit] ingest structural subgraph dedupe: dedupeStructuralSubgraphsInModule (DESIGN D283)",
      );
      expect(r.stdout).toContain("handlers:");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
