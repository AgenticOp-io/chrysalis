# Chrysalis Web Language — hub emit from svelte
module hub;

@page GET "/"
page root_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url=/login\"><title>Checking authentication…</title></head><body><p>Checking authentication…</p><script>location.replace(\"/login\");</script><noscript><a href=\"/login\">Continue</a></noscript></body></html>";
}

@page GET "/admin/billing"
page admin_billing_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { adminArea: "billing", source: "wisp-m2", apiPrefix: "/api/admin" };
  return html "<svelte:head>\n  <title>Billing – WISP Admin</title>\n</svelte:head>\n\n<div class=\"admin-shell\">\n  <nav class=\"admin-nav\">\n  <a href=\"/admin/management\">Management</a>\n  <a href=\"/admin/billing\">Billing</a>\n  <a href=\"/admin/system-management\">System</a>\n  <a href=\"/admin/tenant-management\">Tenants</a>\n  <a href=\"/dashboard\">← Dashboard</a>\n</nav>\n  <header>\n    <h1>Billing</h1>\n    <p class=\"admin-area\">Area: billing</p>\n    <p class=\"api-surface\">API: /api/admin (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive admin widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/admin/management"
page admin_management_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { adminArea: "management", source: "wisp-m2", apiPrefix: "/api/admin" };
  return html "<svelte:head>\n  <title>Management – WISP Admin</title>\n</svelte:head>\n\n<div class=\"admin-shell\">\n  <nav class=\"admin-nav\">\n  <a href=\"/admin/management\">Management</a>\n  <a href=\"/admin/billing\">Billing</a>\n  <a href=\"/admin/system-management\">System</a>\n  <a href=\"/admin/tenant-management\">Tenants</a>\n  <a href=\"/dashboard\">← Dashboard</a>\n</nav>\n  <header>\n    <h1>Management</h1>\n    <p class=\"admin-area\">Area: management</p>\n    <p class=\"api-surface\">API: /api/admin (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive admin widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/admin/system-management"
page admin_system_management_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { adminArea: "system-management", source: "wisp-m2", apiPrefix: "/api/admin" };
  return html "<svelte:head>\n  <title>System Management – WISP Admin</title>\n</svelte:head>\n\n<div class=\"admin-shell\">\n  <nav class=\"admin-nav\">\n  <a href=\"/admin/management\">Management</a>\n  <a href=\"/admin/billing\">Billing</a>\n  <a href=\"/admin/system-management\">System</a>\n  <a href=\"/admin/tenant-management\">Tenants</a>\n  <a href=\"/dashboard\">← Dashboard</a>\n</nav>\n  <header>\n    <h1>System Management</h1>\n    <p class=\"admin-area\">Area: system-management</p>\n    <p class=\"api-surface\">API: /api/admin (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive admin widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/admin/tenant-management"
page admin_tenant_management_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { adminArea: "tenant-management", source: "wisp-m2", apiPrefix: "/api/admin" };
  return html "<svelte:head>\n  <title>Tenant Management – WISP Admin</title>\n</svelte:head>\n\n<div class=\"admin-shell\">\n  <nav class=\"admin-nav\">\n  <a href=\"/admin/management\">Management</a>\n  <a href=\"/admin/billing\">Billing</a>\n  <a href=\"/admin/system-management\">System</a>\n  <a href=\"/admin/tenant-management\">Tenants</a>\n  <a href=\"/dashboard\">← Dashboard</a>\n</nav>\n  <header>\n    <h1>Tenant Management</h1>\n    <p class=\"admin-area\">Area: tenant-management</p>\n    <p class=\"api-surface\">API: /api/admin (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive admin widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/admin/tenants/:tenantId/modules"
page admin_tenants_tenantId_modules_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { adminArea: "tenant-modules", source: "wisp-m2", apiPrefix: "/api/admin" };
  return html "<svelte:head>\n  <title>Tenant Modules – WISP Admin</title>\n</svelte:head>\n\n<div class=\"admin-shell\">\n  <nav class=\"admin-nav\">\n  <a href=\"/admin/management\">Management</a>\n  <a href=\"/admin/billing\">Billing</a>\n  <a href=\"/admin/system-management\">System</a>\n  <a href=\"/admin/tenant-management\">Tenants</a>\n  <a href=\"/dashboard\">← Dashboard</a>\n</nav>\n  <header>\n    <h1>Tenant Modules</h1>\n    <p class=\"admin-area\">Area: tenant-modules</p>\n    <p class=\"api-surface\">API: /api/admin (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive admin widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/auth/google/callback"
