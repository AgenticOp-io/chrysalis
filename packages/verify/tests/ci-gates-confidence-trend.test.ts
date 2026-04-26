import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const ciGates = join(repoRoot, "scripts", "ci-gates.mjs");

type HistoryEntry = {
  timestamp: string;
  seedVariant: string;
  stressRuns: number;
  exitCode: number;
  semanticChecks: string;
  metamorphicChecks: string;
  minCorrectness: number;
  driftDetected: boolean;
  riskCovered: boolean;
  crossBackendParityOk?: boolean;
  matrixCrossBackendParityOk?: boolean;
};

function goodEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    timestamp: "2026-04-26T12:00:00.000Z",
    seedVariant: "baseline",
    stressRuns: 1,
    exitCode: 0,
    semanticChecks: "passed",
    metamorphicChecks: "passed",
    minCorrectness: 1,
    driftDetected: false,
    riskCovered: true,
    ...overrides,
  };
}

function runConfidenceTrend(historyPath: string): void {
  execFileSync(process.execPath, [ciGates, "confidence-trend", historyPath], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      CONFIDENCE_STREAK_REQUIRED: "3",
      CONFIDENCE_TREND_ALLOW_WARMUP: "0",
      CONFIDENCE_5NINES: "0.99999",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runConfidenceTrendExpectFail(historyPath: string): string {
  try {
    execFileSync(process.execPath, [ciGates, "confidence-trend", historyPath], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        CONFIDENCE_STREAK_REQUIRED: "3",
        CONFIDENCE_TREND_ALLOW_WARMUP: "0",
        CONFIDENCE_5NINES: "0.99999",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    const e = err as { status?: number; stderr?: string | Buffer; stdout?: string | Buffer };
    expect(e.status).toBe(1);
    const stderr = typeof e.stderr === "string" ? e.stderr : (e.stderr?.toString("utf8") ?? "");
    const stdout = typeof e.stdout === "string" ? e.stdout : (e.stdout?.toString("utf8") ?? "");
    return `${stderr}${stdout}`;
  }
  throw new Error("expected confidence-trend to exit non-zero");
}

describe("ci-gates confidence-trend crossBackendParityOk", () => {
  it("passes when recent entries omit crossBackendParityOk (legacy history)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-ci-gates-"));
    try {
      const path = join(dir, "history.json");
      const payload = {
        profile: "flagship-laravel-full",
        entries: [
          goodEntry({ timestamp: "2026-04-26T10:00:00.000Z" }),
          goodEntry({ timestamp: "2026-04-26T10:01:00.000Z" }),
          goodEntry({ timestamp: "2026-04-26T10:02:00.000Z" }),
        ],
      };
      writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      expect(() => runConfidenceTrend(path)).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("passes when crossBackendParityOk is explicitly true", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-ci-gates-"));
    try {
      const path = join(dir, "history.json");
      const payload = {
        profile: "flagship-laravel-full",
        entries: [
          goodEntry({ timestamp: "2026-04-26T11:00:00.000Z", crossBackendParityOk: true }),
          goodEntry({ timestamp: "2026-04-26T11:01:00.000Z", crossBackendParityOk: true }),
          goodEntry({ timestamp: "2026-04-26T11:02:00.000Z", crossBackendParityOk: true }),
        ],
      };
      writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      expect(() => runConfidenceTrend(path)).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails when any recent entry has crossBackendParityOk: false", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-ci-gates-"));
    try {
      const path = join(dir, "history.json");
      const payload = {
        profile: "flagship-laravel-full",
        entries: [
          goodEntry({ timestamp: "2026-04-26T09:00:00.000Z", crossBackendParityOk: true }),
          goodEntry({ timestamp: "2026-04-26T09:01:00.000Z", crossBackendParityOk: true }),
          goodEntry({ timestamp: "2026-04-26T09:02:00.000Z", crossBackendParityOk: false }),
        ],
      };
      writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      const combined = runConfidenceTrendExpectFail(path);
      expect(combined).toContain("cross-backend parity failed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails when any recent entry has matrixCrossBackendParityOk: false", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-ci-gates-"));
    try {
      const path = join(dir, "history.json");
      const payload = {
        profile: "flagship-laravel-full",
        entries: [
          goodEntry({ timestamp: "2026-04-26T08:00:00.000Z", matrixCrossBackendParityOk: true }),
          goodEntry({ timestamp: "2026-04-26T08:01:00.000Z", matrixCrossBackendParityOk: true }),
          goodEntry({ timestamp: "2026-04-26T08:02:00.000Z", matrixCrossBackendParityOk: false }),
        ],
      };
      writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      const combined = runConfidenceTrendExpectFail(path);
      expect(combined).toContain("matrix cross-backend parity failed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
