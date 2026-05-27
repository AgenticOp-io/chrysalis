# CWL query-parameter gold (RFC-0003)
module query_params;

@route GET "/search"
handler search {
  effects: none;
  query q;
  return { ok: true, q: q };
}

@route GET "/page"
handler page {
  effects: none;
  query page;
  query limit;
  return { page: page, limit: limit };
}
