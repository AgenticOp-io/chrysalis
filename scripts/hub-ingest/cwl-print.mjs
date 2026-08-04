/**
 * Print a parsed CWL module AST back to source text.
 * Pair with `parseCwlModule` for language-pillar parse→print round-trips
 * without WebIR / convert hub helpers.
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function printCwlLiteral(value) {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(printCwlLiteral).join(", ")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([k, v]) => `${k}: ${printCwlLiteral(v)}`);
    return `{ ${entries.join(", ")} }`;
  }
  return JSON.stringify(String(value));
}

/**
 * @param {{ kind: string, value?: unknown, name?: string, default?: unknown, entries?: Array<{ key: string, value: object }> }} body
 * @returns {string | null}
 */
export function printCwlBodyExpr(body) {
  if (!body || typeof body !== "object") return "null";
  switch (body.kind) {
    case "literal":
      return printCwlLiteral(body.value);
    case "html":
      return `html ${printCwlLiteral(body.value)}`;
    case "pathParam":
    case "queryParam":
      return body.name;
    case "object": {
      const parts = (body.entries ?? []).map((e) => {
        const v = e.value;
        if (!v) return `${e.key}: null`;
        if (v.kind === "literal") return `${e.key}: ${printCwlLiteral(v.value)}`;
        if (
          v.kind === "pathParam" ||
          v.kind === "queryParam" ||
          v.kind === "headerParam" ||
          v.kind === "cookieParam" ||
          v.kind === "bodyParam"
        ) {
          if (v.kind === "cookieParam" && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(v.name ?? ""))) {
            return `${e.key}: cookie ${v.name}`;
          }
          return `${e.key}: ${v.name}`;
        }
        return `${e.key}: ${printCwlLiteral(v.value ?? null)}`;
      });
      return `{ ${parts.join(", ")} }`;
    }
    case "hole":
    case "ui":
      return null;
    default:
      return printCwlLiteral(body.value ?? null);
  }
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
    lines.push(`${indent}client ui {`);
    for (const child of node.children ?? []) printUiNode(child, `${indent}  `, lines);
    lines.push(`${indent}}`);
    return;
  }
  if (node.kind === "element") {
    const attrs = printAttrTail(node.attrs ?? []);
    const children = node.children ?? [];
    const events = node.events ?? [];
    if (children.length === 0 && events.length === 0) {
      lines.push(`${indent}element ${JSON.stringify(node.tag)}${attrs} {`);
      lines.push(`${indent}}`);
      return;
    }
    lines.push(`${indent}element ${JSON.stringify(node.tag)}${attrs} {`);
    for (const child of children) printUiNode(child, `${indent}  `, lines);
    for (const ev of events) {
      lines.push(`${indent}  on ${ev.name} { action ${JSON.stringify(ev.action)}; }`);
    }
    lines.push(`${indent}}`);
  }
}

/**
 * @param {{ key: string, literal?: string, binding?: string }} prop
 */
function printComponentProp(prop) {
  if (Object.prototype.hasOwnProperty.call(prop, "literal")) {
    return `${prop.key}: ${JSON.stringify(prop.literal)}`;
  }
  return `${prop.key}: ${prop.binding}`;
}

/**
 * Emit `return ui …` lines (handler/page indent is two spaces).
 * @param {object} body
 * @param {string} indent
 * @param {string[]} lines
 */
export function printCwlUiReturn(body, indent, lines) {
  if (body.componentRef) {
    const props = (body.props ?? []).map(printComponentProp).join(", ");
    lines.push(`${indent}return ui ${body.componentRef} { ${props} };`);
    return;
  }
  lines.push(`${indent}return ui {`);
  if (body.tree) printUiNode(body.tree, `${indent}  `, lines);
  lines.push(`${indent}};`);
}

/**
 * @param {object} tree
 * @param {string} indent
 * @param {string[]} lines
 */
function printComponentUiTree(tree, indent, lines) {
  lines.push(`${indent}return ui {`);
  printUiNode(tree, `${indent}  `, lines);
  lines.push(`${indent}};`);
}

/**
 * @param {ReturnType<import("./cwl-parser.mjs").parseCwlModule>} mod
 * @param {{ header?: string | null }} [opts]
 * @returns {string}
 */
