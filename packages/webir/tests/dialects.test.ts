import { describe, expect, test } from "vitest";
import {
  ModuleBuilder,
  T,
  countByDialect,
  countAuthTaggedHoles,
  countHoles,
  irCoverageStats,
  dataDialect,
  effectDialect,
  effectsReachableFrom,
  effectsReachableWithCallOverlay,
  effectTag,
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

  test("effectTag formats db and session kinds", () => {
    expect(effectTag({ kind: "db.read", table: "posts" })).toBe("db.read:posts");
    expect(effectTag({ kind: "session.write" })).toBe("session.write");
  });

  test("effectsReachableWithCallOverlay merges callee map at data.call", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const arg = d.literal({ value: 1, type: T.int, origin });
    const call = d.call({
      callee: "peer",
      args: [arg],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["peer", Object.freeze([{ kind: "session.read" as const }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    expect(eff).toEqual([{ kind: "session.read" }]);
  });

  test("effectsReachableWithCallOverlay matches FQN callee to short overlay key via tail", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const arg = d.literal({ value: 1, type: T.int, origin });
    const call = d.call({
      callee: "\\Vendor\\Pkg\\peer",
      args: [arg],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["peer", Object.freeze([{ kind: "session.read" as const }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    expect(eff).toEqual([{ kind: "session.read" }]);
  });

  test("effectsReachableWithCallOverlay matches static Class::method callee", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const arg = d.literal({ value: 1, type: T.int, origin });
    const call = d.call({
      callee: "\\Acme\\Repo\\Thing::run",
      args: [arg],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["Acme\\Repo\\Thing::run", Object.freeze([{ kind: "db.read" as const, table: "t1" }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    expect(eff).toEqual([{ kind: "db.read", table: "t1" }]);
  });

  test("effectsReachableWithCallOverlay unions overlay keys that share an unqualified tail", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const arg = d.literal({ value: 1, type: T.int, origin });
    const call = d.call({
      callee: "\\Any\\Ns\\dup",
      args: [arg],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["LibNs\\dup", Object.freeze([{ kind: "db.read" as const, table: "t1" }])],
      ["VendorNs\\dup", Object.freeze([{ kind: "db.read" as const, table: "t2" }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    const tags = new Set(eff.map(effectTag));
    expect(tags.has("db.read:t1")).toBe(true);
    expect(tags.has("db.read:t2")).toBe(true);
  });

  test("effectsReachableWithCallOverlay narrows call_user_func for literal callee", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const arg = d.literal({ value: "a", type: T.string, origin });
    const call = d.call({
      callee: "call_user_func",
      args: [arg],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["a", Object.freeze([{ kind: "db.read" as const, table: "t1" }])],
      ["b", Object.freeze([{ kind: "session.write" as const }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    const tags = new Set(eff.map(effectTag));
    expect(tags.has("db.read:t1")).toBe(true);
    expect(tags.has("session.write")).toBe(false);
  });

  test("effectsReachableWithCallOverlay normalizes leading slash in literal callee", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const arg = d.literal({ value: "\\a", type: T.string, origin });
    const call = d.call({
      callee: "call_user_func",
      args: [arg],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["a", Object.freeze([{ kind: "db.read" as const, table: "t1" }])],
      ["b", Object.freeze([{ kind: "session.write" as const }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    const tags = new Set(eff.map(effectTag));
    expect(tags.has("db.read:t1")).toBe(true);
    expect(tags.has("session.write")).toBe(false);
  });

  test("effectsReachableWithCallOverlay narrows call_user_func array-literal callable", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const classLit = d.literal({ value: "Acme\\Repo\\Thing", type: T.string, origin });
    const methodLit = d.literal({ value: "run", type: T.string, origin });
    const callable = d.call({
      callee: "__array_literal",
      args: [classLit, methodLit],
      type: T.array(T.unknown),
      origin,
    });
    const call = d.call({
      callee: "call_user_func",
      args: [callable],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["Acme\\Repo\\Thing::run", Object.freeze([{ kind: "db.read" as const, table: "t1" }])],
      ["other", Object.freeze([{ kind: "session.write" as const }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    const tags = new Set(eff.map(effectTag));
    expect(tags.has("db.read:t1")).toBe(true);
    expect(tags.has("session.write")).toBe(false);
  });

  test("effectsReachableWithCallOverlay falls back to widening for unknown literal callee", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const arg = d.literal({ value: "missing_func", type: T.string, origin });
    const call = d.call({
      callee: "call_user_func",
      args: [arg],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["a", Object.freeze([{ kind: "db.read" as const, table: "t1" }])],
      ["b", Object.freeze([{ kind: "session.write" as const }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    const tags = new Set(eff.map(effectTag));
    expect(tags.has("db.read:t1")).toBe(true);
    expect(tags.has("session.write")).toBe(true);
  });

  test("effectsReachableWithCallOverlay still widens call_user_func when callee is dynamic", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const arg = d.param({ name: "fn", type: T.string, origin });
    const call = d.call({
      callee: "call_user_func",
      args: [arg],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["a", Object.freeze([{ kind: "db.read" as const, table: "t1" }])],
      ["b", Object.freeze([{ kind: "session.write" as const }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    const tags = new Set(eff.map(effectTag));
    expect(tags.has("db.read:t1")).toBe(true);
    expect(tags.has("session.write")).toBe(true);
  });

  test("effectsReachableWithCallOverlay narrows ternary callable choices when both are explicit", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const cond = d.param({ name: "flag", type: T.bool, origin });
    const a = d.literal({ value: "a", type: T.string, origin });
    const bLit = d.literal({ value: "b", type: T.string, origin });
    const ternaryCallable = d.call({
      callee: "__ternary",
      args: [cond, a, bLit],
      type: T.string,
      origin,
    });
    const call = d.call({
      callee: "call_user_func",
      args: [ternaryCallable],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["a", Object.freeze([{ kind: "db.read" as const, table: "t1" }])],
      ["b", Object.freeze([{ kind: "session.write" as const }])],
      ["c", Object.freeze([{ kind: "db.write" as const, table: "t2" }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    const tags = new Set(eff.map(effectTag));
    expect(tags.has("db.read:t1")).toBe(true);
    expect(tags.has("session.write")).toBe(true);
    expect(tags.has("db.write:t2")).toBe(false);
  });

  test("effectsReachableWithCallOverlay falls back to full widening for partial ternary callable", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const cond = d.param({ name: "flag", type: T.bool, origin });
    const known = d.literal({ value: "a", type: T.string, origin });
    const unknown = d.param({ name: "fn", type: T.string, origin });
    const ternaryCallable = d.call({
      callee: "__ternary",
      args: [cond, known, unknown],
      type: T.string,
      origin,
    });
    const call = d.call({
      callee: "call_user_func",
      args: [ternaryCallable],
      type: T.unknown,
      origin,
    });
    const overlay = new Map([
      ["a", Object.freeze([{ kind: "db.read" as const, table: "t1" }])],
      ["b", Object.freeze([{ kind: "session.write" as const }])],
    ]);
    const eff = effectsReachableWithCallOverlay((id) => b.get(id), call, overlay);
    const tags = new Set(eff.map(effectTag));
    expect(tags.has("db.read:t1")).toBe(true);
    expect(tags.has("session.write")).toBe(true);
  });

  test("effectsReachableFrom unions nested effect nodes", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const e = effectDialect.builders(b);
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const arg = d.literal({ value: 1, type: T.int, origin });
    const q = e.dbQuery({
      kind: "read",
      sql: "SELECT 1",
      params: [arg],
      returns: "rows",
      tables: ["t"],
      type: T.array(T.record({})),
      origin,
    });
    const eff = effectsReachableFrom((id) => b.get(id), q);
    expect(eff).toEqual([{ kind: "db.read", table: "t" }]);
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

  test("data.hole merges optional catalog attrs with reason", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const h = d.hole({
      reason: "hub-cobol:handler-body",
      input: T.unknown,
      output: T.string,
      origin,
      attrs: { unresolved: ["call", "exec-cics"], execCicsOps: ["SEND-MAP"] },
    });
    const node = b.get(h);
    expect(node.attrs.reason).toBe("hub-cobol:handler-body");
    expect(node.attrs.unresolved).toEqual(["call", "exec-cics"]);
    expect(node.attrs.execCicsOps).toEqual(["SEND-MAP"]);
  });


  test("countAuthTaggedHoles only counts data.hole with auth-prefixed reason", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    b.addRoot(d.hole({ reason: "plain", input: T.unknown, output: T.string, origin }));
    b.addRoot(
      d.hole({ reason: "auth:static x", input: T.unknown, output: T.void, origin }),
    );
    const mod = b.finish();
    expect(countHoles(mod)).toBe(2);
    expect(countAuthTaggedHoles(mod)).toBe(1);
  });

  test("irCoverageStats counts holes vs reachable nodes", () => {
    const b = new ModuleBuilder({ sourceApp: "demo" });
    const d = dataDialect.builders(b);
    const origin = phpLocator("a.php", 1, 0);
    const lit = d.literal({ value: 1, type: T.int, origin });
    b.addRoot(lit);
    const ok = b.finish();
    expect(irCoverageStats(ok)).toEqual({ nodeCount: 1, holeCount: 0, coverage: 1 });

    const b2 = new ModuleBuilder({ sourceApp: "demo2" });
    const d2 = dataDialect.builders(b2);
    const h = d2.hole({ reason: "x", input: T.string, output: T.string, origin });
    b2.addRoot(h);
    const holesOnly = b2.finish();
    const st = irCoverageStats(holesOnly);
    expect(st.nodeCount).toBe(1);
    expect(st.holeCount).toBe(1);
    expect(st.coverage).toBe(0);
  });
});
