import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CI_GATES = resolve(ROOT, "scripts/ci-gates.mjs");

function backendRow(
  id: "hono" | "fastify",
  correctness: number,
  summaryPath: string,
): Record<string, unknown> {
  return {
    backend: id,
    summaryPath,
    aggregate: {
      correctness,
      framesPassed: 10,
      framesTotal: 10,
    },
    failedFrameCount: 0,
    endpoints: [],
    correctness,
  };
}

function dualSummaryFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const dir = "/tmp/chrysalis-verify-dual-fixture";
  return {
    kind: "chrysalis.verify.summary.dual",
    schemaVersion: 1,
    toolVersion: "0.0.0",
    corpusRoot: "/tmp/traces",
    reportDir: "/tmp/reports/verify",
    pass: true,
    profile: "flagship-laravel-min",
    backends: [
      backendRow("hono", 1, join(dir, "hono", "summary.json")),
      backendRow("fastify", 1, join(dir, "fastify", "summary.json")),
    ],
    ...overrides,
  };
}

describe("ci-gates verify-dual-summary", () => {
  test("accepts full contract when profile matches CHRYSALIS_VERIFY_DUAL_PROFILE", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-verify-dual-"));
    const summaryPath = join(dir, "summary.json");
    try {
      writeFileSync(summaryPath, `${JSON.stringify(dualSummaryFixture(), null, 2)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "verify-dual-summary", summaryPath], {
        cwd: ROOT,
        encoding: "utf8",
        env: { ...process.env, CHRYSALIS_VERIFY_DUAL_PROFILE: "flagship-laravel-min" },
      });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails with a gate message when the summary file is not valid JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-verify-dual-badjson-"));
    const summaryPath = join(dir, "summary.json");
    try {
      writeFileSync(summaryPath, "{ not json\n", "utf8");
      const r = spawnSync(process.execPath, [CI_GATES, "verify-dual-summary", summaryPath], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("verify-dual-summary: invalid JSON");
      expect(r.stderr).toContain("summary.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails with a gate message when the summary file is missing", () => {
    const missing = join(tmpdir(), `chrysalis-verify-dual-missing-${Date.now()}.json`);
    const r = spawnSync(process.execPath, [CI_GATES, "verify-dual-summary", missing], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("verify-dual-summary: summary file missing");
    expect(r.stderr).toContain("pnpm run verify:e2e");
  });

  test("rejects when profile does not match CHRYSALIS_VERIFY_DUAL_PROFILE", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-verify-dual-"));
    const summaryPath = join(dir, "summary.json");
    try {
      writeFileSync(summaryPath, `${JSON.stringify(dualSummaryFixture(), null, 2)}\n`);
      const r = spawnSync(process.execPath, [CI_GATES, "verify-dual-summary", summaryPath], {
        cwd: ROOT,
        encoding: "utf8",
        env: { ...process.env, CHRYSALIS_VERIFY_DUAL_PROFILE: "flagship-laravel-full" },
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("expected profile");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