page auth_google_callback_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "auth", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Callback – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Callback</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/dashboard"
page dashboard_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { tenantLabel: "WISP Tenant", source: "wisp-m1", moduleCount: 6 };
  return html "<svelte:head>\n  <title>Dashboard – WISP Management</title>\n</svelte:head>\n\n<div class=\"dashboard-shell\">\n  <header>\n    <h1>Dashboard</h1>\n    <p class=\"tenant\">Tenant: tenantLabel</p>\n  </header>\n  <section class=\"modules\">\n    <h2>Modules</h2>\n    <ul>\n      <li><a href=\"/modules/plan\">Plan</a> – coverage and site planning</li>\n      <li><a href=\"/modules/deploy\">Deploy</a> – rollouts and work orders</li>\n      <li><a href=\"/modules/monitor\">Monitor</a> – SNMP and performance</li>\n      <li><a href=\"/modules/maintain\">Maintain</a> – tickets and maintenance</li>\n      <li><a href=\"/modules/customers\">Customers</a> – CRM and portal</li>\n      <li><a href=\"/modules/hardware\">Hardware</a> – inventory and RMA</li>\n    </ul>\n  </section>\n  <section class=\"wizards\">\n    <p><a href=\"/wizards\">Wizards</a> – guided flows</p>\n  </section>\n  <p class=\"ui-hole-note\">Interactive widgets (tenant guard, notifications, module cards, settings) remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/debug-tenants"
page debug_tenants_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "debug_tenants", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Debug Tenants – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Debug Tenants</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/demo"
page demo_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "demo", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Demo – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Demo</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/docs"
page docs_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<svelte:head>\n  <title>Documentation – WISP Management</title>\n</svelte:head>\n\n<h1>WISP Management Documentation</h1>\n<p class=\"lead\">Documentation is integrated into the app. Use the sidebar or the links below.</p>\n\n<section class=\"doc-section\">\n  <h2>Quick links</h2>\n  <ul>\n    <li><a href=\"/help\">Getting Started</a> – New users and administrators.</li>\n    <li><a href=\"/help\">Using WISP Management</a> – For end users: dashboard, wizards, help.</li>\n    <li><a href=\"/help\">Project Status & Next Steps</a> – Current status and what to work on next.</li>\n    <li><a href=\"/help\">Help by topic</a> – Module-specific help (Inventory, ACS, Deploy, Plan, etc.).</li>\n    <li><a href=\"/wizards\">Wizards</a> – Guided flows (sites, subscribers, customers, RMA, plans, groups, troubleshooting).</li>\n  </ul>\n</section>\n\n<section class=\"doc-section\">\n  <h2>What is WISP Management?</h2>\n  <p>WISP Management is the main app on wisptools.io for LTE WISP operations:</p>\n  <ul>\n    <li><strong>Multi-tenant</strong> – Manage multiple organizations</li>\n    <li><strong>HSS</strong> – Home Subscriber Server for Open5GS</li>\n    <li><strong>Device management</strong> – TR-069/CWMP via GenieACS</li>\n    <li><strong>Network planning</strong> – Coverage mapping, PCI resolution</li>\n    <li><strong>Monitoring</strong> – SNMP and performance graphs</li>\n    <li><strong>CBRS/SAS</strong> – Spectrum Access System integration</li>\n  </ul>\n</section>\n\n<section class=\"doc-section\">\n  <h2>In-app help</h2>\n  <p>Each module (Inventory, Deploy, ACS CPE, HSS, Plan, Coverage Map, CBRS, PCI Resolution, Monitoring) has a <strong>Help</strong> button that opens module-specific documentation. The <a href=\"/help\">Help by topic</a> page lists all topics in one place. For reference and project status, use the sidebar or <a href=\"/docs/reference/project-status\">Project Status &amp; Next Steps</a>.</p>\n</section>";
}

