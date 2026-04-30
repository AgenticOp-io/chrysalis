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
});
