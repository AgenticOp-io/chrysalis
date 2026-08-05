/**
 * CWL `use auth …` module presets (RFC-0007).
 */
import { HUB_T } from "./hub-t.mjs";

const CWL_AUTH_USE_RE = /^use\s+auth\s+(session|bearer)\s*;$/i;

/**
 * @param {string} line
 */
export function cwlAuthPresetFromLine(line) {
  const m = CWL_AUTH_USE_RE.exec(line.trim());
  if (!m) return null;
  return m[1].toLowerCase() === "session" ? "chrysalis.auth.session" : "chrysalis.auth.bearer";
}

/**
 * @param {string[]} authUses
 * @param {object} opts
 */
export function liftCwlAuthPresetsToWebir(authUses, opts) {
  const { file, builder, wr, webir } = opts;
  if (!authUses.length) return { authUseCount: 0, authRootCount: 0 };
  const data = webir.dataDialect.builders(builder);
  let order = 100;
  for (const preset of authUses) {
    order += 1;
    const origin = { file, line: 1, column: 1 };
    const bodyId = data.literal({
      value: { preset },
      type: HUB_T.unknown,
      origin,
      provenance: [webir.provenance("hub-ingest", `cwl-auth-preset:${preset}`)],
    });
    const mid = wr.middleware({
      attrs: { kind: preset, mount: "*", order },
      body: bodyId,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl-auth-middleware")],
    });
    builder.addRoot(mid);
  }
  return { authUseCount: authUses.length, authRootCount: authUses.length };
}
