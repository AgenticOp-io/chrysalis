# CWL full-stack flagship pilot (G1157) — pages + layout + API slice
module flagship;

import "layouts/shell.cwl";

@page GET "/"
page home {
  effects: none;
  return html "<!doctype html><html><body><h1>Chrysalis full-stack</h1></body></html>";
}

@page GET "/docs/:slug"
page doc_show {
  effects: none;
  param slug;
  return html "<html><body><h1>Doc</h1><p>slug: slug</p></body></html>";
}

@page GET "/search"
page search {
  effects: none;
  query q;
  return html "<html><body><h1>Search</h1><p>q: q</p></body></html>";
}

@page GET "/blog/:slug"
page blog_show {
  effects: none;
  param slug;
  load { slug: slug, source: "flagship", tags: ["news", "featured"] };
  return html "<html><body><h1>Blog</h1><p>slug: slug</p></body></html>";
}

@route GET "/api/health"
handler health {
  effects: none;
  return { ok: true, pilot: "fullstack" };
}

@route GET "/api/docs/:slug"
handler doc_api {
  effects: none;
  param slug;
  return { ok: true, slug: slug };
}

@route POST "/api/notify"
handler notify {
  effects: none;
  return { ok: true, channel: "flagship" };
}
