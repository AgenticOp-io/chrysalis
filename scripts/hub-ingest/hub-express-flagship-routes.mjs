/**
 * Canonical route list for fixtures/hub-flagship-express (20 routes).
 */
export const EXPRESS_FLAGSHIP_ROUTES = [
  { method: "GET", path: "/health" },
  { method: "GET", path: "/ping" },
  { method: "GET", path: "/version" },
  { method: "GET", path: "/ready" },
  { method: "GET", path: "/count" },
  { method: "GET", path: "/flag" },
  { method: "GET", path: "/build" },
  { method: "GET", path: "/tier" },
  { method: "GET", path: "/meta" },
  { method: "POST", path: "/echo" },
  { method: "GET", path: "/items" },
  { method: "GET", path: "/items/:id" },
  { method: "POST", path: "/items" },
  { method: "GET", path: "/search" },
  { method: "PUT", path: "/items/:id" },
  { method: "DELETE", path: "/items/:id" },
  { method: "PATCH", path: "/items/:id" },
  { method: "GET", path: "/users/:userId" },
  { method: "GET", path: "/stats" },
  { method: "POST", path: "/notify" },
];

export function expressFlagshipRoutesArg() {
  return EXPRESS_FLAGSHIP_ROUTES.map((r) => `${r.method} ${r.path}`).join(",");
}
