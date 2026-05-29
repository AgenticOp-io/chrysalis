# CWL auth + effects gold (RFC-0007)
module auth_effects;
use auth session;

@route GET "/me"
handler me {
  effects: session.read;
  return { ok: true };
}

@route POST "/login"
handler login {
  effects: session.write;
  return { ok: true };
}
