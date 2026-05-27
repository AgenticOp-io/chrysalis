/**
 * Lower CWL `use json` / `use urlencoded` module presets to WebIR middleware nodes.
 * @see docs/CWL-RFC-0001-module-use-middleware.md
 */

const CWL_USE_PRESET_RE = /^use\s+(json|urlencoded)\s*;$/i;

/**
 * @param {string} line
 * @returns {"express.json"|"express.urlencoded"|null}
 */
export function cwlUsePresetFromLine(line) {
  const m = CWL_USE_PRESET_RE.exec(line.trim());
  if (!m) return null;
  return m[1].toLowerCase() === "json" ? "express.json" : "express.urlencoded";
}

/**
 * @param {string[]} moduleUses
 * @param {object} opts
 */
export function liftCwlModuleMiddlewareToWebir(moduleUses, opts) {
  const { file, builder, wr, webir } = opts;
  if (!moduleUses.length) {
    return { middlewareUseCount: 0, middlewareRootCount: 0 };
  }
  const data = webir.dataDialect.builders(builder);
  let order = 0;
  for (const preset of moduleUses) {
    order += 1;
    const origin = { file, line: 1, column: 1 };
    const bodyId = data.literal({
      value: { preset },
      type: { kind: "unknown" },
      origin,
      provenance: [webir.provenance("hub-ingest", `cwl-middleware-preset:${preset}`)],
    });
    const mid = wr.middleware({
      attrs: { kind: preset, mount: "*", order },
      body: bodyId,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl-middleware")],
    });
    builder.addRoot(mid);
  }
  return { middlewareUseCount: moduleUses.length, middlewareRootCount: moduleUses.length };
}
