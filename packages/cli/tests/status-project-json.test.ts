import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CLI_SRC = resolve(ROOT, "packages/cli/src/bin.ts");

function runCli(args: readonly string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", CLI_SRC, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
}

describe("cli status --project JSON", () => {
  test("includes residualLegacy hole breakdown for ingest dashboard", () => {
    const r = runCli(["status", "--project", "fixtures/throw-new-probe", "--json"]);
    expect(r.status).toBe(0);
    const summary = JSON.parse(r.stdout) as {
      ingestSharding: { mode: string } | null;
      residualLegacy: {
        holeCount: number;
        dialectCounts: Record<string, number>;
        topHoleReasons: ReadonlyArray<{ reason: string; count: number }>;
        dynamicNewHoleCount: number;
        dynamicNewWebIrCount: number;
      } | null;
    };
    expect(summary.ingestSharding).toEqual({ mode: "monolithic" });
    expect(summary.residualLegacy).not.toBeNull();
    expect(typeof summary.residualLegacy!.holeCount).toBe("number");
    expect(Array.isArray(summary.residualLegacy!.topHoleReasons)).toBe(true);
    expect(typeof summary.residualLegacy!.dynamicNewHoleCount).toBe("number");
    expect(typeof summary.residualLegacy!.dynamicNewWebIrCount).toBe("number");
    // dynnew.php + dynfqn.php each lower to one __new_dynamic call site
    expect(summary.residualLegacy!.dynamicNewWebIrCount).toBe(2);
    expect(summary.residualLegacy!.dynamicNewHoleCount).toBe(0);
  });

  test("migration correctness reads dual-backend stress run-N summaries", () => {
    const reportRoot = mkdtempSync(join(tmpdir(), "chrysalis-status-stress-"));
    const summary = {
      aggregate: { framesTotal: 10, framesPassed: 10, correctness: 1 },
      endpoints: [{ route: "GET /ping", correctness: 1 }],
    };
    for (const backend of ["hono", "fastify"] as const) {
      const dir = join(reportRoot, backend, "run-3");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "summary.json"), `${JSON.stringify(summary)}\n`);
    }
    const r = runCli([
      "status",
      "--project",
      "fixtures/tiny-blog",
      "--report",
      reportRoot,
      "--json",
    ]);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { migration: { correctness: number | null } };
    expect(out.migration.correctness).toBe(1);
  });
});
