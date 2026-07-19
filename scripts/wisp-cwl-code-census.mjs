#!/usr/bin/env node
/**
 * Deterministic source-behavior census for the WISP Svelte -> CWL conversion.
 * Uses conservative regexes plus balanced-delimiter extraction; no dependencies.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runBlindSpotAudit } from "./lib/cwl-blind-spot-audit.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SOURCE = resolve(REPO, "..", "..", "products", "wisptools", "Module_Manager", "src");
const DEFAULT_EXPORT = join(REPO, "fixtures", "hub-wisp-management", "cwl-static-export");
const DEFAULT_OUT = join(REPO, "reports", "wisp", "wisp-code-census.json");
const SAMPLE_ROUTES = [
  "/modules/deploy", "/modules/plan", "/modules/inventory", "/modules/hardware",
  "/modules/sites", "/modules/customers", "/modules/work-orders", "/modules/billing",
  "/modules/monitoring", "/modules/hss-management", "/modules/user-management",
  "/modules/help-desk", "/modules/voice-telephony", "/modules/cbrs-management",
  "/modules/pci-resolution", "/dashboard", "/login", "/modules",
];

function slash(value) {
  return value.replace(/\\/g, "/");
}

function walk(dir, accept, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, accept, out);
    else if (accept(path)) out.push(path);
  }
  return out;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function compact(value, limit = 500) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function matchingClose(source, openIndex, open = "(", close = ")") {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === open) depth += 1;
    if (ch === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function attributeExpression(source, start) {
  let cursor = start;
  while (/\s/.test(source[cursor] || "")) cursor += 1;
  if (source[cursor] === "{") {
    const end = matchingClose(source, cursor, "{", "}");
    return { expression: end >= 0 ? source.slice(cursor + 1, end) : "", end: end >= 0 ? end : cursor };
  }
  const quoted = source[cursor];
  if (quoted === "'" || quoted === '"') {
    const end = source.indexOf(quoted, cursor + 1);
    return { expression: end >= 0 ? source.slice(cursor + 1, end) : "", end: end >= 0 ? end : cursor };
  }
  const end = source.slice(cursor).search(/[\s>]/);
  return { expression: source.slice(cursor, end < 0 ? undefined : cursor + end), end: end < 0 ? source.length : cursor + end };
}

function routeFor(file, routesDir) {
  const rel = slash(relative(routesDir, dirname(file)));
  if (!rel || rel === ".") return "/";
  return `/${rel}`.replace(/\/+/g, "/");
}

function exportFileFor(route, exportDir) {
  return route === "/" ? join(exportDir, "index.html") : join(exportDir, ...route.split("/").filter(Boolean), "index.html");
}

/** Map a Svelte `[param]` route onto the static-export preview path shapes. */
function previewRouteCandidates(route) {
  if (!/\[[^\]]+\]/.test(route)) return [];
  return [
    route.replace(/\[[^\]]+\]/g, "preview"),
    route.replace(/\[tenantId\]/g, "preview-tenant").replace(/\[[^\]]+\]/g, "preview"),
    route.replace(/\/\[[^\]]+\]\/edit$/, "/preview/edit").replace(/\/\[[^\]]+\]$/, "/preview"),
  ].filter((r, i, arr) => arr.indexOf(r) === i && r !== route);
}

/** Static preview path used when Firebase/GCE cannot host a dynamic [param] segment. */
function previewExportFor(route, exportDir) {
  for (const candidate of previewRouteCandidates(route)) {
    const file = exportFileFor(candidate, exportDir);
    if (existsSync(file)) return file;
  }
  return null;
}

const DETAIL_ROUTER_RULES = [
  /^\/modules\/inventory\/[^/]+(?:\/edit)?$/,
  /^\/modules\/work-orders\/[^/]+(?:\/edit)?$/,
  /^\/modules\/customers\/[^/]+(?:\/edit)?$/,
  /^\/modules\/sites\/[^/]+(?:\/edit)?$/,
  /^\/modules\/help-desk\/[^/]+(?:\/edit)?$/,
  /^\/modules\/hardware\/[^/]+$/,
  /^\/portal\/[^/]+$/,
];

function dynamicRouteCovered(route, exportDir) {
  if (!/\[[^\]]+\]/.test(route)) return false;
  if (previewExportFor(route, exportDir)) return true;
  // Match the concrete path shape that the Firebase 404 router handles.
  const concrete = route.replace(/\[[^\]]+\]/g, "x");
  return DETAIL_ROUTER_RULES.some((re) => re.test(concrete));
}

