/**
 * Chrysalis Web Language (CWL) parser — direct surface syntax for WebIR routes.
 * @see docs/CWL.md
 */

const ROUTE_RE = /^@route\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+"([^"]+)"/i;
const MODULE_RE = /^module\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/;
const HANDLER_RE = /^handler\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/;
const EFFECTS_RE = /^effects:\s*(.+);/;
const RETURN_RE = /^return\s+(.+);/;
const HOLE_RE = /^hole\s+([a-zA-Z0-9_:.-]+)(?:\s+"([^"]*)")?\s*;/;
const USE_PRESET_RE = /^use\s+(json|urlencoded)\s*;$/i;

/**
 * @param {string} expr
 */
export function parseCwlLiteral(expr) {
  const t = expr.trim();
  if (t === "true") return { ok: true, value: true };
  if (t === "false") return { ok: true, value: false };
  if (t === "null") return { ok: true, value: null };
  if (/^-?\d+$/.test(t)) return { ok: true, value: Number(t) };
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return { ok: true, value: JSON.parse(t.startsWith('"') ? t : `"${t.slice(1, -1)}"`) };
  }
  if (t.startsWith("{") && t.endsWith("}")) {
    try {
      const normalized = t.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');
      return { ok: true, value: JSON.parse(normalized) };
    } catch {
      return { ok: false, error: "invalid-object-literal" };
    }
  }
  return { ok: false, error: "unsupported-literal" };
}

/**
 * @param {string} effectsRaw
 */
function parseEffects(effectsRaw) {
  const t = effectsRaw.trim().toLowerCase();
  if (t === "none" || t === "") return [];
  return t.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * @param {string} source
 * @param {string} file
 */
export function parseCwlModule(source, file) {
  const lines = source.split(/\r?\n/);
  let moduleName = "main";
  /** @type {Array<"express.json"|"express.urlencoded">} */
  const moduleUses = [];
  /** @type {Array<{ method: string, path: string, name: string, line: number, effects: string[], body: { kind: string, value?: unknown, reason?: string } }>} */
  const routes = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const lineNo = i + 1;
    i += 1;
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const mod = MODULE_RE.exec(line);
    if (mod) {
      moduleName = mod[1];
      continue;
    }
    const useM = USE_PRESET_RE.exec(line);
    if (useM) {
      moduleUses.push(useM[1].toLowerCase() === "json" ? "express.json" : "express.urlencoded");
      continue;
    }
    const rm = ROUTE_RE.exec(line);
    if (!rm) continue;
    const method = rm[1].toUpperCase();
    const path = rm[2];
    if (i >= lines.length) break;
    const hline = lines[i].trim();
    const hm = HANDLER_RE.exec(hline);
    if (!hm) continue;
    const name = hm[1];
    i += 1;
    const effects = [];
    let body = { kind: "hole", reason: "cwl:empty-handler" };
    while (i < lines.length) {
      const inner = lines[i].trim();
      const innerLine = i + 1;
      i += 1;
      if (inner === "}") break;
      if (!inner || inner.startsWith("#") || inner.startsWith("//")) continue;
      const em = EFFECTS_RE.exec(inner);
      if (em) {
        effects.push(...parseEffects(em[1]));
        continue;
      }
      const ret = RETURN_RE.exec(inner);
      if (ret) {
        const lit = parseCwlLiteral(ret[1]);
        if (lit.ok && lit.value !== null && typeof lit.value === "object") {
          body = { kind: "object", value: lit.value };
        } else if (lit.ok) {
          body = { kind: "literal", value: lit.value };
        } else {
          body = { kind: "hole", reason: `cwl:${lit.error}` };
        }
        continue;
      }
      const hol = HOLE_RE.exec(inner);
      if (hol) {
        body = { kind: "hole", reason: hol[1] };
        continue;
      }
      body = { kind: "hole", reason: "cwl:unknown-statement" };
    }
    routes.push({ method, path, name, line: lineNo, effects, body });
  }
  return { moduleName, file, routes, moduleUses };
}
