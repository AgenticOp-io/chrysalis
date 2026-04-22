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

  test("infers the expected effects per handler", async () => {
    const mod = await ingestDirectory(FIXTURE);

    const effectsByHandler: Record<string, Set<string>> = {};
    for (const id of mod.roots) {
      const routeNode = mod.nodes.get(id)!;
      const handlerId = routeNode.operands[0]!;
      const handler = mod.nodes.get(handlerId)!;
      const name = String((handler.attrs as { name?: string }).name ?? "");
      const collected = new Set<string>();
      walk(mod, (n) => {
        if (n.dialect !== "effect") return;
        for (const e of n.effects) {
          const tag = "table" in e ? `${e.kind}:${e.table}` : e.kind;
          collected.add(tag);
        }
      });
      effectsByHandler[name] = collected;
    }

    expect(Object.keys(effectsByHandler).sort()).toEqual([
      "comments_create",
      "login",
      "posts_create",
      "posts_list",
      "posts_view",
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
