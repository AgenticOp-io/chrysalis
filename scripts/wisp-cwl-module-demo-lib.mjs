/** WISP module demo HTML — Phase 32 complete POC surfaces (no empty shells). */
import { titleFromHttpPath, listGetUiPaths } from "./wisp-cwl-bulk-lift-lib.mjs";
import { buildWispModuleHtmlPageBlock } from "./wisp-cwl-ui-parity-lib.mjs";
import { groupHubOperatorDocsByCategory, sortedHubOperatorDocCategories } from "./hub-operator-docs.mjs";

const WISP_HUB_DOCS_BASE =
  process.env.CHRYSALIS_HUB_DOCS_BASE ??
  (process.env.CHRYSALIS_HUB_PUBLIC_HOST
    ? `https://${process.env.CHRYSALIS_HUB_PUBLIC_HOST}`
    : "https://hub.agenticop.io");

/** Routes with dedicated parity HTML (Phase 30/30b) — never replace. */
export const WISP_MODULE_DEMO_SKIP_PATHS = new Set([
  "/login",
  "/dashboard",
  "/modules/plan",
  "/modules/deploy",
  "/modules/coverage-map",
]);

/** @param {string} s */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string} httpPath */
export function inferWispModuleApiPath(httpPath) {
  const p = httpPath.replace(/\/$/, "");
  const map = [
    ["/modules/inventory", "/api/inventory"],
    ["/modules/customers", "/api/customers"],
    ["/modules/monitor", "/api/monitoring"],
    ["/modules/monitoring", "/api/monitoring/graphs"],
    ["/modules/hss-management", "/api/hss"],
    ["/modules/work-orders", "/api/work-orders"],
    ["/modules/deploy", "/api/deploy"],
    ["/modules/plan", "/api/plans"],
    ["/modules/billing", "/api/customer-billing"],
    ["/modules/maintain", "/api/maintain"],
    ["/modules/voice-telephony", "/api/voice"],
    ["/modules/hardware", "/api/inventory"],
    ["/modules/sites", "/api/network"],
    ["/modules/pci-resolution", "/api/network"],
    ["/modules/help-desk", "/api/maintain"],
    ["/modules/tenant-management", "/api/tenants"],
    ["/modules/user-management", "/api/users"],
    ["/modules/acs-cpe-management", "/api/snmp"],
    ["/modules/backend-management", "/api/admin"],
    ["/modules/cbrs-management", "/api/network"],
    ["/modules/customers/portal", "/api/customers"],
  ];
  for (const [prefix, api] of map) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return api;
  }
  if (p.startsWith("/admin")) return "/api/admin";
  if (p.startsWith("/docs")) return null;
  if (p.startsWith("/modules/")) {
    const seg = p.split("/")[2];
    if (seg) return `/api/${seg.replace(/-/g, "")}`;
  }
  return null;
}

/** @param {string} httpPath */
export function inferWispModuleDemoLayout(httpPath) {
  if (httpPath.startsWith("/docs")) return "docs";
  if (httpPath.includes("/portal/")) return "portal";
  if (/\/(add|edit|new|signup|setup|onboarding|reset-password)$/.test(httpPath)) return "form";
  if (httpPath === "/help" || httpPath.startsWith("/help")) return "docs";
  if (httpPath === "/demo") return "dashboard";
  return "list";
}

/** @param {string} httpPath */
export function buildWispModuleDemoDescription(httpPath) {
  const title = titleFromHttpPath(httpPath);
  if (httpPath.startsWith("/modules/customers/portal")) {
    return "Customer self-service portal — tickets, billing, knowledge base, and live chat.";
  }
  if (httpPath.startsWith("/modules/acs-cpe-management")) {
    return "TR-069 ACS / CPE management — devices, firmware, faults, and monitoring graphs.";
  }
  if (httpPath.startsWith("/admin")) {
    return "Platform administration — tenants, billing, and system configuration.";
  }
  if (httpPath.startsWith("/docs")) {
    return "Operator documentation — WISP demo surfaces + Chrysalis Migration OS library.";
  }
  if (httpPath === "/help") {
    return "Help — WISP operational guide and links to the full Chrysalis documentation library.";
  }
  return `Operational workspace for ${title} — native CWL handlers with live API integration.`;
}

