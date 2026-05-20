import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { countHoles, walk } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

/** Committed templates merged into Composer output by `scaffold-flagship-laravel.mjs`. */
const TEMPLATES = resolve(__dirname, "../../../flagship/laravel-full/chrysalis-templates");

describe("flagship laravel-full chrysalis-templates", () => {
  test("ingests fifty-three-route manifest with zero holes", async () => {
    const mod = await ingestDirectory(TEMPLATES);
    expect(mod.meta.sourceApp).toBe("laravel-full");
    let routeNodes = 0;
    walk(mod, (n) => {
      if (n.dialect === "web.request" && n.op === "route") routeNodes += 1;
    });
    expect(routeNodes).toBe(53);
    expect(countHoles(mod)).toBe(0);
  });
});