@page GET "/docs/deployment"
page docs_deployment_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<svelte:head>\n  <title>Using WISP Management – WISP Management Docs</title>\n</svelte:head>\n\n<h1>Using WISP Management</h1>\n<p class=\"lead\">Your organization’s WISP Management instance is set up and managed by your administrator. This page is for end users.</p>\n\n<section class=\"doc-section\">\n  <h2>What you can do</h2>\n  <ul>\n    <li><strong>Dashboard</strong> – Open modules (Plan, Deploy, Monitor, Maintain, Customers, Hardware) and use <strong>Wizards</strong> for guided flows.</li>\n    <li><strong>Wizards</strong> – Use the <strong>Wizards</strong> menu on the dashboard or go to <a href=\"/wizards\">/wizards</a> to see all guided flows (sites, subscribers, customers, RMA, plans, groups, troubleshooting).</li>\n    <li><strong>Documentation</strong> – Use <a href=\"/help\">Help</a> for getting started and project status.</li>\n    <li><strong>Help</strong> – Use <a href=\"/help\">Help by topic</a> for module-specific guidance.</li>\n  </ul>\n</section>\n\n<section class=\"doc-section\">\n  <h2>Need access or changes?</h2>\n  <p>For new accounts, access to modules, or platform changes, contact your WISP Management administrator.</p>\n  <p><a href=\"/help\">← Help & Documentation</a></p>\n</section>";
}

@page GET "/docs/getting-started"
page docs_getting_started_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<svelte:head>\n  <title>Getting Started – WISP Management Docs</title>\n</svelte:head>\n\n<h1>Getting Started</h1>\n<p class=\"lead\">Welcome to WISP Management. This guide helps you get started with the LTE WISP platform on wisptools.io.</p>\n\n<section class=\"doc-section\">\n  <h2>What is WISP Management?</h2>\n  <p>WISP Management is the main app on wisptools.io for LTE WISPs. It provides:</p>\n  <ul>\n    <li><strong>Multi-tenant architecture</strong> – Manage multiple organizations</li>\n    <li><strong>HSS management</strong> – Home Subscriber Server for Open5GS</li>\n    <li><strong>Device management</strong> – TR-069/CWMP via GenieACS</li>\n    <li><strong>Network planning</strong> – Coverage mapping and PCI collision prevention</li>\n    <li><strong>Monitoring</strong> – SNMP monitoring and performance graphs</li>\n    <li><strong>CBRS/SAS</strong> – Spectrum Access System integration</li>\n  </ul>\n</section>\n\n<section class=\"doc-section\">\n  <h2>Quick start</h2>\n  <h3>For new users</h3>\n  <ol>\n    <li><strong>Create an account</strong> – Complete registration and verify your email.</li>\n    <li><strong>Set up your first tenant</strong> – Configure organization details and subscription.</li>\n    <li><strong>Use the platform</strong> – Open the <a href=\"/dashboard\">dashboard</a>, explore modules, and start managing your network.</li>\n  </ol>\n  <h3>For administrators</h3>\n  <ol>\n    <li><strong>Deploy the platform</strong> – Follow the <a href=\"/help\">deployment guide</a>; set up backend and frontend.</li>\n    <li><strong>Configure HSS</strong> – Set up Open5GS and connect MMEs (see repo <code>docs/</code> for admin guides).</li>\n    <li><strong>Manage tenants</strong> – Use Admin Management from the dashboard; configure GenieACS and user roles.</li>\n  </ol>\n</section>\n\n<section class=\"doc-section\">\n  <h2>Next steps</h2>\n  <ul>\n    <li><a href=\"/help\">Help & Documentation</a></li>\n    <li><a href=\"/help\">Deployment</a></li>\n    <li><a href=\"/help\">Project status & next steps</a></li>\n    <li><a href=\"/help\">Help by topic</a></li>\n    <li><a href=\"/wizards\">Wizards</a> – Guided flows for sites, subscribers, customers, RMA, plans, groups</li>\n  </ul>\n</section>";
}

@page GET "/docs/reference"
page docs_reference_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<svelte:head>\n  <title>Reference – WISP Management Docs</title>\n</svelte:head>\n\n<h1>Reference</h1>\n<p>Reference documentation for status, deployment, and planning.</p>\n\n<ul class=\"ref-list\">\n  <li><a href=\"/help\">Project Status & Next Steps</a> – Where the project stands and prioritized next items.</li>\n</ul>";
}

