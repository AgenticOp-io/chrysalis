/**
 * CWL native UI v0 — parse `return ui { … }` and lower to WebIR `data.ui.tree` (RFC-0017).
 */

/**
 * @typedef {{ kind: "element", tag: string, attrs: Array<{ key: string, value: string, isBinding: boolean }>, children: CwlUiNode[] }} CwlUiElementNode
 * @typedef {{ kind: "text", text: string | null, binding: string | null }} CwlUiTextNode
 * @typedef {{ kind: "fragment", children: CwlUiNode[] }} CwlUiFragmentNode
 * @typedef {CwlUiElementNode | CwlUiTextNode | CwlUiFragmentNode} CwlUiNode
 */

const HUB_T = { string: { kind: "string" } };

const ELEMENT_RE = /^element\s+"([^"]+)"(.*)$/;
const TEXT_RE = /^text\s+(.+);$/;
const UI_RETURN_RE = /^return\s+ui\s*\{/;
const UI_COMPONENT_RETURN_RE = /^return\s+ui\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/;
const COMPONENT_DECL_RE = /^@component\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/;
const PROP_RE = /^prop\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/;

function hubOrigin(file, line = 1) {
  return { file, line, column: 1 };
}

/**
 * @param {string} tail — remainder after element "tag"
 * @returns {Array<{ key: string, value: string, isBinding: boolean }>}
 */
function parseElementAttrs(tail) {
  /** @type {Array<{ key: string, value: string, isBinding: boolean }>} */
  const attrs = [];
  let rest = tail.trim();
  while (rest.length > 0) {
    if (rest.startsWith("{")) break;
    const quoted = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s+"([^"]*)"\s*/.exec(rest);
    if (quoted) {
      attrs.push({ key: quoted[1], value: quoted[2], isBinding: false });
      rest = rest.slice(quoted[0].length);
      continue;
    }
    const binding = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*/.exec(rest);
    if (binding) {
      attrs.push({ key: binding[1], value: binding[2], isBinding: true });
      rest = rest.slice(binding[0].length);
      continue;
    }
    break;
  }
  return attrs;
}

/**
 * @param {string[]} lines
 * @param {number} startIdx — index of line containing `return ui {`
 */
export function parseCwlUiReturnBlock(lines, startIdx) {
  const openLine = lines[startIdx].trim();
  const compUse = UI_COMPONENT_RETURN_RE.exec(openLine);
  if (compUse) {
    return parseCwlUiComponentUseBlock(lines, startIdx, compUse[1]);
  }
  if (!UI_RETURN_RE.test(openLine)) {
    return { ok: false, error: "not-ui-return", consumed: startIdx + 1 };
  }
  let depth = 1;
  /** @type {CwlUiNode[]} */
  const roots = [];
  /** @type {CwlUiNode[][]} */
  const stack = [roots];

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;

    if (line === "};" && depth === 1) {
      return finishUiParse(roots, i + 1);
    }
    if (line === "}" && depth === 1) {
      return finishUiParse(roots, i + 1);
    }

    const el = ELEMENT_RE.exec(line);
    if (el) {
      const tag = el[1];
      const braceIdx = line.indexOf("{");
      const attrTail = braceIdx >= 0 ? line.slice(el[0].length, braceIdx) : line.slice(el[0].length);
      const attrs = parseElementAttrs(attrTail);
      /** @type {CwlUiElementNode} */
      const node = { kind: "element", tag, attrs, children: [] };
      stack[stack.length - 1].push(node);
      if (braceIdx >= 0) {
        depth += 1;
        stack.push(node.children);
        if (line.includes("}") && line.indexOf("}") > braceIdx) {
          depth -= 1;
          stack.pop();
        }
      }
      continue;
    }

    const tm = TEXT_RE.exec(line);
    if (tm) {
      const val = tm[1].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        const text = JSON.parse(val.startsWith('"') ? val : `"${val.slice(1, -1)}"`);
        stack[stack.length - 1].push({ kind: "text", text, binding: null });
      } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(val)) {
        stack[stack.length - 1].push({ kind: "text", text: null, binding: val });
      } else {
        return { ok: false, error: "invalid-text-child", consumed: i + 1 };
      }
      continue;
    }

    if (line === "}") {
      depth -= 1;
      if (stack.length > 1) stack.pop();
      continue;
    }

    return { ok: false, error: `unknown-ui-line:${line}`, consumed: i + 1 };
  }

  return { ok: false, error: "unclosed-ui-block", consumed: lines.length };
}

