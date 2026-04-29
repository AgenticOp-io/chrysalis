import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import { nPlusOneRecognizer } from "@chrysalis/insight";
import {
  applyRewrites,
  batchN1ReadPass,
  DEFAULT_PASSES,
  verifyBehavior,
} from "../src/index.js";
import { buildModule } from "./helpers.js";

/** Foreach over `posts` param with one inner users lookup by author_id (assign-wrapped). */
function batchN1Module() {
  return buildModule(({ data, eff, loc }) => {
    const outer = eff.dbQuery({
      kind: "read",
      sql: "SELECT id, author_id FROM posts",
      params: [],
      returns: "rows",
      tables: ["posts"],
      type: T.array(T.record({})),
      origin: loc(),
    });
    const postsAssign = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "posts", type: T.string, origin: loc() }),
        outer,
      ],
      type: T.void,
      origin: loc(),
    });
    const postsRead = data.param({ name: "posts", type: T.unknown, origin: loc() });
    const rowParam = data.param({ name: "row", type: T.record({}), origin: loc() });
    const fk = data.member({
      obj: rowParam,
      key: "author_id",
      type: T.int,
      origin: loc(),
    });
    const inner = eff.dbQuery({
      kind: "read",
      sql: "SELECT id, name FROM users WHERE id = ?",
      params: [fk],
      returns: "row-or-null",
      tables: ["users"],
      type: T.nullable(T.record({})),
      origin: loc(),
    });
    const userAssign = data.call({
      callee: "__assign",
      args: [
        data.literal({ value: "user", type: T.string, origin: loc() }),
        inner,
      ],
      type: T.void,
      origin: loc(),
    });
    const body = data.block({ statements: [userAssign], origin: loc() });
    const loop = data.foreach({
      iterable: postsRead,
      valueName: "row",
      body,
      origin: loc(),
    });
    return data.block({ statements: [postsAssign, loop], origin: loc() });
  });
}