@page GET "/docs/reference/project-status"
page docs_reference_project_status_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<svelte:head>\n  <title>Project Status &amp; Next Steps – WISP Management Docs</title>\n</svelte:head>\n\n<article class=\"doc-article\">\n  <h1>Project Status &amp; Next Steps</h1>\n  <p class=\"intro\">This page summarizes where the project stands and what to work on next. For the full lists, see the markdown files in the repository <code>docs/</code> folder.</p>\n  <div class=\"doc-body\">\n<h2>Where We Are</h2>\n<ul>\n  <li><strong>Frontend:</strong> Firebase Hosting. Deploy: <code>npm run build</code> in Module_Manager, then <code>firebase deploy --only hosting:app</code>.</li>\n  <li><strong>Backend:</strong> GCE VM. Deploy: <code>deploy-backend-to-gce.ps1</code> (Upload or Git).</li>\n  <li><strong>Functions:</strong> <code>firebase deploy --only functions</code>.</li>\n  <li><strong>Wizards:</strong> All 19+ wizards implemented and in-app. Access via <code>/wizards</code> or each module's wizard menu.</li>\n  <li><strong>Customer Portal:</strong> Branding, tickets, billing, FAQ, KB at <code>/modules/customers/portal/*</code>.</li>\n  <li><strong>Documentation:</strong> Integrated at <code>/help</code> and <code>/docs</code>.</li>\n</ul>\n\n<h2>Next Items (Optional / Polish)</h2>\n<ol>\n  <li><strong>Documentation:</strong> Add frontmatter to more <code>docs/</code> files; fix broken links.</li>\n  <li><strong>Customer Portal:</strong> Optional live chat integration, KB search enhancements.</li>\n  <li><strong>ACS:</strong> Optional alert email/SMS integration; device grouping/tags.</li>\n</ol>\n\n<h2>Key Docs in Repository</h2>\n<p>In the repo <code>docs/</code> folder: <strong>docs/README.md</strong>, <strong>WHERE_WE_ARE_AND_NEXT_STEPS.md</strong>, <strong>NEXT_ITEMS_TO_ADD.md</strong>, and related planning files.</p>\n  </div>\n  <p><a href=\"/docs\">← Documentation home</a></p>\n</article>";
}

@page GET "/help"
page help_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<svelte:head>\n  <title>Help – WISP Management</title>\n</svelte:head>\n\n<div class=\"help-container\">\n  <h1>WISP Management Help</h1>\n  <p class=\"lead\">Complete guide to using the platform. Module-specific interactive help remains on the full app until CWL UI surfaces ship.</p>\n  <p><a href=\"/docs\">Reference &amp; Project Status → /docs</a></p>\n  <section>\n    <h2>Quick topics</h2>\n    <ul>\n      <li><a href=\"/docs/getting-started\">Getting Started</a></li>\n      <li><a href=\"/docs/deployment\">Using WISP Management</a></li>\n      <li><a href=\"/docs/reference/project-status\">Project Status &amp; Next Steps</a></li>\n      <li><a href=\"/wizards\">Wizards</a> – guided flows (requires interactive UI sidecar)</li>\n      <li><a href=\"/dashboard\">Dashboard</a> – CWL Data shell with tenant load (M1)</li>\n    </ul>\n  </section>\n  <section>\n    <h2>What is WISP Multitool?</h2>\n    <p>All-in-one platform for wireless ISPs: network planning, field operations, customer support, device management (ACS/TR-069), HSS subscribers, and team management.</p>\n  </section>\n</div>";
}

@route GET "/login"
handler login_page {
  effects: none;
  hole hub-svelte:firebase-auth;
}

@page GET "/modules"
page modules_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url=/dashboard\"><title>Redirecting to dashboard…</title></head><body><p>Redirecting to dashboard…</p><script>location.replace(\"/dashboard\");</script><noscript><a href=\"/dashboard\">Continue</a></noscript></body></html>";
}

