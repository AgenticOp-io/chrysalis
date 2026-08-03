/** WISP CWL UI parity helpers — Module_Manager look/markup authority (D6442 translate-only). */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolveWispModuleRoot } from "./lib/wisp-origin-paths.mjs";

/** @param {RegExp[]} patterns */
export function htmlContainsForbiddenStub(html, patterns = WISP_FORBIDDEN_STUB_PATTERNS) {
  return patterns.some((re) => re.test(html));
}

export const WISP_FORBIDDEN_STUB_PATTERNS = [
  /Phase 27c/i,
  /Phase 28g/i,
  /Phase 27d/i,
  /hub-svelte:/i,
  /\bcwl-native-ui\b/,
  /Native CWL UI islands/i,
  /Vendor:\s*hub-svelte/i,
  /Interactive widgets remain sidecar/i,
  /ui-hole-note/i,
  /ui-native-note/i,
  /vendor-charter/i,
  /wisp-integration-shell/i,
  /ArcGIS geocode \+ plan map \(Phase 28g/i,
  /ECharts monitoring graphs \(Phase 28g/i,
];

/** @typedef {{ path: string; required: string[]; minLength?: number }} WispUiAnchorSpec */

const require = createRequire(import.meta.url);
const parityLibRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @returns {string} */
function resolveWispRootForParity() {
  return resolveWispModuleRoot(process.env.CHRYSALIS_WISP_ROOT ?? process.env.WISP_MODULE_DIR);
}

/**
 * Lift Module_Manager coverage-map/+page.svelte → HTML with modal/map/nav shells (D6442).
 * @returns {string}
 */
export function liftWispCoverageMapPageHtml() {
  const wispRoot = resolveWispRootForParity();
  const pagePath = join(wispRoot, "src/routes/modules/coverage-map/+page.svelte");
  if (!existsSync(pagePath)) {
    throw new Error(
      `coverage-map/+page.svelte missing under ${wispRoot} — set CHRYSALIS_WISP_ROOT to AgenticOps Module_Manager`,
    );
  }
  /** @type {{ liftStructuralSveltePageHtml: Function, indexSvelteComponentSources: Function, DEFAULT_STRUCTURAL_INLINE_COMPONENTS?: Set<string> }} */
  let ingest;
  try {
    ingest = require("@chrysalis/ingest");
  } catch {
    ingest = require(join(parityLibRoot, "packages/ingest/dist/index.js"));
  }
  const raw = readFileSync(pagePath, "utf8");
  const componentSources = ingest.indexSvelteComponentSources(join(wispRoot, "src"));
  const lifted = ingest.liftStructuralSveltePageHtml(raw, {
    applyShowcaseLoadBools: true,
    componentSources,
    structuralInlineComponents: ingest.DEFAULT_STRUCTURAL_INLINE_COMPONENTS,
    loadBools: {
      // Keep chrome closed via stampClosedUiChrome (do not delete panels).
      isDeployMode: false,
      hideStats: false,
      isLoading: false,
      error: false,
      success: false,
    },
  });
  if (!lifted || typeof lifted.html !== "string" || lifted.html.length < 500) {
    throw new Error("liftStructuralSveltePageHtml failed for coverage-map/+page.svelte");
  }
  let html = lifted.html;
  // ArcGIS island host uses Module_Manager CoverageMapView classes (D6443) — not invented map-view-host chrome.
  html = html.replace(
    /<div class="cwl-map-shell" data-cwl-map-shell="CoverageMapView"[^>]*><\/div>/,
    '<div class="coverage-map-container" data-cwl-map-shell="CoverageMapView"><div id="arcgis-map-view" class="map-container" role="application" aria-label="Coverage map"></div></div>\n  <div id="map-loading" class="map-loading" hidden>Loading map…</div>',
  );
  if (!html.includes("arcgis-map-view")) {
    html =
      '<div class="coverage-map-container"><div id="arcgis-map-view" class="map-container" role="application" aria-label="Coverage map"></div></div>\n  <div id="map-loading" class="map-loading" hidden>Loading map…</div>\n' +
      html;
  } else if (!html.includes("coverage-map-container")) {
    html = html.replace(
      /(<div id="arcgis-map-view")([^>]*>)/,
      '<div class="coverage-map-container">$1 class="map-container"$2</div>',
    );
  }
  // Prefer origin map-container class if an older map-view-host rewrite remains.
  html = html.replace(/\bmap-view-host\b/g, "map-container");
  if (!html.includes("wisp-coverage-map") && !html.includes("fullscreen-map")) {
    html = `<div class="wisp-coverage-map fullscreen-map" data-wisp-page="coverage-map" data-cwl-island="client">${html}</div>`;
  } else if (!html.includes("data-wisp-page")) {
    html = html.replace(
      /class="([^"]*fullscreen-map[^"]*)"/,
      'class="$1 wisp-coverage-map" data-wisp-page="coverage-map" data-cwl-island="client"',
    );
  }
  return html;
}

/** @returns {WispUiAnchorSpec[]} */
export function wispUiAnchorSpecs() {
  return [
    { path: "/login", required: ["login-page", "demo@wisptools.io", "Sign in"], minLength: 400 },
    { path: "/dashboard", required: ["dashboard-container", "modules-grid", "WISP Management"], minLength: 800 },
    { path: "/modules/plan", required: ["wisp-plan-app", "plan-map-iframe", "wisp-header-overlay"], minLength: 500 },
    { path: "/modules/deploy", required: ["wisp-deploy-app", "deploy-map-iframe", "wisp-header-overlay"], minLength: 500 },
    {
      path: "/modules/coverage-map",
      required: ["arcgis-map-view", "floating-controls", "filters-modal", "filter-panel", "stats-modal"],
      minLength: 4000,
    },
    { path: "/modules/hardware", required: ["hardware-page", "Hardware Management"], minLength: 400 },
    {
      path: "/modules/hardware/add",
      required: ["data-cwl-form-shell", "data-cwl-route"],
      minLength: 40,
    },
  ];
}

/** WISP CWL UI parity — lifted markup/CSS targets matching Module_Manager POC (Phase 30–31). */

export const WISP_UI_PARITY_KIND = "chrysalis.wisp.ui-parity";
export const WISP_UI_PARITY_SCHEMA_VERSION = 1;

/** GCE / Firebase showcase login profile (public email; password from operator env). */
export const WISP_GCE_LOGIN_PROFILE = {
  title: "WISP Management",
  demoEmail: "demo@wisptools.io",
  /** Empty in-repo — operators set CHRYSALIS_WISP_DEMO_PASSWORD (never commit). */
  demoPassword: "",
  firebaseProject: "wisptools-production",
};

/** @typedef {{ id: string; name: string; description: string; path: string; features: string[]; status: "active"|"coming-soon" }} WispModuleCard */

/** @returns {WispModuleCard[]} */
export function wispDashboardModules() {
  return [
    {
      id: "plan",
      name: "📋 Plan",
      description: "Interactive map-based planning tools for network expansion",
      path: "/modules/plan",
      features: ["Coverage Analysis", "Site Planning", "Inventory Check", "CBRS Spectrum", "Capacity Planning", "Cost Analysis"],
      status: "active",
    },
    {
      id: "deploy",
      name: "🚀 Deploy",
      description: "Interactive map-based deployment tools for network rollouts",
      path: "/modules/deploy",
      features: ["PCI Resolution", "Work Orders", "Installation Management", "Equipment Configuration", "Quality Assurance"],
      status: "active",
    },
    {
      id: "monitor",
      name: "📊 Monitor",
      description: "Interactive map-based monitoring tools for network oversight",
      path: "/modules/monitor",
      features: ["Network Monitoring", "Device Health", "Traffic Analysis", "Performance Analytics", "Alert Management", "HSS Management"],
      status: "active",
    },
    {
      id: "maintain",
      name: "🔧 Maintain",
      description: "Traditional interface for ticketing and maintenance management",
      path: "/modules/maintain",
      features: ["Ticketing System", "Preventive Maintenance", "Incident Management", "Customer Support", "Vendor Management", "Knowledge Base"],
      status: "active",
    },
    {
      id: "customers",
      name: "👥 Customers",
      description: "Manage customers and the customer portal",
      path: "/modules/customers",
      features: ["Customer Database", "Customer Portal", "Service Management", "Installation History", "Customer Support"],
      status: "active",
    },
    {
      id: "hardware",
      name: "🔧 Hardware",
      description: "Comprehensive equipment and hardware management system",
      path: "/modules/hardware",
      features: ["Equipment Inventory", "Asset Tracking", "Hardware Management", "Status Monitoring", "Location Tracking", "Maintenance Records"],
      status: "active",
    },
    {
      id: "voice-telephony",
      name: "📞 Voice / SIP",
      description: "Telephone numbers, carrier linkage, E911, and number porting (LNP)",
      path: "/modules/voice-telephony",
      features: ["Provider accounts", "TN inventory", "E911 status", "Port orders", "Domain reference"],
      status: "active",
    },
  ];
}

/** Secondary Module Manager entries (real routes — not GenieACS). */
export function wispSecondaryModules() {
  return [
    { id: "coverage-map", name: "Coverage Map", path: "/modules/coverage-map", description: "ArcGIS network map" },
    { id: "inventory", name: "Inventory", path: "/modules/inventory", description: "Stock, scan, transfer" },
    { id: "sites", name: "Sites", path: "/modules/sites", description: "Site inventory" },
    { id: "pci-resolution", name: "PCI Resolution", path: "/modules/pci-resolution", description: "PCI planner" },
    { id: "hss-management", name: "HSS", path: "/modules/hss-management", description: "Subscriber HSS" },
    { id: "work-orders", name: "Work Orders", path: "/modules/work-orders", description: "Field work orders" },
    { id: "modules-index", name: "All modules", path: "/modules", description: "Module directory" },
  ];
}

/** @param {string} s */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {typeof WISP_GCE_LOGIN_PROFILE} [profile] */
export function buildWispLoginParityHtml(profile = WISP_GCE_LOGIN_PROFILE) {
  return `<div class="login-page" data-wisp-page="login" data-cwl-island="client">
  <div class="login-container">
    <div class="login-brand">
      <img src="/wisptools-logo.svg" alt="WISP Management" class="brand-logo" width="120" height="120" />
      <h1>${esc(profile.title)}</h1>
    </div>
    <div class="login-card">
      <h2>Sign in</h2>
      <div class="demo-credentials-panel" role="note">
        <p class="demo-credentials-title">Demo login</p>
        <p><strong>Email:</strong> ${esc(profile.demoEmail)}</p>
        <p><strong>Password:</strong> set via env <code>CHRYSALIS_WISP_DEMO_PASSWORD</code> (operators only; not printed here)</p>
        <p class="demo-credentials-hint">On management.wisptools.io uses Firebase Auth; on the GCE demo uses native CWL session.</p>
      </div>
      <p class="subtitle">Use your email and password to access ${esc(profile.title)}.</p>
      <div id="wisp-cwl-status" class="wisp-status" hidden aria-live="polite"></div>
      <form id="login-form" autocomplete="on">
        <div class="form-group">
          <label for="email">Email Address</label>
          <input id="email" name="email" type="email" value="${esc(profile.demoEmail)}" placeholder="you@example.com" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" placeholder="Enter your password" required />
        </div>
        <button type="submit" class="btn-primary" id="sign-in">Sign In</button>
      </form>
      <p class="form-footer simple-only-hint">Access is managed by your administrator.</p>
    </div>
  </div>
</div>`;
}

/** @param {WispModuleCard[]} [modules] */
export function buildWispDashboardParityHtml(modules = wispDashboardModules()) {
  const cards = modules
    .map((m) => {
      const features = m.features.map((f) => `<li>${esc(f)}</li>`).join("");
      const status =
        m.status === "active"
          ? '<span class="status-badge active">Active</span>'
          : '<span class="status-badge coming-soon">Coming Soon</span>';
      const cls = m.status === "active" ? "module-card active" : "module-card coming-soon";
      const href = m.status === "active" ? ` href="${esc(m.path)}"` : "";
      const tag = m.status === "active" ? "a" : "div";
      // Match Module_Manager dashboard/+page.svelte: no description block on cards.
      return `<${tag} class="${cls}"${href} aria-label="Open ${esc(m.name)}" role="button">
  <div class="module-header"><h3 class="module-name">${esc(m.name)}</h3></div>
  <div class="module-features"><ul>${features}</ul></div>
  <div class="module-status">${status}</div>
</${tag}>`;
    })
    .join("\n");

  const secondary = wispSecondaryModules()
    .map(
      (m) =>
        `<a class="wisp-secondary-module" href="${esc(m.path)}" title="${esc(m.description)}">${esc(m.name)}</a>`,
    )
    .join("\n");

  return `<div class="dashboard-container" data-wisp-page="dashboard" data-cwl-island="client">
  <div class="header">
    <div class="header-content">
      <div class="header-brand">
        <div class="logo-section">
          <img src="/wisptools-logo.svg" alt="WISP Management" class="dashboard-logo" width="72" height="72" />
          <div class="branding">
            <h1 class="app-title">WISP Management</h1>
            <p class="app-subtitle">wisptools.io</p>
            <p class="poc-notice">wisptools.io · Source code: <a href="https://github.com/theorem6/WISP-Management" target="_blank" rel="noopener noreferrer">github.com/theorem6/WISP-Management</a></p>
          </div>
        </div>
        <div class="header-icons">
          <a href="/help" class="icon-btn apk-btn" title="Field App" aria-label="Field App"><span class="apk-icon">📱</span></a>
          <a href="/help" class="icon-btn doc-btn" title="Help" aria-label="Open help"><span class="doc-icon">📖</span></a>
          <button type="button" class="icon-btn gear-btn" data-cwl-on-click="open-settings" title="Settings" aria-label="Open settings">
            <svg class="gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <button type="button" class="icon-btn power-btn" data-cwl-on-click="logout" title="Logout" aria-label="Logout">
            <svg class="power-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="main-content">
    <div class="modules-section">
      <div class="modules-grid">${cards}</div>
      <section class="wisp-secondary-modules" aria-label="More modules">
        <h2 class="wisp-secondary-title">More modules</h2>
        <nav class="wisp-secondary-nav">${secondary}</nav>
      </section>
    </div>
    <footer class="app-footer">
      <a href="https://github.com/theorem6/WISP-Management" target="_blank" rel="noopener noreferrer">GitHub</a>
      <span class="sep">·</span>
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
    </footer>
  </div>
</div>`;
}

/** Module Manager directory at /modules (G9951). */
export function buildWispModulesIndexHtml() {
  const primary = wispDashboardModules()
    .map(
      (m) =>
        `<a class="module-card active" href="${esc(m.path)}" aria-label="Open ${esc(m.name)}. ${esc(m.description)}" role="button"><div class="module-header"><h3 class="module-name">${esc(m.name)}</h3></div></a>`,
    )
    .join("\n");
  const secondary = wispSecondaryModules()
    .filter((m) => m.id !== "modules-index")
    .map(
      (m) =>
        `<a class="wisp-secondary-module" href="${esc(m.path)}" title="${esc(m.description)}">${esc(m.name)}</a>`,
    )
    .join("\n");
  return `<div class="dashboard-container wisp-modules-index" data-wisp-page="modules" data-cwl-island="client">
  <div class="header"><div class="header-content"><div class="header-brand"><div class="logo-section"><img src="/wisptools-logo.svg" alt="WISP Management" class="dashboard-logo" width="72" height="72" /><div class="branding"><h1 class="app-title">Module Manager</h1><p class="app-subtitle"><a href="/dashboard">← Dashboard</a></p></div></div></div></div></div>
  <div class="main-content">
    <div class="modules-section">
      <div class="modules-grid">${primary}</div>
      <section class="wisp-secondary-modules" aria-label="Map and ops modules">
        <h2 class="wisp-secondary-title">Map &amp; ops</h2>
        <nav class="wisp-secondary-nav">${secondary}</nav>
      </section>
    </div>
  </div>
</div>`;
}

export function buildWispModulesPageBlock(html) {
  const body = html.replace(/\n/g, "\\n").replace(/"/g, '\\"');
  return `@page GET "/modules"
page modules_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { surface: "wisp-modules-index", source: "wisp-g9951" };
  return html "${body}";
}`;
}

/** @param {string} html */
export function buildWispLoginPageBlock(html) {
  const body = html.replace(/\n/g, "\\n").replace(/"/g, '\\"');
  return `@page GET "/login"
page login_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  use auth session;
  load { surface: "wisp-auth-native", source: "wisp-30", profile: "gce-single-use" };
  return html "${body}";
}`;
}

/** @param {string} html */
export function buildWispDashboardPageBlock(html) {
  const body = html.replace(/\n/g, "\\n").replace(/"/g, '\\"');
  return `@page GET "/dashboard"
page dashboard_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { tenantLabel: "WISP Tenant", source: "wisp-m30", moduleCount: 7 };
  return html "${body}";
}`;
}

/** Deploy module — coverage-map iframe + Module_Manager deploy toolbar (G9950). */
export function buildWispDeployParityHtml() {
  const mapQuery = "mode=deploy&hideStats=true&deployMode=true";
  return `<div class="wisp-deploy-app" data-wisp-page="deploy" data-cwl-island="client">
  <div class="map-fullscreen">
    <iframe id="deploy-map-iframe" class="plan-map-iframe" title="Deploy map" src="/modules/coverage-map?${mapQuery}"></iframe>
  </div>
  <div class="wisp-header-overlay">
    <div class="wisp-header-left">
      <button type="button" class="wisp-back-btn" data-action="back" title="Back to Dashboard" aria-label="Back to Dashboard">←</button>
      <h1>🚀 Deploy</h1>
    </div>
    <div class="wisp-header-controls">
      <button type="button" class="wisp-control-btn" data-action="help" title="Help"><span class="control-icon">❓</span><span class="control-label">Help</span></button>
      <button type="button" class="wisp-control-btn" data-action="approved" title="Approved projects ready for deployment"><span class="control-icon">🔍</span><span class="control-label">Approved</span></button>
      <button type="button" class="wisp-control-btn" data-action="projects" title="Projects"><span class="control-icon">📋</span><span class="control-label">Projects</span></button>
      <div data-cwl-component="ModuleWizardMenu" data-cwl-lifted-component="ModuleWizardMenu"></div>
      <button type="button" class="wisp-control-btn" data-action="deployed" title="Deployed projects"><span class="control-icon">✅</span><span class="control-label">Deployed</span></button>
      <button type="button" class="wisp-control-btn" data-action="pci" title="PCI Planner"><span class="control-icon">📊</span><span class="control-label">PCI</span></button>
      <button type="button" class="wisp-control-btn" data-action="frequency" title="Frequency Planner"><span class="control-icon">📡</span><span class="control-label">Frequency</span></button>
      <button type="button" class="wisp-control-btn" data-action="hardware" title="Deployed hardware"><span class="control-icon">🔧</span><span class="control-label">Hardware</span></button>
      <button type="button" class="wisp-control-btn deploy-btn" data-action="deploy-plan" title="Push active plan to field"><span class="control-icon">🚀</span><span class="control-label">Deploy Plan</span></button>
      <button type="button" class="wisp-control-btn" data-action="layers" title="Layers"><span class="control-icon">🎛️</span><span class="control-label">Layers</span></button>
    </div>
  </div>
  <aside id="plan-projects-panel" class="plan-side-panel" hidden aria-label="Deploy projects">
    <div class="plan-panel-header">
      <h2>Deploy projects</h2>
      <button type="button" class="plan-panel-close" data-action="close-projects" aria-label="Close">✕</button>
    </div>
    <div id="plan-projects-list" class="plan-projects-list"><p class="plan-panel-loading">Loading projects…</p></div>
  </aside>
  <div id="plan-active-summary" class="plan-summary" hidden></div>
</div>`;
}

function buildWispMapModuleShellHtml(page, heading, mapQuery, appClass, iframeId) {
  return `<div class="${appClass}" data-wisp-page="${page}" data-cwl-island="client">
  <div class="map-fullscreen">
    <iframe id="${iframeId}" class="plan-map-iframe" title="${heading} map" src="/modules/coverage-map?${mapQuery}"></iframe>
  </div>
  <div class="wisp-header-overlay">
    <div class="wisp-header-left">
      <button type="button" class="wisp-back-btn" data-action="back" title="Back to Dashboard" aria-label="Back to Dashboard">←</button>
      <h1>${heading}</h1>
    </div>
    <div class="wisp-header-controls">
      <button type="button" class="wisp-control-btn" data-action="help" title="Help"><span class="control-icon">❓</span><span class="control-label">Help</span></button>
      <button type="button" class="wisp-control-btn" data-action="projects" title="Projects"><span class="control-icon">📁</span><span class="control-label">Projects</span></button>
      <button type="button" class="wisp-control-btn" data-action="layers" title="Layers"><span class="control-icon">🎛️</span><span class="control-label">Layers</span></button>
    </div>
  </div>
</div>`;
}

/** Plan module — SharedMap iframe + Module_Manager plan toolbar (G9950). */
export function buildWispPlanParityHtml() {
  const mapQuery = "mode=plan&hideStats=true&planMode=true";
  return `<div class="wisp-plan-app" data-wisp-page="plan" data-cwl-island="client">
  <div class="map-fullscreen">
    <iframe id="plan-map-iframe" class="plan-map-iframe" title="Plan map" src="/modules/coverage-map?${mapQuery}"></iframe>
  </div>
  <div class="wisp-header-overlay">
    <div class="wisp-header-left">
      <button type="button" class="wisp-back-btn" data-action="back" title="Back to Dashboard" aria-label="Back to Dashboard">←</button>
      <h1>📋 Plan</h1>
    </div>
    <div class="wisp-header-controls">
      <button type="button" class="wisp-control-btn" data-action="help" title="Help"><span class="control-icon">❓</span><span class="control-label">Help</span></button>
      <button type="button" class="wisp-control-btn" data-action="hardware" title="View hardware on map context"><span class="control-icon">🔧</span><span class="control-label">Hardware</span></button>
      <button type="button" class="wisp-control-btn" data-action="projects" title="Project list"><span class="control-icon">📁</span><span class="control-label">Projects</span></button>
      <div data-cwl-component="ModuleWizardMenu" data-cwl-lifted-component="ModuleWizardMenu"></div>
      <button type="button" class="wisp-control-btn" data-action="create-project" title="Create plan project"><span class="control-icon">➕</span><span class="control-label">Create</span></button>
      <button type="button" class="wisp-control-btn" data-action="layers" title="Layer filters"><span class="control-icon">🎛️</span><span class="control-label">Layers</span></button>
      <button type="button" class="wisp-control-btn marketing-btn" data-action="marketing" title="Find addresses"><span class="control-icon">🔍</span><span class="control-label">Find Addresses</span></button>
    </div>
  </div>
  <aside id="plan-projects-panel" class="plan-side-panel" hidden aria-label="Plan projects">
    <div class="plan-panel-header">
      <h2>Plan projects</h2>
      <button type="button" class="plan-panel-close" data-action="close-projects" aria-label="Close">✕</button>
    </div>
    <div id="plan-projects-list" class="plan-projects-list"><p class="plan-panel-loading">Loading projects…</p></div>
  </aside>
  <div id="plan-active-summary" class="plan-summary" hidden></div>
</div>`;
}

/** Coverage map — structural lift of Module_Manager coverage-map/+page.svelte (D6442). */
export function buildWispCoverageMapParityHtml() {
  try {
    return liftWispCoverageMapPageHtml();
  } catch (e) {
    console.warn(
      "[wisp-ui-parity] coverage-map lift failed; refusing invented stub:",
      e && /** @type {Error} */ (e).message ? /** @type {Error} */ (e).message : e,
    );
    throw e;
  }
}

/**
 * @param {string} path
 * @param {string} pageName
 * @param {string} html
 * @param {string} [loadMeta]
 */
export function buildWispModuleHtmlPageBlock(path, pageName, html, loadMeta) {
  // CWL string literals are JSON-parsed — use JSON.stringify so control chars
  // from deep-lifted modals (AddSite, etc.) do not break ingest/export.
  const bodyLit = JSON.stringify(html);
  const load = loadMeta ?? `{ source: "wisp-m30" }`;
  return `@page GET "${path}"
page ${pageName} {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load ${load};
  return html ${bodyLit};
}`;
}

/** @returns {{ path: string; pageName: string; html: string; loadMeta: string }[]} */
export function wispPhase30bMapModuleRoutes() {
  return [
    {
      path: "/modules/plan",
      pageName: "modules_plan_page",
      html: buildWispPlanParityHtml(),
      loadMeta: `{ moduleKey: "plan", source: "wisp-m30", apiPath: "/api/plans" }`,
    },
    {
      path: "/modules/deploy",
      pageName: "modules_deploy_page",
      html: buildWispDeployParityHtml(),
      loadMeta: `{ moduleKey: "deploy", source: "wisp-m30", apiPath: "/api/deploy" }`,
    },
    {
      path: "/modules/coverage-map",
      pageName: "modules_coverage_map_page",
      html: buildWispCoverageMapParityHtml(),
      loadMeta: `{ moduleKey: "coverage-map", source: "wisp-m30", apiPath: "/api/coverage", vendor: "arcgis-map" }`,
    },
  ];
}
