import type { TraceCorpus } from "@chrysalis/oracle";
import { applyModuleEdits, type Edit } from "@chrysalis/rewrite";
import { replayCorpus, type ReplayOptions, type TraceOutcome } from "@chrysalis/verify";
import {
  nodeId,
  type Effect,
  type Locator,
  type Module,
  type NodeBase,
  type NodeId,
  type Provenance,
  type WebIRType,
} from "@chrysalis/webir";
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

function requireString(v: unknown, ctx: string): string {
  if (typeof v !== "string" || v === "") {
    throw new Error(`hole-patch: ${ctx} must be a non-empty string`);
  }
  return v;
}

function requireRecord(v: unknown, ctx: string): Readonly<Record<string, unknown>> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new Error(`hole-patch: ${ctx} must be an object`);
  }
  return v as Readonly<Record<string, unknown>>;
}

function reviveLocator(raw: unknown, ctx: string): Locator {
  const o = requireRecord(raw, ctx);
  const kind = requireString(o.kind, `${ctx}.kind`);
  switch (kind) {
    case "php": {
      const line = Number(o.line);
      const col = Number(o.col);
      if (!Number.isFinite(line) || !Number.isFinite(col)) {
        throw new Error(`hole-patch: ${ctx} php locator needs finite line and col`);
      }
      return {
        kind: "php",
        file: requireString(o.file, `${ctx}.file`),
        line,
        col,
      };
    }
    case "db":
      return {
        kind: "db",
        table: requireString(o.table, `${ctx}.table`),
        ...(typeof o.column === "string" ? { column: o.column } : {}),
      };
    case "form":
      return {
        kind: "form",
        file: requireString(o.file, `${ctx}.file`),
        fieldName: requireString(o.fieldName, `${ctx}.fieldName`),
      };
    case "trace":
      return {
        kind: "trace",
        corpusId: requireString(o.corpusId, `${ctx}.corpusId`),
        frameId: requireString(o.frameId, `${ctx}.frameId`),
      };
    case "synthetic":
      return { kind: "synthetic", reason: requireString(o.reason, `${ctx}.reason`) };
    default:
      throw new Error(`hole-patch: unsupported locator kind '${kind}' at ${ctx}`);
  }
}

function reviveProvenance(raw: unknown, ctx: string): Provenance {
  const o = requireRecord(raw, ctx);
  const source = requireString(o.source, `${ctx}.source`);
  const allowed: ReadonlySet<Provenance["source"]> = new Set([
    "php-ast",
    "db-schema",
    "form-scan",
    "trace-corpus",
    "repair-pass",
    "intent-rewrite",
    "hand-authored",
  ]);
  if (!allowed.has(source as Provenance["source"])) {
    throw new Error(`hole-patch: invalid provenance source at ${ctx}`);
  }
  return {
    source: source as Provenance["source"],
    locator: reviveLocator(o.locator, `${ctx}.locator`),
    reason: requireString(o.reason, `${ctx}.reason`),
  };
}

const HOLE_PATCH_EFFECT_KINDS = new Set<string>([
  "db.read",
  "db.write",
  "session.read",
  "session.write",
  "mail.send",
  "http.fetch",
  "cache.read",
  "cache.write",
  "time.now",
  "random",
  "fs.read",
  "fs.write",
]);

function reviveEffect(raw: unknown, ctx: string): Effect {
  if (typeof raw !== "object" || raw === null || typeof (raw as { kind?: unknown }).kind !== "string") {
    throw new Error(`hole-patch: ${ctx} must be an effect object`);
  }
  const rec = raw as Record<string, unknown>;
  const k = requireString(rec.kind, `${ctx}.kind`);
  if (!HOLE_PATCH_EFFECT_KINDS.has(k)) {
    throw new Error(`hole-patch: unknown effect kind '${k}' at ${ctx}`);
  }
  return raw as Effect;
}

