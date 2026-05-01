import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/tiny-blog");

describe("chrysalis status --shard-index / --shard-count", () => {
  test("--json includes routeShard ingestSharding; progress on stderr in JSON mode", () => {
    const r = spawnSync(
      process.execPath,
      [
        BIN,
        "status",
        "--project",
        FIXTURE,
        "--shard-index",
        "0",
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
    const j = JSON.parse(r.stdout) as {
      ingestSharding: {
        mode: string;
        shardIndex: number;
        shardCount: number;
      } | null;
      oracleFootprint: { routeCount: number } | null;
    };
    expect(j.ingestSharding).toEqual({ mode: "routeShard", shardIndex: 0, shardCount: 2 });
    expect(j.oracleFootprint).not.toBeNull();
    expect(r.stderr).toContain("shard 0/2");
  });
});
