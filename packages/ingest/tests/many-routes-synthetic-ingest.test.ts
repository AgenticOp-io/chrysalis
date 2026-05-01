/**
 * Synthetic N-route tree (V2-M2 stress class): no committed bulk fixture; exercises
 * ingestDirectory + route sharding over many trivial GET handlers in one temp project.
 * Size class: N=12 routes (documented here and in ROADMAP.md).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { filterRoutesForShard, ingestDirectory, loadRouteManifest } from "../src/index.js";

const SYNTHETIC_ROUTE_COUNT = 12;
const SHARD_COUNT = 4;

describe("many-route synthetic ingest (V2-M2 stress class)", () => {
  it("full ingest lowers all routes; shards partition manifest routes", async () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-many-route-synth-"));
    const pages = join(base, "pages");
    try {
      mkdirSync(pages, { recursive: true });
      const routes: Array<{ method: string; path: string; file: string; pathParams: [] }> = [];
      for (let i = 0; i < SYNTHETIC_ROUTE_COUNT; i++) {
        const fn = `r${i}.php`;
        writeFileSync(join(pages, fn), `<?php echo ${i};\n`);
        routes.push({
          method: "GET",
          path: `/r${i}`,
          file: `pages/${fn}`,
          pathParams: [],
        });
      }
      writeFileSync(
        join(base, "chrysalis.routes.json"),
        JSON.stringify({ app: "many-route-synth", routes }, null, 2),
        "utf8",
      );

      const manifest = await loadRouteManifest(base);
      expect(manifest.routes.length).toBe(SYNTHETIC_ROUTE_COUNT);

      let shardRouteSum = 0;
      for (let s = 0; s < SHARD_COUNT; s++) {
        shardRouteSum += filterRoutesForShard(manifest.routes, s, SHARD_COUNT).length;
      }
      expect(shardRouteSum).toBe(SYNTHETIC_ROUTE_COUNT);

      const t0 = Date.now();
      const full = await ingestDirectory(base);
      expect(full.roots.length).toBe(SYNTHETIC_ROUTE_COUNT);

      for (let s = 0; s < SHARD_COUNT; s++) {
        const part = await ingestDirectory(base, { shardIndex: s, shardCount: SHARD_COUNT });
        const expected = filterRoutesForShard(manifest.routes, s, SHARD_COUNT).length;
        expect(part.roots.length).toBe(expected);
      }

      const budgetRaw = process.env.CHRYSALIS_INGEST_BUDGET_MS;
      if (budgetRaw !== undefined && budgetRaw !== "") {
        const ms = Number.parseInt(budgetRaw, 10);
        expect(Number.isFinite(ms) && ms > 0).toBe(true);
        expect(Date.now() - t0).toBeLessThan(ms);
      }

      const rssMaxRaw = process.env.CHRYSALIS_INGEST_RSS_MAX_BYTES;
      if (rssMaxRaw !== undefined && rssMaxRaw !== "") {
        const limit = Number.parseInt(rssMaxRaw, 10);
        expect(Number.isFinite(limit) && limit > 0).toBe(true);
        expect(process.memoryUsage().rss).toBeLessThan(limit);
      }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
