import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CI_GATES = resolve(ROOT, "scripts/ci-gates.mjs");
const FIXTURE = resolve(ROOT, "fixtures/ci/corpus-merge-summary-smoke.json");

describe("ci-gates corpus-merge-summary", () => {
  test("accepts fixture contract", () => {
    const r = spawnSync(process.execPath, [CI_GATES, "corpus-merge-summary", FIXTURE], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("corpus-merge-summary OK");
  });

  test("fails when kind is not chrysalis.corpus-merge.summary", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-corpus-merge-gate-kind-"));
    const p = join(dir, "wrong.json");
    try {
      writeFileSync(
        p,
        JSON.stringify({
          kind: "chrysalis.verify.summary",
          schemaVersion: 1,
          toolVersion: "0.0.0",
          generatedAt: "2026-01-01T00:00:00.000Z",
          options: {
            outDir: "/x",
            onDuplicate: "error",
            dedupeTraceId: "off",
            dryRun: false,
          },
          sources: ["/a"],
          counts: {
            copiedFiles: 0,
            skippedDuplicates: 0,
            skippedTraceIdDuplicates: 0,
            skippedBySampling: 0,
          },
        }),
      );
      const r = spawnSync(process.execPath, [CI_GATES, "corpus-merge-summary", p], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("expected kind chrysalis.corpus-merge.summary");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails when sampleRemainder >= sampleModulo", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-corpus-merge-gate-"));
    const p = join(dir, "bad.json");
    try {
      writeFileSync(
        p,
        JSON.stringify({
          kind: "chrysalis.corpus-merge.summary",
          schemaVersion: 1,
          toolVersion: "0.0.0",
          generatedAt: "2026-01-01T00:00:00.000Z",
          options: {
            outDir: "/x",
            onDuplicate: "error",
            dedupeTraceId: "off",
            dryRun: true,
            sampleModulo: 2,
            sampleRemainder: 2,
          },
          sources: ["/a"],
          counts: {
            copiedFiles: 0,
            skippedDuplicates: 0,
            skippedTraceIdDuplicates: 0,
            skippedBySampling: 0,
          },
        }),
      );
      const r = spawnSync(process.execPath, [CI_GATES, "corpus-merge-summary", p], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("sampleRemainder");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