/**
 * @param {CwlUiNode[]} roots
 * @param {number} consumed
 */
function finishUiParse(roots, consumed) {
  if (roots.length === 0) {
    return { ok: false, error: "empty-ui-tree", consumed };
  }
  const tree = roots.length === 1 ? roots[0] : { kind: "fragment", children: roots };
  return { ok: true, tree, consumed };
}

/**
 * @param {string[]} lines
 * @param {number} startIdx
 * @param {string} componentName
 */
export function parseCwlUiComponentUseBlock(lines, startIdx, componentName) {
  /** @type {Array<{ key: string, literal?: string, binding?: string }>} */
  const props = [];
  const openLine = lines[startIdx].trim();
  const braceIdx = openLine.indexOf("{");
  if (braceIdx >= 0) {
    const inline = openLine.slice(braceIdx + 1).replace(/\};?\s*$/, "").trim();
    if (inline) {
      const parsed = parseCwlUiComponentPropLine(inline);
      if (!parsed.ok) return { ok: false, error: parsed.error, consumed: startIdx + 1 };
      props.push(...parsed.props);
    }
    if (/\};?\s*$/.test(openLine)) {
      return { ok: true, componentRef: componentName, props, consumed: startIdx + 1 };
    }
  }
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    if (line === "};" || line === "}") {
      return { ok: true, componentRef: componentName, props, consumed: i + 1 };
    }
    const parsed = parseCwlUiComponentPropLine(line.replace(/;\s*$/, ""));
    if (!parsed.ok) return { ok: false, error: parsed.error, consumed: i + 1 };
    props.push(...parsed.props);
  }
  return { ok: false, error: "unclosed-component-use", consumed: lines.length };
}

/**
 * @param {string} line — single prop assignment or comma-separated props
 */
function parseCwlUiComponentPropLine(line) {
  /** @type {Array<{ key: string, literal?: string, binding?: string }>} */
  const props = [];
  for (const part of line.split(",").map((s) => s.trim()).filter(Boolean)) {
    const colon = part.indexOf(":");
    if (colon < 0) return { ok: false, error: "invalid-component-prop", props };
    const key = part.slice(0, colon).trim();
    const raw = part.slice(colon + 1).replace(/;\s*$/, "").trim();
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      const literal = JSON.parse(raw.startsWith('"') ? raw : `"${raw.slice(1, -1)}"`);
      props.push({ key, literal: String(literal) });
      continue;
    }
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw)) {
      props.push({ key, binding: raw });
      continue;
    }
    return { ok: false, error: `invalid-component-prop:${key}`, props };
  }
  return { ok: true, props };
}

/**
 * @param {Array<{ name: string, props: string[], tree: CwlUiNode }>} components
 * @param {string} name
 * @param {Array<{ key: string, literal?: string, binding?: string }>} useProps
 */
export function resolveCwlUiComponent(components, name, useProps) {
  const def = components?.find((c) => c.name === name);
  if (!def?.tree) return null;
  /** @type {Record<string, { kind: "literal", text: string } | { kind: "binding", name: string }>} */
  const propMap = {};
  for (const p of useProps) {
    if (p.literal !== undefined) propMap[p.key] = { kind: "literal", text: p.literal };
    else if (p.binding) propMap[p.key] = { kind: "binding", name: p.binding };
  }
  for (const required of def.props ?? []) {
    if (!propMap[required]) propMap[required] = { kind: "literal", text: "" };
  }
  return substituteUiComponentProps(def.tree, propMap, new Set(def.props ?? []));
}

/**
 * @param {CwlUiNode} node
 * @param {Record<string, { kind: "literal", text: string } | { kind: "binding", name: string }>} propMap
 * @param {Set<string>} componentProps
 */
