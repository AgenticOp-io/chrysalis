import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { ingestDirectory } from "../src/index.js";
import { countHoles, effectTagsSorted, walk } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/mysqli-probe");

describe("ingest: mysqli-probe fixture", () => {
  test("one route, no holes, mysqli lib still yields db.read via query_one", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(1);
    expect(countHoles(mod)).toBe(0);

    const byName: Record<string, readonly string[]> = {};
    for (const id of mod.roots) {
      const routeNode = mod.nodes.get(id)!;
      const handlerId = routeNode.operands[0]!;
      const handler = mod.nodes.get(handlerId)!;
      const name = String((handler.attrs as { name?: string }).name ?? "");
      byName[name] = effectTagsSorted(handler.effects);
    }
    expect(byName.smoke).toEqual(["db.read:widgets"]);
  });

  test("every node has a php-source locator", async () => {
    const mod = await ingestDirectory(FIXTURE);
    let nonPhp = 0;
    walk(mod, (n) => {
      if (n.origin.kind !== "php") nonPhp += 1;
    });
    expect(nonPhp).toBe(0);
  });
});
