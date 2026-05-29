# CWL response content-type gold (RFC-0008)
module response_content_type;

@route GET "/json"
handler json_ok {
  effects: none;
  content-type "application/json";
  return { ok: true };
}

@route GET "/plain"
handler plain_ok {
  effects: none;
  content-type "text/plain; charset=utf-8";
  return "";
}

@route POST "/items"
handler items_create {
  effects: none;
  status 201;
  content-type application/json;
  return { id: 1 };
}
