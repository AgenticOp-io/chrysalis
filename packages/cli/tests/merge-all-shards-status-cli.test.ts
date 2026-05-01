import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/tiny-blog");

describe("chrysalis status --merge-all-shards", () => {
  test("--json stdout is valid JSON; shard merge line on stderr", () => {
    const r = spawnSync(
      process.execPath,
      [
        BIN,
        "status",
        "--project",
        FIXTURE,
        "--merge-all-shards",
        "--shard-count",
        "2",
        "--json",
      ],
      {
        encoding: "utf8",
        cwd: ROOT,
      },
    );
    expect(r.status).toBe(0);
    expect(() => JSON.parse(r.stdout)).not.toThrow();
    const j = JSON.parse(r.stdout) as { oracleFootprint: { routeCount: number } | null };
    expect(j.oracleFootprint).not.toBeNull();
    expect(j.oracleFootprint!.routeCount).toBeGreaterThan(0);
    expect(r.stderr).toContain("merge-all-shards");
  });
});
