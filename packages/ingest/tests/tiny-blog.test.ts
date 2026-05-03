import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { ingestDirectory } from "../src/index.js";
import { countByDialect, countHoles, effectTagsSorted, irCoverageStats, walk } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");
const DEDUPE_IDENTICAL_HANDLERS_FIXTURE = resolve(
  __dirname,
  "../../../fixtures/dedupe-identical-handlers",
);

describe("ingest: tiny-blog fixture", () => {
  test("produces 5 routes and no holes", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(5);
    expect(countHoles(mod)).toBe(0);
  });

  test("handler nodes carry effects merged from the body subtree", async () => {
    const mod = await ingestDirectory(FIXTURE);

    const byName: Record<string, readonly string[]> = {};
    for (const id of mod.roots) {
      const routeNode = mod.nodes.get(id)!;
      const handlerId = routeNode.operands[0]!;
      const handler = mod.nodes.get(handlerId)!;
      const name = String((handler.attrs as { name?: string }).name ?? "");
      byName[name] = effectTagsSorted(handler.effects);
    }

    expect(Object.keys(byName).sort()).toEqual([
      "comments_create",
      "login",
      "posts_create",
      "posts_list",
      "posts_view",
    ]);
    expect(byName.posts_list).toEqual(["db.read:posts", "db.read:users"]);
    expect(byName.posts_view).toEqual([
      "db.read:comments",
      "db.read:posts",
      "db.read:users",
      "session.read",
    ]);
    expect(byName.login).toEqual(["db.read:users", "session.write"]);
    expect(byName.posts_create).toEqual([
      "db.read:users",
      "db.write:posts",
      "session.read",
    ]);
    expect(byName.comments_create).toEqual([
      "db.read:posts",
      "db.read:users",
      "db.write:comments",
      "session.read",
    ]);
  });

  test("every node has a php-source locator", async () => {
    const mod = await ingestDirectory(FIXTURE);
    let nonPhp = 0;
    walk(mod, (n) => {
      if (n.origin.kind !== "php") nonPhp += 1;
    });
    expect(nonPhp).toBe(0);
  });

  test("dialect distribution is stable", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const d = countByDialect(mod);
    expect(d["web.request"]).toBe(10);
    expect((d.effect ?? 0) > 0).toBe(true);
    expect((d.data ?? 0) > 0).toBe(true);
  });
});

describe("ingest: dedupe-identical-handlers fixture", () => {
  test("produces two routes and no holes (byte-identical pages for D282 emit)", async () => {
    const mod = await ingestDirectory(DEDUPE_IDENTICAL_HANDLERS_FIXTURE);
    expect(mod.roots.length).toBe(2);
    expect(countHoles(mod)).toBe(0);
  });

  test("D283 structural dedupe does not increase node map or holes", async () => {
    const base = await ingestDirectory(DEDUPE_IDENTICAL_HANDLERS_FIXTURE);
    const deduped = await ingestDirectory(DEDUPE_IDENTICAL_HANDLERS_FIXTURE, {
      dedupeStructuralSubgraphs: true,
    });
    expect(deduped.roots.length).toBe(base.roots.length);
    expect(countHoles(deduped)).toBe(countHoles(base));
    expect(deduped.nodes.size).toBeLessThanOrEqual(base.nodes.size);
  });
});

describe("ingest: dedupeStructuralSubgraphs (D283)", () => {
  test("tiny-blog with dedupeStructuralSubgraphs stays hole-free and route-stable", async () => {
    const base = await ingestDirectory(FIXTURE);
    const deduped = await ingestDirectory(FIXTURE, { dedupeStructuralSubgraphs: true });
    expect(deduped.roots.length).toBe(base.roots.length);
    expect(countHoles(deduped)).toBe(countHoles(base));
    expect(deduped.nodes.size).toBeLessThanOrEqual(base.nodes.size);
    // Shared lib/ IR is duplicated across routes in default monolithic ingest; D283
    // recovers the same node-count contract as mergeWebIrModules(K=2) on this fixture.
    expect(deduped.nodes.size).toBeLessThan(base.nodes.size);
    // `Module.nodes` can include IDs not reachable from roots; `irCoverageStats` counts
    // only the root-walk (same as status migration.coverage.nodes). Dedupe may shrink
    // the map without changing reachable hole/coverage counts on this fixture.
    expect(irCoverageStats(deduped).nodeCount).toBe(irCoverageStats(base).nodeCount);
  });
});
