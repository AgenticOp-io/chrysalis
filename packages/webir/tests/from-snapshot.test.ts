import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { moduleFromGoldenSnapshot, moduleToGoldenSnapshot } from "../src/index.js";
import { ModuleBuilder, phpLocator, provenance } from "../src/builder.js";

describe("moduleFromGoldenSnapshot", () => {
  it("round-trips a tiny module through golden JSON", () => {
    const o = phpLocator("pages/a.php", 1, 1);
    const p = provenance("php-ast", o, "route");
    const b = new ModuleBuilder({ sourceApp: "snap-test", chrysalisVersion: "test" });
    const body = b.node({
      dialect: "data",
      op: "literal",
      type: { kind: "string" },
      effects: [],
      operands: [],
      attrs: { value: "ok" },
      origin: o,
      provenance: [p],
    });
    const handler = b.node({
      dialect: "web.request",
      op: "handler",
      type: { kind: "named", name: "Response" },
      effects: [],
      operands: [body],
      attrs: { name: "health" },
      origin: o,
      provenance: [p],
    });
    b.addRoot(
      b.node({
        dialect: "web.request",
        op: "route",
        type: { kind: "void" },
        effects: [],
        operands: [handler],
        attrs: { method: "GET", path: "/health", pathParams: [] },
        origin: o,
        provenance: [p],
      }),
    );
    const mod = b.finish();
    const json = moduleToGoldenSnapshot(mod);
    const loaded = moduleFromGoldenSnapshot(json);
    expect(loaded.roots).toEqual(mod.roots);
    expect(loaded.nodes.size).toBe(mod.nodes.size);
    expect(loaded.meta.sourceApp).toBe("snap-test");
  });

  it("loads committed minimal-route WPTP bundle module", () => {
    const raw = JSON.parse(
      readFileSync(
        join(import.meta.dirname, "../../../fixtures/wptp/minimal-route.webir.bundle.json"),
        "utf8",
      ),
    );
    const mod = moduleFromGoldenSnapshot(raw.module);
    expect(mod.roots).toHaveLength(1);
    expect(mod.nodes.size).toBe(3);
  });
});
