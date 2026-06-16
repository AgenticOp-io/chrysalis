import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const TWIN_FIXTURE = resolve(ROOT, "fixtures/lift-helper-lift-twin");

describe("chrysalis ingest --ingest-lift-shared-helpers-respect-origin", () => {
  test("rejects respect-origin without lift", () => {
    const r = spawnSync(
      process.execPath,
      [
        BIN,
        "ingest",
        TWIN_FIXTURE,
        "--ingest-dedupe-structural-subgraphs",
        "--ingest-lift-shared-helpers-respect-origin",
      ],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(
      "error: --ingest-lift-shared-helpers-respect-origin requires --ingest-lift-shared-helpers",
    );
  });

  test("completes with lift + dedupe + respect-origin on lift-twin", () => {
    const r = spawnSync(
      process.execPath,
      [
        BIN,
        "ingest",
        TWIN_FIXTURE,
        "--ingest-dedupe-structural-subgraphs",
        "--ingest-lift-shared-helpers",
        "--ingest-lift-shared-helpers-respect-origin",
      ],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("lift shared helpers: require origin match");
    expect(r.stdout).toContain("holes:    0");
  });
});

describe("chrysalis insight --ingest-lift-shared-helpers-respect-origin", () => {
  test("rejects respect-origin without lift", () => {
    const r = spawnSync(
      process.execPath,
      [
        BIN,
        "insight",
        TWIN_FIXTURE,
        "--json",
        "--ingest-dedupe-structural-subgraphs",
        "--ingest-lift-shared-helpers-respect-origin",
      ],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(
      "error: --ingest-lift-shared-helpers-respect-origin requires --ingest-lift-shared-helpers",
    );
  });
});