@page GET "/modules/acs-cpe-management"
page modules_acs_cpe_management_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Acs Cpe Management – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Acs Cpe Management</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/alerts"
page modules_acs_cpe_management_alerts_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "alerts", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Alerts – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Alerts</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: alerts</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/devices"
page modules_acs_cpe_management_devices_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "devices", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Devices – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Devices</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: devices</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/faults"
page modules_acs_cpe_management_faults_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "faults", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Faults – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Faults</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: faults</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/files"
page modules_acs_cpe_management_files_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "files", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Files – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Files</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: files</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/firmware"
page modules_acs_cpe_management_firmware_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "firmware", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Firmware – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Firmware</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: firmware</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/graphs"
page modules_acs_cpe_management_graphs_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "graphs", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Graphs – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Graphs</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: graphs</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/monitoring"
page modules_acs_cpe_management_monitoring_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "monitoring", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Monitoring – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Monitoring</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: monitoring</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/presets"
page modules_acs_cpe_management_presets_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "presets", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Presets – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Presets</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: presets</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/settings"
page modules_acs_cpe_management_settings_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "settings", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Settings – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Settings</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: settings</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/acs-cpe-management/tasks"
page modules_acs_cpe_management_tasks_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "acs_cpe_management", section: "tasks", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Tasks – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Tasks</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: tasks</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/backend-management"
page modules_backend_management_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "backend_management", source: "wisp-m5", apiPath: "/api/internal" };
  return html "<svelte:head>\n  <title>Backend Management – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Backend Management</h1>\n    <p class=\"api-surface\">API: /api/internal (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/billing"
page modules_billing_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "billing", source: "wisp-m5", apiPath: "/api/customer-billing" };
  return html "<svelte:head>\n  <title>Billing – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Billing</h1>\n    <p class=\"api-surface\">API: /api/customer-billing (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/cbrs-management"
page modules_cbrs_management_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "cbrs_management", source: "wisp-m5", apiPath: "/api/epc-updates" };
  return html "<svelte:head>\n  <title>Cbrs Management – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Cbrs Management</h1>\n    <p class=\"api-surface\">API: /api/epc-updates (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/coverage-map"
page modules_coverage_map_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "coverage-map", source: "wisp-m3", apiPath: "/api/network" };
  return html "<svelte:head>\n  <title>Coverage Map – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <nav class=\"module-nav\">\n  <a href=\"/modules/plan\">Plan</a>\n  <a href=\"/modules/deploy\">Deploy</a>\n  <a href=\"/modules/coverage-map\">Coverage Map</a>\n  <a href=\"/dashboard\">← Dashboard</a>\n</nav>\n  <header>\n    <h1>Coverage Map</h1>\n    <p class=\"module-blurb\">Network coverage visualization</p>\n    <p class=\"api-surface\">API: /api/network (proxied upstream)</p>\n  </header>\n  <p class=\"client-hole-note\">ArcGIS MapView remains <code>hub-svelte:arcgis-map</code> (client bundle) until CWL UI policy.</p>\n  <p class=\"ui-hole-note\">Interactive module widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers"
page modules_customers_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { module: "customers", source: "wisp-m2", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Customers – WISP Management</title>\n</svelte:head>\n\n<div class=\"customers-shell\">\n  <header>\n    <h1>Customers Module</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <section class=\"portal-links\">\n    <h2>Customer Portal</h2>\n    <ul>\n      <li><a href=\"/modules/customers/portal\">Portal home</a></li>\n      <li><a href=\"/modules/customers/portal-setup\">Portal setup</a></li>\n      <li><a href=\"/modules/customers/portal/dashboard\">Portal dashboard</a></li>\n      <li><a href=\"/modules/customers/portal/tickets\">Tickets</a></li>\n      <li><a href=\"/modules/customers/portal/billing\">Billing</a></li>\n      <li><a href=\"/modules/customers/portal/knowledge\">Knowledge base</a></li>\n    </ul>\n  </section>\n  <p class=\"ui-hole-note\">CRM widgets and portal sub-pages remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal"
page modules_customers_portal_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url=/modules/customers/portal/login\"><title>Redirecting…</title></head><body><p>Redirecting…</p><script>location.replace(\"/modules/customers/portal/login\");</script><noscript><a href=\"/modules/customers/portal/login\">Continue</a></noscript></body></html>";
}

