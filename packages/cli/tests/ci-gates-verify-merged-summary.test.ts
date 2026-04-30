import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CI_GATES = resolve(ROOT, "scripts/ci-gates.mjs");
const FIXTURE = resolve(ROOT, "fixtures/ci/verify-merged-summary-smoke.json");

describe("ci-gates verify-merged-summary", () => {
  test("accepts fixture contract", () => {
    const r = spawnSync(process.execPath, [CI_GATES, "verify-merged-summary", FIXTURE], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("verify-merged-summary OK");
  });

  test("fails when merged correctness below CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-merged-gate-"));
    const p = join(dir, "bad.json");
    try {
      writeFileSync(
        p,
        JSON.stringify({
          kind: "chrysalis.verify.summary.merged",
          schemaVersion: 1,
          toolVersion: "0.0.0",
          shardCount: 1,
          inputs: [
            {
              path: "/x.json",
              shardIndex: 0,
              aggregate: { framesTotal: 1, framesPassed: 0, correctness: 0 },
            },
          ],
          merged: {
            generatedAt: "2026-01-01T00:00:00Z",
            aggregate: { framesTotal: 1, framesPassed: 0, correctness: 0 },
            endpoints: [],
          },
        }),
      );
      const r = spawnSync(process.execPath, [CI_GATES, "verify-merged-summary", p], {
        cwd: ROOT,
        encoding: "utf8",
        env: { ...process.env, CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS: "0.5" },
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
