import { describe, expect, test } from "vitest";
import {
  ModuleBuilder,
  T,
  computeOracleFootprint,
  dataDialect,
  effectDialect,
  phpLocator,
  provenance,
  webRequest,
} from "../src/index.js";

describe("computeOracleFootprint", () => {
  test("empty module has no routes in footprint", () => {
    const b = new ModuleBuilder({ sourceApp: "x" });
    b.addRoot(
      dataDialect.builders(b).literal({
        value: 1,
        type: T.int,
        origin: phpLocator("a.php", 1, 0),
      }),
    );
    const fp = computeOracleFootprint(b.finish());
    expect(fp.routes).toEqual([]);
    expect(fp.tapeTablesHint).toEqual([]);
    expect(fp.writeTablesHint).toEqual([]);
    expect(fp.totalHoleCount).toBe(0);
    expect(fp.hydrationIndex).toBe(0);
  });

  test("one route with db.read lists tape hint and non-zero hydration", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const e = effectDialect.builders(b);
    const r = webRequest.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const q = e.dbQuery({
      kind: "read",
      sql: "SELECT * FROM posts",
      params: [],
      returns: "rows",
      tables: ["posts"],
      type: T.array(T.record({})),
      origin,
    });
    const body = d.block({ statements: [q], origin });
    const eff = [{ kind: "db.read" as const, table: "posts" }];
    const handler = r.handler({
      attrs: { name: "h", input: T.record({}), output: T.string },
      body,
      effects: eff,
      origin,
    });
    const route = r.route({
      attrs: { method: "GET", path: "/posts", pathParams: [] },
      handler,
      origin,
    });
    b.addRoot(route);
    const fp = computeOracleFootprint(b.finish());
    expect(fp.routes).toHaveLength(1);
    expect(fp.routes[0]!.route).toBe("GET /posts");
    expect(fp.routes[0]!.dbReadTables).toEqual(["posts"]);
    expect(fp.tapeTablesHint).toEqual(["posts"]);
    expect(fp.hydrationIndex).toBeGreaterThan(0);
    expect(fp.hydrationIndex).toBeLessThanOrEqual(100);
    expect(fp.writeTablesHint).toEqual([]);
    expect(fp.totalHoleCount).toBe(0);
  });

  test("db.write contributes writeTablesHint", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const e = effectDialect.builders(b);
    const r = webRequest.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const q = e.dbQuery({
      kind: "write",
      sql: "INSERT INTO posts …",
      params: [],
      returns: "rowcount",
      tables: ["posts"],
      type: T.int,
      origin,
    });
    const body = d.block({ statements: [q], origin });
    const handler = r.handler({
      attrs: { name: "h", input: T.record({}), output: T.string },
      body,
      effects: [{ kind: "db.write" as const, table: "posts" }],
      origin,
    });
    const route = r.route({
      attrs: { method: "POST", path: "/posts", pathParams: [] },
      handler,
      origin,
    });
    b.addRoot(route);
    const fp = computeOracleFootprint(b.finish());
    expect(fp.tapeTablesHint).toEqual([]);
    expect(fp.writeTablesHint).toEqual(["posts"]);
    expect(fp.routes[0]!.dbWriteTables).toEqual(["posts"]);
  });

  test("cache and filesystem effects surface in route flags", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const r = webRequest.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const cacheLit = b.node({
      dialect: "data",
      op: "literal",
      type: T.int,
      effects: Object.freeze<[{ kind: "cache.read" }]>([{ kind: "cache.read" }]),
      operands: [],
      attrs: { value: 1 },
      origin,
      provenance: [provenance("hand-authored", origin, "test")],
    });
    const fsLit = b.node({
      dialect: "data",
      op: "literal",
      type: T.string,
      effects: Object.freeze<[{ kind: "fs.read" }]>([{ kind: "fs.read" }]),
      operands: [],
      attrs: { value: "x" },
      origin,
      provenance: [provenance("hand-authored", origin, "test")],
    });
    const body = d.block({ statements: [cacheLit, fsLit], origin });
    const handler = r.handler({
      attrs: { name: "h", input: T.record({}), output: T.string },
      body,
      effects: [],
      origin,
    });
    const route = r.route({
      attrs: { method: "GET", path: "/x", pathParams: [] },
      handler,
      origin,
    });
    b.addRoot(route);
    const fp = computeOracleFootprint(b.finish());
    expect(fp.routes[0]!.cache).toBe(true);
    expect(fp.routes[0]!.filesystem).toBe(true);
  });

  test("time.now and random in body surface in route flags", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const e = effectDialect.builders(b);
    const r = webRequest.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const t0 = e.timeNow({ format: "unix", origin });
    const lo = d.literal({ value: 0, type: T.int, origin });
    const hi = d.literal({ value: 9, type: T.int, origin });
    const rnd = e.random({ min: lo, max: hi, origin });
    const body = d.block({ statements: [t0, rnd], origin });
    const handler = r.handler({
      attrs: { name: "h", input: T.record({}), output: T.string },
      body,
      effects: [
        { kind: "time.now" },
        { kind: "random" },
      ],
      origin,
    });
    const route = r.route({
      attrs: { method: "GET", path: "/x", pathParams: [] },
      handler,
      origin,
    });
    b.addRoot(route);
    const fp = computeOracleFootprint(b.finish());
    expect(fp.routes[0]!.wallClock).toBe(true);
    expect(fp.routes[0]!.entropy).toBe(true);
  });
});
