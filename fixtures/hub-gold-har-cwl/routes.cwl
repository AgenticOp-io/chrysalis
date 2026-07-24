# Chrysalis migration contract — imported from HAR (HAR capture)
module items_capture;

@route GET "/health"
handler GET_health {
  effects: none;
  content-type "application/json";
  return { ok: true };
}

@route GET "/items"
handler GET_items {
  effects: none;
  content-type "application/json";
  return { count: 0 };
}

@route POST "/items"
handler POST_items {
  effects: none;
  status 201;
  content-type "application/json";
  header authorization;
  body name = "widget";
  return { created: true };
}

@route DELETE "/items/1"
handler DELETE_items_1 {
  effects: none;
  status 204;
  return "";
}

@route GET "/items/1"
handler GET_items_1 {
  effects: none;
  content-type "application/json";
  return { id: "1", name: "widget" };
}

@route GET "/search"
handler GET_search {
  effects: none;
  content-type "application/json";
  query q;
  return { q: "widget" };
}

