# Site-scale matrix fixture (G9440 / G9450)
module site_scale_matrix;

@page GET "/login"
page login_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  return html "<div class=\"login-page\"><form class=\"login-form\"><button type=\"submit\">Sign in</button></form></div>";
}

@page GET "/admin/billing"
page admin_billing_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  load { source: "fixture", apiPath: "/api/admin", activeRecords: 42, api_ok: true, tracedApiStatus: 200, openAlerts: 3, pendingTasks: 7, itemCount: 1 };
  return html "<div class=\"wisp-module-demo\" data-wisp-api=\"/api/admin\"><div class=\"wisp-demo-stats\"><article class=\"wisp-demo-stat\"><strong>42</strong><span>Active records</span></article></div><table><tbody><tr><td>a1</td><td>Alpha</td></tr></tbody></table></div>";
}
