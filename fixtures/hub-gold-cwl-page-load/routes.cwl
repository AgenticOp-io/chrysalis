# Page load gold (RFC-0013 / G1169)
module page_load_gold;

@page GET "/blog/:slug"
page blog_show {
  effects: none;
  param slug;
  load { slug: slug, source: "page-server" };
  return html "<h1>Blog</h1>";
}
