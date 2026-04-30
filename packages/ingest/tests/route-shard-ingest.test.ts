import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { filterRoutesForShard, ingestDirectory, loadRouteManifest } from "../src/index.js";

const tinyBlog = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/tiny-blog");

describe("ingestDirectory shard filter (V2-M2)", () => {
  it("full ingest has more roots than a single K=2 shard", async () => {
    const manifest = await loadRouteManifest(tinyBlog);
    expect(manifest.routes.length).toBeGreaterThanOrEqual(2);
    const s0 = filterRoutesForShard(manifest.routes, 0, 2);
    const s1 = filterRoutesForShard(manifest.routes, 1, 2);
    expect(s0.length + s1.length).toBe(manifest.routes.length);
    const full = await ingestDirectory(tinyBlog);
    const part0 = await ingestDirectory(tinyBlog, { shardCount: 2, shardIndex: 0 });
    expect(part0.roots.length).toBe(s0.length);
    expect(part0.roots.length).toBeLessThan(full.roots.length);
    expect(part0.roots.length).toBeGreaterThan(0);
  });
});
