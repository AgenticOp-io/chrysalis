import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CI_GATES = resolve(ROOT, "scripts/ci-gates.mjs");

function envWithoutSidecarFloors(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.CHRYSALIS_IDIOMATICITY_MIN;
  delete env.CHRYSALIS_RESIDUAL_LEGACY_MAX;
  return env;
}

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
      const env = envWithoutSidecarFloors();
      env.CHRYSALIS_IDIOMATICITY_MIN = "0.5";
      const r = spawnSync(process.execPath, [CI_GATES, "migration-sidecar-floors", dir], {
        cwd: ROOT,
        encoding: "utf8",
        env,
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("migration-sidecar-floors: invalid JSON");
      expect(r.stderr).toContain("idiomaticity.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("migration-sidecar-floors fails when idiomaticity.json is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-missing-idio-"));
    try {
      const env = envWithoutSidecarFloors();
      env.CHRYSALIS_IDIOMATICITY_MIN = "0.5";
      const r = spawnSync(process.execPath, [CI_GATES, "migration-sidecar-floors", dir], {
        cwd: ROOT,
        encoding: "utf8",
        env,
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("migration-sidecar-floors:");
      expect(r.stderr).toContain("missing (CHRYSALIS_IDIOMATICITY_MIN is set)");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("migration-sidecar-floors fails when residual-legacy.json is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-missing-residual-"));
    try {
      const env = envWithoutSidecarFloors();
      env.CHRYSALIS_RESIDUAL_LEGACY_MAX = "50";
      const r = spawnSync(process.execPath, [CI_GATES, "migration-sidecar-floors", dir], {
        cwd: ROOT,
        encoding: "utf8",
        env,
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("migration-sidecar-floors:");
      expect(r.stderr).toContain("missing (CHRYSALIS_RESIDUAL_LEGACY_MAX is set)");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("migration-sidecar-floors reports invalid JSON for residual-legacy.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-bad-residual-"));
    try {
      writeFileSync(join(dir, "residual-legacy.json"), "not json\n", "utf8");
      const env = envWithoutSidecarFloors();
      env.CHRYSALIS_RESIDUAL_LEGACY_MAX = "50";
      const r = spawnSync(process.execPath, [CI_GATES, "migration-sidecar-floors", dir], {
        cwd: ROOT,
        encoding: "utf8",
        env,
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("migration-sidecar-floors: invalid JSON");
      expect(r.stderr).toContain("residual-legacy.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("migration-sidecar-floors skips when floor env vars are unset", () => {
    const r = spawnSync(process.execPath, [CI_GATES, "migration-sidecar-floors", "."], {
      cwd: ROOT,
      encoding: "utf8",
      env: envWithoutSidecarFloors(),
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("migration-sidecar-floors skipped");
  });

  test("tiny-n1-insight reports invalid JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-insight-badjson-"));
    const p = join(dir, "insight.json");
    try {
      writeFileSync(p, "[\n", "utf8");
      const r = spawnSync(process.execPath, [CI_GATES, "tiny-n1-insight", p], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("tiny-n1-insight: invalid JSON");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("confidence-5nines reports invalid JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-5nines-badjson-"));
    const p = join(dir, "full.json");
    try {
      writeFileSync(p, "{\n", "utf8");
      const r = spawnSync(process.execPath, [CI_GATES, "confidence-5nines", p], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("confidence-5nines: invalid JSON");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("confidence-trend warms up when history file is missing", () => {
    const missing = join(tmpdir(), `chrysalis-trend-warm-${Date.now()}.json`);
    const env = { ...process.env, CONFIDENCE_TREND_ALLOW_WARMUP: "1" };
    const r = spawnSync(process.execPath, [CI_GATES, "confidence-trend", missing], {
      cwd: ROOT,
      encoding: "utf8",
      env,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("confidence-trend warmup");
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

  test("tiny-n1-rewrite reports file missing for rewrite report JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-tiny-n1-rewrite-empty-"));
    try {
      const r = spawnSync(process.execPath, [CI_GATES, "tiny-n1-rewrite", dir], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("tiny-n1-rewrite: file missing");
      expect(r.stderr).toContain("tiny-n1.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