@page GET "/modules/customers/portal-setup"
page modules_customers_portal_setup_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal-setup", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Portal Setup – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Portal Setup</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal-setup</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/billing"
page modules_customers_portal_billing_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/billing", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Billing – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Billing</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/billing</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/billing/settings"
page modules_customers_portal_billing_settings_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/billing/settings", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Settings – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Settings</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/billing/settings</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/dashboard"
page modules_customers_portal_dashboard_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/dashboard", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Dashboard – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Dashboard</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/dashboard</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/faq"
page modules_customers_portal_faq_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/faq", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Faq – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Faq</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/faq</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/knowledge"
page modules_customers_portal_knowledge_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/knowledge", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Knowledge – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Knowledge</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/knowledge</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/knowledge/:id"
page modules_customers_portal_knowledge_id_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/knowledge/:id", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Detail – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Detail</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/knowledge/:id</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/live-chat"
page modules_customers_portal_live_chat_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/live-chat", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Live Chat – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Live Chat</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/live-chat</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/login"
page modules_customers_portal_login_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/login", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Login – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Login</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/login</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/service"
page modules_customers_portal_service_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/service", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Service – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Service</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/service</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/signup"
page modules_customers_portal_signup_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/signup", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Signup – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Signup</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/signup</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/tickets"
page modules_customers_portal_tickets_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/tickets", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Tickets – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Tickets</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/tickets</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/tickets/:id"
page modules_customers_portal_tickets_id_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/tickets/:id", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>Detail – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Detail</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/tickets/:id</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/customers/portal/tickets/new"
page modules_customers_portal_tickets_new_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "customers", section: "portal/tickets/new", source: "wisp-m5", apiPath: "/api/customers" };
  return html "<svelte:head>\n  <title>New – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>New</h1>\n    <p class=\"api-surface\">API: /api/customers (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: portal/tickets/new</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/deploy"
page modules_deploy_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "deploy", source: "wisp-m3", apiPath: "/api/deploy" };
  return html "<svelte:head>\n  <title>Deploy – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <nav class=\"module-nav\">\n  <a href=\"/modules/plan\">Plan</a>\n  <a href=\"/modules/deploy\">Deploy</a>\n  <a href=\"/modules/coverage-map\">Coverage Map</a>\n  <a href=\"/dashboard\">← Dashboard</a>\n</nav>\n  <header>\n    <h1>Deploy</h1>\n    <p class=\"module-blurb\">Rollouts and work orders</p>\n    <p class=\"api-surface\">API: /api/deploy (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive module widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/hardware"
page modules_hardware_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "hardware", source: "wisp-m5", apiPath: "/api/inventory" };
  return html "<svelte:head>\n  <title>Hardware – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Hardware</h1>\n    <p class=\"api-surface\">API: /api/inventory (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/help-desk"
page modules_help_desk_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "help_desk", source: "wisp-m5", apiPath: "/api/maintain" };
  return html "<svelte:head>\n  <title>Help Desk – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Help Desk</h1>\n    <p class=\"api-surface\">API: /api/maintain (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/help-desk/reports"
page modules_help_desk_reports_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "help_desk", section: "reports", source: "wisp-m5", apiPath: "/api/maintain" };
  return html "<svelte:head>\n  <title>Reports – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Reports</h1>\n    <p class=\"api-surface\">API: /api/maintain (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: reports</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/hss-management"
page modules_hss_management_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "hss_management", section: "overview", source: "wisp-m4", apiPath: "/api/hss" };
  return html "<svelte:head>\n  <title>HSS Management – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <nav class=\"m4-nav\">\n  <a href=\"/modules/hss-management\">HSS</a>\n  <a href=\"/modules/monitoring\">Monitoring</a>\n</nav>\n  <header>\n    <h1>HSS Management</h1>\n    <p class=\"api-surface\">API: /api/hss (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: overview</p>\n  <p class=\"extra-note\">Open5GS HSS subscribers via proxied /api/hss.</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/inventory"
page modules_inventory_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "inventory", source: "wisp-m5", apiPath: "/api/inventory" };
  return html "<svelte:head>\n  <title>Inventory – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Inventory</h1>\n    <p class=\"api-surface\">API: /api/inventory (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/inventory/:id"
page modules_inventory_id_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "inventory", section: ":id", source: "wisp-m5", apiPath: "/api/inventory" };
  return html "<svelte:head>\n  <title>Detail – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Detail</h1>\n    <p class=\"api-surface\">API: /api/inventory (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: :id</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/inventory/:id/edit"
page modules_inventory_id_edit_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "inventory", section: ":id/edit", source: "wisp-m5", apiPath: "/api/inventory" };
  return html "<svelte:head>\n  <title>Edit – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Edit</h1>\n    <p class=\"api-surface\">API: /api/inventory (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: :id/edit</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/inventory/add"
