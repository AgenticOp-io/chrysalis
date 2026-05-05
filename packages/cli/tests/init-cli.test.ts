import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");

describe("chrysalis init", () => {
  test("writes chrysalis.project.json and is idempotent", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-init-"));
    try {
      const r1 = spawnSync(process.execPath, [BIN, "init", dir], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r1.status).toBe(0);
      expect(r1.stdout).toMatch(/initialized project/);
      const marker = join(dir, "chrysalis.project.json");
      const j = JSON.parse(readFileSync(marker, "utf8")) as {
        kind: string;
        schemaVersion: string;
        initializedAt: string;
      };
      expect(j.kind).toBe("chrysalis.project");
      expect(j.schemaVersion).toBe("1.0.0");
      expect(typeof j.initializedAt).toBe("string");

      const r2 = spawnSync(process.execPath, [BIN, "init", dir], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r2.status).toBe(0);
      expect(r2.stdout).toMatch(/already initialized/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("refuses to overwrite unknown marker file", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-init-bad-"));
    try {
      writeFileSync(join(dir, "chrysalis.project.json"), `${JSON.stringify({ x: 1 })}\n`, "utf8");
      const r = spawnSync(process.execPath, [BIN, "init", dir], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/refusing to overwrite/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
