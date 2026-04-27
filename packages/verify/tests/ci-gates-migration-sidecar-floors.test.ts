import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const ciGates = join(repoRoot, "scripts", "ci-gates.mjs");

function runFloors(migrationDir: string, env: Record<string, string | undefined>): void {
  execFileSync(process.execPath, [ciGates, "migration-sidecar-floors", migrationDir], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runReleaseFloors(migrationDir: string, env: Record<string, string | undefined>): void {
  execFileSync(process.execPath, [ciGates, "migration-sidecar-floors-release", migrationDir], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runFloorsExpectFail(migrationDir: string, env: Record<string, string | undefined>): string {
  try {
    execFileSync(process.execPath, [ciGates, "migration-sidecar-floors", migrationDir], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    const e = err as { status?: number; stderr?: string | Buffer; stdout?: string | Buffer };
    expect(e.status).toBe(1);
    const stderr = typeof e.stderr === "string" ? e.stderr : (e.stderr?.toString("utf8") ?? "");
    const stdout = typeof e.stdout === "string" ? e.stdout : (e.stdout?.toString("utf8") ?? "");
    return `${stderr}${stdout}`;
  }
  throw new Error("expected migration-sidecar-floors to exit non-zero");
}

describe("ci-gates migration-sidecar-floors", () => {
  it("skips when no floor env vars are set", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-floor-"));
    try {
      mkdirSync(dir, { recursive: true });
      expect(() =>
        runFloors(dir, {
          CHRYSALIS_IDIOMATICITY_MIN: "",
          CHRYSALIS_RESIDUAL_LEGACY_MAX: "",
        }),
      ).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("passes when thresholds are satisfied", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-floor-"));
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "idiomaticity.json"), `${JSON.stringify({ pct: 0.8, pilot: "test" })}\n`);
      writeFileSync(
        join(dir, "residual-legacy.json"),
        `${JSON.stringify({ legacyRequestPct: 5, pilot: "test" })}\n`,
      );
      expect(() =>
        runFloors(dir, {
          CHRYSALIS_IDIOMATICITY_MIN: "0.5",
          CHRYSALIS_RESIDUAL_LEGACY_MAX: "10",
        }),
      ).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails when idiomaticity pct is below min", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-floor-"));
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "idiomaticity.json"), `${JSON.stringify({ pct: 0.2 })}\n`);
      const out = runFloorsExpectFail(dir, { CHRYSALIS_IDIOMATICITY_MIN: "0.5" });
      expect(out).toContain("idiomaticity pct");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails when legacyRequestPct exceeds max", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-floor-"));
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "residual-legacy.json"), `${JSON.stringify({ legacyRequestPct: 40 })}\n`);
      const out = runFloorsExpectFail(dir, { CHRYSALIS_RESIDUAL_LEGACY_MAX: "25" });
      expect(out).toContain("legacyRequestPct");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails when idiomaticity.json is missing but min is set", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-floor-"));
    try {
      mkdirSync(dir, { recursive: true });
      const out = runFloorsExpectFail(dir, { CHRYSALIS_IDIOMATICITY_MIN: "0.1" });
      expect(out).toContain("missing");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("ci-gates migration-sidecar-floors-release", () => {
  it("uses default release thresholds when env vars are unset", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-sidecar-floor-release-"));
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "idiomaticity.json"), `${JSON.stringify({ pct: 0.02 })}\n`);
      writeFileSync(join(dir, "residual-legacy.json"), `${JSON.stringify({ legacyRequestPct: 40 })}\n`);
      expect(() =>
        runReleaseFloors(dir, {
          CHRYSALIS_IDIOMATICITY_MIN: "",
          CHRYSALIS_RESIDUAL_LEGACY_MAX: "",
          CHRYSALIS_RELEASE_IDIOMATICITY_MIN: "",
          CHRYSALIS_RELEASE_RESIDUAL_LEGACY_MAX: "",
        }),
      ).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
