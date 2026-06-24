# CWL Data v2 gold fixture (RFC-0013 v2)
module data_v2;

@page GET "/data-v2/load-ui"
page load_ui {
  effects: none;
  load { title: "Hello", source: "data-v2" };
  return ui {
    element "main" {
      element "h1" { text title; }
    }
  };
}

@page GET "/data-v2/redirect"
page load_redirect {
  effects: none;
  load { redirect: "/data-v2/load-ui" };
  return html "<html><body>unused</body></html>";
}

@page GET "/data-v2/not-found"
page load_error {
  effects: none;
  load { error: 404, message: "Not found" };
  return html "<html><body>unused</body></html>";
}

@page GET "/data-v2/session"
page load_cookie {
  effects: none;
  cookie session_id;
  load { sessionId: cookie session_id };
  return html "<html><body>session: sessionId</body></html>";
}

@route GET "/api/data-v2/health"
handler health {
  effects: none;
  return { ok: true, version: "v2" };
}
