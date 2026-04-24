import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { ingestDirectory } from "../src/index.js";
import { countByDialect, countHoles, walk } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");

describe("ingest: tiny-blog fixture", () => {
  test("produces 5 routes and no holes", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(5);
    expect(countHoles(mod)).toBe(0);
  });

  test("handler nodes carry effects merged from the body subtree", async () => {
    const mod = await ingestDirectory(FIXTURE);

    function tags(es: Iterable<{ kind: string; table?: string }>): string[] {
      return [...es]
        .map((e) => ("table" in e ? `${e.kind}:${e.table}` : e.kind))
        .sort();
    }

    const byName: Record<string, string[]> = {};
    for (const id of mod.roots) {
      const routeNode = mod.nodes.get(id)!;
      const handlerId = routeNode.operands[0]!;
      const handler = mod.nodes.get(handlerId)!;
      const name = String((handler.attrs as { name?: string }).name ?? "");
      byName[name] = tags(handler.effects);
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
    ]);
    expect(byName.login).toEqual(["db.read:users", "session.write"]);
    expect(byName.posts_create).toEqual(["db.write:posts"]);
    expect(byName.comments_create).toEqual(["db.read:posts", "db.write:comments"]);
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
