# CWL diff gold — head contract (PR)
module items_head;

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
  return { count: 1 };
}

@route POST "/items"
handler items_create {
  effects: none;
  status 201;
  content-type "application/json";
  return { created: true };
}
