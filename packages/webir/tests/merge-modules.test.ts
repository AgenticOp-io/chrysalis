import { describe, expect, test } from "vitest";
import {
  ModuleBuilder,
  T,
  dataDialect,
  mergeWebIrModules,
  phpLocator,
  webRequest,
} from "../src/index.js";

function oneGetRouteModule(path: string, sourceApp: string): ReturnType<ModuleBuilder["finish"]> {
  const b = new ModuleBuilder({ sourceApp, chrysalisVersion: "1.0.0" });
  const w = webRequest.builders(b);
  const d = dataDialect.builders(b);
  const origin = phpLocator("pages/x.php", 1, 0);
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
  test("merges disjoint routes", () => {
    const a = oneGetRouteModule("/a", "demo");
    const b = oneGetRouteModule("/b", "demo");
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
