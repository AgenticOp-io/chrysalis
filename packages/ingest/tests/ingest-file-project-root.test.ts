import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { effectTagsSorted } from "@chrysalis/webir";
import { ingestDirectory, ingestFile, loadRouteManifest } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");

describe("ingestFile with projectRoot", () => {
  test("matches ingestDirectory handler effects for the same route", async () => {
    const manifest = await loadRouteManifest(FIXTURE);
    const route = manifest.routes.find((r) => r.file === "pages/posts_view.php");
    expect(route).toBeDefined();

    const modDir = await ingestDirectory(FIXTURE);
    const modFile = await ingestFile(resolve(FIXTURE, route!.file), route!, {
      projectRoot: FIXTURE,
    });

    function effectsByHandler(mod: typeof modDir): Record<string, readonly string[]> {
      const byName: Record<string, readonly string[]> = {};
      for (const id of mod.roots) {
        const routeNode = mod.nodes.get(id)!;
        const handler = mod.nodes.get(routeNode.operands[0]!)!;
        const name = String((handler.attrs as { name?: string }).name ?? "");
        byName[name] = effectTagsSorted(handler.effects);
      }
      return byName;
    }

    const fromDir = effectsByHandler(modDir);
    const fromFile = effectsByHandler(modFile);
    expect(Object.keys(fromFile)).toEqual(["posts_view"]);
    expect(fromFile.posts_view).toEqual(fromDir.posts_view);
  });
});
