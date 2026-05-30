@route GET "/health"
handler health {
  effects: none;
  return true;
}
