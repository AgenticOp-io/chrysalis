# Chrysalis Web Language gold fixture (G32)
module gold;

@route GET "/health"
handler health {
  effects: none;
  return true;
}

@route GET "/ping"
handler ping {
  effects: none;
  return 42;
}

@route GET "/meta"
handler meta {
  effects: none;
  return { ok: true, version: 1 };
}
