import { describe, expect, it } from "vitest";
import type { NodeBase, NodeId } from "@chrysalis/webir";
import { T, phpLocator } from "@chrysalis/webir";
import {
  applyRewrites,
  verifyInvariants,
  type Edit,
  type RewriteCtx,
  type RewritePass,
} from "../src/index.js";
import type { Opportunity } from "@chrysalis/insight";
import { buildModule } from "./helpers.js";

function fakeOpp(): Opportunity {
  return {
    recognizer: "unescaped-output",
    id: "unescaped-output:GET:/x:fake",
    title: "fake",
    severity: "strong",
    confidence: 0.9,
    nodes: [],
    origin: phpLocator("test.php", 1, 1),
    route: { method: "GET", path: "/x" },
    rationale: "",
    proposedLift: { kind: "sanitize", sketch: "" },
    evidence: {},
  };
}

function cloneModule(mod: ReturnType<typeof buildModule>) {
  const nodes = new Map(mod.nodes);
  return { nodes, roots: mod.roots, meta: mod.meta } as typeof mod;
}

function findFirst(
  mod: ReturnType<typeof buildModule>,
  dialect: string,
  op: string,
): NodeBase {
  for (const n of mod.nodes.values()) {
    if (n.dialect === dialect && n.op === op) return n;
  }
  throw new Error(`no ${dialect}.${op} in module`);
}

describe("verifyInvariants", () => {
  it("passes on identical modules", () => {
    const mod = buildModule(({ data, eff, loc }) => {
      const lit = data.literal({ attrs: { value: "hi" }, origin: loc() });
      return eff.echo({ value: lit, origin: loc() });
    });
    const r = verifyInvariants(mod, cloneModule(mod), {});
    expect(r.ok).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it("flags a missing node", () => {
    const before = buildModule(({ data, eff, loc }) => {
      const lit = data.literal({ attrs: { value: "hi" }, origin: loc() });
      return eff.echo({ value: lit, origin: loc() });
    });
    const after = cloneModule(before);
    const echo = findFirst(after, "effect", "echo");
    after.nodes.delete(echo.id);

    const r = verifyInvariants(before, after, {});
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "missing-node")).toBe(true);
    expect(r.violations.some((v) => v.kind === "effect-count-changed")).toBe(true);
  });

  it("flags a modified effect kind not declared in mayModify", () => {
    // A hypothetical misbehaving pass that changes the `table` attr of
    // a DB query. Must be caught even if the pass declared
    // `effect.echo` in its allowlist.
    const before = buildModule(({ data, eff, loc }) => {
      const q = eff.dbQuery({
        kind: "read",
        sql: "SELECT 1",
        params: [],
        returns: "rows",
        tables: ["users"],
        type: T.unknown,
        origin: loc(),
      });
      const lit = data.literal({ attrs: { value: "hi" }, origin: loc() });
      eff.echo({ value: lit, origin: loc() });
      return q;
    });
    const after = cloneModule(before);
    const q = findFirst(after, "effect", "db.query");
    // Tamper with a structural attr we care about. The invariant
    // verifier's `structuralKey` picks `table` out of attrs, so this
    // flips the before/after keys.
    const tampered: NodeBase = {
      ...q,
      attrs: { ...(q.attrs as Record<string, unknown>), table: "admins" },
    };
    after.nodes.set(q.id, tampered);

    const r = verifyInvariants(before, after, {
      mayModify: ["effect.echo"],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "modified-disallowed")).toBe(true);
  });

  it("allows modifications within mayModify set", () => {
    // A rewrite that swaps an echo's value operand — as sanitize-output
    // does — must pass when `effect.echo` is in mayModify, even though
    // the echo node's operands array changed.
    const before = buildModule(({ data, eff, loc }) => {
      const lit = data.literal({ attrs: { value: "hi" }, origin: loc() });
      return eff.echo({ value: lit, origin: loc() });
    });
    const after = cloneModule(before);
    const echo = findFirst(after, "effect", "echo");
    const newLit: NodeBase = {
      id: "new1" as NodeId,
      dialect: "data",
      op: "literal",
      type: { kind: "scalar", scalar: "string" },
      effects: [],
      operands: [],
      attrs: { value: "bye" },
      origin: echo.origin,
      provenance: [{ source: "intent-rewrite", locator: echo.origin, reason: "test" }],
    };
    after.nodes.set(newLit.id, newLit);
    const patchedEcho: NodeBase = {
      ...echo,
      operands: Object.freeze([newLit.id]),
    };
    after.nodes.set(echo.id, patchedEcho);

    const r = verifyInvariants(before, after, { mayModify: ["effect.echo"] });
    expect(r.ok).toBe(true);
  });

  it("flags a new node that lacks intent-rewrite provenance", () => {
    const before = buildModule(({ data, eff, loc }) => {
      const lit = data.literal({ attrs: { value: "hi" }, origin: loc() });
      return eff.echo({ value: lit, origin: loc() });
    });
    const after = cloneModule(before);
    const echo = findFirst(after, "effect", "echo");
    const sketchy: NodeBase = {
      id: "sketchy" as NodeId,
      dialect: "data",
      op: "literal",
      type: { kind: "scalar", scalar: "string" },
      effects: [],
      operands: [],
      attrs: { value: "mystery" },
      origin: echo.origin,
      provenance: [],
    };
    after.nodes.set(sketchy.id, sketchy);

    const r = verifyInvariants(before, after, {});
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "untagged-new-node")).toBe(true);
  });
});

