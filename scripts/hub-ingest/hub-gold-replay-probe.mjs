/**
 * Build in-process fetch probes for hub gold trace replay (middleware-aware POST bodies).
 */

/**
 * @param {import('@chrysalis/webir').Module} mod
 * @returns {Set<string>}
 */
export function hubMiddlewarePresetsFromModule(mod) {
  const presets = new Set();
  for (const [, n] of mod.nodes) {
    if (n.dialect !== "web.request" || n.op !== "middleware") continue;
    const bodyId = n.operands[0];
    if (!bodyId) continue;
    const body = mod.nodes.get(bodyId);
    if (!body || body.op !== "literal") continue;
    const value = body.attrs?.value;
    if (value && typeof value === "object" && value !== null && "preset" in value) {
      presets.add(String(value.preset ?? ""));
    }
  }
  return presets;
}

/**
 * @param {string} method
 * @param {Set<string>} presets
 */
export function hubGoldReplayFetchInit(method, presets) {
  const m = method.toUpperCase();
  if (m !== "POST" && m !== "PUT" && m !== "PATCH") {
    return { method: m };
  }
  if (presets.has("express.json")) {
    return {
      method: m,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ probe: 1 }),
    };
  }
  if (presets.has("express.urlencoded")) {
    return {
      method: m,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "probe=1",
    };
  }
  return { method: m };
}
