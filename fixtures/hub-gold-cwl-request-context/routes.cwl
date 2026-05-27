# CWL request-context gold (RFC-0004)
module request_context;

@route GET "/auth"
handler auth_check {
  effects: none;
  header Authorization;
  cookie session_id;
  return { auth: Authorization, sid: session_id };
}

@route GET "/locale"
handler locale {
  effects: none;
  header Accept-Language;
  query lang;
  return { accept: Accept-Language, lang: lang };
}
