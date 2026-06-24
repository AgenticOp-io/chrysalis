# CWL auth middleware gold (RFC-0020)
module auth_middleware;
use auth session;

@route GET "/admin"
handler admin_index {
  effects: auth.require, cors.allow, csrf.verify;
  return { ok: true, area: "admin" };
}

@route GET "/api/protected"
handler protected_api {
  effects: auth.require, cors.allow;
  return { ok: true };
}
