# Chrysalis migration contract — imported from OpenAPI (items-mini)
module items_mini;

@route GET "/health"
handler health {
  effects: none;
  content-type "application/json";
  return { ok: true };
}

@route GET "/items"
handler items_list {
  effects: none;
  content-type "application/json";
  return { count: 0 };
}

@route POST "/items"
handler items_create {
  effects: none;
  status 201;
  content-type "application/json";
  return { created: true };
}

@route DELETE "/items/:id"
handler items_delete {
  effects: none;
  status 204;
  param id;
  return "";
}

@route GET "/items/:id"
handler items_show {
  effects: none;
  content-type "application/json";
  param id;
  return { id: "1", name: "widget" };
}

@route GET "/raw"
handler raw_unspecified {
  effects: none;
  content-type "application/json";
  hole openapi:no-response-body;
}

@route GET "/search"
handler search {
  effects: none;
  content-type "application/json";
  query q = "";
  return { q: "widget" };
}