export function printCwlModule(mod, opts = {}) {
  const lines = [];
  if (opts.header !== null) {
    const header = opts.header ?? "# Chrysalis Web Language";
    if (header) lines.push(header);
  }
  lines.push(`module ${mod.moduleName ?? "main"};`);

  for (const use of mod.moduleUses ?? []) {
    if (use === "express.json") lines.push("use json;");
    else if (use === "express.urlencoded") lines.push("use urlencoded;");
  }
  for (const auth of mod.moduleAuthUses ?? []) {
    if (auth === "chrysalis.auth.session") lines.push("use auth session;");
    else if (auth === "chrysalis.auth.bearer") lines.push("use auth bearer;");
  }
  for (const imp of mod.imports ?? []) {
    lines.push(`import "${imp}";`);
  }

  if (
    (mod.moduleUses?.length || mod.moduleAuthUses?.length || mod.imports?.length) &&
    (mod.routes?.length || mod.components?.length)
  ) {
    lines.push("");
  }

  for (const comp of mod.components ?? []) {
    lines.push(`@component ${comp.name} {`);
    for (const p of comp.props ?? []) {
      lines.push(`  prop ${p};`);
    }
    if (comp.tree && comp.tree.kind !== "hole") printComponentUiTree(comp.tree, "  ", lines);
    else lines.push(`  return ui { element "div" { } };`);
    lines.push("}");
    lines.push("");
  }

  for (const route of mod.routes ?? []) {
    const isPage = route.surfaceKind === "page";
    lines.push(`${isPage ? "@page" : "@route"} ${route.method} "${route.path}"`);
    lines.push(`${isPage ? "page" : "handler"} ${route.name} {`);
    const effects = Array.isArray(route.effects) && route.effects.length > 0 ? route.effects : [];
    lines.push(`  effects: ${effects.length ? effects.join(", ") : "none"};`);

    if (typeof route.responseStatus === "number") {
      lines.push(`  status ${route.responseStatus};`);
    }
    if (route.responseContentType) {
      const defaultHtml =
        (route.body?.kind === "html" || route.body?.kind === "ui") &&
        route.responseContentType === "text/html; charset=utf-8";
      if (!defaultHtml) {
        lines.push(`  content-type ${JSON.stringify(route.responseContentType)};`);
      }
    }

    const pathDefaults = route.handlerPathDefaults ?? {};
    for (const name of route.handlerPathParams ?? []) {
      if (Object.prototype.hasOwnProperty.call(pathDefaults, name)) {
        lines.push(`  param ${name} = ${printCwlLiteral(pathDefaults[name])};`);
      } else {
        lines.push(`  param ${name};`);
      }
    }
    const queryDefaults = route.handlerQueryDefaults ?? {};
    for (const name of route.handlerQueryParams ?? []) {
      if (Object.prototype.hasOwnProperty.call(queryDefaults, name)) {
        lines.push(`  query ${name} = ${printCwlLiteral(queryDefaults[name])};`);
      } else {
        lines.push(`  query ${name};`);
      }
    }
    for (const name of route.handlerHeaders ?? []) {
      lines.push(`  header ${name};`);
    }
    for (const name of route.handlerCookies ?? []) {
      lines.push(`  cookie ${name};`);
    }
    for (const name of route.handlerBodyParams ?? []) {
      lines.push(`  body ${name};`);
    }
    for (const h of route.responseHeaders ?? []) {
      if (Object.prototype.hasOwnProperty.call(h, "default")) {
        lines.push(`  response-header ${h.name} = ${printCwlLiteral(h.default)};`);
      } else {
        lines.push(`  response-header ${h.name};`);
      }
    }

    for (const g of route.earlyGuards ?? []) {
      lines.push(`  if ${g.condExpr} {`);
      if (typeof g.status === "number") {
        lines.push(`    status ${g.status};`);
      }
      if (g.body?.kind === "html") {
        lines.push(`    return html ${printCwlLiteral(g.body.value)};`);
      } else if (g.body) {
        const expr = printCwlBodyExpr(g.body);
        if (expr != null) lines.push(`    return ${expr};`);
      }
      lines.push("  }");
    }

    if (route.loadBody) {
      const loadExpr = printCwlBodyExpr(route.loadBody);
      if (loadExpr != null) lines.push(`  load ${loadExpr};`);
      else if (route.loadBody.kind === "hole") {
        lines.push(`  hole ${route.loadBody.reason ?? "cwl:load-hole"};`);
      }
    }

    const body = route.body;
    if (body?.kind === "hole") {
      const reason = String(body.reason ?? "cwl:hole");
      lines.push(
        /^[A-Za-z0-9_:.-]+$/.test(reason)
          ? `  hole ${reason};`
          : `  hole legacy ${JSON.stringify(reason)};`,
      );
    } else if (body?.kind === "ui") {
      printCwlUiReturn(body, "  ", lines);
    } else {
      const expr = printCwlBodyExpr(body);
      if (expr != null) lines.push(`  return ${expr};`);
      else lines.push(`  hole cwl:empty-handler;`);
    }

    for (const fe of route.foreachBindings ?? []) {
      const keyPart = fe.key ? ` ${fe.key} =>` : "";
      lines.push(`  foreach ${fe.collection} as${keyPart} ${fe.item} {`);
      if (fe.body?.kind === "html") {
        lines.push(`    return html ${printCwlLiteral(fe.body.value)};`);
      } else if (fe.body) {
        const expr = printCwlBodyExpr(fe.body);
        if (expr != null) lines.push(`    return ${expr};`);
      }
      lines.push("  }");
    }

    lines.push("}");
    lines.push("");
  }

  return `${lines.join("\n").replace(/\n+$/, "\n")}`;
}

