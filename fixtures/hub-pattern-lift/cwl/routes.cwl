# Matrix smoke fixture for CWL origin
module smoke;

@route GET "/api/status"
handler status {
  effects: none;
  return "ok";
}
