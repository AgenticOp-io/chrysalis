/**
 * CWL HTML template interpolation (RFC-0010 extension / G1189).
 */

const HUB_T = { string: { kind: "string" } };

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
 * @param {{ path?: string[], query?: string[], load?: string[] }} bindings
 */
export function splitCwlHtmlTemplate(html, bindings = {}) {
  const pathSet = new Set(bindings.path ?? []);
  const querySet = new Set(bindings.query ?? []);
  const loadSet = new Set(bindings.load ?? []);
  if (pathSet.size + querySet.size + loadSet.size === 0) return null;

  /** @type {Array<{ kind: "literal", text: string } | { kind: "expr", name: string, source: "path" | "query" | "load" }>} */
  const parts = [];
  let i = 0;
  while (i < html.length) {
    const rest = html.slice(i);
    const idMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(rest);
    if (idMatch) {
      const name = idMatch[0];
      let source = null;
      if (pathSet.has(name)) source = "path";
      else if (querySet.has(name)) source = "query";
      else if (loadSet.has(name)) source = "load";
      if (source) {
        const after = html[i + name.length];
        const before = i > 0 ? html[i - 1] : "";
        // Skip load/path/query ids inside hyphenated CSS tokens (e.g. class="module-header").
        if (before === "-" || after === "-") {
          let start = i;
          let end = i + name.length;
          while (start > 0 && /[a-zA-Z0-9_-]/.test(html[start - 1])) start--;
          while (end < html.length && /[a-zA-Z0-9_-]/.test(html[end])) end++;
          parts.push({ kind: "literal", text: html.slice(start, end) });
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
        if (pathSet.has(name) || querySet.has(name) || loadSet.has(name)) break;
      }
      j++;
    }
    parts.push({ kind: "literal", text: html.slice(i, j) });
    i = j;
  }
  return parts.some((p) => p.kind === "expr") ? parts : null;
}

/**
 * @param {object} ctx — { data, webir, file }
 * @param {string} html
 * @param {{ file: string, line?: number }} loc
 * @param {object} wr
 * @param {{ path?: string[], query?: string[], load?: string[] }} [bindings]
 */
export function lowerCwlHtmlTemplateBody(ctx, html, loc, wr, bindings = {}) {
  const split = splitCwlHtmlTemplate(html, bindings);
  if (!split) return lowerHubHtmlLiteralPageBody(ctx, html, loc, wr);

  const { data, webir } = ctx;
  const origin = { file: loc.file, line: loc.line ?? 1, column: 1 };
  /** @type {Array<{ kind: "literal", text: string } | { kind: "expr", node: string, escape: boolean }>} */
  const templateParts = [];
  for (const part of split) {
    if (part.kind === "literal") {
      templateParts.push({ kind: "literal", text: part.text });
      continue;
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
            source: part.source,
            name: part.name,
            type: { kind: "string" },
            origin,
            provenance: [webir.provenance("hub-ingest", "cwl-html-param")],
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
 * @param {(id: string) => object | undefined} get
 * @param {object} n
 */
export function cwlHtmlTemplateToLit(get, n) {
  const parts = n.attrs?.parts ?? [];
  let html = "";
  for (const p of parts) {
    if (p.kind === "literal") {
      html += String(p.text ?? "");
      continue;
    }
    const idx = p.operandIndex ?? p.idx;
    const opId = n.operands?.[idx];
    const expr = opId ? get(opId) : null;
    if (expr?.op === "request.field") html += String(expr.attrs?.name ?? "");
    else if (expr?.op === "param") html += String(expr.attrs?.name ?? "");
    else return { t: "hole", reason: "hub:cwl:html-template-expr" };
  }
  return { t: "lit", value: html };
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
