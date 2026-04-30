import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CI_GATES = resolve(ROOT, "scripts/ci-gates.mjs");

describe("ci-gates readJsonGateArtifact", () => {
  test("tiny-n1-insight reports file missing with hint", () => {
    const missing = join(tmpdir(), `chrysalis-tiny-n1-insight-${Date.now()}.json`);
    const r = spawnSync(process.execPath, [CI_GATES, "tiny-n1-insight", missing], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("tiny-n1-insight: file missing");
    expect(r.stderr).toContain("pnpm run ci:insight");
  });

  test("confidence-trend-ready reports invalid JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-trend-ready-badjson-"));
    const p = join(dir, "history.json");
    try {
      writeFileSync(p, "{\n", "utf8");
      const r = spawnSync(process.execPath, [CI_GATES, "confidence-trend-ready", p], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("confidence-trend-ready: invalid JSON");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rewrite-pre-xss reports file missing with hint", () => {
    const missing = join(tmpdir(), `chrysalis-rewrite-pre-${Date.now()}.json`);
    const r = spawnSync(process.execPath, [CI_GATES, "rewrite-pre-xss", missing], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("rewrite-pre-xss: file missing");
    expect(r.stderr).toContain("reports/rewrite/before.json");
  });

  test("confidence-5nines reports file missing with hint", () => {
    const missing = join(tmpdir(), `chrysalis-5nines-${Date.now()}.json`);
    const r = spawnSync(process.execPath, [CI_GATES, "confidence-5nines", missing], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("confidence-5nines: file missing");
    expect(r.stderr).toContain("flagship-laravel-full.json");
  });

  test("confidence-trend reports history file missing when warmup is off", () => {
    const missing = join(tmpdir(), `chrysalis-trend-${Date.now()}.json`);
    const r = spawnSync(process.execPath, [CI_GATES, "confidence-trend", missing], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, CONFIDENCE_TREND_ALLOW_WARMUP: "0" },
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("confidence-trend: history file missing");
  });

  test("migration-sidecar-floors reports invalid JSON for idiomaticity.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-badjson-"));
    try {
      writeFileSync(join(dir, "idiomaticity.json"), "not json\n", "utf8");
      const r = spawnSync(process.execPath, [CI_GATES, "migration-sidecar-floors", dir], {
        cwd: ROOT,
        encoding: "utf8",
        env: { ...process.env, CHRYSALIS_IDIOMATICITY_MIN: "0.5", CHRYSALIS_RESIDUAL_LEGACY_MAX: "" },
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("migration-sidecar-floors: invalid JSON");
      expect(r.stderr).toContain("idiomaticity.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("status-migration reports invalid JSON on stdin", () => {
    const r = spawnSync(process.execPath, [CI_GATES, "status-migration"], {
      cwd: ROOT,
      encoding: "utf8",
      input: "{",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("status-migration: invalid JSON on stdin");
  });
});
