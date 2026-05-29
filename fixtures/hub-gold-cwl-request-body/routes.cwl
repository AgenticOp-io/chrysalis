# CWL request-body gold (RFC-0005)
module request_body;
use json;

@route POST "/items"
handler items_create {
  effects: none;
  body title;
  body qty;
  return { ok: true, title: title, qty: qty };
}

@route POST "/echo"
handler echo_body {
  effects: none;
  body message;
  return { message: message };
}
