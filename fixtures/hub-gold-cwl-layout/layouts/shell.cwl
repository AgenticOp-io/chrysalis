# Shared layout routes (RFC-0011)
use json;

@page GET "/about"
page about {
  effects: none;
  return html "<html><body><h1>About</h1></body></html>";
}
