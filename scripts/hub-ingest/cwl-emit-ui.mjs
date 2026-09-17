/**
 * Thin WebIR → CWL reverse for `data.ui.tree` / HTML templates (SSR surface only).
 */
import { cwlHtmlTemplateToLit } from "./cwl-html-template.mjs";

/**
 * @param {(id: string) => object | undefined} get
 * @param {object} n data.ui.tree node
 * @returns {{ t: "ui", tree: object } | { t: "hole", reason: string }}
 */
export function projectUiTreeValue(get, n) {
  if (!n || n.dialect !== "data" || n.op !== "ui.tree") {
    return { t: "hole", reason: "cwl:emit:not-ui-tree" };
  }
  const operands = n.operands ?? [];
  const nodes = n.attrs?.nodes;
  if (!nodes) return { t: "hole", reason: "cwl:emit:ui-missing-nodes" };
  const tree = deserialiseUiNode(get, nodes, operands);
  if (tree?.kind === "hole") return { t: "hole", reason: tree.reason ?? "cwl:emit:ui-hole" };
  return { t: "ui", tree };
}

/**
 * @param {(id: string) => object | undefined} get
 * @param {object} node
 * @param {string[]} operands
 */
function deserialiseUiNode(get, node, operands) {
  if (!node || typeof node !== "object") return { kind: "hole", reason: "cwl:emit:ui-bad-node" };
  if (node.kind === "fragment") {
    return {
      kind: "fragment",
      children: (node.children ?? []).map((c) => deserialiseUiNode(get, c, operands)),
    };
  }
  if (node.kind === "text") {
    if (typeof node.operandIndex === "number" || typeof node.idx === "number") {
      const idx = node.operandIndex ?? node.idx;
      const expr = get(operands[idx]);
      const name =
        expr?.attrs?.name != null
          ? String(expr.attrs.name)
          : null;
      if (!name) return { kind: "hole", reason: "cwl:emit:ui-text-binding" };
      return { kind: "text", text: null, binding: name };
    }
    return { kind: "text", text: String(node.text ?? ""), binding: null };
  }
  if (node.kind === "island") {
    return {
      kind: "island",
      client: true,
      name: node.name ? String(node.name) : null,
      children: (node.children ?? []).map((c) => deserialiseUiNode(get, c, operands)),
      events: Array.isArray(node.events) ? node.events : [],
    };
  }
  if (node.kind === "element") {
    /** @type {Array<{ key: string, value: string, isBinding: boolean }>} */
    const attrs = [];
    const raw = node.attrs ?? {};
    for (const [key, val] of Object.entries(raw)) {
      if (val && typeof val === "object" && typeof val.operandIndex === "number") {
        const expr = get(operands[val.operandIndex]);
        const name = expr?.attrs?.name != null ? String(expr.attrs.name) : null;
        if (!name) return { kind: "hole", reason: `cwl:emit:ui-attr-binding:${key}` };
        attrs.push({ key, value: name, isBinding: true });
      } else {
        attrs.push({ key, value: String(val ?? ""), isBinding: false });
      }
    }
    return {
      kind: "element",
      tag: String(node.tag ?? "div"),
      attrs,
      children: (node.children ?? []).map((c) => deserialiseUiNode(get, c, operands)),
      events: Array.isArray(node.events) ? node.events : [],
    };
  }
  if (node.kind === "hole") return node;
  return { kind: "hole", reason: "cwl:emit:ui-unknown-node" };
}

/**
 * @param {(id: string) => object | undefined} get
 * @param {object} n
 */
export function projectHtmlTemplateOrLiteral(get, n) {
  if (!n) return { t: "hole", reason: "cwl:emit:missing-html" };
  if (n.dialect === "data" && n.op === "html.template") {
    const lit = cwlHtmlTemplateToLit(get, n);
    if (lit.t === "hole") return lit;
    return lit.repeats
      ? { t: "html", value: lit.value, repeats: lit.repeats }
      : { t: "html", value: lit.value };
  }
  if (n.dialect === "data" && n.op === "literal" && typeof n.attrs?.value === "string") {
    return { t: "html", value: n.attrs.value };
  }
  return { t: "hole", reason: "cwl:emit:unsupported-html" };
}

/**
 * Print a standalone page/layout island (RFC-0030) without `return ui`.
 * @param {object} island
 * @param {string} indent
 * @param {string[]} lines
 */
export function printEmitStandaloneIsland(island, indent, lines) {
  printUiNode(island, indent, lines);
}

/**
 * Print UI tree return (mirrors cwl-print printCwlUiReturn shape).
 * @param {object} tree
 * @param {string} indent
 * @param {string[]} lines
 */
export function printEmitUiTree(tree, indent, lines) {
  lines.push(`${indent}return ui {`);
  printUiNode(tree, `${indent}  `, lines);
  lines.push(`${indent}};`);
}

/**
 * @param {Array<{ key: string, value: string, isBinding: boolean }>} attrs
 */
function printAttrTail(attrs) {
  if (!attrs?.length) return "";
  return attrs
    .map((a) => (a.isBinding ? ` ${a.key} ${a.value}` : ` ${a.key} ${JSON.stringify(a.value)}`))
    .join("");
}

/**
 * @param {object} node
 * @param {string} indent
 * @param {string[]} lines
 */
function printUiNode(node, indent, lines) {
  if (!node || typeof node !== "object") return;
  if (node.kind === "fragment") {
    for (const child of node.children ?? []) printUiNode(child, indent, lines);
    return;
  }
  if (node.kind === "text") {
    if (node.binding) lines.push(`${indent}text ${node.binding};`);
    else lines.push(`${indent}text ${JSON.stringify(node.text ?? "")};`);
    return;
  }
  if (node.kind === "island") {
    if (node.name) lines.push(`${indent}client ui ${JSON.stringify(String(node.name))} {`);
    else lines.push(`${indent}client ui {`);
    for (const ev of node.events ?? []) {
      lines.push(`${indent}  on ${ev.name} { action ${JSON.stringify(ev.action)}; }`);
    }
    for (const child of node.children ?? []) printUiNode(child, `${indent}  `, lines);
    lines.push(`${indent}}`);
    return;
  }
  if (node.kind === "element") {
    const attrs = printAttrTail(node.attrs ?? []);
    const children = node.children ?? [];
    const events = node.events ?? [];
    lines.push(`${indent}element ${JSON.stringify(node.tag)}${attrs} {`);
    for (const child of children) printUiNode(child, `${indent}  `, lines);
    for (const ev of events) {
      lines.push(`${indent}  on ${ev.name} { action ${JSON.stringify(ev.action)}; }`);
    }
    lines.push(`${indent}}`);
  }
}
