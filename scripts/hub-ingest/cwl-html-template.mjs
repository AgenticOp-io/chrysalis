/**
 * CWL HTML template interpolation (RFC-0010 extension / G1189).
 */

const HUB_T = { string: { kind: "string" } };

/** RFC-0031 repeat node callee — named so emit can reverse it exactly. */
export const CWL_HTML_REPEAT_CALLEE = "__cwl_html_repeat";

function hubOrigin(file, line = 1) {
  return { file, line, column: 1 };
}

function lowerHubHtmlLiteralPageBody(ctx, html, loc, wr) {
  const { data, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const litId = data.literal({
    value: html,
    type: HUB_T.string,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-page-html-literal")],
  });
  return wr.response({
    attrs: { status: 200, kind: "html", contentType: "text/html; charset=utf-8" },
    value: litId,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-page-html-response")],
  });
}

/**
 * @param {string} html
 * @param {{ path?: string[], query?: string[], load?: string[], cookie?: string[], repeat?: string[] }} bindings
 */
export function splitCwlHtmlTemplate(html, bindings = {}) {
  const pathSet = new Set(bindings.path ?? []);
  const querySet = new Set(bindings.query ?? []);
  const loadSet = new Set(bindings.load ?? []);
  const cookieSet = new Set(bindings.cookie ?? []);
  const repeatSet = new Set(bindings.repeat ?? []);
  if (pathSet.size + querySet.size + loadSet.size + cookieSet.size + repeatSet.size === 0) {
    return null;
  }

  /** @type {Array<{ kind: "literal", text: string } | { kind: "expr", name: string, source: "path" | "query" | "load" | "cookie" | "repeat" }>} */
  const parts = [];
  let i = 0;
  while (i < html.length) {
    const rest = html.slice(i);
    const idMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(rest);
    if (idMatch) {
      const name = idMatch[0];
      let source = null;
      // `repeat` wins over `load`: a repeated collection renders markup, not a scalar.
      if (repeatSet.has(name)) source = "repeat";
      else if (pathSet.has(name)) source = "path";
      else if (querySet.has(name)) source = "query";
      else if (loadSet.has(name)) source = "load";
      else if (cookieSet.has(name)) source = "cookie";
      if (source) {
        const after = html[i + name.length];
        const before = i > 0 ? html[i - 1] : "";
        if (before === "-" || after === "-") {
          let end = i + name.length;
          while (end < html.length && /[a-zA-Z0-9_-]/.test(html[end])) end++;
          parts.push({ kind: "literal", text: html.slice(i, end) });
          i = end;
          continue;
        } else {
          parts.push({ kind: "expr", name, source });
          i += name.length;
          continue;
        }
      }
    }
    let j = i + 1;
    while (j < html.length) {
      const tail = html.slice(j);
      const next = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(tail);
      if (next) {
        const name = next[0];
        if (
          pathSet.has(name) ||
          querySet.has(name) ||
          loadSet.has(name) ||
          cookieSet.has(name) ||
          repeatSet.has(name)
        ) {
          break;
        }
      }
      j++;
    }
    parts.push({ kind: "literal", text: html.slice(i, j) });
    i = j;
  }
  return parts.some((p) => p.kind === "expr") ? parts : null;
}

/**
 * Split a repeat item template on the loop variable, allowing dotted field chains
 * (`item.name`, `item.site.city`). Field access is the shape real list fragments need;
 * anything else stays literal text.
 * @param {string} template
 * @param {string} itemName
 * @returns {Array<{ kind: "literal", text: string } | { kind: "expr", fields: string[] }>}
 */
export function splitCwlRepeatItemTemplate(template, itemName) {
  const html = String(template ?? "");
  /** @type {Array<{ kind: "literal", text: string } | { kind: "expr", fields: string[] }>} */
  const parts = [];
  const idRe = new RegExp(`\\b${itemName}\\b`, "g");
  let cursor = 0;
  for (let m = idRe.exec(html); m; m = idRe.exec(html)) {
    const start = m.index;
    const before = start > 0 ? html[start - 1] : "";
    let end = start + itemName.length;
    // Hyphenated words (`item-list`) and dashed prefixes are markup, not bindings.
    if (before === "-" || html[end] === "-" || before === ".") continue;
    /** @type {string[]} */
    const fields = [];
    while (html[end] === ".") {
      const field = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(html.slice(end + 1));
      if (!field) break;
      fields.push(field[0]);
      end += 1 + field[0].length;
    }
    if (start > cursor) parts.push({ kind: "literal", text: html.slice(cursor, start) });
    parts.push({ kind: "expr", fields });
    cursor = end;
    idRe.lastIndex = end;
  }
  if (cursor < html.length) parts.push({ kind: "literal", text: html.slice(cursor) });
  return parts;
}

/**
 * RFC-0031: lower one `repeat <collection> as <item> html "…";` to a repeat node.
 * Item markup is a nested `html.template`; the repeat itself is a named CWL call
 * so WebIR keeps both the iterable and the per-item template (no invented loop runtime).
 * @param {object} ctx — { data, webir }
 * @param {{ collection: string, item: string, template: string }} repeat
 * @param {{ file: string, line?: number, column?: number }} origin
 */
export function lowerCwlHtmlRepeat(ctx, repeat, origin) {
  const { data, webir } = ctx;
  const itemSplit = splitCwlRepeatItemTemplate(repeat.template, repeat.item);
  /** @type {Array<{ kind: "literal", text: string } | { kind: "expr", node: string, escape: boolean }>} */
  const itemParts = [];
  for (const part of itemSplit) {
    if (part.kind === "literal") {
      itemParts.push({ kind: "literal", text: part.text });
      continue;
    }
    let nodeId = data.param({
      name: repeat.item,
      type: part.fields.length > 0 ? { kind: "unknown" } : { kind: "string" },
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-item")],
    });
    for (const field of part.fields) {
      nodeId = data.member({
        obj: nodeId,
        key: field,
        type: { kind: "string" },
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-item-field")],
      });
    }
    itemParts.push({ kind: "expr", node: nodeId, escape: true });
  }
  const itemTemplateId = data.htmlTemplate({
    parts: itemParts,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-item-template")],
  });
  const iterableId = data.param({
    name: repeat.collection,
    type: { kind: "unknown" },
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-iterable")],
  });
  return data.call({
    callee: CWL_HTML_REPEAT_CALLEE,
    args: [iterableId, itemTemplateId],
    argNames: ["items", repeat.item],
    type: { kind: "string" },
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-html-repeat")],
  });
}

/**
 * @param {object} ctx — { data, webir, file }
 * @param {string} html
 * @param {{ file: string, line?: number }} loc
 * @param {object} wr
 * @param {{ path?: string[], query?: string[], load?: string[], cookie?: string[], repeat?: string[], repeats?: object[] }} [bindings]
 */
export function lowerCwlHtmlTemplateBody(ctx, html, loc, wr, bindings = {}) {
  const split = splitCwlHtmlTemplate(html, bindings);
  if (!split) return lowerHubHtmlLiteralPageBody(ctx, html, loc, wr);

  const { data, webir } = ctx;
  const origin = { file: loc.file, line: loc.line ?? 1, column: 1 };
  const repeatsByCollection = new Map(
    (bindings.repeats ?? []).map((rep) => [rep.collection, rep]),
  );
  /** @type {Array<{ kind: "literal", text: string } | { kind: "expr", node: string, escape: boolean }>} */
  const templateParts = [];
  for (const part of split) {
    if (part.kind === "literal") {
      templateParts.push({ kind: "literal", text: part.text });
      continue;
    }
    if (part.source === "repeat") {
      const repeat = repeatsByCollection.get(part.name);
      if (repeat) {
        templateParts.push({
          kind: "expr",
          node: lowerCwlHtmlRepeat(ctx, repeat, origin),
          escape: false,
        });
        continue;
      }
    }
    const nodeId =
      part.source === "load"
        ? data.param({
            name: part.name,
            type: { kind: "string" },
            origin,
            provenance: [webir.provenance("hub-ingest", "cwl-html-load-field")],
          })
        : data.requestField({
            source: part.source === "cookie" ? "cookie" : part.source,
            name: part.name,
            type: { kind: "string" },
            origin,
            provenance: [
              webir.provenance(
                "hub-ingest",
                part.source === "cookie" ? "cwl-html-cookie" : "cwl-html-param",
              ),
            ],
          });
    templateParts.push({ kind: "expr", node: nodeId, escape: true });
  }
  const templateId = data.htmlTemplate({
    parts: templateParts,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-html-template")],
  });
  return wr.response({
    attrs: { status: 200, kind: "html", contentType: "text/html; charset=utf-8" },
    value: templateId,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl-html-response")],
  });
}

/**
 * Reconstruct CWL `return html "..."` text with bare binding identifiers.
 * RFC-0031 repeat nodes come back as the collection identifier plus a recovered
 * `repeat` statement (see `repeats`), never as invented markup.
 * @param {(id: string) => object | undefined} get
 * @param {object} n
 */
export function cwlHtmlTemplateToLit(get, n) {
  const parts = n.attrs?.parts ?? [];
  let html = "";
  /** @type {Array<{ collection: string, item: string, template: string }>} */
  const repeats = [];
  for (const p of parts) {
    if (p.kind === "literal") {
      html += String(p.text ?? "");
      continue;
    }
    const idx = p.operandIndex ?? p.idx;
    const opId = n.operands?.[idx];
    const expr = opId ? get(opId) : null;
    if (expr?.op === "call" && expr.attrs?.callee === CWL_HTML_REPEAT_CALLEE) {
      const recovered = cwlHtmlRepeatToStatement(get, expr);
      if (!recovered) return { t: "hole", reason: "cwl:emit:html-repeat" };
      repeats.push(recovered);
      html += recovered.collection;
      continue;
    }
    if (expr?.op === "request.field") html += String(expr.attrs?.name ?? "");
    else if (expr?.op === "param") html += String(expr.attrs?.name ?? "");
    else return { t: "hole", reason: "hub:cwl:html-template-expr" };
  }
  return repeats.length > 0
    ? { t: "lit", value: html, repeats }
    : { t: "lit", value: html };
}

/**
 * Reverse one RFC-0031 repeat call to its CWL statement fields.
 * Returns null when the item template is not reconstructable (keep an honest hole).
 * @param {(id: string) => object | undefined} get
 * @param {object} call
 */
export function cwlHtmlRepeatToStatement(get, call) {
  const iterable = get(call.operands?.[0] ?? "");
  const itemTemplate = get(call.operands?.[1] ?? "");
  if (iterable?.op !== "param" || itemTemplate?.op !== "html.template") return null;
  const collection = String(iterable.attrs?.name ?? "");
  if (!collection) return null;
  const argNames = call.attrs?.argNames ?? [];
  let item = typeof argNames[1] === "string" ? argNames[1] : "";
  let template = "";
  for (const p of itemTemplate.attrs?.parts ?? []) {
    if (p.kind === "literal") {
      template += String(p.text ?? "");
      continue;
    }
    const idx = p.operandIndex ?? p.idx;
    const opId = itemTemplate.operands?.[idx];
    const ref = cwlRepeatItemRefToText(get, opId ? get(opId) : null);
    if (!ref) return null;
    if (!item) item = ref.item;
    template += ref.text;
  }
  if (!item) return null;
  return { collection, item, template };
}

/**
 * Reverse a repeat item expression (`param` or `member` chain) to `item` / `item.a.b`.
 * @param {(id: string) => object | undefined} get
 * @param {object | null} expr
 * @returns {{ item: string, text: string } | null}
 */
function cwlRepeatItemRefToText(get, expr) {
  /** @type {string[]} */
  const fields = [];
  let node = expr;
  while (node?.op === "member") {
    const key = node.attrs?.key;
    if (typeof key !== "string" || !key) return null;
    fields.unshift(key);
    node = get(node.operands?.[0] ?? "");
  }
  if (node?.op !== "param") return null;
  const item = String(node.attrs?.name ?? "");
  if (!item) return null;
  return { item, text: [item, ...fields].join(".") };
}

/**
 * @param {string} html
 * @param {string[]} fieldNames
 */
export function applyBareFieldRefsToHtml(html, fieldNames) {
  let out = html;
  for (const name of fieldNames) {
    out = out.replace(new RegExp(`\\{${name}\\}`, "g"), name);
  }
  return out;
}
