import { formatCookieDecl, formatRedirectStatement } from "./hub-cwl-effects.mjs";
import { printCwlDbStatement, printCwlTable } from "./cwl-db.mjs";

/**
 * Print `return html` / `chrome html`. Newlines stay a raw block, not a one-line escape.
 * @param {string[]} lines
 * @param {string} indent
 * @param {string} head
 * @param {unknown} value
 */
/**
 * @param {{ robots?: string, author?: string, theme?: string, og?: Record<string, string>, twitter?: Record<string, string> } | null | undefined} card
 * @param {string} indent
 * @param {string[]} lines
 */
function printMetaCard(card, indent, lines) {
  if (!card) return;
  if (typeof card.robots === "string") lines.push(`${indent}meta robots ${JSON.stringify(card.robots)};`);
  if (typeof card.author === "string") lines.push(`${indent}meta author ${JSON.stringify(card.author)};`);
  if (typeof card.theme === "string") lines.push(`${indent}meta theme ${JSON.stringify(card.theme)};`);
  if (typeof card.keywords === "string") lines.push(`${indent}meta keywords ${JSON.stringify(card.keywords)};`);
  for (const key of ["type", "site", "locale", "url", "title", "description", "image"]) {
    if (typeof card.og?.[key] === "string") lines.push(`${indent}meta og ${key} ${JSON.stringify(card.og[key])};`);
  }
  for (const key of ["card", "title", "description", "image"]) {
    if (typeof card.twitter?.[key] === "string") lines.push(`${indent}meta twitter ${key} ${JSON.stringify(card.twitter[key])};`);
  }
}

/**
 * RFC-0040 style asset line (string or { href, integrity?, crossorigin? }).
 * @param {string | { href: string, integrity?: string, crossorigin?: boolean }} entry
 */
function formatCwlStyleAsset(entry) {
  const href = typeof entry === "string" ? entry : entry?.href;
  const integrity = typeof entry === "object" && entry ? entry.integrity : undefined;
  const crossorigin = typeof entry === "object" && entry ? entry.crossorigin : undefined;
  let line = `style ${JSON.stringify(href ?? "")}`;
  if (typeof integrity === "string") line += ` integrity ${JSON.stringify(integrity)}`;
  if (crossorigin) line += ` crossorigin`;
  return `${line};`;
}

/**
 * RFC-0040 script asset line (string or { src, module?, integrity?, crossorigin? }).
 * @param {string | { src: string, module?: boolean, integrity?: string, crossorigin?: boolean }} entry
 */
function formatCwlScriptAsset(entry) {
  const src = typeof entry === "string" ? entry : entry?.src;
  const isModule = typeof entry === "object" && entry ? entry.module : undefined;
  const integrity = typeof entry === "object" && entry ? entry.integrity : undefined;
  const crossorigin = typeof entry === "object" && entry ? entry.crossorigin : undefined;
  let line = `script ${JSON.stringify(src ?? "")}`;
  if (isModule) line += ` module`;
  if (typeof integrity === "string") line += ` integrity ${JSON.stringify(integrity)}`;
  if (crossorigin) line += ` crossorigin`;
  return `${line};`;
}

