# CWL path-parameter gold (RFC-0002)
module path_params;

@route GET "/items/:id"
handler item_show {
  effects: none;
  param id;
  return { ok: true, id: id };
}

@route GET "/users/:userId/items/:itemId"
handler nested_show {
  effects: none;
  param userId;
  param itemId;
  return { userId: userId, itemId: itemId };
}
