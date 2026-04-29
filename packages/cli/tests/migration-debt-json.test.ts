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
      expect(r.stdout).toContain("wrote JSON summary:");
      const j = JSON.parse(readFileSync(outPath, "utf8")) as {
        generatedAt: string;
        corpus: unknown;
        correctness: unknown;
        residualLegacy: unknown;
        migration: unknown;
        oracleFootprintRouteCount: number;
      };
      expect(typeof j.generatedAt).toBe("string");
      expect(j).toHaveProperty("corpus");
      expect(j).toHaveProperty("correctness");
      expect(j).toHaveProperty("residualLegacy");
      expect(j).toHaveProperty("migration");
      expect(typeof j.oracleFootprintRouteCount).toBe("number");
    } finally {
      try {
        unlinkSync(outPath);
      } catch {
        /* ignore */
      }
    }
  });
});