function appendCwlHtmlStmt(lines, indent, head, value) {
  const s = String(value ?? "");
  if (!s.includes("\n")) {
    lines.push(`${indent}${head} ${JSON.stringify(s)};`);
    return;
  }
  const body = s.endsWith("\n") ? s.slice(0, -1) : s;
  lines.push(`${indent}${head} """`);
  for (const line of body.split("\n")) lines.push(line);
  lines.push(`${indent}""";`);
}

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
      appendCwlHtmlStmt(lines, `${indent}  `, "return html", s.elseBody.value);
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
        appendCwlHtmlStmt(lines, indent, "return html", s.body.value);
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
    // RFC-0033: printed as its own `proxy upstream` statement, not a `return`.
    case "proxy":
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
  if (mod.engine) lines.push(`engine ${mod.engine};`);
  for (const hole of mod.engineHoles ?? []) lines.push(`hole ${hole};`);

  for (const table of mod.tables ?? []) {
    lines.push("");
    lines.push(...printCwlTable(table));
  }

  for (const L of mod.layouts ?? []) {
    lines.push("");
    lines.push(`layout ${L.name} {`);
    for (const h of L.headers ?? []) lines.push(`  header ${h};`);
    for (const c of L.cookies ?? []) {
      const purpose = (L.cookiePurposes ?? []).find((p) => p.name === c);
      lines.push(`  ${formatCookieDecl(c, purpose)};`);
    }
    if (L.yearHost) lines.push("  year host;");
    else if (Number.isInteger(L.yearLiteral)) lines.push(`  year ${L.yearLiteral};`);
    if (L.charset === "utf-8") lines.push("  charset utf-8;");
    if (L.viewportDevice) lines.push("  viewport device;");
    printMetaCard(L.metaCard, "  ", lines);
    if (L.deviceHost?.values?.length === 2) {
      const below = L.deviceHost.below ? ` below ${L.deviceHost.below}` : "";
      lines.push(`  device host ${L.deviceHost.values[0]} ${L.deviceHost.values[1]}${below};`);
    }
    if (L.drawer) {
      const panel = L.drawer.panelId ? ` panel ${L.drawer.panelId}` : "";
      lines.push(
        `  drawer ${L.drawer.navId} toggle ${L.drawer.toggleClass} class ${L.drawer.openClass}${panel};`,
      );
    }
    for (const style of L.styles ?? []) lines.push(`  ${formatCwlStyleAsset(style)}`);
    for (const script of L.scripts ?? []) lines.push(`  ${formatCwlScriptAsset(script)}`);
    for (const form of L.forms ?? []) {
      lines.push(`  form ${form.id} method ${form.method} action ${JSON.stringify(form.action)};`);
      for (const field of form.fields ?? []) lines.push(`  field ${field.name} ${JSON.stringify(field.type)};`);
      if (form.submit) lines.push(`  submit ${JSON.stringify(form.submit)};`);
    }
    for (const image of L.images ?? []) lines.push(`  image ${image.id} ${JSON.stringify(image.path)};`);
    if (L.hostFirebase) {
      const error = L.hostFirebase.errorDoc ? ` error ${JSON.stringify(L.hostFirebase.errorDoc)}` : "";
      lines.push(
        `  host firebase ${JSON.stringify(L.hostFirebase.target)} public ${JSON.stringify(L.hostFirebase.publicDir)}${error};`,
      );
    }
    let printedGroup = "";
    for (const link of L.links ?? []) {
      const group = link.group || "";
      if (group !== printedGroup) {
        if (group) lines.push(`  links ${group};`);
        printedGroup = group;
      }
      const cls = link.className ? ` class ${link.className}` : "";
      const target = link.target === "blank" ? " target blank" : "";
      const rel = link.rel ? ` rel ${link.rel}` : "";
      lines.push(`  link ${link.id} ${JSON.stringify(link.href)} ${JSON.stringify(link.label)}${cls}${target}${rel};`);
    }
    for (const hole of L.holes ?? []) {
      const r = String(hole ?? "cwl:hole");
      lines.push(
        /^[A-Za-z0-9_:.-]+$/.test(r) ? `  hole ${r};` : `  hole legacy ${JSON.stringify(r)};`,
      );
    }
    for (const island of L.pageIslands ?? []) {
      printUiNode(island, "  ", lines);
    }
    if (typeof L.chromeHtml === "string") {
      appendCwlHtmlStmt(lines, "  ", "chrome html", L.chromeHtml);
    }
    lines.push("}");
  }

  if (
    (mod.moduleUses?.length || mod.moduleAuthUses?.length || mod.imports?.length || mod.layouts?.length || mod.tables?.length) &&
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

    if (route.layoutName) {
      lines.push(`  layout ${route.layoutName};`);
    }
    if (route.navId) {
      lines.push(`  nav ${route.navId};`);
    }
    if (typeof route.title === "string") lines.push(`  title ${JSON.stringify(route.title)};`);
    if (typeof route.description === "string") lines.push(`  description ${JSON.stringify(route.description)};`);
    if (typeof route.canonical === "string") lines.push(`  canonical ${JSON.stringify(route.canonical)};`);
    if (typeof route.replaces === "string") lines.push(`  replaces ${JSON.stringify(route.replaces)};`);
    if (route.peel?.stack && route.peel?.at) {
      lines.push(`  from peel ${JSON.stringify(route.peel.stack)} at ${JSON.stringify(route.peel.at)};`);
    }
    for (const cap of route.capabilities ?? []) lines.push(`  capability ${cap};`);
    if (route.worksWithoutClient) lines.push(`  works without client;`);
    printMetaCard(route.metaCard, "  ", lines);
    for (const icon of route.icons ?? []) lines.push(`  icon ${icon.id}${icon.apple ? " apple" : ""};`);
    for (const link of route.preconnects ?? []) {
      lines.push(`  preconnect ${JSON.stringify(link.href)}${link.crossorigin ? " crossorigin" : ""};`);
    }
    for (const link of route.alternates ?? []) {
      lines.push(`  alternate ${JSON.stringify(link.type)} ${JSON.stringify(link.href)} ${JSON.stringify(link.title)};`);
    }
    for (const style of route.pageStyles ?? []) lines.push(`  ${formatCwlStyleAsset(style)}`);
    for (const json of route.jsonlds ?? []) appendCwlHtmlStmt(lines, "  ", "jsonld", json);

    if (route.redirect?.path) {
      lines.push(`  ${formatRedirectStatement(route.redirect)};`);
    } else if (typeof route.responseStatus === "number") {
      lines.push(`  status ${route.responseStatus};`);
    }
    if (route.streamKind === "sse") {
      lines.push(`  stream sse;`);
    } else if (route.streamKind === "websocket") {
      lines.push(`  stream websocket;`);
    } else if (route.responseContentType) {
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
      const purpose = (route.handlerCookiePurposes ?? []).find((p) => p.name === name);
      lines.push(`  ${formatCookieDecl(name, purpose)};`);
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

    for (const op of route.dbOps ?? []) {
      lines.push(`  ${printCwlDbStatement(op)}`);
    }

    for (const rep of route.htmlRepeats ?? []) {
      const whenPart = rep.when ? ` if ${rep.when}` : "";
      const elsePart = typeof rep.empty === "string" ? ` else html ${printCwlLiteral(rep.empty)}` : "";
      lines.push(
        `  repeat ${rep.collection} as ${rep.item}${whenPart} html ${printCwlLiteral(rep.template)}${elsePart};`,
      );
    }

    for (const island of route.pageIslands ?? []) {
      printUiNode(island, "  ", lines);
    }

    if (typeof route.headHtml === "string") {
      appendCwlHtmlStmt(lines, "  ", "head html", route.headHtml);
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
    if (body?.kind === "proxy") {
      for (const reason of attachmentHoles) printHoleLine(reason);
      lines.push(`  proxy upstream ${printCwlLiteral(body.target)};`);
    } else if (body?.kind === "hole") {
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
      } else if (body?.kind === "html") {
        appendCwlHtmlStmt(lines, "  ", "return html", body.value);
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
    engine: mod.engine ?? null,
    engineHoles: [...(mod.engineHoles ?? [])],
    tables: (mod.tables ?? []).map((table) => ({
      name: table.name,
      columns: (table.columns ?? []).map((col) => ({
        name: col.name,
        type: col.type,
        key: Boolean(col.key),
      })),
      holes: [...(table.holes ?? [])],
    })),
    layouts: (mod.layouts ?? []).map((L) => ({
      name: L.name,
      headers: [...(L.headers ?? [])],
      cookies: [...(L.cookies ?? [])],
      cookiePurposes: (L.cookiePurposes ?? []).map((p) => ({
        name: p.name,
        purpose: p.purpose,
        values: p.values ? [...p.values] : null,
      })),
      holes: [...(L.holes ?? [])],
      chromeHtml: L.chromeHtml ?? null,
      pageIslands: (L.pageIslands ?? []).map(canonicalizeUiNode),
    })),
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
      layoutName: r.layoutName ?? null,
      pageIslands: (r.pageIslands ?? []).map(canonicalizeUiNode),
      htmlRepeats: (r.htmlRepeats ?? []).map((rep) => ({
        collection: rep.collection,
        item: rep.item,
        template: rep.template,
        ...(rep.when ? { when: rep.when } : {}),
        ...(typeof rep.empty === "string" ? { empty: rep.empty } : {}),
      })),
      handlerPathParams: [...(r.handlerPathParams ?? [])],
      handlerPathDefaults: { ...(r.handlerPathDefaults ?? {}) },
      handlerQueryParams: [...(r.handlerQueryParams ?? [])],
      handlerQueryDefaults: { ...(r.handlerQueryDefaults ?? {}) },
      handlerHeaders: [...(r.handlerHeaders ?? [])],
      handlerCookies: [...(r.handlerCookies ?? [])],
      handlerCookiePurposes: (r.handlerCookiePurposes ?? []).map((p) => ({
        name: p.name,
        purpose: p.purpose,
        values: p.values ? [...p.values] : null,
      })),
      handlerBodyParams: [...(r.handlerBodyParams ?? [])],
      handlerMultipartFields: [...(r.handlerMultipartFields ?? [])],
      handlerMultipartFiles: [...(r.handlerMultipartFiles ?? [])],
      responseStatus: r.redirect?.path ? null : (r.responseStatus ?? null),
      redirect: r.redirect?.path
        ? { path: r.redirect.path, status: r.redirect.status ?? 302 }
        : null,
      responseContentType: r.responseContentType ?? null,
      streamKind: r.streamKind ?? null,
      responseHeaders: (r.responseHeaders ?? []).map((h) =>
        Object.prototype.hasOwnProperty.call(h, "default")
          ? { name: h.name, default: h.default }
          : { name: h.name },
      ),
      loadBody: canonicalizeBody(r.loadBody),
      dbOps: (r.dbOps ?? []).map((op) => ({
        op: op.op,
        one: Boolean(op.one),
        table: op.table,
        column: op.column ?? null,
        where: (op.where ?? []).map((part) => ({
          column: part.column,
          cmp: part.cmp,
          value: part.value,
        })),
        join: op.join ?? null,
        as: op.as ?? null,
        into: op.into ? { collection: op.into.collection, field: op.into.field } : null,
        fields: (op.fields ?? []).map((field) => ({ column: field.column, value: field.value })),
      })),
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
  if (body.kind === "proxy") {
    return { kind: "proxy", target: body.target };
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
    /** @type {{ kind: string, client: boolean, name?: string | null, children: unknown[], events?: object[] }} */
    const out = {
      kind: "island",
      client: true,
      children: (node.children ?? []).map(canonicalizeUiNode),
    };
    if (node.name) out.name = String(node.name);
    if (node.events?.length) {
      out.events = node.events.map((e) => ({ name: e.name, action: e.action }));
    }
    return out;
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
