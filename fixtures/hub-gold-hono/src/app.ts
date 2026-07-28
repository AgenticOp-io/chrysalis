import { Hono } from "hono";

// hub-gold-hono — 20-route Hono TypeScript dialect (secondary to Express flagship).
// `new Hono()` + `app.get|post|…` + `c.req.param|query` + `c.json`/`c.text`.
// Pass-through `app.use` peels as `js.passthrough` preset (**D6447** / G10044 —
// no invented onion runtime; ≠ emit-hono outbound target; complex mw stays hole).

const app = new Hono();

// Pass-through onion shells — peel as `js.passthrough` (no invented middleware runtime).
app.use(async (_c, next) => {
  await next();
});
app.use(async (_c, next) => {
  return next();
});

app.get("/health", (c) => c.json(true));
app.get("/ping", (c) => c.json(42));
app.get("/version", (c) => c.json(1));
app.get("/ready", (c) => c.text("ok"));
app.get("/count", (c) => c.json(3));
app.get("/flag", (c) => c.json("chrysalis"));
app.get("/build", (c) => c.json(2026));
app.get("/tier", (c) => c.json("gold"));

app.get("/meta", (c) => c.json({ service: "hub-gold-hono", version: 1 }));

app.post("/echo", (c) => c.json({ echo: true }));

app.get("/items", (c) => c.json(true));
app.get("/items/:id", (c) => c.json({ id: c.req.param("id") }));
app.post("/items", (c) => c.json({ created: true }, 201));
app.get("/search", (c) => c.json({ q: c.req.query("q") ?? "" }));
app.put("/items/:id", (c) => c.json({ updated: true, id: c.req.param("id") }));
app.delete("/items/:id", (c) => c.json(true));
app.patch("/items/:id", (c) => c.json({ patched: true, id: c.req.param("id") }));
app.get("/users/:userId", (c) => c.json(c.req.param("userId")));
app.get("/stats", (c) => c.json(3));
app.post("/notify", (c) => c.json({ ok: true }, 202));

export default app;
