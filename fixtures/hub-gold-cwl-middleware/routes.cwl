# CWL middleware gold (RFC-0001)
module middleware;

use json;
use urlencoded;

@route GET "/ready"
handler ready {
  effects: none;
  return { ready: true };
}

@route POST "/echo"
handler echo_post {
  effects: io;
  return { ok: true };
}
