import { describe, expect, test } from "vitest";
import {
  ModuleBuilder,
  T,
  countByDialect,
  countHoles,
  dataDialect,
  effectDialect,
  phpLocator,
  walk,
  webRequest,
} from "../src/index.js";

describe("webir module builder", () => {
  test("produces deterministic ids", () => {
    const b1 = new ModuleBuilder({ sourceApp: "demo" });
    const d1 = dataDialect.builders(b1);
    const a = d1.literal({ value: 1, type: T.int, origin: phpLocator("a.php", 1, 0) });
    const b = d1.literal({ value: 2, type: T.int, origin: phpLocator("a.php", 2, 0) });
    expect(a).toBe("n0");
    expect(b).toBe("n1");
  });

  test("effect nodes carry effect sets", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const e = effectDialect.builders(b);
    const d = dataDialect.builders(b);
    const arg = d.literal({ value: "x", type: T.string, origin: phpLocator("a.php", 1, 0) });
    const q = e.dbQuery({
      kind: "read",
      sql: "SELECT * FROM users",
      params: [arg],
      returns: "rows",
      tables: ["users"],
      type: T.array(T.record({})),
      origin: phpLocator("a.php", 1, 0),
    });
    const node = b.get(q);
    expect(node.effects).toEqual([{ kind: "db.read", table: "users" }]);
  });

  test("modules expose dialect counts and holes", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const r = webRequest.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const h = d.hole({ reason: "tbd", input: T.unknown, output: T.string, origin });
    const handler = r.handler({
      attrs: { name: "h", input: T.record({}), output: T.string },
      body: h,
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
    expect(countByDialect(mod)).toEqual({ data: 1, "web.request": 2 });
    expect(countHoles(mod)).toBe(1);
    let count = 0;
    walk(mod, () => {
      count += 1;
    });
    expect(count).toBe(3);
  });
});
