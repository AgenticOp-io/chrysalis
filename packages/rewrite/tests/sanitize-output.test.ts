import { describe, expect, it } from "vitest";
import { T, type NodeId } from "@chrysalis/webir";
import { unescapedOutputRecognizer, analyzeModule } from "@chrysalis/insight";
import { applyRewrites, sanitizeOutputPass } from "../src/index.js";
import { buildModule } from "./helpers.js";

describe("rewrite engine — sanitize-output", () => {
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

  it("wraps an echo of a tainted request field in htmlspecialchars", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({
        source: "query",
        name: "name",
        type: T.string,
        origin: loc(),
      });
      return eff.echo({ value: field, origin: loc() });
    });
    const ops = unescapedOutputRecognizer.recognize(m).map(withCorpusEvidence);
    expect(ops).toHaveLength(1);
    const { module: next, report } = applyRewrites(m, ops, [sanitizeOutputPass]);
    expect(report.applied).toHaveLength(1);
    expect(report.skipped).toHaveLength(0);
    expect(report.applied[0]!.pass).toBe("sanitize-output");

    const echoNode = [...next.nodes.values()].find(
      (n) => n.dialect === "effect" && n.op === "echo",
    );
    expect(echoNode).toBeDefined();
    const wrappedId = echoNode!.operands[0]!;
    const wrapper = next.nodes.get(wrappedId);
    expect(wrapper).toBeDefined();
    expect(wrapper!.dialect).toBe("data");
    expect(wrapper!.op).toBe("call");
    expect((wrapper!.attrs as { callee: string }).callee).toBe("htmlspecialchars");
    expect(wrapper!.operands).toHaveLength(1);

    // Re-running insight on the rewritten module should find no XSS.
    const after = unescapedOutputRecognizer.recognize(next);
    expect(after).toHaveLength(0);
  });

  it("skips without corpus confirmation", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({
        source: "query",
        name: "name",
        type: T.string,
        origin: loc(),
      });
      return eff.echo({ value: field, origin: loc() });
    });
    const ops = unescapedOutputRecognizer.recognize(m);
    expect(ops).toHaveLength(1);
    const { report } = applyRewrites(m, ops, [sanitizeOutputPass]);
    expect(report.applied).toHaveLength(0);
    expect(report.skipped.some((s) => s.reason.includes("corpus gating"))).toBe(true);
  });

  it("is idempotent: re-rewriting does not double-wrap", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({
        source: "query",
        name: "n",
        type: T.string,
        origin: loc(),
      });
      return eff.echo({ value: field, origin: loc() });
    });
    const firstReport = analyzeModule(m, { only: ["unescaped-output"] });
    const { module: once } = applyRewrites(
      m,
      firstReport.opportunities.map(withCorpusEvidence),
      [sanitizeOutputPass],
    );
    const secondReport = analyzeModule(once, { only: ["unescaped-output"] });
    const { module: twice, report } = applyRewrites(
      once,
      secondReport.opportunities,
      [sanitizeOutputPass],
    );
    expect(secondReport.opportunities).toHaveLength(0);
    expect(report.applied).toHaveLength(0);

    const callNodes = [...twice.nodes.values()].filter(
      (n) =>
        n.dialect === "data" &&
        n.op === "call" &&
        (n.attrs as { callee?: string }).callee === "htmlspecialchars",
    );
    expect(callNodes).toHaveLength(1);
  });

  it("flips escape:true on a tainted template interpolation", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({
        source: "query",
        name: "raw",
        type: T.string,
        origin: loc(),
      });
      const tpl = data.htmlTemplate({
        parts: [
          { kind: "literal", text: "<h1>" },
          { kind: "expr", node: field, escape: false },
          { kind: "literal", text: "</h1>" },
        ],
        origin: loc(),
      });
      return eff.echo({ value: tpl, origin: loc() });
    });
    const ops = unescapedOutputRecognizer.recognize(m).map(withCorpusEvidence);
    expect(ops).toHaveLength(1);
    const { module: next, report } = applyRewrites(m, ops, [sanitizeOutputPass]);
    expect(report.applied).toHaveLength(1);

    const tmpl = [...next.nodes.values()].find(
      (n) => n.dialect === "data" && n.op === "html.template",
    );
    expect(tmpl).toBeDefined();
    const parts = (tmpl!.attrs as {
      parts: ReadonlyArray<
        { kind: "literal"; text: string } | { kind: "expr"; idx: number; escape: boolean }
      >;
    }).parts;
    const exprPart = parts.find((p) => p.kind === "expr") as {
      kind: "expr";
      idx: number;
      escape: boolean;
    };
    expect(exprPart.escape).toBe(true);

    const wrappedOperand: NodeId = tmpl!.operands[exprPart.idx]!;
    const wrapper = next.nodes.get(wrappedOperand);
    expect(wrapper).toBeDefined();
    expect((wrapper!.attrs as { callee: string }).callee).toBe("htmlspecialchars");
  });

  it("skips opportunities below the minConfidence threshold", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({
        source: "query",
        name: "n",
        type: T.string,
        origin: loc(),
      });
      return eff.echo({ value: field, origin: loc() });
    });
    const ops = unescapedOutputRecognizer.recognize(m).map(withCorpusEvidence);
    const { module: next, report } = applyRewrites(m, ops, [sanitizeOutputPass], {
      minConfidence: 0.99,
    });
    expect(report.applied).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0]!.reason).toMatch(/below threshold/);
    // The module is unchanged (no new htmlspecialchars calls).
    const hasWrapper = [...next.nodes.values()].some(
      (n) =>
        n.dialect === "data" &&
        n.op === "call" &&
        (n.attrs as { callee?: string }).callee === "htmlspecialchars",
    );
    expect(hasWrapper).toBe(false);
  });

  it("wraps only the tainted operands of a concat (not literal HTML parts)", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({
        source: "query",
        name: "q",
        type: T.string,
        origin: loc(),
      });
      const lit1 = data.literal({ value: "<h1>Hello, ", type: T.string, origin: loc() });
      const lit2 = data.literal({ value: "</h1>", type: T.string, origin: loc() });
      const concat = data.concat({ parts: [lit1, field, lit2], origin: loc() });
      return eff.echo({ value: concat, origin: loc() });
    });
    const ops = unescapedOutputRecognizer.recognize(m).map(withCorpusEvidence);
    expect(ops).toHaveLength(1);
    const { module: next, report } = applyRewrites(m, ops, [sanitizeOutputPass]);
    expect(report.applied).toHaveLength(1);

    const concat = [...next.nodes.values()].find(
      (n) => n.dialect === "data" && n.op === "concat",
    );
    expect(concat).toBeDefined();
    expect(concat!.operands).toHaveLength(3);

    // First and last operands remain the literals — unchanged.
    const first = next.nodes.get(concat!.operands[0]!)!;
    const last = next.nodes.get(concat!.operands[2]!)!;
    expect(first.op).toBe("literal");
    expect(last.op).toBe("literal");
    expect((first.attrs as { value: string }).value).toBe("<h1>Hello, ");

    // Middle operand has been replaced with a htmlspecialchars wrapper.
    const mid = next.nodes.get(concat!.operands[1]!)!;
    expect(mid.op).toBe("call");
    expect((mid.attrs as { callee: string }).callee).toBe("htmlspecialchars");
  });

  it("does not wrap already-sanitized echo values", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({
        source: "query",
        name: "n",
        type: T.string,
        origin: loc(),
      });
      const safe = data.call({
        callee: "htmlspecialchars",
        args: [field],
        type: T.string,
        origin: loc(),
      });
      return eff.echo({ value: safe, origin: loc() });
    });
    const ops = unescapedOutputRecognizer.recognize(m);
    // Recognizer already declines to fire when sanitized; the rewrite
    // engine should therefore have nothing to do.
    expect(ops).toHaveLength(0);
    const { report } = applyRewrites(m, ops, [sanitizeOutputPass]);
    expect(report.applied).toHaveLength(0);
  });
});