describe("applyRewrites × invariants", () => {
  const evilPass: RewritePass = {
    id: "evil-pass",
    name: "Evil pass that deletes a DB query",
    handles(op) {
      return op.recognizer === "unescaped-output";
    },
    apply(ctx: RewriteCtx): ReadonlyArray<Edit> {
      // Simulate a pass that tampers with a DB query by replacing the
      // node entirely — swapping the SQL string under the same id.
      // This is exactly the kind of regression the invariants system
      // must catch before committing the rewrite.
      let q: NodeBase | undefined;
      for (const n of ctx.module.nodes.values()) {
        if (n.dialect === "effect" && n.op === "db.query") {
          q = n;
          break;
        }
      }
      if (!q) return [];
      const tampered: NodeBase = {
        ...q,
        attrs: {
          ...(q.attrs as Record<string, unknown>),
          sql: "DROP TABLE users",
        },
      };
      return [{ kind: "add", node: tampered }];
    },
    invariants: {
      // Declares it only touches echoes — but it actually touches
      // the DB query. verifyInvariants should catch this and roll
      // the edit back.
      mayModify: ["effect.echo"],
    },
  };

  it("rolls back an opportunity whose pass violates its declared invariants", () => {
    const mod = buildModule(({ data, eff, loc }) => {
      const q = eff.dbQuery({
        kind: "read",
        sql: "SELECT 1",
        params: [],
        returns: "rows",
        tables: ["users"],
        type: T.unknown,
        origin: loc(),
      });
      const lit = data.literal({ attrs: { value: "hi" }, origin: loc() });
      eff.echo({ value: lit, origin: loc() });
      return q;
    });

    const { report, module } = applyRewrites(mod, [fakeOpp()], [evilPass]);
    expect(report.applied).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    const first = report.skipped[0]!;
    expect(first.reason).toMatch(/verify-invariant-failed/);
    expect(first.violations).toBeTruthy();
    // Module must be unchanged — same node count, same db query SQL.
    expect(module.nodes.size).toBe(mod.nodes.size);
    const q = findFirst(module, "effect", "db.query");
    const origQ = findFirst(mod, "effect", "db.query");
    expect(q.operands[0]).toBe(origQ.operands[0]);
  });

  it("still applies the rewrite when verifyInvariants is false", () => {
    // Escape hatch: if a user explicitly disables verification, the
    // evil pass's edits land. This exists only so tests can exercise
    // the raw edit pipeline; it is NOT the default.
    const mod = buildModule(({ data, eff, loc }) => {
      const q = eff.dbQuery({
        kind: "read",
        sql: "SELECT 1",
        params: [],
        returns: "rows",
        tables: ["users"],
        type: T.unknown,
        origin: loc(),
      });
      const lit = data.literal({ attrs: { value: "hi" }, origin: loc() });
      eff.echo({ value: lit, origin: loc() });
      return q;
    });
    const { report } = applyRewrites(mod, [fakeOpp()], [evilPass], {
      verifyInvariants: false,
    });
    expect(report.applied).toHaveLength(1);
  });
});