/** @param {string} httpPath @param {string} layout */
function buildDemoToolbar(httpPath, layout) {
  if (layout === "docs") return "";
  const parts = httpPath.split("/").filter(Boolean);
  const actions = ['<button type="button" class="wisp-demo-btn" data-action="refresh">Refresh</button>'];
  if (layout === "list" && !httpPath.includes(":id")) {
    const addPath = `${httpPath.replace(/\/$/, "")}/add`;
    if (!httpPath.endsWith("/add")) {
      actions.push(`<a class="wisp-demo-btn primary" href="${esc(addPath)}">Add new</a>`);
    }
  }
  if (parts[0] === "modules" && parts.length === 2) {
    actions.push(`<a class="wisp-demo-btn" href="/help">Help</a>`);
  }
  actions.push('<button type="button" class="wisp-demo-btn" data-action="back">← Dashboard</button>');
  return `<div class="wisp-demo-toolbar">${actions.join("")}</div>`;
}

/** @param {string} httpPath */
function buildDemoStats(httpPath) {
  const seed = httpPath.length * 17;
  const online = 120 + (seed % 80);
  const alerts = seed % 12;
  const pending = (seed % 25) + 3;
  return `<div class="wisp-demo-stats">
  <article class="wisp-demo-stat"><strong>${online}</strong><span>Active records</span></article>
  <article class="wisp-demo-stat"><strong>${alerts}</strong><span>Open alerts</span></article>
  <article class="wisp-demo-stat"><strong>${pending}</strong><span>Pending tasks</span></article>
</div>`;
}

/** @param {string} docId @param {string} label */
function hubGuideLink(docId, label) {
  const href = `${WISP_HUB_DOCS_BASE}/#/guide?doc=${encodeURIComponent(docId)}`;
  return `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

/** @param {string} httpPath */
function buildWispHubDocIndexHtml() {
  const groups = groupHubOperatorDocsByCategory();
  const hubGuide = `${WISP_HUB_DOCS_BASE}/#/guide`;
  const parts = [
    `<div class="wisp-docs-library">`,
    `<div class="wisp-docs-library-head">`,
    `<p class="wisp-docs-library-lead">Browse on this page or open the full reader on the Translation Hub.</p>`,
    `<a class="wisp-docs-hub-cta" href="${esc(hubGuide)}" target="_blank" rel="noopener">Open full library in Translation Hub</a>`,
    `</div>`,
  ];
  for (const category of sortedHubOperatorDocCategories(groups)) {
    const docs = groups[category];
    parts.push(`<details class="wisp-docs-category" open>`);
    parts.push(`<summary><span>${esc(category)}</span><span class="wisp-docs-count">${docs.length}</span></summary>`);
    parts.push(`<div class="wisp-docs-grid">`);
    for (const doc of docs) {
      parts.push(
        `<a class="wisp-docs-card" href="${esc(`${WISP_HUB_DOCS_BASE}/#/guide?doc=${encodeURIComponent(doc.id)}`)}" target="_blank" rel="noopener">` +
          `<span class="wisp-docs-card-title">${esc(doc.title)}</span>` +
          `<span class="wisp-docs-card-meta">${esc(category)}</span>` +
          `</a>`,
      );
    }
    parts.push(`</div></details>`);
  }
  parts.push(`</div>`);
  return parts.join("\n");
}