page modules_inventory_add_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "inventory", section: "add", source: "wisp-m5", apiPath: "/api/inventory" };
  return html "<svelte:head>\n  <title>Add – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Add</h1>\n    <p class=\"api-surface\">API: /api/inventory (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: add</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/inventory/bundles"
page modules_inventory_bundles_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "inventory", section: "bundles", source: "wisp-m5", apiPath: "/api/inventory" };
  return html "<svelte:head>\n  <title>Bundles – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Bundles</h1>\n    <p class=\"api-surface\">API: /api/inventory (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: bundles</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/inventory/reports"
page modules_inventory_reports_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "inventory", section: "reports", source: "wisp-m5", apiPath: "/api/inventory" };
  return html "<svelte:head>\n  <title>Reports – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Reports</h1>\n    <p class=\"api-surface\">API: /api/inventory (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: reports</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/maintain"
page modules_maintain_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "maintain", source: "wisp-m5", apiPath: "/api/maintain" };
  return html "<svelte:head>\n  <title>Maintain – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Maintain</h1>\n    <p class=\"api-surface\">API: /api/maintain (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/monitor"
page modules_monitor_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url=/modules/monitoring\"><title>Redirecting to Monitoring…</title></head><body><p>Redirecting to Monitoring…</p><script>location.replace(\"/modules/monitoring\");</script><noscript><a href=\"/modules/monitoring\">Continue</a></noscript></body></html>";
}

@page GET "/modules/monitoring"
page modules_monitoring_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "monitoring", section: "overview", source: "wisp-m4", apiPath: "/api/monitoring" };
  return html "<svelte:head>\n  <title>SNMP Monitoring – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <nav class=\"m4-nav\">\n  <a href=\"/modules/hss-management\">HSS</a>\n  <a href=\"/modules/monitoring\">Monitoring</a>\n</nav>\n  <header>\n    <h1>SNMP Monitoring</h1>\n    <p class=\"api-surface\">API: /api/monitoring (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: overview</p>\n  <p class=\"extra-note\">SNMP graphs via /api/monitoring and /api/snmp.</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/pci-resolution"
page modules_pci_resolution_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "pci_resolution", source: "wisp-m5", apiPath: "/api/network" };
  return html "<svelte:head>\n  <title>Pci Resolution – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Pci Resolution</h1>\n    <p class=\"api-surface\">API: /api/network (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/plan"
page modules_plan_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "plan", source: "wisp-m3", apiPath: "/api/plans" };
  return html "<svelte:head>\n  <title>Plan – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <nav class=\"module-nav\">\n  <a href=\"/modules/plan\">Plan</a>\n  <a href=\"/modules/deploy\">Deploy</a>\n  <a href=\"/modules/coverage-map\">Coverage Map</a>\n  <a href=\"/dashboard\">← Dashboard</a>\n</nav>\n  <header>\n    <h1>Plan</h1>\n    <p class=\"module-blurb\">Coverage and site planning</p>\n    <p class=\"api-surface\">API: /api/plans (proxied upstream)</p>\n  </header>\n  <p class=\"client-hole-note\">ArcGIS geocode client calls remain <code>hub-svelte:arcgis-map</code>.</p>\n  <p class=\"ui-hole-note\">Interactive module widgets remain <code>hub-svelte:page-component</code> until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/sites"
page modules_sites_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "sites", source: "wisp-m5", apiPath: "/api/network" };
  return html "<svelte:head>\n  <title>Sites – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Sites</h1>\n    <p class=\"api-surface\">API: /api/network (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/tenant-management"
page modules_tenant_management_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "tenant_management", source: "wisp-m5", apiPath: "/api/tenants" };
  return html "<svelte:head>\n  <title>Tenant Management – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Tenant Management</h1>\n    <p class=\"api-surface\">API: /api/tenants (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/tenant-management/cbrs-platform"
page modules_tenant_management_cbrs_platform_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "tenant_management", section: "cbrs-platform", source: "wisp-m5", apiPath: "/api/tenants" };
  return html "<svelte:head>\n  <title>Cbrs Platform – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Cbrs Platform</h1>\n    <p class=\"api-surface\">API: /api/tenants (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: cbrs-platform</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/tenant-management/users"
page modules_tenant_management_users_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "tenant_management", section: "users", source: "wisp-m5", apiPath: "/api/tenants" };
  return html "<svelte:head>\n  <title>Users – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Users</h1>\n    <p class=\"api-surface\">API: /api/tenants (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: users</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/user-management"
