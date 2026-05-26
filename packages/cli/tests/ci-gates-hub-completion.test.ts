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