function substituteUiComponentProps(node, propMap, componentProps) {
  if (node.kind === "fragment") {
    return {
      kind: "fragment",
      children: node.children.map((c) => substituteUiComponentProps(c, propMap, componentProps)),
    };
  }
  if (node.kind === "text") {
    if (node.binding && componentProps.has(node.binding)) {
      const mapped = propMap[node.binding];
      if (!mapped) return { kind: "text", text: "", binding: null };
      if (mapped.kind === "literal") return { kind: "text", text: mapped.text, binding: null };
      return { kind: "text", text: null, binding: mapped.name };
    }
    return node;
  }
  if (node.kind === "element") {
    return {
      kind: "element",
      tag: node.tag,
      attrs: (node.attrs ?? []).map((a) => {
        if (a.isBinding && componentProps.has(a.value)) {
          const mapped = propMap[a.value];
          if (mapped?.kind === "literal") {
            return { key: a.key, value: mapped.text, isBinding: false };
          }
          if (mapped?.kind === "binding") {
            return { key: a.key, value: mapped.name, isBinding: true };
          }
        }
        return a;
      }),
      children: (node.children ?? []).map((c) => substituteUiComponentProps(c, propMap, componentProps)),
    };
  }
  return node;
}

/**
 * @param {string} name
 * @param {{ path?: string[], query?: string[], load?: string[] }} bindings
 */
function resolveTextBindingSource(name, bindings) {
  if (bindings.path?.includes(name)) return "path";
  if (bindings.query?.includes(name)) return "query";
  if (bindings.load?.includes(name)) return "load";
  return null;
}

/**
 * @param {object} ctx — { data, webir, file }
 * @param {string} source
 * @param {string} name
 * @param {{ file: string, line?: number }} loc
 */
function lowerBindingExpr(ctx, source, name, loc) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  if (source === "load") {
    return data.param({
      name,
      type: HUB_T.string,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl:ui-load-binding")],
    });
  }
  return data.requestField({
    source: source === "path" ? "path" : "query",
    name,
    type: HUB_T.string,
    origin,
    provenance: [webir.provenance("hub-ingest", `cwl:ui-${source}-binding`)],
  });
}

/**
 * @param {object} ctx
 * @param {object} node
 * @param {{ path?: string[], query?: string[], load?: string[] }} bindings
 * @param {{ file: string, line?: number }} loc
 * @param {import('@chrysalis/webir').NodeId[]} operands
 */
function serialiseUiNode(ctx, node, bindings, loc, operands) {
  if (node.kind === "fragment") {
    return {
      kind: "fragment",
      children: node.children.map((c) => serialiseUiNode(ctx, c, bindings, loc, operands)),
    };
  }
  if (node.kind === "text") {
    if (node.binding) {
      const source = resolveTextBindingSource(node.binding, bindings);
      if (!source) return { kind: "hole", reason: `cwl:ui-unknown-binding:${node.binding}` };
      const exprId = lowerBindingExpr(ctx, source, node.binding, loc);
      operands.push(exprId);
      return { kind: "text", operandIndex: operands.length - 1, escape: true };
    }
    return { kind: "text", text: node.text ?? "", escape: true };
  }
  if (node.kind === "element") {
    /** @type {Record<string, string | { operandIndex: number }>} */
    const attrs = {};
    for (const a of node.attrs ?? []) {
      if (a.isBinding) {
        const source = resolveTextBindingSource(a.value, bindings);
        if (!source) return { kind: "hole", reason: `cwl:ui-unknown-attr-binding:${a.value}` };
        const exprId = lowerBindingExpr(ctx, source, a.value, loc);
        operands.push(exprId);
        attrs[a.key] = { operandIndex: operands.length - 1 };
      } else {
        attrs[a.key] = a.value;
      }
    }
    return {
      kind: "element",
      tag: node.tag,
      attrs,
      children: (node.children ?? []).map((c) => serialiseUiNode(ctx, c, bindings, loc, operands)),
    };
  }
  return { kind: "hole", reason: "cwl:ui-unknown-node" };
}

/**
 * @param {object} ctx
 * @param {object} tree
 * @param {{ file: string, line?: number }} loc
 * @param {{ path?: string[], query?: string[], load?: string[] }} bindings
 */
export function lowerCwlUiTreeBody(ctx, tree, loc, bindings = {}) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const operands = [];
  const nodes = serialiseUiNode(ctx, tree, bindings, loc, operands);
  if (nodes.kind === "hole") {
    return data.hole({
      reason: nodes.reason ?? "cwl:ui-hole",
      input: HUB_T.string,
      output: HUB_T.string,
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl:ui-tree-hole")],
    });
  }
  return data.uiTree({
    nodes,
    operands,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:ui-tree")],
  });
}