/** @param {string} httpPath */
function buildWispDocsQuickCards() {
  return `<div class="wisp-docs-quick-grid">
  <a class="wisp-docs-quick-card" href="/docs/getting-started">
    <span class="wisp-docs-quick-label">Getting started</span>
    <span class="wisp-docs-quick-desc">Install Chrysalis and run your first verify loop</span>
  </a>
  <a class="wisp-docs-quick-card" href="/docs/deployment">
    <span class="wisp-docs-quick-label">Deployment</span>
    <span class="wisp-docs-quick-desc">GCE hub deploy, WISP chimera, operator refresh</span>
  </a>
  <a class="wisp-docs-quick-card" href="/docs/reference/project-status">
    <span class="wisp-docs-quick-label">Project status</span>
    <span class="wisp-docs-quick-desc">Maintenance queue and honest product gaps</span>
  </a>
  <a class="wisp-docs-quick-card" href="${esc(`${WISP_HUB_DOCS_BASE}/#/guide?doc=migration-os`)}" target="_blank" rel="noopener">
    <span class="wisp-docs-quick-label">Migration OS</span>
    <span class="wisp-docs-quick-desc">Primary operator entry on the Translation Hub</span>
  </a>
</div>`;
}

/** @param {string} httpPath */
function buildWispDocsSectionContent(httpPath) {
  const section = httpPath.split("/").pop() || "overview";
  const blurbs = {
    help: null,
    docs: null,
    "getting-started": "Install Chrysalis, run your first ingest/emit/verify loop, and try the tiny-blog fixture.",
    deployment: "CI patterns, GCE hub deploy (<code>deploy:hub-demo</code>), WISP chimera (<code>wisp:deploy:gce</code>), and production dual-stack routing.",
    reference: "CLI reference, environment variables, gates, and operator reports.",
    "project-status": "Program status, maintenance queue, and honest gaps (census 601/601 oracle-product; depth beyond trace replay remains).",
  };
  if (httpPath === "/help") {
    return `<div class="wisp-docs-body">
  <section class="wisp-docs-hero">
    <p class="wisp-docs-eyebrow">WISP Management · GCE demo</p>
    <h2>WISP Management Help</h2>
    <p class="wisp-docs-lead">Pure CWL chimera with native API handlers. Operational modules integrate with the HSS backend when configured.</p>
  </section>
  <section class="wisp-docs-section">
    <h3 class="wisp-docs-section-title">Quick start</h3>
    ${buildWispDocsQuickCards()}
  </section>
  <section class="wisp-docs-section wisp-docs-section-split">
    <div class="wisp-docs-panel">
      <h3 class="wisp-docs-section-title">This deployment</h3>
      <ul class="wisp-docs-checklist">
        <li>Session auth via Firebase or CWL session preview</li>
        <li>Native CWL API handlers; HSS at <code>https://hss.wisptools.io</code> when proxied</li>
        <li>Plan, Deploy, and Coverage Map — ArcGIS charter surfaces</li>
        <li>Verify: <code>pnpm run wisp:verify:demo -- --base-url http://HOST:19100</code></li>
      </ul>
      <p class="wisp-docs-inline-links"><a href="/dashboard">Dashboard</a> · <a href="/login">Login</a> · <a href="/docs">Documentation home</a></p>
    </div>
    <div class="wisp-docs-panel wisp-docs-panel-accent">
      <h3 class="wisp-docs-section-title">Demo shortcuts</h3>
      <ul class="wisp-docs-linklist">
        <li><a href="/docs/getting-started">Getting started</a></li>
        <li><a href="/docs/deployment">Deployment &amp; refresh</a></li>
        <li><a href="/docs/reference/project-status">Project status</a></li>
      </ul>
    </div>
  </section>
  <section class="wisp-docs-section">
    <h3 class="wisp-docs-section-title">Chrysalis operator library</h3>
    ${buildWispHubDocIndexHtml()}
  </section>
</div>`;
  }
  if (httpPath === "/docs" || httpPath === "/docs/") {
    return `<div class="wisp-docs-body">
  <section class="wisp-docs-hero">
    <p class="wisp-docs-eyebrow">Documentation</p>
    <h2>Operator documentation</h2>
    <p class="wisp-docs-lead">Migration OS, CLI, Translation Hub, governance, and WISP showcase programs.</p>
    <p class="wisp-docs-inline-links"><a href="/help">Help home</a> · <a href="/dashboard">Dashboard</a></p>
  </section>
  <section class="wisp-docs-section">
    <h3 class="wisp-docs-section-title">Topics on this demo</h3>
    ${buildWispDocsQuickCards()}
  </section>
  <section class="wisp-docs-section">
    <h3 class="wisp-docs-section-title">Full library</h3>
    ${buildWispHubDocIndexHtml()}
  </section>
</div>`;
  }
  const blurb = blurbs[section] ?? `Section <code>${esc(section)}</code> — see the Translation Hub for the full markdown guide.`;
  const docIdMap = {
    "getting-started": "installation",
    deployment: "deployment",
    reference: section === "project-status" ? "paused-and-maintenance" : "docs-index",
    "project-status": "paused-and-maintenance",
  };
  const hubId = docIdMap[section] ?? "docs-index";
  return `<div class="wisp-docs-body wisp-docs-body-article">
  <section class="wisp-docs-hero wisp-docs-hero-compact">
    <p class="wisp-docs-eyebrow"><a href="/docs">Documentation</a></p>
    <h2>${esc(titleFromHttpPath(httpPath))}</h2>
    <p class="wisp-docs-lead">${blurb}</p>
  </section>
  <section class="wisp-docs-section">
    <a class="wisp-docs-hub-cta" href="${esc(`${WISP_HUB_DOCS_BASE}/#/guide?doc=${encodeURIComponent(hubId)}`)}" target="_blank" rel="noopener">Read full guide on Translation Hub</a>
    <p class="wisp-docs-inline-links"><a href="/docs">← Documentation home</a> · <a href="/help">Help</a></p>
  </section>
</div>`;
}

/** @param {string} httpPath @param {string} layout */
function buildDemoBodyContent(httpPath, layout) {
  const title = titleFromHttpPath(httpPath);
  if (layout === "docs") {
    if (httpPath === "/help" || httpPath.startsWith("/docs")) {
      return buildWispDocsSectionContent(httpPath);
    }
    const section = httpPath.split("/").pop() || "overview";
    return `<article class="wisp-demo-docs">
  <h2>${esc(title)}</h2>
  <p>This deployment runs <strong>pure CWL</strong> (chimera + runtime-cwl) with native API handlers. Use the dashboard to open operational modules.</p>
  <ul>
    <li>Session auth via Firebase or CWL session preview</li>
    <li>API routes proxied to HSS backend when configured</li>
    <li>Plan / Deploy / Coverage Map use ArcGIS MapView charter</li>
  </ul>
  <p class="wisp-demo-docs-section">Section: <code>${esc(section)}</code> — <a href="/help">full help index</a></p>
</article>`;
  }
  if (layout === "form") {
    return `<form class="wisp-demo-form" id="wisp-demo-form">
  <div class="wisp-demo-field"><label>Name</label><input name="name" type="text" placeholder="${esc(title)} entry" required /></div>
  <div class="wisp-demo-field"><label>Notes</label><textarea name="notes" rows="4" placeholder="Optional notes"></textarea></div>
  <div class="wisp-demo-field"><label>Status</label><select name="status"><option>Active</option><option>Pending</option><option>Archived</option></select></div>
  <button type="submit" class="wisp-demo-btn primary">Save</button>
</form>`;
  }
  if (layout === "portal") {
    return `<div class="wisp-demo-portal">
  <nav class="wisp-demo-portal-nav">
    <a href="/modules/customers/portal/dashboard">Dashboard</a>
    <a href="/modules/customers/portal/tickets">Tickets</a>
    <a href="/modules/customers/portal/billing">Billing</a>
    <a href="/modules/customers/portal/knowledge">Knowledge</a>
  </nav>
  <section class="wisp-demo-portal-body">
    <h2>${esc(title)}</h2>
    <p>Customer portal surface — demo content wired to native CWL API.</p>
    <table class="wisp-demo-table" id="wisp-demo-table"><tbody><tr><td colspan="4">Loading portal data…</td></tr></tbody></table>
  </section>
</div>`;
  }
  return `${buildDemoStats(httpPath)}
<table class="wisp-demo-table" id="wisp-demo-table" aria-label="${esc(title)} data">
  <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Updated</th></tr></thead>
  <tbody><tr><td colspan="4">Loading…</td></tr></tbody>
</table>`;
}

/**
 * @param {string} httpPath
 * @returns {string}
 */
export function buildWispModuleDemoHtml(httpPath) {
  const title = titleFromHttpPath(httpPath);
  const layout = inferWispModuleDemoLayout(httpPath);
  const apiPath = inferWispModuleApiPath(httpPath);
  const pageKey = httpPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+/, "") || "root";
  const apiAttr = apiPath ? ` data-wisp-api="${esc(apiPath)}"` : "";

  if (layout === "docs") {
    return `<div class="wisp-docs-shell wisp-demo-content" data-wisp-page="${esc(pageKey)}" data-wisp-path="${esc(httpPath)}" data-cwl-island="client" data-wisp-layout="docs">
  <header class="wisp-docs-topbar">
    <nav class="wisp-docs-crumb" aria-label="Documentation">
      <a href="/dashboard">Dashboard</a>
      <span aria-hidden="true">/</span>
      <a href="/help">Help</a>
      <span aria-hidden="true">/</span>
      <span>${esc(title)}</span>
    </nav>
  </header>
  <main class="wisp-docs-main">
    ${buildDemoBodyContent(httpPath, layout)}
  </main>
</div>`;
  }

  return `<div class="wisp-module-demo wisp-demo-content" data-wisp-page="${esc(pageKey)}" data-wisp-path="${esc(httpPath)}" data-cwl-island="client" data-wisp-layout="${layout}"${apiAttr}>
  <header class="wisp-demo-header">
    <h1>${esc(title)}</h1>
    <p class="wisp-demo-desc">${esc(buildWispModuleDemoDescription(httpPath))}</p>
    ${buildDemoToolbar(httpPath, layout)}
  </header>
  <section class="wisp-demo-panel">
    ${buildDemoBodyContent(httpPath, layout)}
  </section>
  <footer class="wisp-demo-api-status" id="wisp-demo-api-status" aria-live="polite">Ready</footer>
</div>`;
}

/** @param {string} block @param {string} [httpPath] */
export function routeBlockNeedsModuleDemo(block, httpPath = "") {
  if (!block) return true;
  if (
    (httpPath === "/help" || httpPath.startsWith("/docs")) &&
    !/\bwisp-docs-shell\b/.test(block)
  ) {
    return true;
  }
  if (/\bwisp-demo-content\b/.test(block) && !/<main class="wisp-surface-body">\s*<\/main>/.test(block)) {
    if (httpPath === "/modules/monitor" && /Redirecting to Monitoring/.test(block)) return true;
    return false;
  }
  if (httpPath.startsWith("/docs") && !/\bwisp-demo-content\b/.test(block)) return true;
  if (httpPath === "/modules/monitor") return true;
  if (/<main class="wisp-surface-body">\s*<\/main>/.test(block)) return true;
  if (/\bwisp-app-surface\b/.test(block) && !/\bwisp-demo-content\b/.test(block)) return true;
  if (/<svelte:head>/.test(block)) return true;
  return false;
}

/** @param {string} httpPath */
export function buildWispMonitorRedirectDemoHtml(httpPath = "/modules/monitor") {
  return `<div class="wisp-module-demo wisp-demo-content" data-wisp-page="modules_monitor" data-wisp-path="${httpPath.replace(/"/g, "")}" data-cwl-island="client" data-wisp-layout="docs">
  <header class="wisp-demo-header"><h1>Monitor</h1></header>
  <article class="wisp-demo-docs"><p>Redirecting to <a href="/modules/monitoring">Monitoring</a>…</p></article>
  <script>location.replace("/modules/monitoring");</script>
