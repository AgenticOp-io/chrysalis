/**
 * Deterministic JSON snapshot of a {@link Module} for golden tests.
 * Node ids and roots keep ingest order; the `nodes` array is sorted by id so
 * diffs are stable across Map iteration differences.
 */

import { relative, sep } from "node:path";
import type { Locator, Module, NodeBase, NodeId, Provenance } from "./index.js";

/** Options for portable goldens (Linux CI vs Windows dev, CRLF vs LF). */
export interface GoldenSnapshotOptions {
  /**
   * Absolute project/fixture root. PHP (and form) locator `file` fields are
   * emitted as posix paths relative to this directory (e.g. `pages/x.php`).
   */
  readonly relativizeProjectRoot?: string;
}

function posixRelative(fromRoot: string, absFile: string): string {
  let rel = relative(fromRoot, absFile);
  if (sep === "\\") rel = rel.split("\\").join("/");
  return rel;
}

function goldenLocator(loc: Locator, opts: GoldenSnapshotOptions): unknown {
  const root = opts.relativizeProjectRoot;
  if (root && loc.kind === "php") {
    return stableValue({
      kind: "php" as const,
      file: posixRelative(root, loc.file),
      line: loc.line,
      col: loc.col,
    });
  }
  if (root && loc.kind === "form") {
    return stableValue({
      kind: "form" as const,
      file: posixRelative(root, loc.file),
      fieldName: loc.fieldName,
    });
  }
  return stableValue(loc);
}

function goldenProvenance(p: Provenance, opts: GoldenSnapshotOptions): unknown {
  return stableValue({
    source: p.source,
    locator: goldenLocator(p.locator, opts),
    reason: p.reason,
  });
}

function stableValue(v: unknown): unknown {
  if (typeof v === "string") {
    return v.replace(/\r\n/g, "\n");
  }
  if (v === null || typeof v !== "object") {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map(stableValue);
  }
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = stableValue(o[k]);
  }
  return out;
}

function nodeToGolden(n: NodeBase, opts: GoldenSnapshotOptions): unknown {
  return {
    id: String(n.id),
    dialect: n.dialect,
    op: n.op,
    type: stableValue(n.type),
    effects: stableValue(n.effects),
    operands: n.operands.map((id) => String(id)),
    attrs: stableValue(n.attrs),
    origin: goldenLocator(n.origin, opts),
    provenance: n.provenance.map((p) => goldenProvenance(p, opts)),
  };
}

/**
 * Serialize a module to pretty-printed JSON with stable node ordering.
 * Suitable for committing as a golden file; compare with string equality.
 * Pass {@link GoldenSnapshotOptions.relativizeProjectRoot} so locator paths are
 * stable across machines; all strings normalize CRLF to LF.
 */
export function moduleToGoldenSnapshot(mod: Module, options: GoldenSnapshotOptions = {}): string {
  const sortedIds = [...mod.nodes.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const nodes = sortedIds.map((id) => nodeToGolden(mod.nodes.get(id)!, options));
  const payload = {
    meta: stableValue(mod.meta) as unknown,
    roots: mod.roots.map((id: NodeId) => String(id)),
    nodes,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
