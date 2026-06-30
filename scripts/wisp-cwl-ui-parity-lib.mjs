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

/** @returns {WispUiAnchorSpec[]} */
export function wispUiAnchorSpecs() {
  return [
    { path: "/login", required: ["login-page", "demo@wisptools.io", "Sign in"], minLength: 400 },
    { path: "/dashboard", required: ["dashboard-container", "modules-grid", "WISP Management"], minLength: 800 },
    { path: "/modules/plan", required: ["wisp-plan-app", "plan-map-iframe", "wisp-header-overlay"], minLength: 500 },
    { path: "/modules/deploy", required: ["wisp-deploy-app", "deploy-map-iframe", "wisp-header-overlay"], minLength: 500 },
    { path: "/modules/coverage-map", required: ["wisp-coverage-map", "arcgis-map-view"], minLength: 80 },
  ];
}

/** WISP CWL UI parity — lifted markup/CSS targets matching Module_Manager POC (Phase 30–31). */

export const WISP_UI_PARITY_KIND = "chrysalis.wisp.ui-parity";
export const WISP_UI_PARITY_SCHEMA_VERSION = 1;

/** GCE single-use login profile (matches .env.single-use). */
export const WISP_GCE_LOGIN_PROFILE = {
  title: "WISPTools Demo ISP",
  demoEmail: "demo@wisptools.io",
  demoPassword: "WisptoolsDemo2026!",
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
      features: ["PCI Resolution", "ACS CPE Management", "Work Orders", "Installation Management", "Equipment Configuration", "Quality Assurance"],
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
        <p class="demo-credentials-title">Demo login (Firebase <code>${esc(profile.firebaseProject)}</code>)</p>
        <p><strong>Email:</strong> ${esc(profile.demoEmail)}</p>
        <p><strong>Password:</strong> ${esc(profile.demoPassword)}</p>
        <p class="demo-credentials-hint">Use the GCE demo URL for this deployment.</p>
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
      return `<${tag} class="${cls}"${href} aria-label="Open ${esc(m.name)}">
  <div class="module-header"><h3 class="module-name">${esc(m.name)}</h3></div>
  <p class="module-description">${esc(m.description)}</p>
  <div class="module-features"><ul>${features}</ul></div>
  <div class="module-status">${status}</div>
</${tag}>`;
    })
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
          <a href="/help" class="icon-btn doc-btn" title="Help" aria-label="Open help"><span class="doc-icon">📖</span></a>
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
    </div>
    <footer class="app-footer">
      <a href="https://github.com/theorem6/WISP-Management" target="_blank" rel="noopener noreferrer">GitHub</a>
      <span class="sep">·</span>
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
    </footer>
  </div>
</div>`;
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

/** Deploy module — coverage-map iframe (deploy mode). */
export function buildWispDeployParityHtml() {
  const mapQuery = "mode=deploy&hideStats=true&deployMode=true";
  return buildWispMapModuleShellHtml("deploy", "🚀 Deploy", mapQuery, "wisp-deploy-app", "deploy-map-iframe");
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
      <a href="/help" class="wisp-control-btn help-link" title="Help"><span class="control-icon">❓</span><span class="control-label">Help</span></a>
      <button type="button" class="wisp-control-btn" data-action="projects" title="Projects"><span class="control-icon">📁</span><span class="control-label">Projects</span></button>
      <button type="button" class="wisp-control-btn" data-action="layers" title="Layers"><span class="control-icon">🎛️</span><span class="control-label">Layers</span></button>
    </div>
  </div>
</div>`;
}

/** Plan module — full-screen coverage-map iframe + header overlay (POC SharedMap pattern). */
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
      <a href="/help" class="wisp-control-btn help-link" title="Help"><span class="control-icon">❓</span><span class="control-label">Help</span></a>
      <button type="button" class="wisp-control-btn" data-action="hardware" title="View hardware"><span class="control-icon">🔧</span><span class="control-label">Hardware</span></button>
      <button type="button" class="wisp-control-btn" data-action="projects" title="Project list"><span class="control-icon">📁</span><span class="control-label">Projects</span></button>
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

/** Coverage map — ArcGIS MapView host (embedded by Plan/Deploy iframes). */
export function buildWispCoverageMapParityHtml() {
  return `<div class="wisp-coverage-map" data-wisp-page="coverage-map" data-cwl-island="client">
  <div id="arcgis-map-view" class="map-view-host" role="application" aria-label="Coverage map"></div>
  <div id="map-loading" class="map-loading">Loading map…</div>
</div>`;
}

/**
 * @param {string} path
 * @param {string} pageName
 * @param {string} html
 * @param {string} [loadMeta]
 */
export function buildWispModuleHtmlPageBlock(path, pageName, html, loadMeta) {
  const body = html.replace(/\n/g, "\\n").replace(/"/g, '\\"');
  const load = loadMeta ?? `{ source: "wisp-m30" }`;
  return `@page GET "${path}"
page ${pageName} {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load ${load};
  return html "${body}";
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
