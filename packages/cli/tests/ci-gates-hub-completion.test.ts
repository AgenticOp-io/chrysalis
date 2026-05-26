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
          schemaVersion: 1,
          ok: true,
          matrixSmoke: { passed: 21, failed: 0, skipped: 0 },
          goldVerify: { ok: true },
          traceReplay: { ok: true, correctness: 1, routeCount: 2 },
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

  test("accepts schema v3 with crossLanguageSynthesis", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v3-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 3,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true },
          traceReplay: { ok: true, correctness: 1 },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 14, originCount: 23 },
          routeGrades: { gold: 14, silver: 279, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v6 with expected suite counts", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v6-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 6,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 24, expectedSuiteCount: 24, suiteIds: ["js-literal-hono"] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 16,
            expectedSuiteCount: 16,
            suiteIds: ["js-literal-hono"],
            targets: ["hono", "fastify"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 17, originCount: 23 },
          routeGrades: { gold: 17, silver: 276, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v5 with gold suite ids", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v5-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 5,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 20, suiteIds: ["js-literal-hono"] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 14,
            suiteIds: ["js-literal-hono"],
            targets: ["hono", "fastify"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 17, originCount: 23 },
          routeGrades: { gold: 17, silver: 276, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v7 with goldCoverage", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v7-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 10,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 30, expectedSuiteCount: 30, suiteIds: [] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 16,
            expectedSuiteCount: 16,
            suiteIds: [],
            targets: ["hono", "fastify"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 575, originCount: 23 },
          goldCoverage: {
            ok: true,
            goldMatrix: 575,
            oracleTier: 3,
            structuralTier: 14,
            hubCiStructuralPairs: 14,
            chrysalisCiGoldPairs: 4,
            coverageGaps: 0,
          },
          nativeStructuralGold: {
            targets: ["python", "java", "go", "ruby"],
            suiteIds: [
              "python-native-python",
              "java-native-java",
              "go-native-go",
              "ruby-native-ruby",
              "csharp-native-csharp",
              "rust-native-rust",
            ],
          },
          middlewareTraceReplay: {
            jsonPostProbe: true,
            suites: ["js-middleware-hono", "js-middleware-fastify"],
          },
          routeGrades: { gold: 575, silver: 0, open: 0 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects schema v6 when suite counts drift", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v6-bad-"));
    const p = join(dir, "bad.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 6,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 20, expectedSuiteCount: 24, suiteIds: [] },
          traceReplay: {
            ok: true,
            correctness: 1,
            suiteCount: 16,
            expectedSuiteCount: 16,
            suiteIds: [],
            targets: ["hono", "fastify"],
          },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 17, originCount: 23 },
          routeGrades: { gold: 17, silver: 276, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts schema v4 with traceReplay targets", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-hub-completion-v4-"));
    const p = join(dir, "ok.json");
    try {
      writeFileSync(
        p,
        `${JSON.stringify({
          kind: "chrysalis.hub.completion",
          schemaVersion: 4,
          ok: true,
          matrixSmoke: { passed: 22, failed: 0, skipped: 0 },
          goldVerify: { ok: true, suiteCount: 14 },
          traceReplay: { ok: true, correctness: 1, suiteCount: 11, targets: ["hono", "fastify"] },
          nativeEmitSmoke: { ok: true, passed: 10, failed: 0 },
          crossLanguageSynthesis: { ok: true, pairCount: 575, goldPairs: 17, originCount: 23 },
          routeGrades: { gold: 17, silver: 276, open: 282 },
        })}\n`,
      );
      const r = spawnSync(process.execPath, [CI_GATES, "hub-completion", p], { cwd: ROOT, encoding: "utf8" });
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
