# CWL structured gold — JSON object responses
module structured;

@route GET "/health"
handler health {
  effects: none;
  return { ok: true };
}

@route GET "/meta"
handler meta {
  effects: none;
  return { service: "hub-gold-cwl-structured", version: 1 };
}
