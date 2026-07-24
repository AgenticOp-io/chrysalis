import Hapi from "@hapi/hapi";

// hub-gold-hapi — 20-route Hapi TypeScript dialect (secondary to Express flagship).
// `server.route({ method, path, handler })` + request.params|query|payload + h.response().code
// (**D6447** — no invented plugins/auth/lifecycle runtime).

const server = Hapi.server();

server.route({ method: "GET", path: "/health", handler: () => true });
server.route({ method: "GET", path: "/ping", handler: () => 42 });
server.route({ method: "GET", path: "/version", handler: () => 1 });
server.route({ method: "GET", path: "/ready", handler: () => "ok" });
server.route({ method: "GET", path: "/count", handler: () => 3 });
server.route({ method: "GET", path: "/flag", handler: () => "chrysalis" });
server.route({ method: "GET", path: "/build", handler: () => 2026 });
server.route({ method: "GET", path: "/tier", handler: () => "gold" });

server.route({
  method: "GET",
  path: "/meta",
  handler: () => ({ service: "hub-gold-hapi", version: 1 }),
});

server.route({
  method: "POST",
  path: "/echo",
  handler: (request) => {
    const { kind = "plain" } = request.payload;
    return { echo: true, kind };
  },
});

server.route({ method: "GET", path: "/items", handler: () => true });
server.route({
  method: "GET",
  path: "/items/{id}",
  handler: (request) => {
    const { id } = request.params;
    return { id };
  },
});
server.route({
  method: "POST",
  path: "/items",
  handler: (_request, h) => h.response({ created: true }).code(201),
});
server.route({
  method: "GET",
  path: "/search",
  handler: (request) => ({ q: request.query.q ?? "" }),
});
server.route({
  method: "PUT",
  path: "/items/{id}",
  handler: (request) => ({ updated: true, id: request.params.id }),
});
server.route({ method: "DELETE", path: "/items/{id}", handler: () => true });
server.route({
  method: "PATCH",
  path: "/items/{id}",
  handler: (request) => ({ patched: true, id: request.params.id }),
});
server.route({
  method: "GET",
  path: "/users/{userId}",
  handler: (request) => request.params.userId,
});
server.route({ method: "GET", path: "/stats", handler: () => 3 });
server.route({
  method: "POST",
  path: "/notify",
  handler: (_request, h) => h.response({ ok: true }).code(202),
});

export default server;
