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
 * (`item.name`, `item.site.city`). Optional nested leaf names (`towers` for
 * `item.towers`) become nested-repeat slots — tip 1.0.41, one level only.
 * @param {string} template
 * @param {string} itemName
 * @param {string[]} [nestedLeaves]
 * @returns {Array<{ kind: "literal", text: string } | { kind: "expr", fields: string[] } | { kind: "nested", leaf: string }>}
 */
export function splitCwlRepeatItemTemplate(template, itemName, nestedLeaves = []) {
  const html = String(template ?? "");
  const leafSet = new Set(nestedLeaves.filter(Boolean));
  /** @type {Array<{ kind: "literal", text: string } | { kind: "expr", fields: string[] } | { kind: "nested", leaf: string }>} */
  const parts = [];
  let i = 0;
  while (i < html.length) {
    const rest = html.slice(i);
    const idMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(rest);
    if (idMatch) {
      const name = idMatch[0];
      const before = i > 0 ? html[i - 1] : "";
      let end = i + name.length;
      const after = html[end];
      // Hyphenated words stay markup.
      if (before === "-" || after === "-") {
        while (end < html.length && /[a-zA-Z0-9_-]/.test(html[end])) end++;
        parts.push({ kind: "literal", text: html.slice(i, end) });
        i = end;
        continue;
      }
      if (name === itemName && before !== ".") {
        /** @type {string[]} */
        const fields = [];
        while (html[end] === ".") {
          const field = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(html.slice(end + 1));
          if (!field) break;
          fields.push(field[0]);
          end += 1 + field[0].length;
        }
        parts.push({ kind: "expr", fields });
        i = end;
        continue;
      }
      if (leafSet.has(name) && before !== ".") {
        parts.push({ kind: "nested", leaf: name });
        i = end;
        continue;
      }
    }
    let j = i + 1;
    while (j < html.length) {
      const next = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(html.slice(j));
      if (next) {
        const name = next[0];
        const before = j > 0 ? html[j - 1] : "";
        const after = html[j + name.length];
        if (before === "-" || after === "-") {
          j++;
          continue;
        }
        if ((name === itemName && before !== ".") || (leafSet.has(name) && before !== ".")) {
          break;
        }
      }
      j++;
    }
    parts.push({ kind: "literal", text: html.slice(i, j) });
    i = j;
  }
  return parts;
}

/**
 * Child repeats of `outerItem.field` (one level) keyed by leaf name.
 * @param {{ collection: string, item: string, template: string, when?: string, empty?: string }} repeat
 * @param {Array<{ collection: string, item: string, template: string, when?: string, empty?: string }>} siblingRepeats
 */
function nestedRepeatsForOuter(repeat, siblingRepeats) {
  /** @type {Map<string, { collection: string, item: string, template: string, when?: string, empty?: string }>} */
  const byLeaf = new Map();
  const prefix = `${repeat.item}.`;
  for (const sib of siblingRepeats) {
    if (sib === repeat) continue;
    const coll = String(sib.collection || "");
    if (!coll.startsWith(prefix)) continue;
    const segs = coll.split(".");
    if (segs.length !== 2) continue;
    byLeaf.set(segs[1], sib);
  }
  return byLeaf;
}

/**
 * RFC-0031: lower one `repeat <collection> as <item> html "…";` to a repeat node.
 * Item markup is a nested `html.template`; the repeat itself is a named CWL call
 * so WebIR keeps both the iterable and the per-item template (no invented loop runtime).
 * Optional `when` (item field chain) becomes a named arg — truthy filter, no invented sorter.
 * Optional `empty` (else markup) becomes a named arg — rendered when the filtered list is empty.
 * Sibling repeats whose collection is `item.field` splice into the item template (tip 1.0.41).
 * @param {object} ctx — { data, webir }
 * @param {{ collection: string, item: string, template: string, when?: string, empty?: string }} repeat
 * @param {{ file: string, line?: number, column?: number }} origin
 * @param {Array<{ collection: string, item: string, template: string, when?: string, empty?: string }>} [siblingRepeats]
 */
