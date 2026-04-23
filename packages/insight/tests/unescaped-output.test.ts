import { describe, expect, it } from "vitest";
import { T } from "@chrysalis/webir";
import { unescapedOutputRecognizer } from "../src/recognizers/unescaped-output.js";
import { boostWithCorpus } from "../src/framework.js";
import { buildModule } from "./helpers.js";
import type { TraceCorpus } from "@chrysalis/oracle";

describe("unescaped-output recognizer", () => {
  it("fires when echo of a request field has no sanitizer", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({ source: "query", name: "name", type: T.string, origin: loc() });
      return eff.echo({ value: field, origin: loc() });
    });
    const ops = unescapedOutputRecognizer.recognize(m);
    expect(ops).toHaveLength(1);
    expect(ops[0]!.severity).toBe("strong");
    expect(ops[0]!.evidence["sources"]).toContain("request");
  });

  it("does not fire when echo value passes through htmlspecialchars", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({ source: "query", name: "name", type: T.string, origin: loc() });
      const safe = data.call({ callee: "htmlspecialchars", args: [field], type: T.string, origin: loc() });
      return eff.echo({ value: safe, origin: loc() });
    });
    expect(unescapedOutputRecognizer.recognize(m)).toHaveLength(0);
  });

  it("does not fire when echo value is a plain literal", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const lit = data.literal({ value: "hello", type: T.string, origin: loc() });
      return eff.echo({ value: lit, origin: loc() });
    });
    expect(unescapedOutputRecognizer.recognize(m)).toHaveLength(0);
  });

  it("flags unescaped template interpolations and leaves escaped ones alone", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const raw = data.requestField({ source: "query", name: "raw", type: T.string, origin: loc() });
      const safe = data.requestField({ source: "query", name: "safe", type: T.string, origin: loc() });
      const tpl = data.htmlTemplate({
        parts: [
          { kind: "literal", text: "<h1>" },
          { kind: "expr", node: raw, escape: false },
          { kind: "literal", text: "</h1><p>" },
          { kind: "expr", node: safe, escape: true },
          { kind: "literal", text: "</p>" },
        ],
        origin: loc(),
      });
      return eff.echo({ value: tpl, origin: loc() });
    });
    const ops = unescapedOutputRecognizer.recognize(m);
    expect(ops).toHaveLength(1);
    expect(ops[0]!.evidence["isTemplate"]).toBe(true);
  });

  it("reports suggestion severity when the source is a db read", () => {
    const m = buildModule(({ eff, loc }) => {
      const q = eff.dbQuery({
        kind: "read",
        sql: "SELECT name FROM users WHERE id = 1",
        params: [],
        returns: "row-or-null",
        tables: ["users"],
        type: T.nullable(T.record({})),
        origin: loc(),
      });
      return eff.echo({ value: q, origin: loc() });
    });
    const ops = unescapedOutputRecognizer.recognize(m);
    expect(ops).toHaveLength(1);
    expect(ops[0]!.severity).toBe("suggestion");
    expect(ops[0]!.evidence["sources"]).toContain("db");
  });

  it("boosts confidence when the corpus shows the value echoed verbatim", () => {
    const m = buildModule(({ data, eff, loc }) => {
      const field = data.requestField({ source: "body", name: "name", type: T.string, origin: loc() });
      return eff.echo({ value: field, origin: loc() });
    });
    const [op] = unescapedOutputRecognizer.recognize(m);
    const corpus: TraceCorpus = {
      id: "test",
      createdAt: "2026-01-01T00:00:00Z",
      root: "/tmp",
      traces: [
        {
          header: {
            type: "header",
            schemaVersion: "1.0.0",
            traceId: "a",
            startedAt: "2026-01-01T00:00:00Z",
            php: { version: "8.3", sapi: "cli-server" },
            redaction: { configHash: "x", rules: [] },
          },
          events: [
            {
              type: "http.request",
              method: "POST",
              path: "/x",
              query: {},
              headers: {},
              cookies: {},
              post: { name: "<script>alert(1)</script>" },
              rawBody: null,
              session: {},
            },
            {
              type: "http.response",
              status: 200,
              headers: {},
              body: "hello <script>alert(1)</script>!",
              durationUs: 100,
            },
          ],
          footer: {
            type: "footer",
            endedAt: "2026-01-01T00:00:01Z",
            durationUs: 1,
            eventCount: 2,
            exitStatus: 0,
          },
        },
      ],
    };
    const boosted = boostWithCorpus(op!, corpus);
    expect(boosted.confidence).toBeGreaterThan(op!.confidence);
    expect(boosted.severity).toBe("strong");
    expect(boosted.evidence["corpusConfirmations"]).toBe(1);
    expect(boosted.evidence["exampleValueEchoed"]).toBe("<script>alert(1)</script>");
  });
});
