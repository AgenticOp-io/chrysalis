@route GET "/meta"
handler meta {
  effects: none;
  return { ok: true, version: 1 };
}
