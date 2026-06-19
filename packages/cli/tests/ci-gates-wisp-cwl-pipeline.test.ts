import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../..");
const CI_GATES = join(ROOT, "scripts/ci-gates.mjs");

describe("ci-gates wisp-cwl-pipeline", () => {
  test("reports missing pipeline artifact with hint", () => {
    const missing = join(tmpdir(), `wisp-cwl-pipeline-${Date.now()}.json`);
    const r = spawnSync(process.execPath, [CI_GATES, "wisp-cwl-pipeline", missing], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("wisp-cwl-pipeline: pipeline report missing");
    expect(r.stderr).toContain("hub:wisp-cwl-pipeline-smoke");
  });

  test("rejects invalid kind", () => {
    const dir = mkdtempSync(join(tmpdir(), "wisp-pipeline-gate-"));
    const p = join(dir, "bad.json");
    writeFileSync(
      p,
      JSON.stringify({ kind: "wrong", schemaVersion: 1, ok: true, close: { ok: true }, build: { ok: true } }),
    );
    const r = spawnSync(process.execPath, [CI_GATES, "wisp-cwl-pipeline", p], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("expected kind chrysalis.wisp-cwl-pipeline");
  });
});
