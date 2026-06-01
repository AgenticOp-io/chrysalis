import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");

describe("chrysalis cwl init", () => {
  test("bootstraps migration.cwl and is idempotent (G1142)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-cwl-init-"));
    try {
      const r1 = spawnSync(process.execPath, [BIN, "cwl", "init", dir, "--no-probe"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r1.status).toBe(0);
      expect(r1.stdout).toMatch(/wrote .*migration\.cwl/);
      const cwlPath = join(dir, ".chrysalis", "migration.cwl");
      expect(existsSync(cwlPath)).toBe(true);
      expect(readFileSync(cwlPath, "utf8")).toContain('@route GET "/health"');
      expect(existsSync(join(dir, ".chrysalis", "cwl-preview.json"))).toBe(true);

      const r2 = spawnSync(process.execPath, [BIN, "cwl", "init", dir, "--no-probe"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r2.status).toBe(0);
      expect(r2.stdout).toMatch(/already exists/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
