import type { TraceCorpus } from "@chrysalis/oracle";
import { applyModuleEdits, type Edit } from "@chrysalis/rewrite";
import { replayCorpus, type ReplayOptions, type TraceOutcome } from "@chrysalis/verify";
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import type { RepairReplayBase } from "./types.js";

export interface HoleClosureSignOff {
  readonly signer: string;
  readonly note?: string;
}

export interface ApplyHoleClosureOptions {
  readonly holeId: NodeId;
  /** Subgraph root to substitute for the hole (must appear in `nodesToAdd`). */
  readonly replacementRootId: NodeId;
  /** Every node in the replacement subgraph, including `replacementRootId`. */
  readonly nodesToAdd: ReadonlyArray<NodeBase>;
  readonly signOff: HoleClosureSignOff;
}

function isDataHole(n: NodeBase | undefined): n is NodeBase {
  return n != null && n.dialect === "data" && n.op === "hole";
}

/**
 * Locates the unique parent that lists `holeId` as an operand.
 * Multiple parents are rejected (v1); unreachable holes must be wired first.
 */
export function findHoleOperandRef(
  module: Module,
  holeId: NodeId,
): { parentId: NodeId; operandIndex: number } {
  const refs: { parentId: NodeId; operandIndex: number }[] = [];
  for (const [parentId, node] of module.nodes) {
    for (let idx = 0; idx < node.operands.length; idx++) {
      if (node.operands[idx] === holeId) refs.push({ parentId, operandIndex: idx });
    }
  }
  if (refs.length === 0) {
    throw new Error(`hole-closure: hole ${String(holeId)} is not referenced as an operand`);
  }
  if (refs.length > 1) {
    throw new Error(
      `hole-closure: hole ${String(holeId)} has ${refs.length} operand refs (v1 supports exactly one)`,
    );
  }
  return refs[0]!;
}

/**
 * Replace a single `data.hole` operand with a replacement subgraph and record
 * human sign-off on the replacement root's provenance. Does not run verify;
 * use {@link applyHoleClosureAndVerify} for the Milestone 3 gate.
 */
export function applyHoleClosure(module: Module, opts: ApplyHoleClosureOptions): Module {
  const hole = module.nodes.get(opts.holeId);
  if (!isDataHole(hole)) {
    throw new Error(`hole-closure: ${String(opts.holeId)} is not a data.hole node`);
  }
  const { parentId, operandIndex } = findHoleOperandRef(module, opts.holeId);
  const idSet = new Set(opts.nodesToAdd.map((n) => n.id));
  if (!idSet.has(opts.replacementRootId)) {
    throw new Error("hole-closure: replacementRootId must appear in nodesToAdd");
  }
  const seenNew = new Set<NodeId>();
  for (const n of opts.nodesToAdd) {
    if (seenNew.has(n.id)) {
      throw new Error(`hole-closure: duplicate id in nodesToAdd: ${String(n.id)}`);
    }
    seenNew.add(n.id);
    if (module.nodes.has(n.id)) {
      throw new Error(`hole-closure: node ${String(n.id)} already exists in module`);
    }
  }

  const reason =
    `hole closed: signed off by ${opts.signOff.signer}` +
    (opts.signOff.note != null && opts.signOff.note !== "" ? ` — ${opts.signOff.note}` : "");

  const signProv = {
    source: "hand-authored" as const,
    locator: hole.origin,
    reason,
  };

  const nodesWithSignOff = opts.nodesToAdd.map((n) =>
    n.id === opts.replacementRootId
      ? { ...n, provenance: [...n.provenance, signProv] }
      : n,
  );

  const edits: Edit[] = [
    ...nodesWithSignOff.map((node) => ({ kind: "add" as const, node })),
    {
      kind: "replaceOperand" as const,
      nodeId: parentId,
      index: operandIndex,
      newOperandId: opts.replacementRootId,
    },
  ];

  return applyModuleEdits(module, edits, {
    provenanceSource: "repair-pass",
    replaceOperandReason: `close hole ${String(opts.holeId)} (${opts.signOff.signer})`,
  });
}

export interface HoleClosureVerifyResult {
  readonly ok: boolean;
  readonly module: Module;
  readonly outcomes: ReadonlyArray<TraceOutcome>;
}

/**
 * Apply {@link applyHoleClosure} then full-corpus replay. Acceptance matches
 * the repair loop: every trace must pass.
 */
export async function applyHoleClosureAndVerify(
  module: Module,
  corpus: TraceCorpus,
  replayBase: RepairReplayBase,
  closure: ApplyHoleClosureOptions,
  replayImpl: (
    corpus: TraceCorpus,
    opts: ReplayOptions,
  ) => Promise<TraceOutcome[]> = replayCorpus,
): Promise<HoleClosureVerifyResult> {
  const patched = applyHoleClosure(module, closure);
  const outcomes = await replayImpl(corpus, { ...replayBase, module: patched } as ReplayOptions);
  const ok = outcomes.every((o) => o.ok);
  return { ok, module: patched, outcomes };
}
