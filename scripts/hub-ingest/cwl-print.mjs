/**
 * Print `else if` / `else` tails for an if / earlyGuard node.
 * @param {object} s
 * @param {string} indent
 * @param {string[]} lines
 */
function printElseTail(s, indent, lines) {
  for (const ei of s.elseIfs ?? []) {
    lines.push(`${indent}else if ${ei.condExpr} {`);
    printControlStmts(controlStmtsOf(ei), `${indent}  `, lines);
    lines.push(`${indent}}`);
  }
  if (Array.isArray(s.elseStmts) && s.elseStmts.length > 0) {
    lines.push(`${indent}else {`);
    printControlStmts(s.elseStmts, `${indent}  `, lines);
    lines.push(`${indent}}`);
  } else if (s.elseBody) {
    lines.push(`${indent}else {`);
    if (typeof s.elseStatus === "number") lines.push(`${indent}  status ${s.elseStatus};`);
    if (s.elseBody?.kind === "html") {
      lines.push(`${indent}  return html ${printCwlLiteral(s.elseBody.value)};`);
    } else {
      const expr = printCwlBodyExpr(s.elseBody);
      if (expr != null) lines.push(`${indent}  return ${expr};`);
    }
    lines.push(`${indent}}`);
  }
}

/**
 * Print control-block stmt lists (`status` / `return` / nested `if` / `foreach`).
 * Surface documentation only — no condition or loop evaluation.
 * @param {object[]} stmts
 * @param {string} indent
 * @param {string[]} lines
 */
function printControlStmts(stmts, indent, lines) {
  for (const s of stmts ?? []) {
    if (s.kind === "status" && typeof s.status === "number") {
      lines.push(`${indent}status ${s.status};`);
      continue;
    }
    if (s.kind === "return") {
      if (s.body?.kind === "html") {
        lines.push(`${indent}return html ${printCwlLiteral(s.body.value)};`);
      } else if (s.body) {
        const expr = printCwlBodyExpr(s.body);
        if (expr != null) lines.push(`${indent}return ${expr};`);
      }
      continue;
    }
    if (s.kind === "if") {
      lines.push(`${indent}if ${s.condExpr} {`);
      printControlStmts(s.stmts ?? [], `${indent}  `, lines);
      lines.push(`${indent}}`);
      printElseTail(s, indent, lines);
      continue;
    }
    if (s.kind === "foreach") {
      const keyPart = s.key ? ` ${s.key} =>` : "";
      lines.push(`${indent}foreach ${s.collection} as${keyPart} ${s.item} {`);
      printControlStmts(s.stmts ?? [], `${indent}  `, lines);
      lines.push(`${indent}}`);
    }
  }
}

/**
 * Flatten legacy status/body into a stmt list when `stmts` is absent.
 * @param {{ status?: number | null, body?: object | null, stmts?: object[] }} block
 */
function controlStmtsOf(block) {
  if (Array.isArray(block.stmts) && block.stmts.length > 0) return block.stmts;
  /** @type {object[]} */
  const out = [];
  if (typeof block.status === "number") out.push({ kind: "status", status: block.status });
  if (block.body) out.push({ kind: "return", body: block.body });
  return out;
}

/**
 * @param {object[] | null | undefined} stmts
 */
function canonicalizeElseIfs(elseIfs) {
  return (elseIfs ?? []).map((ei) => ({
    condExpr: ei.condExpr,
    status: ei.status ?? null,
    body: canonicalizeBody(ei.body),
    stmts: canonicalizeControlStmts(controlStmtsOf(ei)),
  }));
}

