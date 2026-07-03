/**
 * Shared lowering for hub native/Python return trees → WebIR.
 */

/** @typedef {{ t: "lit", v: string | number | boolean | null } | { t: "ref", source: string, name: string, default?: unknown } | { t: "obj", entries: Array<{ key: string, value: object }> }} HubReturnTree */

/**
 * @param {object} ctx — { data, webir }
 * @param {HubReturnTree} tree
 * @param {{ file: string, line?: number }} loc
 */
export function lowerHubReturnTree(ctx, tree, loc) {
  const { data, webir } = ctx;
  const origin = { file: loc.file, line: loc.line ?? 1, column: 1 };

  /** @param {HubReturnTree} node */
  const lower = (node) => {
    if (node.t === "lit") {
      const v = node.v;
      const type =
        typeof v === "string"
          ? { kind: "string" }
          : typeof v === "boolean"
            ? { kind: "bool" }
            : typeof v === "number"
              ? { kind: "int" }
              : { kind: "unknown" };
      return data.literal({
        value: v,
        type,
        origin,
        provenance: [webir.provenance("hub-ingest", "return-tree:lit")],
      });
    }
    if (node.t === "ref") {
      const source = node.source;
      if (!["path", "query", "body", "header", "cookie"].includes(source)) return null;
      const fieldId = data.requestField({
        source,
        name: node.name,
        type: { kind: "string" },
        origin,
        provenance: [webir.provenance("hub-ingest", `return-tree:req-${source}`)],
      });
      if (node.default !== undefined) {
        const defId = data.literal({
          value: node.default,
          type: { kind: "string" },
          origin,
          provenance: [webir.provenance("hub-ingest", "return-tree:ref-default")],
        });
        return data.binOp({
          operator: "??",
          left: fieldId,
          right: defId,
          type: { kind: "string" },
          origin,
          provenance: [webir.provenance("hub-ingest", "return-tree:nullish-coalesce")],
        });
      }
      return fieldId;
    }
    if (node.t === "obj") {
      const flat = [];
      for (const e of node.entries) {
        const val = lower(/** @type {HubReturnTree} */ (e.value));
        if (val === null) return null;
        flat.push(
          data.literal({
            value: e.key,
            type: { kind: "string" },
            origin,
            provenance: [webir.provenance("hub-ingest", "return-tree:object-key")],
          }),
        );
        flat.push(val);
      }
      return data.call({
        callee: "__object_literal",
        args: flat,
        type: { kind: "unknown" },
        origin,
        provenance: [webir.provenance("hub-ingest", "return-tree:object")],
      });
    }
    return null;
  };

  return lower(tree);
}

/**
 * @param {object} ctx
 * @param {HubReturnTree} tree
 * @param {{ file: string, line?: number }} loc
 */
export function lowerHubReturnTreeBlock(ctx, tree, loc) {
  const valId = lowerHubReturnTree(ctx, tree, loc);
  if (valId === null) return null;
  const origin = { file: loc.file, line: loc.line ?? 1, column: 1 };
  const retId = ctx.data.call({
    callee: "__return_json",
    args: [valId],
    type: { kind: "unknown" },
    origin,
    provenance: [ctx.webir.provenance("hub-ingest", "return-tree:json")],
  });
  return ctx.data.block({
    statements: [retId],
    type: { kind: "unknown" },
    origin,
    provenance: [ctx.webir.provenance("hub-ingest", "return-tree:block")],
  });
}
