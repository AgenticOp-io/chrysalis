import { describe, expect, it, vi } from "vitest";
import {
  ModuleBuilder,
  NO_EFFECTS,
  T,
  countHoles,
  dataDialect,
  effectDialect,
  nodeId,
  synthetic,
  type NodeBase,
} from "@chrysalis/webir";
import type { TraceCorpus } from "@chrysalis/oracle";
import type { TraceOutcome } from "@chrysalis/verify";
import {
  applyHoleClosure,
  applyHoleClosureAndVerify,
  findHoleOperandRef,
  parseHoleClosurePatchJson,
} from "../src/hole-closure.js";

describe("hole closure", () => {
  it("findHoleOperandRef locates parent", () => {
    const b = new ModuleBuilder({ sourceApp: "t" });
    const eff = effectDialect.builders(b);
    const data = dataDialect.builders(b);
    const origin = synthetic("t");
    const holeId = data.hole({
      reason: "r",
      input: T.string,
      output: T.string,
      origin,
    });
    const echoId = eff.echo({ value: holeId, origin });
    b.addRoot(echoId);
    const mod = b.finish();
    const ref = findHoleOperandRef(mod, holeId);
    expect(ref.parentId).toBe(echoId);
    expect(ref.operandIndex).toBe(0);
  });

  it("applyHoleClosure replaces hole and lowers reachable hole count", () => {
    const b = new ModuleBuilder({ sourceApp: "t" });
    const eff = effectDialect.builders(b);
    const data = dataDialect.builders(b);
    const origin = synthetic("t");
    const holeId = data.hole({
      reason: "r",
      input: T.string,
      output: T.string,
      origin,
    });
    const echoId = eff.echo({ value: holeId, origin });
    b.addRoot(echoId);
    const mod = b.finish();
    expect(countHoles(mod)).toBe(1);

    const litId = nodeId("lit1");
    const lit: NodeBase = {
      id: litId,
      dialect: "data",
      op: "literal",
      type: T.string,
      effects: NO_EFFECTS,
      operands: [],
      attrs: { value: "ok" },
      origin: synthetic("lit"),
      provenance: [],
    };

    const next = applyHoleClosure(mod, {
      holeId,
      replacementRootId: litId,
      nodesToAdd: [lit],
      signOff: { signer: "qa", note: "unit" },
    });
    expect(countHoles(next)).toBe(0);
    const echo = next.nodes.get(echoId);
    expect(echo?.operands[0]).toBe(litId);
    const litNode = next.nodes.get(litId);
    expect(litNode?.provenance.some((p) => p.source === "hand-authored" && p.reason.includes("qa"))).toBe(
      true,
    );
  });

  it("applyHoleClosureAndVerify checks full replay", async () => {
    const b = new ModuleBuilder({ sourceApp: "t" });
    const eff = effectDialect.builders(b);
    const data = dataDialect.builders(b);
    const origin = synthetic("t");
    const holeId = data.hole({
      reason: "r",
      input: T.string,
      output: T.string,
      origin,
    });
    b.addRoot(eff.echo({ value: holeId, origin }));
    const mod = b.finish();

    const litId = nodeId("lit1");
    const lit: NodeBase = {
      id: litId,
      dialect: "data",
      op: "literal",
      type: T.string,
      effects: NO_EFFECTS,
      operands: [],
      attrs: { value: "ok" },
      origin: synthetic("lit"),
      provenance: [],
    };

    const corpus: TraceCorpus = { schemaVersion: "1.0.0", traces: [] };
    const replay = vi.fn().mockResolvedValue([] as TraceOutcome[]);
    const r = await applyHoleClosureAndVerify(
      mod,
      corpus,
      { baseUrl: "http://x" },
      {
        holeId,
        replacementRootId: litId,
        nodesToAdd: [lit],
        signOff: { signer: "qa" },
      },
      replay,
    );
    expect(r.ok).toBe(true);
    expect(countHoles(r.module)).toBe(0);
    expect(replay).toHaveBeenCalledTimes(1);
  });

  it("parseHoleClosurePatchJson round-trips a minimal patch file", () => {
    const json = JSON.stringify({
      holeId: "h1",
      replacementRootId: "lit1",
      signOff: { signer: "dev", note: "from fixture" },
      nodesToAdd: [
        {
          id: "lit1",
          dialect: "data",
          op: "literal",
          type: { kind: "string" },
          effects: [],
          operands: [],
          attrs: { value: "ok" },
          origin: { kind: "synthetic", reason: "patch" },
          provenance: [],
        },
      ],
    });
    const parsed = parseHoleClosurePatchJson(json);
    expect(String(parsed.holeId)).toBe("h1");
    expect(String(parsed.replacementRootId)).toBe("lit1");
    expect(parsed.nodesToAdd).toHaveLength(1);
    expect(parsed.signOff.signer).toBe("dev");
  });
});