</div>`;
}

/** @param {string} routesText */
export function collectMissingModuleAddPaths(routesText) {
  const existing = new Set(listGetUiPaths(routesText));
  /** @type {Set<string>} */
  const linked = new Set();
  for (const m of routesText.matchAll(/href=\\?"(\/(?:modules|admin)(?:\/[^"\\]+)*\/add)\\?"/g)) {
    linked.add(m[1]);
  }
  return [...linked].filter((p) => !existing.has(p)).sort();
}

/** @param {string} httpPath */
export function buildWispModuleAddRouteBlock(httpPath) {
  const pageName = `${httpPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+/, "") || "root"}_page`;
  // D6369 / G9480: explicit hole — never invent demo form HTML for missing +page.svelte
  const safePath = httpPath.replace(/"/g, "'");
  const html = `<div class="cwl-markup-hole" data-cwl-hole="legacy:markup-no-source-route" data-cwl-hole-detail="missing +page.svelte for ${safePath}" data-cwl-route="${safePath}"></div>`;
  const apiPath = inferWispModuleApiPath(httpPath);
  const loadMeta = apiPath
    ? `{ source: "markup-no-source", path: "${httpPath}", apiPath: "${apiPath}" }`
    : `{ source: "markup-no-source", path: "${httpPath}" }`;
  return buildWispModuleHtmlPageBlock(httpPath, pageName, html, loadMeta);
}

/**
 * Append CWL @page routes for every list-page "Add new" link that would otherwise fall through to SvelteKit.
 * @param {string} routesText
 */
export function ensureWispModuleAddRoutes(routesText) {
  const missing = collectMissingModuleAddPaths(routesText);
  let text = routesText;
  /** @type {string[]} */
  const added = [];
  for (const httpPath of missing) {
    text = `${text.trimEnd()}\n\n${buildWispModuleAddRouteBlock(httpPath)}\n`;
    added.push(httpPath);
  }
  return { ok: true, text, added, missing, addRouteCount: added.length };
}

const WISP_POC_API_USER_TENANTS_STUB = `@route GET "/api/user-tenants/tenant/:tenantId"
handler wisp_api_user_tenants_tenant_get {
  # POC stub — Firebase tenant store (legacy Svelte client contract)
  effects: session;
  use auth bearer;
  return "{\\"ok\\":true,\\"surface\\":\\"wisp-api-native\\",\\"resource\\":\\"user-tenants\\",\\"op\\":\\"get\\",\\"tenant\\":{\\"id\\":\\"demo\\",\\"name\\":\\"WISPTools Demo ISP\\",\\"status\\":\\"active\\"}}";
}`;

/** @param {string} apiProxyText */
export function ensureWispPocApiStubs(apiProxyText) {
  if (apiProxyText.includes("/api/user-tenants/tenant/:tenantId")) {
    return { ok: true, text: apiProxyText, patched: false };
  }
  const needle = '@route ANY "/api/*"';
  const idx = apiProxyText.indexOf(needle);
  if (idx < 0) return { ok: false, text: apiProxyText, patched: false, skip: "missing-api-catchall" };
  const text = `${apiProxyText.slice(0, idx).trimEnd()}\n\n${WISP_POC_API_USER_TENANTS_STUB}\n\n${apiProxyText.slice(idx)}`;
  return { ok: true, text, patched: true };
}
