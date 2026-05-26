/**
 * Synthetic Flask body-parser presets for hub gold trace replay (JSON + form).
 * Flask parses both by default; WebIR records presets aligned with express.json probes.
 */
import { resolveHubPython } from "./shared.mjs";

const FLASK_APP_RE = /\bFlask\s*\(/;

/**
 * @param {string} source
 */
export function flaskAppDetected(source) {
  return FLASK_APP_RE.test(source);
}

/**
 * @param {string} source
 */
export function flaskHasPostRoute(source) {
  const py = resolveHubPython();
  return /\bpost\s*\(/i.test(source) || /@app\.post\b/i.test(source);
}

/**
 * @param {string} source
 * @param {string} file
 * @param {typeof import('@chrysalis/webir')} webir
 * @param {import('@chrysalis/webir').ModuleBuilder} builder
 * @param {ReturnType<import('@chrysalis/webir').webRequest.builders>} wr
 */
export function liftFlaskSyntheticMiddleware(source, file, webir, builder, wr) {
  if (!flaskAppDetected(source)) {
    return { middlewareUseCount: 0, middlewareRootCount: 0 };
  }
  const data = webir.dataDialect.builders(builder);
  const origin = { file, line: 1, column: 1 };
  const presets = ["express.json", "express.urlencoded"];
  let order = 0;
  for (const preset of presets) {
    order += 1;
    const bodyId = data.literal({
      value: { preset },
      type: { kind: "unknown" },
      origin,
      provenance: [webir.provenance("hub-ingest", `flask-middleware-preset:${preset}`)],
    });
    const mid = wr.middleware({
      attrs: { kind: preset, mount: "*", order },
      body: bodyId,
      origin,
      provenance: [webir.provenance("hub-ingest", "flask-middleware")],
    });
    builder.addRoot(mid);
  }
  return { middlewareUseCount: presets.length, middlewareRootCount: presets.length };
}
