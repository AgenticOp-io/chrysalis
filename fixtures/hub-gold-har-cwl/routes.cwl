# Chrysalis migration contract — imported from HAR (HAR capture)
module items_capture;

@route GET "/health"
handler GET__health {
  effects: none;
  content-type "application/json";
  return { ok: true };
}

@route GET "/items"
handler GET__items {
  effects: none;
  content-type "application/json";
  return { count: 0 };
}

@route POST "/items"
handler POST__items {
  effects: none;
  status 201;
  content-type "application/json";
  return { created: true };
}

@route DELETE "/items/1"
handler DELETE__items_1 {
  effects: none;
  status 204;
  return "";
}

@route GET "/items/1"
handler GET__items_1 {
  effects: none;
  content-type "application/json";
  return { id: "1", name: "widget" };
}

@route GET "/search"
handler GET__search {
  effects: none;
  content-type "application/json";
  query q;
  return { q: "widget" };
}