const HOLE_PATCH_TYPE_KINDS = new Set<string>([
  "unknown",
  "void",
  "null",
  "bool",
  "int",
  "float",
  "string",
  "literal",
  "array",
  "record",
  "union",
  "nullable",
  "named",
  "hole",
]);

function asWebIRType(raw: unknown, ctx: string): WebIRType {
  if (typeof raw !== "object" || raw === null || typeof (raw as { kind?: unknown }).kind !== "string") {
    throw new Error(`hole-patch: ${ctx} must be a WebIR type object`);
  }
  const rec = raw as Record<string, unknown>;
  const k = requireString(rec.kind, `${ctx}.kind`);
  if (!HOLE_PATCH_TYPE_KINDS.has(k)) {
    throw new Error(`hole-patch: unknown WebIR type kind '${k}' at ${ctx}`);
  }
  return raw as WebIRType;
}

function reviveNodeBase(raw: unknown, index: number): NodeBase {
  const ctx = `nodesToAdd[${index}]`;
  const o = requireRecord(raw, ctx);
  const id = nodeId(requireString(o.id, `${ctx}.id`));
  const operandsRaw = o.operands;
  if (!Array.isArray(operandsRaw)) {
    throw new Error(`hole-patch: ${ctx}.operands must be an array`);
  }
  const operands = operandsRaw.map((x, j) =>
    nodeId(requireString(x, `${ctx}.operands[${j}]`)),
  );
  const effectsRaw = o.effects;
  if (!Array.isArray(effectsRaw)) {
    throw new Error(`hole-patch: ${ctx}.effects must be an array`);
  }
  const effects = effectsRaw.map((e, j) => reviveEffect(e, `${ctx}.effects[${j}]`));
  const provRaw = o.provenance;
  if (!Array.isArray(provRaw)) {
    throw new Error(`hole-patch: ${ctx}.provenance must be an array`);
  }
  const provenance = provRaw.map((p, j) => reviveProvenance(p, `${ctx}.provenance[${j}]`));
  const attrs =
    o.attrs === undefined
      ? {}
      : (requireRecord(o.attrs, `${ctx}.attrs`) as Readonly<Record<string, unknown>>);
  return {
    id,
    dialect: requireString(o.dialect, `${ctx}.dialect`),
    op: requireString(o.op, `${ctx}.op`),
    type: asWebIRType(o.type, `${ctx}.type`),
    effects,
    operands,
    attrs,
    origin: reviveLocator(o.origin, `${ctx}.origin`),
    provenance,
  };
}

/**
 * Parse a JSON file for {@link applyHoleClosure} / {@link applyHoleClosureAndVerify}.
 * Shape: `{ "holeId", "replacementRootId", "nodesToAdd": NodeBase[], "signOff": { "signer", "note?" } }`.
 */
export function parseHoleClosurePatchJson(text: string): ApplyHoleClosureOptions {
  let root: unknown;
  try {
    root = JSON.parse(text) as unknown;
  } catch (e) {
    throw new Error(
      `hole-patch: invalid JSON (${e instanceof Error ? e.message : String(e)})`,
    );
  }
  const o = requireRecord(root, "root");
  const holeId = nodeId(requireString(o.holeId, "holeId"));
  const replacementRootId = nodeId(requireString(o.replacementRootId, "replacementRootId"));
  const signOffRaw = o.signOff;
  const signOffRec = requireRecord(signOffRaw, "signOff");
  const signOff: HoleClosureSignOff = {
    signer: requireString(signOffRec.signer, "signOff.signer"),
    ...(typeof signOffRec.note === "string" && signOffRec.note !== ""
      ? { note: signOffRec.note }
      : {}),
  };
  const nodesRaw = o.nodesToAdd;
  if (!Array.isArray(nodesRaw) || nodesRaw.length === 0) {
    throw new Error("hole-patch: nodesToAdd must be a non-empty array");
  }
  const nodesToAdd = nodesRaw.map((n, i) => reviveNodeBase(n, i));
  return { holeId, replacementRootId, nodesToAdd, signOff };
}
