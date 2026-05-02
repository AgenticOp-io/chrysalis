import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");

describe("chrysalis --help", () => {
  test("mentions V2 scale-out flag families", () => {
    const r = spawnSync(process.execPath, [BIN, "--help"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Scale-out (V2):");
    expect(r.stdout).toContain("verify-merge");
    expect(r.stdout).toContain("corpus-merge");
    expect(r.stdout).toContain("--ingest-cache");
    expect(r.stdout).toContain("--merge-all-shards");
    expect(r.stdout).toContain("--shard-count");
    expect(r.stdout).toContain("--emit-handler-fingerprints");
    expect(r.stdout).toContain("aggregate-chimera-operator-snapshots.mjs");
    expect(r.stdout).toContain("aggregate-verify-summaries.mjs");
  });
});
