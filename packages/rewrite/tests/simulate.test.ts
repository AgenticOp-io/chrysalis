import { describe, expect, it } from "vitest";
import { T, type NodeId } from "@chrysalis/webir";
import { simulateHandler, type RequestInput } from "../src/simulate.js";
import { buildModule } from "./helpers.js";

const emptyInput: RequestInput = {
  method: "GET",
  path: "/x",
  query: {},
  post: {},
  cookies: {},
  session: {},
  pathParams: {},
};

function routeIdOf(m: ReturnType<typeof buildModule>): NodeId {
  const rootId = m.roots[0];
  if (!rootId) throw new Error("no route in module");
  return rootId;
}

describe("IR simulator (D19 core)", () => {
  it("evaluates echo of a literal", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const lit = data.literal({ value: "hello", type: T.string, origin: loc() });
      return eff.echo({ value: lit, origin: loc() });
    });
    const res = simulateHandler(m, routeIdOf(m), emptyInput);
    expect(res.errors).toEqual([]);
    expect(res.body).toBe("hello");
    expect(res.status).toBe(200);
  });

  it("echoes a request.field value", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const q = data.requestField({
        source: "query",
        name: "name",
        type: T.string,
        origin: loc(),
      });
      return eff.echo({ value: q, origin: loc() });
    });
    const res = simulateHandler(m, routeIdOf(m), {
      ...emptyInput,
      query: { name: "alice" },
    });
    expect(res.body).toBe("alice");
  });

  it("propagates __assign writes into data.param reads", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const name = data.literal({ value: "x", type: T.string, origin: loc() });
      const val = data.literal({ value: "42", type: T.string, origin: loc() });
      const assign = data.call({
        callee: "__assign",
        args: [name, val],
        type: T.void,
        origin: loc(),
      });
      const read = data.param({ name: "x", type: T.unknown, origin: loc() });
      const echo = eff.echo({ value: read, origin: loc() });
      return data.block({
        statements: [assign, echo],
        type: T.void,
        origin: loc(),
      });
    });
    const res = simulateHandler(m, routeIdOf(m), emptyInput);
    expect(res.body).toBe("42");
    expect(res.errors).toEqual([]);
  });

  it("short-circuits ?? when left is not null", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const q = data.requestField({
        source: "query",
        name: "id",
        type: T.string,
        origin: loc(),
      });
      const fallback = data.literal({ value: "0", type: T.string, origin: loc() });
      const coalesced = data.binOp({
        operator: "??",
        left: q,
        right: fallback,
        type: T.string,
        origin: loc(),
      });
      return eff.echo({ value: coalesced, origin: loc() });
    });
    const withValue = simulateHandler(m, routeIdOf(m), {
      ...emptyInput,
      query: { id: "7" },
    });
    expect(withValue.body).toBe("7");
    const withoutValue = simulateHandler(m, routeIdOf(m), emptyInput);
    expect(withoutValue.body).toBe("0");
  });

  it("concatenates with `.` and htmlspecialchars escapes", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const prefix = data.literal({ value: "<h1>", type: T.string, origin: loc() });
      const q = data.requestField({
        source: "query",
        name: "q",
        type: T.string,
        origin: loc(),
      });
      const escaped = data.call({
        callee: "htmlspecialchars",
        args: [q],
        type: T.string,
        origin: loc(),
      });
      const concat = data.binOp({
        operator: ".",
        left: prefix,
        right: escaped,
        type: T.string,
        origin: loc(),
      });
      return eff.echo({ value: concat, origin: loc() });
    });
    const res = simulateHandler(m, routeIdOf(m), {
      ...emptyInput,
      query: { q: "<script>" },
    });
    expect(res.body).toBe("<h1>&lt;script&gt;");
  });

  it("records db.query as a dbRead and evaluates foreach over the stub rows", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const sql = data.literal({
        value: "SELECT id, name FROM users",
        type: T.string,
        origin: loc(),
      });
      const q = eff.dbQuery({
        kind: "read",
        sql: "SELECT id, name FROM users",
        params: [],
        returns: "rows",
        tables: ["users"],
        type: T.unknown,
        origin: loc(),
      });
      void sql;
      const rowsAssign = data.call({
        callee: "__assign",
        args: [
          data.literal({ value: "rows", type: T.string, origin: loc() }),
          q,
        ],
        type: T.void,
        origin: loc(),
      });
      const rowsRead = data.param({ name: "rows", type: T.unknown, origin: loc() });
      const nameMember = data.member({
        obj: data.param({ name: "row", type: T.unknown, origin: loc() }),
        key: "name",
        type: T.string,
        origin: loc(),
      });
      const bodyEcho = eff.echo({ value: nameMember, origin: loc() });
      const loopBody = data.block({
        statements: [bodyEcho],
        type: T.void,
        origin: loc(),
      });
      const loop = data.foreach({
        iterable: rowsRead,
        valueName: "row",
        body: loopBody,
        origin: loc(),
      });
      return data.block({
        statements: [rowsAssign, loop],
        type: T.void,
        origin: loc(),
      });
    });
    const res = simulateHandler(m, routeIdOf(m), emptyInput);
    expect(res.errors).toEqual([]);
    expect(res.dbReads).toHaveLength(1);
    expect(res.dbReads[0]!.tables).toEqual(["users"]);
    expect(res.body).toBe("stub-row:users");
  });

  it("redirect halts execution and returns status 302", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const loc1 = data.literal({ value: "/home", type: T.string, origin: loc() });
      const r = eff.redirect({ location: loc1, origin: loc() });
      const after = eff.echo({
        value: data.literal({ value: "should not fire", type: T.string, origin: loc() }),
        origin: loc(),
      });
      return data.block({ statements: [r, after], type: T.void, origin: loc() });
    });
    const res = simulateHandler(m, routeIdOf(m), emptyInput);
    expect(res.status).toBe(302);
    expect(res.redirectTo).toBe("/home");
    expect(res.body).toBe(""); // post-redirect echo suppressed
  });

  it("returns an abstention rather than crashing on unknown ops", () => {
    // data.hole represents an unknown PHP feature the ingester
    // couldn't lower. The simulator should log a SimError (caller
    // treats as abstain) and keep going.
    const m = buildModule(({ data, eff, loc }) => {
      const h = data.hole({
        reason: "pending:weird-feature",
        input: T.unknown,
        output: T.string,
        origin: loc(),
      });
      return eff.echo({ value: h, origin: loc() });
    });
    const res = simulateHandler(m, routeIdOf(m), emptyInput);
    expect(res.errors.length).toBeGreaterThanOrEqual(1);
    expect(res.errors[0]!.reason).toMatch(/hole/);
  });
});
