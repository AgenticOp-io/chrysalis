# CWL full-stack gold fixture (RFC-0010)
module fullstack;

@page GET "/"
page home {
  effects: none;
  return html "<!doctype html><html><body><h1>Home</h1></body></html>";
}

@route GET "/api/health"
handler health {
  effects: none;
  return { ok: true, surface: "api" };
}
