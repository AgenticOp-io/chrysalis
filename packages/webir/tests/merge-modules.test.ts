import { describe, expect, test } from "vitest";
import {
  ModuleBuilder,
  T,
  dataDialect,
  dedupeStructuralSubgraphsInModule,
  mergeWebIrModules,
  phpLocator,
  webRequest,
  type Module,
} from "../src/index.js";

function oneGetRouteModule(
  path: string,
  sourceApp: string,
  phpFile = "pages/x.php",
): ReturnType<ModuleBuilder["finish"]> {
  const b = new ModuleBuilder({ sourceApp, chrysalisVersion: "1.0.0" });
  const w = webRequest.builders(b);
  const d = dataDialect.builders(b);
  const origin = phpLocator(phpFile, 1, 0);
  const body = d.literal({ value: 1, type: T.int, origin });
  const resp = w.response({
    attrs: { status: 200, kind: "html" },
    value: body,
    origin,
  });
  const h = w.handler({
    attrs: { name: "h", input: T.record({}), output: T.void },
    body: resp,
    effects: [],
    origin,
  });
  const route = w.route({
    attrs: { method: "GET", path, pathParams: [] },
    handler: h,
    origin,
  });
  b.addRoot(route);
  return b.finish();
}

describe("mergeWebIrModules", () => {
  test("merges disjoint routes and dedupes identical shared subgraphs (same origins)", () => {
    const a = oneGetRouteModule("/a", "demo");
    const b = oneGetRouteModule("/b", "demo");
    const m = mergeWebIrModules([a, b]);
    expect(m.roots.length).toBe(2);
    // Same PHP file/lines for handler chain: literal/response/handler bodies collapse to one copy.
    expect(m.nodes.size).toBeLessThan(a.nodes.size + b.nodes.size);
    expect(m.nodes.size).toBe(5);
  });

  test("does not dedupe when PHP locator file differs", () => {
    const a = oneGetRouteModule("/a", "demo", "routes/a.php");
    const b = oneGetRouteModule("/b", "demo", "routes/b.php");
    const m = mergeWebIrModules([a, b]);
    expect(m.roots.length).toBe(2);
    expect(m.nodes.size).toBe(a.nodes.size + b.nodes.size);
  });

  test("throws on duplicate route keys", () => {
    const a = oneGetRouteModule("/same", "demo");
    const b = oneGetRouteModule("/same", "demo");
    expect(() => mergeWebIrModules([a, b])).toThrow(/duplicate route/);
  });

  test("throws on sourceApp mismatch", () => {
    const a = oneGetRouteModule("/a", "one");
    const b = oneGetRouteModule("/b", "two");
    expect(() => mergeWebIrModules([a, b])).toThrow(/sourceApp mismatch/);
  });
});

function sortedRouteKeys(m: Module): string[] {
  return [...m.roots]
    .map((id) => {
      const n = m.nodes.get(id);
      if (!n || n.dialect !== "web.request" || n.op !== "route") return "";
      return `${String(n.attrs.method)} ${String(n.attrs.path)}`;
    })
    .filter(Boolean)
    .sort();
}

describe("dedupeStructuralSubgraphsInModule", () => {
  test("collapses duplicate literals shared across routes in one module (same origin)", () => {
    const b = new ModuleBuilder({ sourceApp: "mono-dedupe", chrysalisVersion: "1.0.0" });
    const w = webRequest.builders(b);
    const d = dataDialect.builders(b);
    const o = phpLocator("pages/shared.php", 2, 0);
    const mkRoute = (path: string, name: string) => {
      const lit = d.literal({ value: 42, type: T.int, origin: o });
      const resp = w.response({
        attrs: { status: 200, kind: "html" },
        value: lit,
        origin: o,
      });
      const h = w.handler({
        attrs: { name, input: T.record({}), output: T.void },
        body: resp,
        effects: [],
        origin: o,
      });
      const route = w.route({
        attrs: { method: "GET", path, pathParams: [] },
        handler: h,
        origin: o,
      });
      b.addRoot(route);
    };
    mkRoute("/a", "ha");
    mkRoute("/b", "hb");
    const before = b.finish();
    const after = dedupeStructuralSubgraphsInModule(before);
    expect(after.roots.length).toBe(2);
    expect(after.nodes.size).toBeLessThan(before.nodes.size);
    expect(after.meta.sourceApp).toBe(before.meta.sourceApp);
    expect(after.meta.chrysalisVersion).toBe(before.meta.chrysalisVersion);
    expect(sortedRouteKeys(after)).toEqual(sortedRouteKeys(before));
  });

  test("second pass does not change node count (structural dedupe is stable)", () => {
    const m = oneGetRouteModule("/only", "idem");
    const once = dedupeStructuralSubgraphsInModule(m);
    const twice = dedupeStructuralSubgraphsInModule(once);
    expect(twice.nodes.size).toBe(once.nodes.size);
    // Rebuild uses a fresh IdGen each call; assert stability on counts, not NodeId strings.
    expect(once.nodes.size).toBe(m.nodes.size);
  });
});
