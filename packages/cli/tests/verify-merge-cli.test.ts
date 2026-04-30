import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");

const miniSummary = {
  generatedAt: "2026-04-29T00:00:00.000Z",
  aggregate: { framesTotal: 1, framesPassed: 1, correctness: 1 },
  endpoints: [
    {
      route: "GET /x",
      framesTotal: 1,
      framesPassed: 1,
      correctness: 1,
      avgBodySimilarity: 1,
      divergences: [],
    },
  ],
};

describe("verify-merge CLI", () => {
  test("prints chrysalis.verify.summary.merged with --json-out", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-verify-merge-"));
    try {
      const a = join(dir, "s0.json");
      const b = join(dir, "s1.json");
      writeFileSync(a, JSON.stringify(miniSummary));
      writeFileSync(b, JSON.stringify(miniSummary));
      const r = spawnSync(process.execPath, [BIN, "verify-merge", a, b, "--json-out"], {
        encoding: "utf8",
        cwd: ROOT,
      });
      expect(r.status).toBe(0);
      const j = JSON.parse(r.stdout.trim()) as { kind: string; schemaVersion: number; merged: { aggregate: { framesTotal: number } } };
      expect(j.kind).toBe("chrysalis.verify.summary.merged");
      expect(j.schemaVersion).toBe(1);
      expect(j.merged.aggregate.framesTotal).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
