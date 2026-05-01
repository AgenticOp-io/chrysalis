import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/tiny-blog");

describe("chrysalis ingest --merge-all-shards", () => {
  test("runs K shard ingests and merges (stdout mentions merge)", () => {
    const r = spawnSync(
      process.execPath,
      [BIN, "ingest", FIXTURE, "--merge-all-shards", "--shard-count", "2"],
      {
        encoding: "utf8",
        cwd: ROOT,
      },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("merge-all-shards");
    expect(r.stdout).toContain("routes:");
  });
});
