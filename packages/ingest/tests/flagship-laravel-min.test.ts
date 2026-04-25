import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { countHoles, walk } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

const FLAGSHIP = resolve(__dirname, "../../../flagship/laravel-min");

describe("flagship laravel-min", () => {
  test("ingests manifest routes with Laravel-shaped paths", async () => {
    const mod = await ingestDirectory(FLAGSHIP);
    expect(mod.meta.sourceApp).toBe("laravel-min");
    let routeNodes = 0;
    walk(mod, (n) => {
      if (n.dialect === "web.request" && n.op === "route") routeNodes += 1;
    });
    expect(routeNodes).toBe(2);
    expect(countHoles(mod)).toBe(0);
  });
});
