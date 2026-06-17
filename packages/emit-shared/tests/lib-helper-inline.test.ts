import { describe, expect, it } from "vitest";
import { ModuleBuilder, T, dataDialect, effectDialect, phpLocator } from "@chrysalis/webir";
import { tryExtractInlineQuery } from "../src/lib-helper-inline.js";

describe("tryExtractInlineQuery (G2334)", () => {
  it("accepts literal-RHS assign chains", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.literal({ value: 1, type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE active = ?",
      params: [data.param({ name: "flag", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();

    const extracted = tryExtractInlineQuery(mod, body, ["active"]);
    expect(extracted).toBeDefined();
    expect(extracted!.localToLiteral.size).toBe(1);
    expect(extracted!.localToLiteral.has("$flag")).toBe(true);
  });

  it("rejects binop assign RHS", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const assign = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "b", type: T.string, origin }),
        data.binOp({
          operator: "+",
          left: data.param({ name: "active", type: T.int, origin }),
          right: data.literal({ value: 1, type: T.int, origin }),
          type: T.int,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE active = ?",
      params: [data.param({ name: "b", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assign, ret], origin });
    const mod = builder.finish();

    expect(tryExtractInlineQuery(mod, body, ["active"])).toBeUndefined();
  });

  it("accepts __cast_int wrapper on formal assign (G2344)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const active = data.param({ name: "active", type: T.int, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({
          callee: "__cast_int",
          args: [active],
          type: T.int,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE active = ?",
      params: [data.param({ name: "flag", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();

    const extracted = tryExtractInlineQuery(mod, body, ["active"]);
    expect(extracted).toBeDefined();
    expect(extracted!.localToFormal.get("$flag")).toBe("active");
  });

  it("accepts coalesce formal ?? literal assign (G2348)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const active = data.param({ name: "active", type: T.int, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.binOp({
          operator: "??",
          left: active,
          right: data.literal({ value: 1, type: T.int, origin }),
          type: T.int,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE active = ?",
      params: [data.param({ name: "flag", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();

    const extracted = tryExtractInlineQuery(mod, body, ["active"]);
    expect(extracted).toBeDefined();
    expect(extracted!.localToCoalesce.size).toBe(1);
    expect(extracted!.localToCoalesce.get("$flag")?.formal).toBe("active");
  });

  it("accepts __cast_string wrapper on formal assign (G2360)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const active = data.param({ name: "active", type: T.int, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({
          callee: "__cast_string",
          args: [active],
          type: T.string,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE active = ?",
      params: [data.param({ name: "flag", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();

    const extracted = tryExtractInlineQuery(mod, body, ["active"]);
    expect(extracted).toBeDefined();
    expect(extracted!.localToStringCast.size).toBe(1);
    expect(extracted!.localToStringCast.get("$flag")).toBe("active");
  });
});
