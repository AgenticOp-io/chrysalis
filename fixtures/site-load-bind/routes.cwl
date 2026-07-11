# Site load bind fixture (G9430)
module site_load_bind_fixture;

@page GET "/admin/billing"
page admin_billing_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { source: "fixture", apiPath: "/api/admin" };
  return html "<div class=\"wisp-module-demo\" data-wisp-api=\"/api/admin\"><section class=\"wisp-demo-panel\"><div class=\"wisp-demo-stats\"><article class=\"wisp-demo-stat\"><strong>0</strong><span>Active records</span></article><article class=\"wisp-demo-stat\"><strong>0</strong><span>Open alerts</span></article><article class=\"wisp-demo-stat\"><strong>0</strong><span>Pending tasks</span></article></div><table class=\"wisp-demo-table\"><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Updated</th></tr></thead><tbody><tr><td colspan=\"4\">Loading…</td></tr></tbody></table></section></div>";
}
