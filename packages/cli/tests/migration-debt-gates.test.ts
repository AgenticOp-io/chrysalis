import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCRIPT = resolve(ROOT, "scripts/migration-debt.mjs");
describe("migration-debt gates", () => {
  test("--min-correctness 1 passes when aggregate correctness is 1", () => {
    const reportDir = join(ROOT, "fixtures/ci/tiny-blog-verify-for-status");
    const r = spawnSync(
      process.execPath,
      [SCRIPT, "--project", "fixtures/tiny-blog", "--report", reportDir, "--min-correctness", "1"],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(r.status).toBe(0);
  });

  test("--min-correctness above 1 is rejected", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--project", "fixtures/tiny-blog", "--min-correctness", "1.01"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(2);
  });

  test("invalid --max-holes is rejected", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--project", "fixtures/tiny-blog", "--max-holes", "x"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(2);
  });

  test("--max-holes passes for tiny-blog (zero holes)", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--project", "fixtures/tiny-blog", "--max-holes", "0"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
  });

  test("--max-holes exits 4 when holeCount exceeds bound", () => {
    const r = spawnSync(
      process.execPath,
      [SCRIPT, "--project", "fixtures/db-query-unknown-receiver-probe", "--max-holes", "0"],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(r.status).toBe(4);
    expect(r.stderr).toContain("exceeds --max-holes");
  });

  test("--max-holes 1 passes for db-query-unknown-receiver-probe (single expected hole)", () => {
    const r = spawnSync(
      process.execPath,
      [SCRIPT, "--project", "fixtures/db-query-unknown-receiver-probe", "--max-holes", "1"],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(r.status).toBe(0);
  });

  test("--max-holes 0 passes for laravel-shaped-db-factory-probe", () => {
    const r = spawnSync(
      process.execPath,
      [SCRIPT, "--project", "fixtures/laravel-shaped-db-factory-probe", "--max-holes", "0"],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(r.status).toBe(0);
  });

  test("--min-correctness exits 4 when status has no correctness aggregate", () => {
    const emptyCwd = mkdtempSync(join(tmpdir(), "chrysalis-mig-debt-"));
    const reportDir = join(emptyCwd, "reports", "verify");
    try {
      mkdirSync(reportDir, { recursive: true });
      const r = spawnSync(
        process.execPath,
        [
          SCRIPT,
          "--project",
          resolve(ROOT, "fixtures/tiny-blog"),
          "--report",
          reportDir,
          "--min-correctness",
          "0.5",
        ],
        { cwd: ROOT, encoding: "utf8" },
      );
      expect(r.status).toBe(4);
      expect(r.stderr).toContain("requires correctness.aggregate");
    } finally {
      rmSync(emptyCwd, { recursive: true, force: true });
    }
  });
});
