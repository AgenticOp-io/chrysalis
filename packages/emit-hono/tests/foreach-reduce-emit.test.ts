import { describe, expect, test } from "vitest";
import { emitHandlerBody, honoHttpProfile } from "@chrysalis/emit-shared";
import { ModuleBuilder, T, dataDialect, phpLocator, webRequest } from "@chrysalis/webir";

describe("emit-hono: foreach reduce chooser", () => {
  test("emits Array.reduce for literal init + foreach + += pattern", () => {
    const m = new ModuleBuilder({ sourceApp: "reduce-test" });
    const data = dataDialect.builders(m);
    const web = webRequest.builders(m);
    let line = 1;
    const loc = () => phpLocator("sum.php", line++, 1);

    const items = data.param({ name: "items", type: T.array(T.unknown), origin: loc() });
    const init = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "sum", type: T.string, origin: loc() }),
        data.literal({ value: 0, type: T.int, origin: loc() }),
      ],
      type: T.void,
      origin: loc(),
    });
    const row = data.param({ name: "row", type: T.record({}), origin: loc() });
    const nMem = data.member({ obj: row, key: "n", type: T.int, origin: loc() });
    const rhs = data.binOp({
      operator: "+",
      left: data.param({ name: "sum", type: T.unknown, origin: loc() }),
      right: nMem,
      type: T.int,
      origin: loc(),
    });
    const loopAssign = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "sum", type: T.string, origin: loc() }),
        rhs,
      ],
      type: T.void,
      origin: loc(),
    });
    const body = data.block({ statements: [loopAssign], origin: loc() });
    const fe = data.foreach({
      iterable: items,
      valueName: "row",
      body,
      origin: loc(),
    });
    const blk = data.block({ statements: [init, fe], origin: loc() });
    const handler = web.handler({
      attrs: { name: "sum_handler", input: T.unknown, output: T.unknown },
      body: blk,
      effects: [],
      origin: loc(),
    });
    const route = web.route({
      attrs: { method: "GET", path: "/sum", pathParams: [] },
      handler,
      origin: loc(),
    });
    m.addRoot(route);
    const mod = m.finish();

    const emitted = emitHandlerBody(mod, handler, undefined, honoHttpProfile);
    expect(emitted.body).toContain(".reduce(");
    expect(emitted.body).not.toMatch(/for \(const row of/);
  });

  test("emits phpDynamicNew for __new_dynamic calls", () => {
    const m = new ModuleBuilder({ sourceApp: "dynamic-new-test" });
    const data = dataDialect.builders(m);
    const web = webRequest.builders(m);
    let line = 1;
    const loc = () => phpLocator("dyn.php", line++, 1);

    const ctorName = data.param({ name: "klass", type: T.string, origin: loc() });
    const dynamicNew = data.call({
      callee: "__new_dynamic",
      args: [ctorName, data.literal({ value: "x", type: T.string, origin: loc() })],
      type: T.unknown,
      origin: loc(),
    });
    const blk = data.block({ statements: [dynamicNew], origin: loc() });
    const handler = web.handler({
      attrs: { name: "dyn_handler", input: T.unknown, output: T.unknown },
      body: blk,
      effects: [],
      origin: loc(),
    });
    const route = web.route({
      attrs: { method: "GET", path: "/dyn", pathParams: [] },
      handler,
      origin: loc(),
    });
    m.addRoot(route);
    const mod = m.finish();

    const emitted = emitHandlerBody(mod, handler, undefined, honoHttpProfile);
    expect(emitted.body).toContain("phpDynamicNew(");
    expect(emitted.usesPhpDynamicNew).toBe(true);
  });
});
