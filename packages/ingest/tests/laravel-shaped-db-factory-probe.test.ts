import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { ingestDirectory } from "../src/index.js";
import { countHoles, effectTagsSorted, walk } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/laravel-shaped-db-factory-probe");

describe("ingest: laravel-shaped-db-factory-probe", () => {
  test("four routes, zero holes; FQN manifest callees for DB::connection, Conn::make, Repo::db", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(4);
    expect(countHoles(mod)).toBe(0);

    const byName: Record<string, readonly string[]> = {};
    for (const id of mod.roots) {
      const routeNode = mod.nodes.get(id)!;
      const handlerId = routeNode.operands[0]!;
      const handler = mod.nodes.get(handlerId)!;
      const name = String((handler.attrs as { name?: string }).name ?? "");
      byName[name] = effectTagsSorted(handler.effects);
    }
    for (const k of ["illuminate_db_chain", "illuminate_db_assign", "conn_make_assign", "repo_db_chain"]) {
      expect(byName[k]).toEqual(["db.read:probe_row"]);
    }
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
