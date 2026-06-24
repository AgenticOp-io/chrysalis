# Greenfield CWL-only module (Phase 23) — no chimera sidecars
module greenfield;

@page GET "/"
page home {
  effects: none;
  return ui {
    element "main" {
      element "h1" { text "Greenfield CWL"; }
    }
  };
}

@page GET "/dashboard"
page dashboard {
  effects: session.read;
  load { view: "dashboard" };
  return ui {
    element "main" {
      element "h2" { text view; }
    }
  };
}

@route GET "/api/health"
handler health {
  effects: none;
  return { ok: true, greenfield: true };
}

@route POST "/api/login"
handler login {
  effects: session.write;
  return { ok: true };
}
