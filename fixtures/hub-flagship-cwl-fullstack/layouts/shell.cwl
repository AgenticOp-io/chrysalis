# Shared layout routes (RFC-0011)
use json;

@page GET "/about"
page about {
  effects: none;
  return html "<html><body><h1>About</h1><p>Full-stack flagship layout.</p></body></html>";
}
