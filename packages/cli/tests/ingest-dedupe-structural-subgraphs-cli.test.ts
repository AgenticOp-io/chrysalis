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

  test("ingest phase logs D283 and emit completes (fastify)", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-ingest-dedupe-fastify-"));
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
          "fastify",
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

  test("merge-all-shards K=2 logs merge + D283 and emits hono", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-merge-dedupe-"));
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
      expect(r.stdout).toContain("handlers:");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("chrysalis convert --ingest-dedupe-structural-subgraphs", () => {
  test("delegates to emit and completes hono out", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-convert-ingest-dedupe-"));
    try {
      const r = spawnSync(
        process.execPath,
        [
          BIN,
          "convert",
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

describe("chrysalis status --project --ingest-dedupe-structural-subgraphs", () => {
  test("--json keeps migration.coverage.nodes and holes (dedupe shrinks Module map)", () => {
    const base = spawnSync(
      process.execPath,
      [BIN, "status", "--project", FIXTURE, "--json"],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(base.status).toBe(0);
    const baseSummary = JSON.parse(base.stdout) as {
      migration: { coverage: { nodes: number; holes: number } | null };
    };
    expect(baseSummary.migration.coverage).not.toBeNull();
    const baseNodes = baseSummary.migration.coverage!.nodes;
    const baseHoles = baseSummary.migration.coverage!.holes;

    const deduped = spawnSync(
      process.execPath,
      [BIN, "status", "--project", FIXTURE, "--json", "--ingest-dedupe-structural-subgraphs"],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(deduped.status).toBe(0);
    const dSummary = JSON.parse(deduped.stdout) as {
      migration: { coverage: { nodes: number; holes: number } | null };
    };
    expect(dSummary.migration.coverage).not.toBeNull();
    expect(dSummary.migration.coverage!.nodes).toBe(baseNodes);
    expect(dSummary.migration.coverage!.holes).toBe(baseHoles);
  });
});

describe("chrysalis insight --ingest-dedupe-structural-subgraphs", () => {
  test("--json produces insight report for tiny-blog sourceApp", () => {
    const r = spawnSync(
      process.execPath,
      [BIN, "insight", FIXTURE, "--json", "--ingest-dedupe-structural-subgraphs"],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(r.status).toBe(0);
    const report = JSON.parse(r.stdout) as { sourceApp: string; summary: { total: number } };
    expect(report.sourceApp).toBe("tiny-blog");
    expect(typeof report.summary.total).toBe("number");
  });
});
