/** Hole-closure patch hints for verify-gated convert + repair bridge (Phase 44b). */

export type HoleClosurePatchHint = {
  kind: "hole-closure";
  holeId: string;
  replacementRootId?: string;
  nodesToAdd?: readonly unknown[];
  operatorComplete: boolean;
  note: string;
};

export type ConvertHoleRecord = {
  name: string;
  detail?: string | null;
  holeId?: string | null;
  reason?: string | null;
};

/** Build repair-bridge-ready patch hint when WebIR hole node id is known. */
export function buildHoleClosurePatchHint(hole: ConvertHoleRecord): HoleClosurePatchHint | null {
  const holeId = hole.holeId?.trim() ?? "";
  if (!holeId) return null;
  const reason = hole.reason ?? hole.name ?? "legacy:unknown";
  return {
    kind: "hole-closure",
    holeId,
    operatorComplete: false,
    note: `Complete WebIR replacement subgraph for ${reason}; verify before repair apply.`,
  };
}

/** Merge hole-closure hint into enrich patchHint when id present; else keep scaffold. */
export function mergeHoleClosureIntoPatchHint(
  patchHint: Record<string, unknown> | null,
  hole: ConvertHoleRecord,
): Record<string, unknown> {
  const closure = buildHoleClosurePatchHint(hole);
  if (closure) {
    return {
      ...closure,
      ...(patchHint ?? {}),
      kind: "hole-closure",
      holeId: closure.holeId,
      operatorComplete: false,
    };
  }
  return patchHint ?? { kind: "hole-scaffold", hole: hole.name, action: "manual-review", webirRequired: true };
}