function canonicalizeControlStmts(stmts) {
  return (stmts ?? []).map((s) => {
    if (s.kind === "status") return { kind: "status", status: s.status ?? null };
    if (s.kind === "return") return { kind: "return", body: canonicalizeBody(s.body) };
    if (s.kind === "if") {
      return {
        kind: "if",
        condExpr: s.condExpr,
        status: s.status ?? null,
        body: canonicalizeBody(s.body),
        stmts: canonicalizeControlStmts(s.stmts),
        elseIfs: canonicalizeElseIfs(s.elseIfs),
        elseStmts: canonicalizeControlStmts(s.elseStmts ?? []),
        elseStatus: s.elseStatus ?? null,
        elseBody: canonicalizeBody(s.elseBody),
      };
    }
    if (s.kind === "foreach") {
      return {
        kind: "foreach",
        collection: s.collection,
        key: s.key ?? null,
        item: s.item,
        body: canonicalizeBody(s.body),
        stmts: canonicalizeControlStmts(s.stmts),
      };
    }
    return s;
  });
}

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
        return `${e.key}: ${printCwlBodyExpr(v)}`;
      });
      return `{ ${parts.join(", ")} }`;
    }
    case "array": {
      const parts = (body.elements ?? []).map((el) => printCwlBodyExpr(el));
      return `[${parts.join(", ")}]`;
    }
    case "cookieParam":
      return `cookie ${body.name}`;
    case "headerParam":
    case "bodyParam":
      return body.name ?? "null";
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
    for (const name of route.handlerMultipartFields ?? []) {
      lines.push(`  multipart field ${name};`);
    }
    for (const name of route.handlerMultipartFiles ?? []) {
      lines.push(`  multipart file ${name};`);
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
      printControlStmts(controlStmtsOf(g), "    ", lines);
      lines.push("  }");
      printElseTail(g, "  ", lines);
    }

    if (route.loadBody) {
      const loadExpr = printCwlBodyExpr(route.loadBody);
      if (loadExpr != null) lines.push(`  load ${loadExpr};`);
      else if (route.loadBody.kind === "hole") {
        lines.push(`  hole ${route.loadBody.reason ?? "cwl:load-hole"};`);
      }
    }

    const body = route.body;
    const attachmentHoles = Array.isArray(route.attachmentHoles)
      ? route.attachmentHoles
      : [];
    /** @param {string} reason */
    const printHoleLine = (reason) => {
      const r = String(reason ?? "cwl:hole");
      lines.push(
        /^[A-Za-z0-9_:.-]+$/.test(r)
          ? `  hole ${r};`
          : `  hole legacy ${JSON.stringify(r)};`,
      );
    };
    if (body?.kind === "hole") {
      // Body-as-hole: print each attachment (or the body reason once).
      if (attachmentHoles.length > 0) {
        for (const reason of attachmentHoles) printHoleLine(reason);
      } else {
        printHoleLine(body.reason ?? "cwl:hole");
      }
    } else {
      for (const reason of attachmentHoles) printHoleLine(reason);
      if (body?.kind === "ui") {
        printCwlUiReturn(body, "  ", lines);
      } else {
        const expr = printCwlBodyExpr(body);
        if (expr != null) lines.push(`  return ${expr};`);
        else lines.push(`  hole cwl:empty-handler;`);
      }
    }

    for (const fe of route.foreachBindings ?? []) {
      const keyPart = fe.key ? ` ${fe.key} =>` : "";
      lines.push(`  foreach ${fe.collection} as${keyPart} ${fe.item} {`);
      printControlStmts(controlStmtsOf(fe), "    ", lines);
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
      handlerMultipartFields: [...(r.handlerMultipartFields ?? [])],
      handlerMultipartFiles: [...(r.handlerMultipartFiles ?? [])],
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
        stmts: canonicalizeControlStmts(controlStmtsOf(g)),
        elseIfs: canonicalizeElseIfs(g.elseIfs),
        elseStmts: canonicalizeControlStmts(g.elseStmts ?? []),
        elseStatus: g.elseStatus ?? null,
        elseBody: canonicalizeBody(g.elseBody),
      })),
      foreachBindings: (r.foreachBindings ?? []).map((fe) => ({
        collection: fe.collection,
        key: fe.key ?? null,
        item: fe.item,
        body: canonicalizeBody(fe.body),
        stmts: canonicalizeControlStmts(controlStmtsOf(fe)),
      })),
      attachmentHoles: [...(r.attachmentHoles ?? [])],
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
  if (body.kind === "array") {
    return {
      kind: "array",
      elements: (body.elements ?? []).map((el) => canonicalizeBody(el) ?? el),
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
