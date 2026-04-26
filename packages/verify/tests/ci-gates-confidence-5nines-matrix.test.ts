import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const ciGates = join(repoRoot, "scripts", "ci-gates.mjs");

function covered(cell: string, value: number, min: number, unit: string) {
  return {
    cell,
    status: "covered" as const,
    kpi: { value, min, unit },
    evidence: "fixture",
  };
}

/** Minimal variant payload satisfying `confidence-5nines` when stressRuns=3, single seed. */
function minimalVariant() {
  const stressRuns = 3;
  return {
    variant: "baseline",
    semanticChecks: "passed",
    metamorphicChecks: "passed",
    exitCode: 0,
    riskCells: [
      covered("http-health-and-metadata", 6, 6, "traces"),
      covered("redirect-contract", 1, 1, "traces"),
      covered("session-auth-happy-path", 8, 8, "traces"),
      covered("session-auth-negative-path", 5, 5, "traces"),
      covered("session-idempotency", 2, 2, "traces"),
      covered("session-transition-monotonicity", 4, 4, "traces"),
      covered("request-shape-robustness", 5, 5, "traces"),
      covered("header-contract-strictness", 6, 6, "traces"),
      covered("redirect-location-invariants", 1, 1, "traces"),
      covered("cookie-session-header-invariants", 8, 8, "traces"),
      covered("sql-aggregates-and-cte", 8, 8, "traces"),
      covered("seed-cardinality-variance", 1, 1, "variants"),
      covered("determinism-under-replay", stressRuns, 1, "runs"),
      covered("dual-emitter-parity", 2, 2, "backends"),
      covered("cross-backend-verify-parity", 1, 1, "match"),
      covered("overall-corpus-volume", 120, 1, "traces"),
    ],
    backends: [
      { backend: "hono", driftDetected: false, minCorrectness: 1, stressRuns, maxCorrectness: 1, threshold: 0.99999 },
      { backend: "fastify", driftDetected: false, minCorrectness: 1, stressRuns, maxCorrectness: 1, threshold: 0.99999 },
    ],
  };
}

function runConfidence5Nines(path: string): void {
  execFileSync(process.execPath, [ciGates, "confidence-5nines", path], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, CONFIDENCE_5NINES: "0.99999" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runConfidence5NinesExpectFail(path: string): string {
  try {
    execFileSync(process.execPath, [ciGates, "confidence-5nines", path], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, CONFIDENCE_5NINES: "0.99999" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    const e = err as { status?: number; stderr?: string | Buffer; stdout?: string | Buffer };
    expect(e.status).toBe(1);
    const stderr = typeof e.stderr === "string" ? e.stderr : (e.stderr?.toString("utf8") ?? "");
    const stdout = typeof e.stdout === "string" ? e.stdout : (e.stdout?.toString("utf8") ?? "");
    return `${stderr}${stdout}`;
  }
  throw new Error("expected confidence-5nines to exit non-zero");
}

describe("ci-gates confidence-5nines matrix rollup", () => {
  it("requires matrixCrossBackendParityOk when matrix is present", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-5nines-matrix-"));
    try {
      const path = join(dir, "confidence.json");
      const payload = {
        profile: "flagship-laravel-full",
        target: "5-nines-confidence",
        matrix: [minimalVariant()],
        matrixExit: 0,
        matrixCrossBackendParityOk: false,
      };
      writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      const out = runConfidence5NinesExpectFail(path);
      expect(out).toContain("matrixCrossBackendParityOk");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("passes when matrixCrossBackendParityOk is true", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-5nines-matrix-"));
    try {
      const path = join(dir, "confidence.json");
      const payload = {
        profile: "flagship-laravel-full",
        target: "5-nines-confidence",
        matrix: [minimalVariant()],
        matrixExit: 0,
        matrixCrossBackendParityOk: true,
      };
      writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      expect(() => runConfidence5Nines(path)).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