export function lowerCwlHtmlRepeat(ctx, repeat, origin, siblingRepeats = []) {
  const { data, webir } = ctx;
  const nestedByLeaf = nestedRepeatsForOuter(repeat, siblingRepeats);
  const itemSplit = splitCwlRepeatItemTemplate(
    repeat.template,
    repeat.item,
    [...nestedByLeaf.keys()],
  );
  /** @type {Array<{ kind: "literal", text: string } | { kind: "expr", node: string, escape: boolean }>} */
  const itemParts = [];
  for (const part of itemSplit) {
    if (part.kind === "literal") {
      itemParts.push({ kind: "literal", text: part.text });
      continue;
    }
    if (part.kind === "nested") {
      const nested = nestedByLeaf.get(part.leaf);
      if (nested) {
        itemParts.push({
          kind: "expr",
          // Nested repeats do not nest further in tip 1.0.41 — empty sibling list.
          node: lowerCwlHtmlRepeat(ctx, nested, origin, []),
          escape: false,
        });
        continue;
      }
      itemParts.push({ kind: "literal", text: part.leaf });
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
  const iterableSegs = String(repeat.collection || "").split(".").filter(Boolean);
  /** @type {string} */
  let iterableId;
  if (iterableSegs.length === 1) {
    iterableId = data.param({
      name: iterableSegs[0],
      type: { kind: "unknown" },
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-iterable")],
    });
  } else if (iterableSegs.length === 2) {
    // One-level nest: outer item param → member field (tip 1.0.41).
    let nest = data.param({
      name: iterableSegs[0],
      type: { kind: "unknown" },
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-iterable-outer")],
    });
    nest = data.member({
      obj: nest,
      key: iterableSegs[1],
      type: { kind: "unknown" },
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-iterable-field")],
    });
    iterableId = nest;
  } else {
    // Parser should have holed deeper nests; keep an honest empty iterable param.
    iterableId = data.param({
      name: repeat.collection,
      type: { kind: "unknown" },
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-iterable")],
    });
  }
  /** @type {string[]} */
  const args = [iterableId, itemTemplateId];
  /** @type {string[]} */
  const argNames = ["items", repeat.item];
  if (repeat.when) {
    const whenFields =
      repeat.when === repeat.item
        ? []
        : String(repeat.when)
            .slice(repeat.item.length + 1)
            .split(".")
            .filter(Boolean);
    let whenNode = data.param({
      name: repeat.item,
      type: whenFields.length > 0 ? { kind: "unknown" } : { kind: "boolean" },
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-when")],
    });
    for (const field of whenFields) {
      whenNode = data.member({
        obj: whenNode,
        key: field,
        type: { kind: "unknown" },
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-when-field")],
      });
    }
    args.push(whenNode);
    argNames.push("when");
  }
  if (typeof repeat.empty === "string") {
    // Empty markup is a literal html.template — no item binding (collection had nothing to bind).
    const emptyTemplateId = data.htmlTemplate({
      parts: [{ kind: "literal", text: repeat.empty }],
      origin,
      provenance: [webir.provenance("hub-ingest", "cwl-html-repeat-empty")],
    });
    args.push(emptyTemplateId);
    argNames.push("empty");
  }
  return data.call({
    callee: CWL_HTML_REPEAT_CALLEE,
    args,
    argNames,
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
  const repeatsByCollection = new Map();
  for (const rep of bindings.repeats ?? []) {
    repeatsByCollection.set(rep.collection, rep);
    // Nested `site.towers` also interpolates as the leaf name `towers` in the outer template.
    const leaf = String(rep.collection).split(".").pop();
    if (leaf && leaf !== rep.collection && !repeatsByCollection.has(leaf)) {
      repeatsByCollection.set(leaf, rep);
    }
  }
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
          node: lowerCwlHtmlRepeat(ctx, repeat, origin, bindings.repeats ?? []),
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
  /** @type {Array<{ collection: string, item: string, template: string, when?: string, empty?: string }>} */
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
      const { nested = [], ...stmt } = recovered;
      repeats.push(stmt);
      // Nested children recovered from the outer item template follow the outer statement.
      for (const child of nested) repeats.push(child);
      // Page-level interpolation uses the collection id; nested leaves stay inside outer markup.
      html += stmt.collection.includes(".")
        ? String(stmt.collection).split(".").pop()
        : stmt.collection;
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
 * Nested `__cwl_html_repeat` exprs inside the item template become sibling statements
 * (leaf name stays in the outer markup; full `item.field` on the nested statement).
 * @param {(id: string) => object | undefined} get
 * @param {object} call
 * @returns {{ collection: string, item: string, template: string, when?: string, empty?: string, nested?: object[] } | null}
 */
export function cwlHtmlRepeatToStatement(get, call) {
  const iterable = get(call.operands?.[0] ?? "");
  const itemTemplate = get(call.operands?.[1] ?? "");
  if (itemTemplate?.op !== "html.template") return null;
  const collRef = cwlRepeatItemRefToText(get, iterable);
  const collection =
    collRef?.text ||
    (iterable?.op === "param" ? String(iterable.attrs?.name ?? "") : "");
  if (!collection) return null;
  const argNames = call.attrs?.argNames ?? [];
  let item = typeof argNames[1] === "string" ? argNames[1] : "";
  let template = "";
  /** @type {Array<{ collection: string, item: string, template: string, when?: string, empty?: string }>} */
  const nested = [];
  for (const p of itemTemplate.attrs?.parts ?? []) {
    if (p.kind === "literal") {
      template += String(p.text ?? "");
      continue;
    }
    const idx = p.operandIndex ?? p.idx;
    const opId = itemTemplate.operands?.[idx];
    const expr = opId ? get(opId) : null;
    if (expr?.op === "call" && expr.attrs?.callee === CWL_HTML_REPEAT_CALLEE) {
      const child = cwlHtmlRepeatToStatement(get, expr);
      if (!child) return null;
      const { nested: deeper = [], ...childStmt } = child;
      if (deeper.length > 0) return null; // tip 1.0.41: one nest only
      nested.push(childStmt);
      const leaf = String(childStmt.collection).split(".").pop();
      template += leaf || childStmt.collection;
      continue;
    }
    const ref = cwlRepeatItemRefToText(get, expr);
    if (!ref) return null;
    if (!item) item = ref.item;
    template += ref.text;
  }
  if (!item) return null;
  /** @type {{ collection: string, item: string, template: string, when?: string, empty?: string, nested?: object[] }} */
  const out = { collection, item, template };
  const whenIdx = argNames.indexOf("when");
  if (whenIdx >= 0) {
    const whenOpId = call.operands?.[whenIdx];
    const whenRef = cwlRepeatItemRefToText(get, get(whenOpId));
    if (!whenRef) return null;
    out.when = whenRef.text;
  } else if (call.operands?.[2] && argNames[2] !== "empty") {
    // Legacy tip 1.0.39: third arg is when without relying on argNames alone
    const whenRef = cwlRepeatItemRefToText(get, get(call.operands[2]));
    if (whenRef) out.when = whenRef.text;
  }
  const emptyIdx = argNames.indexOf("empty");
  if (emptyIdx >= 0) {
    const emptyTemplate = get(call.operands?.[emptyIdx] ?? "");
    if (emptyTemplate?.op !== "html.template") return null;
    let empty = "";
    for (const p of emptyTemplate.attrs?.parts ?? []) {
      if (p.kind !== "literal") return null;
      empty += String(p.text ?? "");
    }
    out.empty = empty;
  }
  if (nested.length > 0) out.nested = nested;
  return out;
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
