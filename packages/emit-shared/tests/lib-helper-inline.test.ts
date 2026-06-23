import { describe, expect, it } from "vitest";
import { ModuleBuilder, T, dataDialect, effectDialect, phpLocator } from "@chrysalis/webir";
import { libHelperTsExportName, tryExtractInlineQuery } from "../src/lib-helper-inline.js";

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

  it("accepts __cast_float wrapper on formal assign (G2369)", () => {
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
          callee: "__cast_float",
          args: [active],
          type: T.float,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE active = ?",
      params: [data.param({ name: "flag", type: T.float, origin })],
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
    expect(extracted!.localToFloatCast.size).toBe(1);
    expect(extracted!.localToFloatCast.get("$flag")).toBe("active");
  });

  it("accepts __cast_bool wrapper on formal assign (G2368)", () => {
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
          callee: "__cast_bool",
          args: [active],
          type: T.bool,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE active = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
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
    expect(extracted!.localToBoolCast.size).toBe(1);
    expect(extracted!.localToBoolCast.get("$flag")).toBe("active");
  });

  it("accepts trim() wrapper on formal assign (G2378)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const active = data.param({ name: "active", type: T.string, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({
          callee: "trim",
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
    expect(extracted!.localToTrimFormal.size).toBe(1);
    expect(extracted!.localToTrimFormal.get("$flag")).toBe("active");
  });

  it("accepts empty() wrapper on formal assign (G6730)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const active = data.param({ name: "active", type: T.string, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.unaryOp({
          operator: "empty",
          operand: active,
          type: T.bool,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE active = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
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
    expect(extracted!.localToEmptyFormal.size).toBe(1);
    expect(extracted!.localToEmptyFormal.get("$flag")).toBe("active");
  });

  it("accepts isset() wrapper on formal assign (G6740)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const active = data.param({ name: "active", type: T.string, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.unaryOp({
          operator: "isset",
          operand: active,
          type: T.bool,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
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
    expect(extracted!.localToIssetFormal.size).toBe(1);
    expect(extracted!.localToIssetFormal.get("$flag")).toBe("active");
  });

  it("accepts count() wrapper on formal assign (G6760)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const items = data.param({ name: "items", type: T.array(T.unknown), origin });
    const assignLen = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "len", type: T.string, origin }),
        data.call({
          callee: "count",
          args: [items],
          type: T.int,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "len", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignLen, ret], origin });
    const mod = builder.finish();

    const extracted = tryExtractInlineQuery(mod, body, ["items"]);
    expect(extracted).toBeDefined();
    expect(extracted!.localToCountFormal.size).toBe(1);
    expect(extracted!.localToCountFormal.get("$len")).toBe("items");
  });

  it("accepts is_array() wrapper on formal assign (G6770)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const items = data.param({ name: "items", type: T.array(T.unknown), origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({
          callee: "is_array",
          args: [items],
          type: T.bool,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();

    const extracted = tryExtractInlineQuery(mod, body, ["items"]);
    expect(extracted).toBeDefined();
    expect(extracted!.localToIsArrayFormal.size).toBe(1);
    expect(extracted!.localToIsArrayFormal.get("$flag")).toBe("items");
  });

  it("accepts is_string() wrapper on formal assign (G6780)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const label = data.param({ name: "label", type: T.string, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({
          callee: "is_string",
          args: [label],
          type: T.bool,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();

    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted).toBeDefined();
    expect(extracted!.localToIsStringFormal.size).toBe(1);
    expect(extracted!.localToIsStringFormal.get("$flag")).toBe("label");
  });

  it("accepts abs() wrapper on formal assign (G6790)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const n = data.param({ name: "n", type: T.int, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({
          callee: "abs",
          args: [n],
          type: T.int,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();

    const extracted = tryExtractInlineQuery(mod, body, ["n"]);
    expect(extracted).toBeDefined();
    expect(extracted!.localToAbsFormal.size).toBe(1);
    expect(extracted!.localToAbsFormal.get("$val")).toBe("n");
  });

  it("accepts is_numeric() wrapper on formal assign (G6800)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const label = data.param({ name: "label", type: T.string, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({
          callee: "is_numeric",
          args: [label],
          type: T.bool,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();

    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted).toBeDefined();
    expect(extracted!.localToIsNumericFormal.size).toBe(1);
    expect(extracted!.localToIsNumericFormal.get("$flag")).toBe("label");
  });

  it("accepts logical ! on formal assign (G6810)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);

    const active = data.param({ name: "active", type: T.bool, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.unaryOp({
          operator: "!",
          operand: active,
          type: T.bool,
          origin,
        }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
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
    expect(extracted!.localToNotFormal.size).toBe(1);
    expect(extracted!.localToNotFormal.get("$flag")).toBe("active");
  });

  it("accepts is_int() wrapper on formal assign (G6820)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const n = data.param({ name: "n", type: T.int, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({ callee: "is_int", args: [n], type: T.bool, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["n"]);
    expect(extracted!.localToIsIntFormal.get("$flag")).toBe("n");
  });

  it("accepts is_bool() wrapper on formal assign (G6830)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const active = data.param({ name: "active", type: T.bool, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({ callee: "is_bool", args: [active], type: T.bool, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["active"]);
    expect(extracted!.localToIsBoolFormal.get("$flag")).toBe("active");
  });

  it("accepts is_null() wrapper on formal assign (G6840)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({ callee: "is_null", args: [label], type: T.bool, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToIsNullFormal.get("$flag")).toBe("label");
  });

  it("accepts unary - on formal assign (G6850)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const n = data.param({ name: "n", type: T.int, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.unaryOp({ operator: "-", operand: n, type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["n"]);
    expect(extracted!.localToNegFormal.get("$val")).toBe("n");
  });

  it("accepts round() wrapper on formal assign (G6860)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const amount = data.param({ name: "amount", type: T.float, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "round", args: [amount], type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["amount"]);
    expect(extracted!.localToRoundFormal.get("$val")).toBe("amount");
  });

  it("accepts floor() wrapper on formal assign (G6870)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const amount = data.param({ name: "amount", type: T.float, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "floor", args: [amount], type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["amount"]);
    expect(extracted!.localToFloorFormal.get("$val")).toBe("amount");
  });

  it("accepts ceil() wrapper on formal assign (G6880)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const amount = data.param({ name: "amount", type: T.float, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "ceil", args: [amount], type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["amount"]);
    expect(extracted!.localToCeilFormal.get("$val")).toBe("amount");
  });

  it("accepts strtolower() wrapper on formal assign (G6890)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "strtolower", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToStrtolowerFormal.get("$val")).toBe("label");
  });

  it("accepts strtoupper() wrapper on formal assign (G6900)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "strtoupper", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToStrtoupperFormal.get("$val")).toBe("label");
  });

  it("accepts htmlspecialchars() wrapper on formal assign (G6910)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "htmlspecialchars", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToHtmlspecialcharsFormal.get("$val")).toBe("label");
  });

  it("accepts nl2br() wrapper on formal assign (G6920)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "nl2br", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToNl2brFormal.get("$val")).toBe("label");
  });

  it("accepts urlencode() wrapper on formal assign (G6930)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "urlencode", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToUrlencodeFormal.get("$val")).toBe("label");
  });

  it("accepts rawurlencode() wrapper on formal assign (G6940)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "rawurlencode", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToRawurlencodeFormal.get("$val")).toBe("label");
  });

  it("accepts urldecode() wrapper on formal assign (G6950)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "urldecode", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToUrldecodeFormal.get("$val")).toBe("label");
  });

  it("accepts rawurldecode() wrapper on formal assign (G6960)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "rawurldecode", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToRawurldecodeFormal.get("$val")).toBe("label");
  });

  it("accepts ltrim() wrapper on formal assign (G6970)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "ltrim", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToLtrimFormal.get("$val")).toBe("label");
  });

  it("accepts rtrim() wrapper on formal assign (G6980)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "val", type: T.string, origin }),
        data.call({ callee: "rtrim", args: [label], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "val", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToRtrimFormal.get("$val")).toBe("label");
  });

  it("accepts is_float() wrapper on formal assign (G6990)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const x = data.param({ name: "x", type: T.float, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({ callee: "is_float", args: [x], type: T.bool, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["x"]);
    expect(extracted!.localToIsFloatFormal.get("$flag")).toBe("x");
  });

  it("accepts is_object() wrapper on formal assign (G7000)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const obj = data.param({ name: "obj", type: T.unknown, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({ callee: "is_object", args: [obj], type: T.bool, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["obj"]);
    expect(extracted!.localToIsObjectFormal.get("$flag")).toBe("obj");
  });

  it("accepts is_scalar() wrapper on formal assign (G7010)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const v = data.param({ name: "v", type: T.unknown, origin });
    const assignFlag = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "flag", type: T.string, origin }),
        data.call({ callee: "is_scalar", args: [v], type: T.bool, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "flag", type: T.bool, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignFlag, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["v"]);
    expect(extracted!.localToIsScalarFormal.get("$flag")).toBe("v");
  });

  it("accepts round(, literal) wrapper on formal assign (G7020)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const amount = data.param({ name: "amount", type: T.float, origin });
    const prec = data.literal({ value: 2, type: T.int, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "v", type: T.string, origin }),
        data.call({ callee: "round", args: [amount, prec], type: T.float, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "v", type: T.float, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["amount"]);
    expect(extracted!.localToRoundFormal2.get("$v")).toEqual({ formal: "amount", literalId: prec });
  });

  it("accepts max(, literal) wrapper on formal assign (G7030)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const n = data.param({ name: "n", type: T.int, origin });
    const zero = data.literal({ value: 0, type: T.int, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "v", type: T.string, origin }),
        data.call({ callee: "max", args: [n, zero], type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "v", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["n"]);
    expect(extracted!.localToMaxFormalLiteral.get("$v")).toEqual({ formal: "n", literalId: zero });
  });

  it("accepts min(, literal) wrapper on formal assign (G7040)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const n = data.param({ name: "n", type: T.int, origin });
    const ten = data.literal({ value: 10, type: T.int, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "v", type: T.string, origin }),
        data.call({ callee: "min", args: [n, ten], type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "v", type: T.int, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["n"]);
    expect(extracted!.localToMinFormalLiteral.get("$v")).toEqual({ formal: "n", literalId: ten });
  });

  it("accepts substr(, literal) wrapper on formal assign (G7050)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const one = data.literal({ value: 1, type: T.int, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "v", type: T.string, origin }),
        data.call({ callee: "substr", args: [label, one], type: T.string, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "v", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToSubstrFormalLiteral.get("$v")).toEqual({ formal: "label", literalId: one });
  });

  it("accepts strpos(, literal) wrapper on formal assign (G7060)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const comma = data.literal({ value: ",", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "v", type: T.string, origin }),
        data.call({ callee: "strpos", args: [label, comma], type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "v", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToStrposFormalLiteral.get("$v")).toEqual({ formal: "label", literalId: comma });
  });

  it("accepts stripos(, literal) wrapper on formal assign (G7070)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const comma = data.literal({ value: ",", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "v", type: T.string, origin }),
        data.call({ callee: "stripos", args: [label, comma], type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "v", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToStriposFormalLiteral.get("$v")).toEqual({ formal: "label", literalId: comma });
  });

  it("accepts strrpos(, literal) wrapper on formal assign (G7080)", () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const data = dataDialect.builders(builder);
    const effect = effectDialect.builders(builder);
    const origin = phpLocator("lib.php", 1, 1);
    const label = data.param({ name: "label", type: T.string, origin });
    const comma = data.literal({ value: ",", type: T.string, origin });
    const assignVal = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "v", type: T.string, origin }),
        data.call({ callee: "strrpos", args: [label, comma], type: T.int, origin }),
      ],
      type: T.void,
      origin,
    });
    const query = effect.dbQuery({
      kind: "read",
      sql: "SELECT id FROM items WHERE id = ?",
      params: [data.param({ name: "v", type: T.string, origin })],
      returns: "rows",
      tables: ["items"],
      type: T.array(T.record({})),
      origin,
    });
    const ret = data.call({ callee: "__return", args: [query], type: T.void, origin });
    const body = data.block({ statements: [assignVal, ret], origin });
    const mod = builder.finish();
    const extracted = tryExtractInlineQuery(mod, body, ["label"]);
    expect(extracted!.localToStrrposFormalLiteral.get("$v")).toEqual({ formal: "label", literalId: comma });
  });
});

describe("libHelperTsExportName (G6207)", () => {
  it("sanitizes static factory callees for TS exports", () => {
    expect(libHelperTsExportName("DbFactory::getConnection")).toBe("DbFactory__getConnection");
    expect(libHelperTsExportName("App\\DbFactory::getConnection")).toBe("DbFactory__getConnection");
  });
});
