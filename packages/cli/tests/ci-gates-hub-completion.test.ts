import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CI_GATES = resolve(ROOT, "scripts/ci-gates.mjs");

describe("ci-gates hub-completion", () => {
  test("accepts valid completion JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-gate-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 0,
          ok: true,
          matrixSmoke: { passed: 21, failed: 0, skipped: 0 },
          goldVerify: { ok: true },
          routeGrades: { gold: 10, silver: 50, open: 200 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("hub-completion OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