/**
 * Drop volatile fields so two parses of equivalent source compare equal.
 * @param {ReturnType<import("./cwl-parser.mjs").parseCwlModule>} mod
 */
export function canonicalizeCwlModule(mod) {
  return {
    moduleName: mod.moduleName ?? "main",
    moduleUses: [...(mod.moduleUses ?? [])],
    moduleAuthUses: [...(mod.moduleAuthUses ?? [])],
    imports: [...(mod.imports ?? [])],
    components: (mod.components ?? []).map((c) => ({
      name: c.name,
      props: [...(c.props ?? [])],
      tree: canonicalizeUiNode(c.tree),
    })),
    routes: (mod.routes ?? []).map((r) => ({
      method: r.method,
      path: r.path,
      pathParams: [...(r.pathParams ?? [])],
      name: r.name,
      surfaceKind: r.surfaceKind ?? "api",
      effects: [...(r.effects ?? [])],
      handlerPathParams: [...(r.handlerPathParams ?? [])],
      handlerPathDefaults: { ...(r.handlerPathDefaults ?? {}) },
      handlerQueryParams: [...(r.handlerQueryParams ?? [])],
      handlerQueryDefaults: { ...(r.handlerQueryDefaults ?? {}) },
      handlerHeaders: [...(r.handlerHeaders ?? [])],
      handlerCookies: [...(r.handlerCookies ?? [])],
      handlerBodyParams: [...(r.handlerBodyParams ?? [])],
      responseStatus: r.responseStatus ?? null,
      responseContentType: r.responseContentType ?? null,
      responseHeaders: (r.responseHeaders ?? []).map((h) =>
        Object.prototype.hasOwnProperty.call(h, "default")
          ? { name: h.name, default: h.default }
          : { name: h.name },
      ),
      loadBody: canonicalizeBody(r.loadBody),
      earlyGuards: (r.earlyGuards ?? []).map((g) => ({
        condExpr: g.condExpr,
        status: g.status ?? null,
        body: canonicalizeBody(g.body),
      })),
      foreachBindings: (r.foreachBindings ?? []).map((fe) => ({
        collection: fe.collection,
        key: fe.key ?? null,
        item: fe.item,
        body: canonicalizeBody(fe.body),
      })),
      body: canonicalizeBody(r.body),
    })),
  };
}

/** @param {object | null | undefined} body */
function canonicalizeBody(body) {
  if (!body) return null;
  if (body.kind === "ui") {
    if (body.componentRef) {
      return {
        kind: "ui",
        componentRef: body.componentRef,
        props: (body.props ?? []).map((p) => {
          if (Object.prototype.hasOwnProperty.call(p, "literal")) {
            return { key: p.key, literal: p.literal };
          }
          return { key: p.key, binding: p.binding };
        }),
      };
    }
    return { kind: "ui", tree: canonicalizeUiNode(body.tree) };
  }
  if (body.kind === "object") {
    return {
      kind: "object",
      entries: (body.entries ?? []).map((e) => ({
        key: e.key,
        value: canonicalizeBody(e.value) ?? e.value,
      })),
    };
  }
  if (body.kind === "literal" || body.kind === "html") {
    return { kind: body.kind, value: body.value };
  }
  if (body.kind === "hole") {
    return { kind: "hole", reason: body.reason ?? "cwl:hole" };
  }
  if (
    body.kind === "pathParam" ||
    body.kind === "queryParam" ||
    body.kind === "headerParam" ||
    body.kind === "cookieParam" ||
    body.kind === "bodyParam"
  ) {
    const out = { kind: body.kind, name: body.name };
    if (Object.prototype.hasOwnProperty.call(body, "default")) out.default = body.default;
    return out;
  }
  return body;
}

/** @param {object | null | undefined} node */
function canonicalizeUiNode(node) {
  if (!node) return null;
  if (node.kind === "text") {
    return { kind: "text", text: node.text ?? null, binding: node.binding ?? null };
  }
  if (node.kind === "fragment") {
    return { kind: "fragment", children: (node.children ?? []).map(canonicalizeUiNode) };
  }
  if (node.kind === "island") {
    return { kind: "island", client: true, children: (node.children ?? []).map(canonicalizeUiNode) };
  }
  if (node.kind === "element") {
    return {
      kind: "element",
      tag: node.tag,
      attrs: (node.attrs ?? []).map((a) => ({
        key: a.key,
        value: a.value,
        isBinding: Boolean(a.isBinding),
      })),
      children: (node.children ?? []).map(canonicalizeUiNode),
      events: (node.events ?? []).map((e) => ({ name: e.name, action: e.action })),
    };
  }
  return node;
}
