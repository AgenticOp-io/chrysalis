import Route from "@adonisjs/core/services/router";

// hub-gold-adonis — 20-route AdonisJS TypeScript dialect (secondary to Express flagship).
// `Route.get|post|…` (same peel as `router.get` in start/routes.ts) + `:id` +
// `request.param` / `request.qs()` + `response.json` / `response.status`
// (D6447 — no Lucid / IoC / controller-string invent). G10059 / D6521.

Route.get("/health", async ({ response }) => response.json(true));
Route.get("/ping", async ({ response }) => response.json(42));
Route.get("/version", async ({ response }) => response.json(1));
Route.get("/ready", async ({ response }) => response.json("ok"));
Route.get("/count", async ({ response }) => response.json(3));
Route.get("/flag", async ({ response }) => response.json("chrysalis"));
Route.get("/build", async ({ response }) => response.json(2026));
Route.get("/tier", async ({ response }) => response.json("gold"));

Route.get("/meta", async ({ response }) =>
  response.json({ service: "hub-gold-adonis", version: 1 }),
);

Route.post("/echo", async ({ response }) => response.json({ echo: true }));

Route.get("/items", async ({ response }) => response.json(true));
Route.get("/items/:id", async ({ request, response }) =>
  response.json({ id: request.param("id") }),
);
Route.post("/items", async ({ response }) =>
  response.status(201).json({ created: true }),
);
Route.get("/search", async ({ request, response }) =>
  response.json({ q: request.qs().q ?? "" }),
);
Route.put("/items/:id", async ({ request, response }) =>
  response.json({ updated: true, id: request.param("id") }),
);
Route.delete("/items/:id", async ({ response }) => response.json(true));
Route.patch("/items/:id", async ({ request, response }) =>
  response.json({ patched: true, id: request.param("id") }),
);
Route.get("/users/:userId", async ({ request, response }) =>
  response.json(request.param("userId")),
);
Route.get("/stats", async ({ response }) => response.json(3));
Route.post("/notify", async ({ response }) =>
  response.status(202).json({ ok: true }),
);

export default Route;
