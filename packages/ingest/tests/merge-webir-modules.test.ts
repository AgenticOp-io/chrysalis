import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countHoles, mergeWebIrModules } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

const tinyBlog = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/tiny-blog");

describe("mergeWebIrModules + ingestDirectory shards", () => {
  it("K=2 shard modules merge to monolithic parity (tiny-blog)", async () => {
    const full = await ingestDirectory(tinyBlog);
    const s0 = await ingestDirectory(tinyBlog, { shardIndex: 0, shardCount: 2 });
    const s1 = await ingestDirectory(tinyBlog, { shardIndex: 1, shardCount: 2 });
    const merged = mergeWebIrModules([s0, s1]);
    expect(merged.roots.length).toBe(full.roots.length);
    expect(countHoles(merged)).toBe(countHoles(full));
  });
});