function classifyLifecycle(body) {
  const classes = [];
  if (/\bgoto\s*\(/.test(body)) classes.push("redirect");
  // Auth/session accessors on redirect/guard pages (root page, OAuth callbacks,
  // portal entry) are not page-data loads — they read the current session and
  // then navigate. Strip them before the data-load probe so those pages classify
  // as pure redirects instead of falsely demanding hydration holes.
  const dataBody = body
    .replace(
      /\b(?:authService|customerAuthService|auth|adminService)\.(?:getCurrentUser|getCurrentCustomer|getUser|getIdToken|getSession|onAuthStateChang(?:e|ed)|currentUser|isAuthenticated)\s*\([^)]*\)/g,
      "",
    )
    .replace(/\bhandleGoogleCallback\s*\([^)]*\)/g, "");
  if (/\bfetch\s*\(|\baxios(?:\.|\s*\()|(?:\w*Service|api|backendClient)\.[A-Za-z_$][\w$]*\s*\(|\bload[A-Z]\w*\s*\(/.test(dataBody)) classes.push("data-load");
  if (/\bsetInterval\s*\(|\.subscribe\s*\(|addEventListener\s*\(|\bsetTimeout\s*\(/.test(body)) classes.push("subscription/interval");
  if (/\bdocument\.|\bwindow\.|querySelector\s*\(|getElementById\s*\(|MutationObserver|ResizeObserver|IntersectionObserver/.test(body)) classes.push("DOM-setup");
  if (!classes.length) classes.push("other");
  return classes;
}

function handlerName(expression) {
  const value = expression.trim();
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?$/.test(value)) return value;
  const called = value.match(/(?:=>\s*)?(?:\{[\s\S]*?)?\b([A-Za-z_$][\w$]*)\s*\(/);
  return called ? called[1] : value.includes("=>") ? "(inline-arrow)" : "(inline-expression)";
}

function literalArgument(args) {
  const match = args.match(/^\s*(['"`])([\s\S]*?)\1/);
  return match ? match[2] : compact(args.split(",")[0], 160) || "(dynamic)";
}

function inferMethod(name) {
  if (/^(get|list|load|fetch|find|search|check|validate|count)/i.test(name)) return "GET";
  if (/^(create|add|save|submit|send|login|signup|authorize|deploy|upload|import)/i.test(name)) return "POST";
  if (/^(update|edit|set|mark|assign|approve|reject|activate|deactivate|toggle)/i.test(name)) return "PATCH/PUT";
  if (/^(delete|remove|clear|destroy|revoke)/i.test(name)) return "DELETE";
  return "UNKNOWN";
}

function scanCalls(source, file) {
  const rows = [];
  const occupiedApiStrings = [];
  for (const match of source.matchAll(/\bfetch\s*\(/g)) {
    const open = source.indexOf("(", match.index);
    const close = matchingClose(source, open);
    const args = close >= 0 ? source.slice(open + 1, close) : "";
    const option = args.match(/\bmethod\s*:\s*['"`]([A-Za-z]+)['"`]/i);
    rows.push({ file, line: lineAt(source, match.index), kind: "fetch", callee: "fetch", endpoint: literalArgument(args), method: (option?.[1] || "GET").toUpperCase() });
    occupiedApiStrings.push([match.index, close >= 0 ? close : match.index]);
  }
  for (const match of source.matchAll(/\baxios(?:\.([A-Za-z]+))?\s*\(/g)) {
    const open = source.indexOf("(", match.index);
    const close = matchingClose(source, open);
    const args = close >= 0 ? source.slice(open + 1, close) : "";
    const named = match[1]?.toUpperCase();
    const configMethod = args.match(/\bmethod\s*:\s*['"`]([A-Za-z]+)['"`]/i)?.[1]?.toUpperCase();
    rows.push({ file, line: lineAt(source, match.index), kind: "axios", callee: match[0].replace(/\s*\($/, ""), endpoint: literalArgument(args), method: named || configMethod || "UNKNOWN" });
  }
  const serviceRe = /\b((?:[A-Za-z_$][\w$]*(?:Service|Api|API)|api|backendClient))\.([A-Za-z_$][\w$]*)\s*\(/g;
  for (const match of source.matchAll(serviceRe)) {
    const open = source.indexOf("(", match.index);
    const close = matchingClose(source, open);
    const args = close >= 0 ? source.slice(open + 1, close) : "";
    rows.push({
      file,
      line: lineAt(source, match.index),
      kind: "service",
      callee: `${match[1]}.${match[2]}`,
      endpoint: literalArgument(args),
      method: inferMethod(match[2]),
    });
  }
  for (const match of source.matchAll(/(['"`])(\/api\/[^'"`\s${}]+)\1/g)) {
    if (occupiedApiStrings.some(([start, end]) => match.index >= start && match.index <= end)) continue;
    rows.push({ file, line: lineAt(source, match.index), kind: "api-string", callee: "(endpoint literal)", endpoint: match[2], method: "UNKNOWN" });
  }
  return rows;
}

function scanReactive(source, file) {
  const rows = [];
  for (const match of source.matchAll(/(^|\n)([ \t]*)\$:\s*/g)) {
    const start = match.index + match[0].length;
    let body = "";
    if (source[start] === "{") {
      const close = matchingClose(source, start, "{", "}");
      body = close >= 0 ? source.slice(start + 1, close) : source.slice(start);
    } else {
      body = source.slice(start, source.indexOf("\n", start) < 0 ? undefined : source.indexOf("\n", start));
    }
    const behavioral = /\bgoto\s*\(|\bfetch\s*\(|\bsetTimeout\s*\(|\bsetInterval\s*\(|\.subscribe\s*\(|(?:\w*Service|api)\.\w+\s*\(|\bload[A-Z]\w*\s*\(|\bshow\w*\s*=|\bdispatch\s*\(/.test(body);
    if (behavioral) rows.push({ file, line: lineAt(source, match.index), body: compact(body), classification: classifyLifecycle(body) });
  }
  return rows;
}

function importMap(source) {
  const map = new Map();
  const re = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+\.svelte)['"]/g;
  for (const match of source.matchAll(re)) map.set(match[1], match[2]);
  return map;
}

/** Layout components intentionally unwrapped by the converter (not shells). */
const PASSTHROUGH_COMPONENTS = new Set(["TenantGuard"]);

/**
 * Every PascalCase component rendered by this file, with its import path when
 * known — deeper than the Modal/Wizard-only census (modals/help audit).
 */
function renderedComponents(source, file) {
  const rows = [];
  const imports = importMap(source);
  const seen = new Set();
  // Markup only — `<PlanProject` inside TS generics (`Array<PlanProject>`) is a type.
  const markup = source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  for (const match of markup.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)) {
    const name = match[1];
    if (seen.has(name) || PASSTHROUGH_COMPONENTS.has(name)) continue;
    seen.add(name);
    rows.push({
      component: name,
      definition: imports.get(name) || "(unresolved-import)",
      renderedIn: file,
      line: lineAt(source, match.index),
    });
  }
  return rows;
}

/** Inner HTML of a lifted component wrapper via balanced <div> scanning. */
function liftedShellBody(html, name) {
  const marker = `data-cwl-lifted-component="${name}"`;
  let at = html.indexOf(marker);
  if (at < 0) return null;
  const open = html.indexOf(">", at);
  if (open < 0) return null;
  let depth = 1;
  const tagRe = /<div\b|<\/div>/g;
  tagRe.lastIndex = open + 1;
  let m;
  while ((m = tagRe.exec(html))) {
    depth += m[0] === "<div" ? 1 : -1;
    if (depth === 0) return html.slice(open + 1, m.index);
  }
  return html.slice(open + 1);
}

/** Docs imports (`$lib/docs/x-docs`) rendered as help content on this page. */
function helpDocsImports(source) {
  const rows = [];
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]\$lib\/docs\/([^'"]+)['"]/g)) {
    const names = match[1].split(",").map((n) => n.replace(/^\s*type\s+/, "").trim()).filter(Boolean);
    rows.push({ names, module: match[2] });
  }
  return rows;
}

function modalUsages(source, file) {
  const rows = [];
  const imports = importMap(source);
  for (const [name, importPath] of imports) {
    if (!/(Modal|Wizard)$/.test(name)) continue;
    const rendered = new RegExp(`<${name}\\b`, "g");
    let found = false;
    for (const match of source.matchAll(rendered)) {
      found = true;
      const tagEnd = source.indexOf(">", match.index);
      const tag = source.slice(match.index, tagEnd < 0 ? match.index + 1000 : tagEnd + 1);
      const prefix = source.slice(Math.max(0, match.index - 300), match.index);
      const state =
        tag.match(/(?:bind:show|show|open|visible)\s*=\s*\{([^}]+)\}/)?.[1]?.trim() ||
        prefix.match(/\{#if\s+([\w$?.]+)/)?.[1] ||
        "(unconditional/unknown)";
      rows.push({ component: name, definition: importPath, renderedIn: file, line: lineAt(source, match.index), stateVariable: state });
    }
    if (!found) rows.push({ component: name, definition: importPath, renderedIn: file, line: null, stateVariable: "(imported-not-rendered)" });
  }
  return rows;
}

function routeCoverage(route, page, exportDir, modalsForFile, lifecycleForFile, componentsForFile = [], docsForFile = [], sourceDir = "") {
  const htmlFile = exportFileFor(route, exportDir);
  const htmlExists = existsSync(htmlFile);
  const previewFile = !htmlExists ? previewExportFor(route, exportDir) : null;
  const html = htmlExists ? readFileSync(htmlFile, "utf8") : previewFile ? readFileSync(previewFile, "utf8") : "";
  const shellPresent = (name) =>
    new RegExp(`data-cwl-(?:lifted-component|modal-shell|wizard-shell)=["']${name}["']`).test(html);
  // When the converter compiles a page into an auth/config redirect shell, the
  // origin's modals/components behind that gate are intentionally not lifted —
  // the page never renders them in this deployment mode.
  const isRedirectShell =
    /data-wisp-page="(?:auth-)?redirect"/.test(html) ||
    (/location\.replace/.test(html) && html.length < 2500 && /Checking authentication|Redirecting/i.test(html));
  const expectedModals = isRedirectShell
    ? []
    : [...new Set(modalsForFile.filter((row) => row.line !== null).map((row) => row.component))].sort();
  const liftedModals = expectedModals.filter((name) => shellPresent(name));
  const missingModals = expectedModals.filter((name) => !liftedModals.includes(name));
  // Deep pass 1 — every rendered component must land as lifted markup, a named
  // shell, an island, or an honest hole marker. Silently absent = census gap.
  const componentCoverage = (isRedirectShell ? [] : componentsForFile).map((row) => {
    const name = row.component;
    let representation = "absent";
    if (new RegExp(`data-cwl-lifted-component=["']${name}["']`).test(html)) representation = "lifted";
    else if (new RegExp(`data-cwl-(?:modal-shell|wizard-shell|component)=["']${name}["']`).test(html)) representation = "shell";
    else if (new RegExp(`data-cwl-hole-detail=["']${name}["']`).test(html)) representation = "hole";
    else if (new RegExp(`data-cwl-island=["'][^"']*${name}`, "i").test(html)) representation = "island";
    return { component: name, definition: row.definition, representation };
  });
  const absentComponents = componentCoverage.filter((row) => row.representation === "absent").map((row) => row.component);
  // Deep pass 2 — lifted shells must carry real markup, not an empty husk.
  const emptyLiftedShells = [];
  for (const row of componentCoverage) {
    if (row.representation !== "lifted" || row.component === "SharedMap") continue;
    // Map/chart components are runtime islands — an empty container is their
    // correct static form (ArcGIS/Chart.js render into it client-side).
    if (/Map|Chart/.test(row.component)) continue;
    const body = liftedShellBody(html, row.component);
    if (body === null) continue;
    const text = body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const hasBindings = /data-cwl-(?:bind|each-tpl|hole)/.test(body);
    const hasControls = /<(?:input|select|textarea|button)\b/i.test(body);
    const hasVisuals = /<(?:h[1-6]|svg|img|iframe|table)\b/i.test(body);
    if (text.length < 40 && !hasBindings && !hasControls && !hasVisuals) emptyLiftedShells.push(row.component);
  }
  // Deep pass 3 — help docs imported by the page must appear in the export.
  const missingHelpDocs = [];
  for (const doc of docsForFile) {
    let docSource = "";
    for (const cand of [`${doc.module}.ts`, doc.module, `${doc.module}.js`]) {
      const abs = join(sourceDir, "lib", "docs", cand);
      if (existsSync(abs)) {
        docSource = readFileSync(abs, "utf8");
        break;
      }
    }
    if (!docSource) continue;
    const heading = docSource.match(/<h3[^>]*>([^<]{4,80})<\/h3>/)?.[1]?.trim();
    const probe = heading || docSource.match(/<h4[^>]*>([^<]{4,80})<\/h4>/)?.[1]?.trim();
    if (!probe) continue;
    if (!html.includes(probe)) missingHelpDocs.push({ module: doc.module, probe });
  }
  const hasDataLoad = lifecycleForFile.some((row) => row.classification.includes("data-load"));
  const hasRedirect = lifecycleForFile.some((row) => row.hook === "onMount" && row.classification.includes("redirect"));
  const hasBindHoles = /data-cwl-bind=/.test(html);
  const hasClientHydration = /data-cwl-island=["']client["']|wisp-cwl-client\.js|data-cwl-hydrat/i.test(html);
  // A feature-gated data page whose loader lives behind an off-by-default flag
  // legitimately renders a coherent terminal state (e.g. "Knowledge Base
  // Unavailable — this tenant has not enabled…"). That is an honest converted
  // state served through a client island, not a dropped data load.
  const rendersTerminalState =
    /not enabled|unavailable|is disabled|feature[- ]disabled|access denied|no results|nothing to show/i.test(html);
  // OAuth callback pages run auth-flow routing in onMount (exchange token, check
  // tenant, then redirect) and render a status card — the work is client-island
  // routing, not list/table data to hydrate into holes.
  const isOAuthCallbackFlow =
    /callback-page|callback-card|handleGoogleCallback/i.test(html) ||
    /handleGoogleCallback|google_auth_return_url|google_auth_state/.test(
      lifecycleForFile.map((row) => row.body).join("\n"),
    );
  // Deployment-config gates: when the origin's onMount checks a build-mode flag
  // (single-tenant / simple-login fork) and unconditionally leaves the page,
  // the exported page must redirect too — otherwise the demo shows dead
  // multitenant UI (tenant selector/setup) the fork removed.
  const onMountBodies = lifecycleForFile
    .filter((row) => row.hook === "onMount")
    .map((row) => row.body)
    .join("\n");
  const hasConfigGatedRedirect =
    /if\s*\(\s*(?:isSingleTenantMode|isSimpleLoginOnly|isSingleUseForkBuild)\s*\(\s*\)[\s\S]{0,400}?goto\(\s*['"`]\//.test(
      onMountBodies,
    );
  const exportRedirects =
    /location\.replace|data-wisp-page="(?:auth-)?redirect"|http-equiv=["']refresh["']/.test(html);
  const hasRedirectExport =
    /http-equiv=["']refresh["']|location\.(?:replace|assign)|window\.location\s*=|onAuthStateChanged/.test(html);
  // Full module pages with client islands often keep conditional goto() for auth
  // or query cleanup — that is not a dead-end redirect shell.
  const looksLikeFullPage =
    htmlExists &&
    (hasClientHydration || hasBindHoles) &&
    html.length > 800 &&
    !/^\s*<div[^>]*>\s*<div[^>]*class="[^"]*redirect/i.test(html) &&
    !/Checking authentication\.\.\./i.test(html);
  // Login-only guards (goto login if !session) are not whole-page redirects.
  const redirectBodies = lifecycleForFile
    .filter((row) => row.hook === "onMount" && row.classification.includes("redirect"))
    .map((row) => row.body)
    .join("\n");
  const loginGuardOnly =
    hasRedirect &&
    /goto\s*\(\s*['"`][^'"`]*login/i.test(redirectBodies) &&
    !/else\s*\{[\s\S]*goto\s*\(/i.test(redirectBodies);
  // Feature-flag / OAuth / localStorage gates are client-island work, not
  // whole-page static redirects.
  const conditionalClientNav =
    hasRedirect &&
    (/ticketsEnabled|onboardingCompleted|tenantSetupCompleted|handleGoogleCallback|google_auth_return_url|returnUrl/.test(
      redirectBodies,
    ) ||
      /data-cwl-wizard-shell|callback-page|create-ticket-page|callback-card/.test(html));
  const dynamicCovered = !htmlExists && dynamicRouteCovered(route, exportDir);
  return {
    sampled: SAMPLE_ROUTES.includes(route),
    htmlFile: slash(relative(exportDir, htmlFile)),
    htmlExists: htmlExists || dynamicCovered,
    dynamicCovered,
    expectedModals,
    liftedModals,
    missingModals,
    componentCoverage,
    absentComponents,
    emptyLiftedShells,
    missingHelpDocs,
    onMountDataLoad: hasDataLoad,
    dataLoadRepresentation: !hasDataLoad
      ? "not-applicable"
      : isRedirectShell
        ? "redirect-supersedes-data-load"
        : hasBindHoles && hasClientHydration
          ? "bind-holes-and-client-hydration"
          : looksLikeFullPage
            ? "client-island-present"
            : hasClientHydration && (rendersTerminalState || isOAuthCallbackFlow)
              ? "client-island-present"
              : "missing",
    onMountRedirect: hasRedirect,
    redirectRepresentation: !hasRedirect
      ? "not-applicable"
      : hasRedirectExport
        ? "static-redirect"
        : looksLikeFullPage || loginGuardOnly || conditionalClientNav
          ? "conditional-client-navigation"
          : "dead-end-static-content",
    missingConfigGatedRedirect: hasConfigGatedRedirect && !exportRedirects,
  };
}

export function runWispCodeCensus(options = {}) {
  const sourceDir = resolve(options.sourceDir || DEFAULT_SOURCE);
  const routesDir = join(sourceDir, "routes");
  const exportDir = resolve(options.exportDir || DEFAULT_EXPORT);
  const outPath = resolve(options.outPath || DEFAULT_OUT);
  const files = [
    ...walk(routesDir, (path) => [".svelte", ".ts"].includes(extname(path))),
    ...walk(join(sourceDir, "lib"), (path) => [".svelte", ".ts"].includes(extname(path))),
  ].sort((a, b) => slash(a).localeCompare(slash(b)));

  const pages = [];
  const lifecycle = [];
  const handlers = [];
  const modals = [];
  const apiCalls = [];
  const stores = [];
  const reactiveState = [];
  const gotoCalls = [];
  const contentByFile = new Map();
  const renderedByFile = new Map();
  const docsByFile = new Map();

  for (const absolute of files) {
    const source = readFileSync(absolute, "utf8");
    const file = slash(relative(sourceDir, absolute));
    contentByFile.set(file, source);
    const pageMatch = basename(absolute).match(/^\+(page|layout)\.svelte$/);
    if (pageMatch) pages.push({ file, kind: pageMatch[1], route: routeFor(absolute, routesDir) });

    for (const hook of ["onMount", "onDestroy"]) {
      const re = new RegExp(`\\b${hook}\\s*\\(`, "g");
      for (const match of source.matchAll(re)) {
        const open = source.indexOf("(", match.index);
        const close = matchingClose(source, open);
        const argument = close >= 0 ? source.slice(open + 1, close) : "";
        lifecycle.push({
          file,
          line: lineAt(source, match.index),
          hook,
          classification: classifyLifecycle(argument),
          body: compact(argument, 1200),
          _start: match.index,
          _end: close >= 0 ? close : match.index,
        });
      }
    }

    const eventRe = /\b(on:([A-Za-z][\w-]*)|on(click|submit|change|input|blur|focus|keydown|keyup|mouseenter|mouseleave|message|load|error|close|select|saved|approved|rejected|visibility-changed|add-equipment))\s*=\s*/g;
    for (const match of source.matchAll(eventRe)) {
      const parsed = attributeExpression(source, match.index + match[0].length);
      handlers.push({
        file,
        line: lineAt(source, match.index),
        event: match[2] || match[3],
        syntax: match[2] ? "on:event" : "onevent",
        handler: handlerName(parsed.expression),
        expression: compact(parsed.expression, 350),
      });
    }

    modals.push(...modalUsages(source, file));
    if (/\+(?:page|layout)\.svelte$/.test(basename(absolute))) {
      renderedByFile.set(file, renderedComponents(source, file));
      docsByFile.set(file, helpDocsImports(source));
    }
    apiCalls.push(...scanCalls(source, file));
    reactiveState.push(...scanReactive(source, file));

    for (const match of source.matchAll(/\b(?:writable|readable)\s*(?:<[^;=()]+>)?\s*\(/g)) {
      const before = source.slice(Math.max(0, match.index - 160), match.index);
      const name = before.match(/(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*$/)?.[1] || "(anonymous)";
      stores.push({ file, line: lineAt(source, match.index), name, storeType: match[0].trim().startsWith("writable") ? "writable" : "readable" });
    }

    for (const match of source.matchAll(/\bgoto\s*\(/g)) {
      const open = source.indexOf("(", match.index);
      const close = matchingClose(source, open);
      const args = close >= 0 ? source.slice(open + 1, close) : "";
      const containingLifecycle = lifecycle.find((row) => row.file === file && match.index >= row._start && match.index <= row._end);
      gotoCalls.push({
        file,
        line: lineAt(source, match.index),
        target: literalArgument(args),
        context: containingLifecycle?.hook || "handler/function",
      });
    }
  }

  const definitions = files
    .filter((file) => file.endsWith(".svelte") && /(Modal|Wizard)\.svelte$/.test(file))
    .map((absolute) => ({
      component: basename(absolute, ".svelte"),
      definition: slash(relative(sourceDir, absolute)),
      renderedIn: null,
      line: null,
      stateVariable: "(component-definition)",
    }));
  const usedDefinitions = new Set(modals.map((row) => row.component));
  modals.push(...definitions.filter((row) => !usedDefinitions.has(row.component)));

  for (const page of pages) {
    const fileModals = modals.filter((row) => row.renderedIn === page.file);
    const fileLifecycle = lifecycle.filter((row) => row.file === page.file);
    page.conversionCoverage = routeCoverage(
      page.route,
      page,
      exportDir,
      fileModals,
      fileLifecycle,
      renderedByFile.get(page.file) || [],
      docsByFile.get(page.file) || [],
      sourceDir,
    );
  }

  const gaps = [];
  // Blind-spot audit: layout side-effects, storage, media queries, global CSS,
  // browser APIs, SDK boots, Svelte context/actions — behavior the route and
  // button censuses historically miss because it is not page markup.
  const fixtureDir = dirname(exportDir);
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const gatewayPath = join(repoRoot, "scripts/lib/cwl-chimera-gateway.mjs");
  const blindSpots = runBlindSpotAudit({
    sourceDir,
    exportDir,
    fixtureDir,
    gatewaySource: existsSync(gatewayPath) ? readFileSync(gatewayPath, "utf8") : "",
  });
  for (const gap of blindSpots.gaps) gaps.push(gap);

  // Theme controls emitted into dashboard must remain handled even when the
  // broader blind-spot family is covered by boot script tokens.
  const clientPath = join(fixtureDir, "wisp-cwl-client.js");
  const clientSource = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";
  const dashboardHtmlPath = exportFileFor("/dashboard", exportDir);
  const dashboardHtml = existsSync(dashboardHtmlPath) ? readFileSync(dashboardHtmlPath, "utf8") : "";
  if (
    /data-cwl-action=["']applyTheme["']/.test(dashboardHtml) &&
    !/apply theme/.test(clientSource)
  ) {
    gaps.push({
      priority: 97,
      file: "lib/components/GlobalSettings.svelte",
      route: "/dashboard",
      kind: "unhandled-theme-controls",
      family: "document-mutation",
      detail: "Light, Dark, and System controls were emitted as applyTheme actions without a runtime handler.",
      suggestedConverterChange:
        "Bind applyTheme arguments to the global theme runtime and retain active/aria-pressed state.",
    });
  }

  const routePages = pages.filter((page) => page.kind === "page");
  for (const page of routePages) {
    const coverage = page.conversionCoverage;
    const sampleBoost = coverage.sampled ? 4 : 0;
    if (!coverage.htmlExists) {
      gaps.push({ priority: 100 + sampleBoost, file: page.file, route: page.route, kind: "missing-static-route", detail: `No exported HTML exists at ${coverage.htmlFile}.`, suggestedConverterChange: "Emit an index.html for every discovered +page.svelte route, including redirect-only routes and a concrete fallback strategy for dynamic [param] routes." });
    }
    if (coverage.redirectRepresentation === "dead-end-static-content") {
      const targets = lifecycle
        .filter((row) => row.file === page.file && row.hook === "onMount" && row.classification.includes("redirect"))
        .flatMap((row) => [...row.body.matchAll(/\bgoto\s*\(\s*([^,)]+)/g)].map((match) => compact(match[1], 100)));
      gaps.push({ priority: 94 + sampleBoost, file: page.file, route: page.route, kind: "missing-onMount-navigation", detail: `onMount contains goto() navigation to ${targets.join(", ") || "another route"}, but export has no page-specific meta refresh/location.replace behavior.`, suggestedConverterChange: "Compile unconditional mount redirects to location.replace (plus meta fallback), and conditional/auth/query cleanup goto() calls into the page client island." });
    }
    if (coverage.missingConfigGatedRedirect) {
      gaps.push({ priority: 93 + sampleBoost, file: page.file, route: page.route, kind: "missing-config-gated-redirect", detail: "onMount checks a deployment-mode flag (single-tenant / simple-login fork) and navigates away, but the export still renders the removed multitenant UI with no redirect.", suggestedConverterChange: "Compile config-mode mount gates (isSingleTenantMode / isSimpleLoginOnly) into a static auth redirect so fork-removed pages leave immediately." });
    }
    if (coverage.missingModals.length) {
      gaps.push({ priority: 88 + sampleBoost + Math.min(4, coverage.missingModals.length), file: page.file, route: page.route, kind: "missing-lifted-components", detail: `Missing lifted modal/wizard shells: ${coverage.missingModals.join(", ")}.`, suggestedConverterChange: "Lift every rendered Modal/Wizard component and preserve its show/open binding and component event wiring." });
    }
    if (coverage.dataLoadRepresentation === "missing") {
      gaps.push({ priority: 92 + sampleBoost, file: page.file, route: page.route, kind: "missing-onMount-data-load", detail: "The page loads data during onMount, but exported HTML lacks both bind holes and client hydration markers.", suggestedConverterChange: "Lift the onMount loader into the generated client island and bind loaded state into data-cwl-bind holes." });
    }
    if (coverage.htmlExists && coverage.absentComponents?.length) {
      gaps.push({ priority: 90 + sampleBoost, file: page.file, route: page.route, kind: "missing-rendered-component", detail: `Rendered components with no lifted markup, shell, island, or hole marker in the export: ${coverage.absentComponents.join(", ")}.`, suggestedConverterChange: "Every PascalCase component rendered by a page must be lifted structurally, emitted as a named shell/island, or stamped with an honest data-cwl-hole marker." });
    }
    if (coverage.emptyLiftedShells?.length) {
      gaps.push({ priority: 89 + sampleBoost, file: page.file, route: page.route, kind: "empty-lifted-shell", detail: `Lifted shells with no text, controls, or bindings inside: ${coverage.emptyLiftedShells.join(", ")}.`, suggestedConverterChange: "Resolve component props (title/content/etc.) at the call site and inline static $lib constants so lifted modal bodies carry the origin markup." });
    }
    if (coverage.missingHelpDocs?.length) {
      gaps.push({ priority: 91 + sampleBoost, file: page.file, route: page.route, kind: "missing-help-content", detail: `Help docs imported by the page are absent from the export: ${coverage.missingHelpDocs.map((d) => `$lib/docs/${d.module} (probe "${d.probe}")`).join("; ")}.`, suggestedConverterChange: "Inline static template-literal docs constants from $lib/docs and pass them through HelpModal content props during the lift." });
    }
  }

  for (const row of reactiveState) {
    const page = pages.find((candidate) => candidate.file === row.file);
    if (!page || !SAMPLE_ROUTES.includes(page.route)) continue;
    const html = page.conversionCoverage.htmlExists ? readFileSync(exportFileFor(page.route, exportDir), "utf8") : "";
    if (!/data-cwl-reactive|data-cwl-island=["']client["']/.test(html)) {
      gaps.push({ priority: 82, file: row.file, route: page.route, kind: "missing-reactive-effect", detail: `Behavioral reactive statement at line ${row.line}: ${row.body}`, suggestedConverterChange: "Compile behavioral $: statements into client-side effects with dependency tracking and cleanup." });
    }
  }

  for (const row of lifecycle.filter((item) => item.hook === "onMount" && item.classification.includes("DOM-setup"))) {
    const page = pages.find((candidate) => candidate.file === row.file);
    if (!page || !SAMPLE_ROUTES.includes(page.route) || !page.conversionCoverage.htmlExists) continue;
    const html = readFileSync(exportFileFor(page.route, exportDir), "utf8");
    if (!/data-cwl-island=["']client["']/.test(html)) {
      gaps.push({ priority: 88, file: row.file, route: page.route, kind: "missing-dom-setup", detail: `DOM setup in onMount at line ${row.line} has no client island.`, suggestedConverterChange: "Retain DOM setup and its cleanup in a generated client island." });
    }
  }

  const sortRows = (rows) => rows.sort((a, b) => String(a.file || a.component).localeCompare(String(b.file || b.component)) || (a.line ?? -1) - (b.line ?? -1) || JSON.stringify(a).localeCompare(JSON.stringify(b)));
  for (const row of lifecycle) {
    delete row._start;
    delete row._end;
  }
  sortRows(pages);
  sortRows(lifecycle);
  sortRows(handlers);
  sortRows(modals);
  sortRows(apiCalls);
  sortRows(stores);
  sortRows(reactiveState);
  sortRows(gotoCalls);
  gaps.sort((a, b) => b.priority - a.priority || a.route.localeCompare(b.route) || a.kind.localeCompare(b.kind));
  gaps.forEach((gap, index) => {
    gap.rank = index + 1;
  });

  const blockingKinds = new Set([
    "missing-static-route",
    "missing-onMount-navigation",
    "missing-config-gated-redirect",
    "missing-lifted-components",
    "missing-help-content",
    "empty-lifted-shell",
    "missing-layout-side-effect",
    "missing-layout-side-effect-import",
    "missing-layout-css-import",
    "missing-global-theme-css",
    "unhandled-theme-controls",
    "missing-storage-key",
  ]);
  // Any high-priority blind-spot family gap is also blocking.
  for (const gap of gaps) {
    if (String(gap.kind || "").startsWith("missing-blind-spot:") && gap.priority >= 90) {
      blockingKinds.add(gap.kind);
    }
  }
  const blockingGaps = gaps.filter(
    (g) => blockingKinds.has(g.kind) || (String(g.kind || "").startsWith("missing-blind-spot:") && g.priority >= 90),
  );
  const summary = {
    pageCount: pages.length,
    lifecycleCount: lifecycle.length,
    handlerCount: handlers.length,
    modalCount: modals.length,
    apiCallCount: apiCalls.length,
    storeCount: stores.length,
    reactiveStateCount: reactiveState.length,
    gotoCallCount: gotoCalls.length,
    gapCount: gaps.length,
    blockingGapCount: blockingGaps.length,
    blockingKinds: [...blockingKinds],
    blindSpot: blindSpots.summary,
  };
  const report = {
    pages,
    lifecycle,
    handlers,
    modals,
    apiCalls,
    stores,
    reactiveState,
    gotoCalls,
    blindSpots: {
      familyCounts: blindSpots.familyCounts,
      sideEffectImports: blindSpots.sideEffectImports,
      storageKeyInventory: blindSpots.storageKeyInventory,
      inventory: blindSpots.inventory,
      hits: blindSpots.hits,
      summary: blindSpots.summary,
    },
    gaps,
    blockingGaps,
    summary,
    ok: blockingGaps.length === 0,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = runWispCodeCensus();
  const redirectFiles = new Set(
    report.lifecycle
      .filter((row) => row.hook === "onMount" && row.classification.includes("redirect"))
      .map((row) => row.file),
  );
  const onMountRedirectPages = report.pages
    .filter((page) => redirectFiles.has(page.file))
    .map((page) => ({ route: page.route, kind: page.kind, file: page.file }));
  console.log(JSON.stringify({
    pages: report.pages.length,
    lifecycle: report.lifecycle.length,
    handlers: report.handlers.length,
    modals: report.modals.length,
    apiCalls: report.apiCalls.length,
    stores: report.stores.length,
    reactiveState: report.reactiveState.length,
    gotoCalls: report.gotoCalls.length,
    gaps: report.gaps.length,
    blockingGaps: report.blockingGaps.length,
    blindSpot: report.summary.blindSpot,
    blindSpotGapSample: report.gaps
      .filter((g) => String(g.kind || "").includes("blind-spot") || String(g.family || ""))
      .filter((g) =>
        /blind-spot|layout-side-effect|layout-css|storage-key|theme-controls/.test(String(g.kind || "")),
      )
      .slice(0, 20)
      .map((g) => ({ kind: g.kind, priority: g.priority, file: g.file, detail: g.detail?.slice(0, 160) })),
    onMountRedirectPages,
    outPath: DEFAULT_OUT,
  }, null, 2));
}