page modules_user_management_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "user_management", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>User Management – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>User Management</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/user-management/permissions"
page modules_user_management_permissions_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "user_management", section: "permissions", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Permissions – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Permissions</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: permissions</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/user-management/roles"
page modules_user_management_roles_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "user_management", section: "roles", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Roles – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Roles</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: roles</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/voice-telephony"
page modules_voice_telephony_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "voice_telephony", source: "wisp-m5", apiPath: "/api/voice" };
  return html "<svelte:head>\n  <title>Voice Telephony – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Voice Telephony</h1>\n    <p class=\"api-surface\">API: /api/voice (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/work-orders"
page modules_work_orders_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "work_orders", source: "wisp-m5", apiPath: "/api/work-orders" };
  return html "<svelte:head>\n  <title>Work Orders – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Work Orders</h1>\n    <p class=\"api-surface\">API: /api/work-orders (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/modules/work-orders/:id"
page modules_work_orders_id_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "work_orders", section: ":id", source: "wisp-m5", apiPath: "/api/work-orders" };
  return html "<svelte:head>\n  <title>Detail – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Detail</h1>\n    <p class=\"api-surface\">API: /api/work-orders (proxied upstream)</p>\n  </header>\n  <p class=\"section\">Section: :id</p>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/oauth/google/callback"
page oauth_google_callback_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "oauth", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Callback – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Callback</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/onboarding"
page onboarding_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "onboarding", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Onboarding – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Onboarding</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/portal/:tenantId"
page portal_tenantId_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Redirecting to portal…</title></head><body><p>Redirecting to portal…</p><script>var m=location.pathname.match(/^\\/portal\\/([^/]+)/);location.replace(m?\"/modules/customers/portal/login?tenant=\"+encodeURIComponent(m[1]):\"/modules/customers/portal/login\");</script><noscript><a href=\"/modules/customers/portal/login\">Continue</a></noscript></body></html>";
}

@page GET "/reset-password"
page reset_password_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "reset_password", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Reset Password – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Reset Password</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/settings/module-access"
page settings_module_access_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { module: "settings", source: "wisp-m5", apiPath: "/api/permissions" };
  return html "<svelte:head>\n  <title>Module Access – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Module Access</h1>\n    <p class=\"api-surface\">API: /api/permissions (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/setup-admin"
page setup_admin_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "setup_admin", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Setup Admin – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Setup Admin</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/signup"
page signup_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "signup", source: "wisp-m5", apiPath: "/api/users" };
  return html "<svelte:head>\n  <title>Signup – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Signup</h1>\n    <p class=\"api-surface\">API: /api/users (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/support-dashboard"
page support_dashboard_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "support_dashboard", source: "wisp-m5", apiPath: "/api/maintain" };
  return html "<svelte:head>\n  <title>Support Dashboard – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Support Dashboard</h1>\n    <p class=\"api-surface\">API: /api/maintain (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/tenant-admin"
page tenant_admin_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { module: "tenant_admin", source: "wisp-m5", apiPath: "/api/tenants" };
  return html "<svelte:head>\n  <title>Tenant Admin – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Tenant Admin</h1>\n    <p class=\"api-surface\">API: /api/tenants (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/tenant-selector"
page tenant_selector_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { module: "tenant_selector", source: "wisp-m5", apiPath: "/api/tenants" };
  return html "<svelte:head>\n  <title>Tenant Selector – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Tenant Selector</h1>\n    <p class=\"api-surface\">API: /api/tenants (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/tenant-setup"
page tenant_setup_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  load { module: "tenant_setup", source: "wisp-m5", apiPath: "/api/tenants" };
  return html "<svelte:head>\n  <title>Tenant Setup – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Tenant Setup</h1>\n    <p class=\"api-surface\">API: /api/tenants (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

@page GET "/wizards"
page wizards_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { module: "wizards", source: "wisp-m5", apiPath: "/api/plans" };
  return html "<svelte:head>\n  <title>Wizards – WISP Management</title>\n</svelte:head>\n\n<div class=\"module-shell\">\n  <header>\n    <h1>Wizards</h1>\n    <p class=\"api-surface\">API: /api/plans (proxied upstream)</p>\n  </header>\n  <p class=\"ui-hole-note\">Interactive widgets remain sidecar until CWL UI RFC-0012.</p>\n</div>";
}

