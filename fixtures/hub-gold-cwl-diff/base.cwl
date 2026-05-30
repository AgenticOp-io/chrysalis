# CWL diff gold — base contract
module items_base;

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

@route GET "/gone"
handler gone {
  effects: none;
  status 410;
  content-type "application/json";
  return { gone: true };
}
