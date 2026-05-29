# CWL response-status gold (RFC-0006)
module response_status;

@route POST "/items"
handler items_create {
  effects: none;
  status 201;
  return { ok: true };
}

@route GET "/gone"
handler gone {
  effects: none;
  status 410;
  return { gone: true };
}
