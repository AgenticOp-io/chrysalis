/**
 * Walk hub WebIR golden snapshot nodes for dialect/op patterns.
 * @param {unknown} mod
 * @param {(node: { dialect?: string, op?: string, attrs?: Record<string, unknown> }) => void} visit
 */
export function walkHubWebirGoldenNodes(mod, visit) {
  if (!mod || typeof mod !== "object") return;
  const nodes = /** @type {{ nodes?: unknown }} */ (mod).nodes;
  if (Array.isArray(nodes)) {
    for (const n of nodes) {
      if (n && typeof n === "object") visit(/** @type {{ dialect?: string, op?: string, attrs?: Record<string, unknown> }} */ (n));
    }
    return;
  }
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if ("dialect" in n && "op" in n) visit(n);
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  };
  walk(mod);
}

/**
 * @param {string} text
 */
export function parseHubWebirGoldenFile(text) {
  let mod = JSON.parse(text);
  if (typeof mod === "string") mod = JSON.parse(mod);
  return mod;
}
