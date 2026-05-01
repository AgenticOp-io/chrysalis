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

const EMIT_LAYOUT_ENV_KEYS = [
  "CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_LINES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_HONO_LARGEST_FILE_LINES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_FILES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_LINES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_LARGEST_FILE_LINES",
] as const;

function envWithoutEmitLayoutFloors(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  for (const k of EMIT_LAYOUT_ENV_KEYS) {
    delete env[k];
  }
  return env;
}

function minimalFlagshipEmitStats(overrides: Record<string, unknown> = {}) {
  const layout = {
    tsFileCount: 5,
    tsLineCount: 100,
    largestFileRelativePath: "src/a.ts",
    largestFileLineCount: 40,
  };
  return {
    schema: "chrysalis/flagship-laravel-min-emit-stats/1",
    manifestRoutes: 1,
    hono: { holes: 0, authHoles: 0, handlerCount: 1, layout: { ...layout } },
    fastify: { holes: 0, authHoles: 0, handlerCount: 1, layout: { ...layout } },
    ...overrides,
  };
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

  test("corpus-merge-summary reports file missing with hint", () => {
    const missing = join(tmpdir(), `chrysalis-corpus-merge-summary-${Date.now()}.json`);
    const r = spawnSync(process.execPath, [CI_GATES, "corpus-merge-summary", missing], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("corpus-merge-summary: summary file missing");
    expect(r.stderr).toContain("pnpm run ci:corpus-merge-summary");
  });

  test("corpus-merge-summary reports invalid JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-corpus-merge-badjson-"));
    const p = join(dir, "summary.json");
    try {
      writeFileSync(p, "{\n", "utf8");
      const r = spawnSync(process.execPath, [CI_GATES, "corpus-merge-summary", p], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("corpus-merge-summary: invalid JSON");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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

  test("emit-layout-floors skips when CHRYSALIS_EMIT_LAYOUT_MAX_* are unset", () => {
    const r = spawnSync(process.execPath, [CI_GATES, "emit-layout-floors", "."], {
      cwd: ROOT,
      encoding: "utf8",
      env: envWithoutEmitLayoutFloors(),
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("emit-layout-floors skipped");
  });

  test("emit-layout-floors fails when emit-stats file is missing", () => {
    const missing = join(tmpdir(), `chrysalis-emit-layout-${Date.now()}.json`);
    const env = envWithoutEmitLayoutFloors();
    env.CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES = "10";
    const r = spawnSync(process.execPath, [CI_GATES, "emit-layout-floors", missing], {
      cwd: ROOT,
      encoding: "utf8",
      env,
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("emit-layout-floors:");
    expect(r.stderr).toContain("emit-stats file missing");
  });

  test("emit-layout-floors reports invalid JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-emit-layout-badjson-"));
    const p = join(dir, "emit-stats.json");
    try {
      writeFileSync(p, "{\n", "utf8");
      const env = envWithoutEmitLayoutFloors();
      env.CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES = "10";
      const r = spawnSync(process.execPath, [CI_GATES, "emit-layout-floors", p], {
        cwd: ROOT,
        encoding: "utf8",
        env,
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("emit-layout-floors: invalid JSON");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("emit-layout-floors fails when hono tsFileCount exceeds ceiling", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-emit-layout-over-"));
    const p = join(dir, "emit-stats.json");
    try {
      writeFileSync(
        p,
        JSON.stringify(
          minimalFlagshipEmitStats({
            hono: {
              holes: 0,
              authHoles: 0,
              handlerCount: 1,
              layout: {
                tsFileCount: 100,
                tsLineCount: 1,
                largestFileRelativePath: "a.ts",
                largestFileLineCount: 1,
              },
            },
          }),
        ),
        "utf8",
      );
      const env = envWithoutEmitLayoutFloors();
      env.CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES = "50";
      const r = spawnSync(process.execPath, [CI_GATES, "emit-layout-floors", p], {
        cwd: ROOT,
        encoding: "utf8",
        env,
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("tsFileCount 100");
      expect(r.stderr).toContain("CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES 50");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("emit-layout-floors OK when within ceilings", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-emit-layout-ok-"));
    const p = join(dir, "emit-stats.json");
    try {
      writeFileSync(p, JSON.stringify(minimalFlagshipEmitStats()), "utf8");
      const env = envWithoutEmitLayoutFloors();
      env.CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES = "10";
      env.CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_FILES = "10";
      const r = spawnSync(process.execPath, [CI_GATES, "emit-layout-floors", p], {
        cwd: ROOT,
        encoding: "utf8",
        env,
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("emit-layout-floors OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
