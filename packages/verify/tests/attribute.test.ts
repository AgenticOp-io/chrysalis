import { describe, expect, it } from "vitest";
import {
  ModuleBuilder,
  T,
  dataDialect,
  effectDialect,
  phpLocator,
  webRequest,
} from "@chrysalis/webir";
import {
  MAX_ATTRIBUTION_NODES,
  attributeDivergenceToNodes,
  findHandlerBodyRoot,
} from "../src/attribute.js";

describe("divergence attribution (M3 v1)", () => {
  it("finds handler body for GET /x", () => {
    const b = new ModuleBuilder({ sourceApp: "t" });
    const d = dataDialect.builders(b);
    const e = effectDialect.builders(b);
    const r = webRequest.builders(b);
    const origin = phpLocator("x.php", 1, 0);
    const lit = d.literal({ value: "x", type: T.string, origin });
    const echo = e.echo({ value: lit, origin });
    const block = d.block({ statements: [echo], origin });
    const handler = r.handler({
      attrs: { name: "h", input: T.record({}), output: T.string },
      body: block,
      effects: [],
      origin,
    });
    const route = r.route({
      attrs: { method: "GET", path: "/x", pathParams: [] },
      handler,
      origin,
    });
    b.addRoot(route);
    const mod = b.finish();
    expect(findHandlerBodyRoot(mod, "GET /x")).toBe(block);
  });

  it("attributes body-mismatch to echo before filling to cap", () => {
    const b = new ModuleBuilder({ sourceApp: "t" });
    const d = dataDialect.builders(b);
    const e = effectDialect.builders(b);
    const r = webRequest.builders(b);
    const origin = phpLocator("x.php", 1, 0);
    const lit = d.literal({ value: "x", type: T.string, origin });
    const q = e.dbQuery({
      kind: "read",
      sql: "SELECT 1",
      params: [],
      returns: "rows",
      tables: ["t"],
      type: T.array(T.record({})),
      origin,
    });
    const echo = e.echo({ value: lit, origin });
    const block = d.block({ statements: [q, echo], origin });
    const handler = r.handler({
      attrs: { name: "h", input: T.record({}), output: T.string },
      body: block,
      effects: [],
      origin,
    });
    const route = r.route({
      attrs: { method: "GET", path: "/posts", pathParams: [] },
      handler,
      origin,
    });
    b.addRoot(route);
    const mod = b.finish();
    const ids = attributeDivergenceToNodes(mod, "GET /posts", [
      {
        kind: "body-mismatch",
        detail: "body",
        expected: "a",
        actual: "b",
      },
    ]);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(MAX_ATTRIBUTION_NODES);
    const nodes = ids.map((id) => mod.nodes.get(id)!);
    const ops = new Set(nodes.map((n) => `${n.dialect}.${n.op}`));
    expect(ops.has("effect.db.query")).toBe(true);
    expect(ops.has("effect.echo")).toBe(true);
  });
});