describe("batch-n1-read pass", () => {
  function withCorpusEvidence<T extends { evidence: Record<string, unknown> }>(op: T): T {
    return {
      ...op,
      evidence: {
        ...op.evidence,
        corpusConfirmations: 1,
        observedMaxPerRequest: 2,
      },
    };
  }

  it("hoists a batched IN read and replaces inner query with row lookup", () => {
    const m = batchN1Module();
    const [op0] = nPlusOneRecognizer.recognize(m);
    expect(op0).toBeDefined();
    const op = withCorpusEvidence({ ...op0!, confidence: 0.95 });

    const { module: next, report } = applyRewrites(m, [op], [batchN1ReadPass], {
      minConfidence: 0.5,
      verifyInvariants: true,
    });
    expect(report.applied).toHaveLength(1);
    expect(report.applied[0]!.pass).toBe("batch-n1-read");

    const after = nPlusOneRecognizer.recognize(next);
    expect(after).toHaveLength(0);

    const vb = verifyBehavior(m, next, report.applied, { synthesizeProbes: true });
    expect(vb.ok).toBe(true);
  });

  it("batches two assign-wrapped inner reads in one pass", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const outer = eff.dbQuery({
        kind: "read",
        sql: "SELECT id, author_id FROM posts",
        params: [],
        returns: "rows",
        tables: ["posts"],
        type: T.array(T.record({})),
        origin: loc(),
      });
      const postsAssign = data.call({
        callee: "__assign",
        args: [
          data.literal({ value: "posts", type: T.string, origin: loc() }),
          outer,
        ],
        type: T.void,
        origin: loc(),
      });
      const postsRead = data.param({ name: "posts", type: T.unknown, origin: loc() });
      const rowParam = data.param({ name: "row", type: T.record({}), origin: loc() });
      const q1 = eff.dbQuery({
        kind: "read",
        sql: "SELECT id, name FROM users WHERE id = ?",
        params: [data.member({ obj: rowParam, key: "author_id", type: T.int, origin: loc() })],
        returns: "row-or-null",
        tables: ["users"],
        type: T.nullable(T.record({})),
        origin: loc(),
      });
      const a1 = data.call({
        callee: "__assign",
        args: [
          data.literal({ value: "user", type: T.string, origin: loc() }),
          q1,
        ],
        type: T.void,
        origin: loc(),
      });
      const q2 = eff.dbQuery({
        kind: "read",
        sql: "SELECT post_id, c FROM comment_counts WHERE post_id = ?",
        params: [data.member({ obj: rowParam, key: "id", type: T.int, origin: loc() })],
        returns: "row-or-null",
        tables: ["comment_counts"],
        type: T.nullable(T.record({})),
        origin: loc(),
      });
      const a2 = data.call({
        callee: "__assign",
        args: [
          data.literal({ value: "cc", type: T.string, origin: loc() }),
          q2,
        ],
        type: T.void,
        origin: loc(),
      });
      const body = data.block({ statements: [a1, a2], origin: loc() });
      const loop = data.foreach({
        iterable: postsRead,
        valueName: "row",
        body,
        origin: loc(),
      });
      return data.block({ statements: [postsAssign, loop], origin: loc() });
    });
    const [op0] = nPlusOneRecognizer.recognize(m);
    expect(op0!.evidence["innerQueriesInLoop"]).toBe(2);
    const op = withCorpusEvidence({ ...op0!, confidence: 0.95 });
    const { module: next, report } = applyRewrites(m, [op], [batchN1ReadPass], {
      minConfidence: 0.5,
      verifyInvariants: true,
    });
    expect(report.applied).toHaveLength(1);
    const vb = verifyBehavior(m, next, report.applied, { synthesizeProbes: true });
    expect(vb.ok).toBe(true);
  });

  it("batches bare inner reads (no __assign wrapper) by replacing body statements", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const outer = eff.dbQuery({
        kind: "read",
        sql: "SELECT id FROM posts",
        params: [],
        returns: "rows",
        tables: ["posts"],
        type: T.array(T.record({})),
        origin: loc(),
      });
      const postsAssign = data.call({
        callee: "__assign",
        args: [
          data.literal({ value: "posts", type: T.string, origin: loc() }),
          outer,
        ],
        type: T.void,
        origin: loc(),
      });
      const postsRead = data.param({ name: "posts", type: T.unknown, origin: loc() });
      const rowParam = data.param({ name: "row", type: T.record({}), origin: loc() });
      const q1 = eff.dbQuery({
        kind: "read",
        sql: "SELECT id, name FROM users WHERE id = ?",
        params: [data.member({ obj: rowParam, key: "author_id", type: T.int, origin: loc() })],
        returns: "row-or-null",
        tables: ["users"],
        type: T.nullable(T.record({})),
        origin: loc(),
      });
      const body = data.block({ statements: [q1], origin: loc() });
      const loop = data.foreach({
        iterable: postsRead,
        valueName: "row",
        body,
        origin: loc(),
      });
      return data.block({ statements: [postsAssign, loop], origin: loc() });
    });
    const [op0] = nPlusOneRecognizer.recognize(m);
    const op = withCorpusEvidence({ ...op0!, confidence: 0.95 });
    const { module: next, report } = applyRewrites(m, [op], [batchN1ReadPass], {
      minConfidence: 0.5,
      verifyInvariants: true,
    });
    expect(report.applied).toHaveLength(1);
    const after = nPlusOneRecognizer.recognize(next);
    expect(after.length).toBeLessThanOrEqual(1);
    const vb = verifyBehavior(m, next, report.applied, { synthesizeProbes: true });
    expect(vb.ok).toBe(true);
  });

  it("composes with DEFAULT_PASSES when opportunity is above confidence threshold", () => {
    const m = batchN1Module();
    const [op0] = nPlusOneRecognizer.recognize(m);
    const op = withCorpusEvidence({ ...op0!, confidence: 0.95 });
    const { report } = applyRewrites(m, [op], DEFAULT_PASSES, {
      only: ["batch-n1-read"],
      minConfidence: 0.5,
      postVerifyRecognizers: [nPlusOneRecognizer],
    });
    expect(report.applied.some((a) => a.pass === "batch-n1-read")).toBe(true);
    expect(report.postVerify?.ok).toBe(true);
  });
});
