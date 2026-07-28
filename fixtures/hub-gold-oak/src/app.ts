import { Application, Router } from "oak";

// hub-gold-oak — 20-route Oak (Deno) TypeScript dialect (secondary to Express flagship).
// `new Application()` + `router.get|post|…` + `:id` / `{id}` + `ctx.params`
// + `ctx.request.url.searchParams` + `ctx.response.body` / `ctx.response.status`.
// Middleware (`app.use` / `router.routes()` onion) stays honest holes (**D6447** —
// no invented middleware runtime).

const app = new Application();
const router = new Router();

router.get("/health", (ctx) => {
  ctx.response.body = true;
});
router.get("/ping", (ctx) => {
  ctx.response.body = 42;
});
router.get("/version", (ctx) => {
  ctx.response.body = 1;
});
router.get("/ready", (ctx) => {
  ctx.response.body = "ok";
});
router.get("/count", (ctx) => {
  ctx.response.body = 3;
});
router.get("/flag", (ctx) => {
  ctx.response.body = "chrysalis";
});
router.get("/build", (ctx) => {
  ctx.response.body = 2026;
});
router.get("/tier", (ctx) => {
  ctx.response.body = "gold";
});

router.get("/meta", (ctx) => {
  ctx.response.body = { service: "hub-gold-oak", version: 1 };
});

router.post("/echo", (ctx) => {
  ctx.response.body = { echo: true };
});

router.get("/items", (ctx) => {
  ctx.response.body = true;
});
router.get("/items/:id", (ctx) => {
  ctx.response.body = { id: ctx.params.id };
});
router.post("/items", (ctx) => {
  ctx.response.status = 201;
  ctx.response.body = { created: true };
});
router.get("/search", (ctx) => {
  ctx.response.body = { q: ctx.request.url.searchParams.get("q") ?? "" };
});
router.put("/items/:id", (ctx) => {
  ctx.response.body = { updated: true, id: ctx.params.id };
});
router.delete("/items/:id", (ctx) => {
  ctx.response.body = true;
});
router.patch("/items/{id}", (ctx) => {
  ctx.response.body = { patched: true, id: ctx.params.id };
});
router.get("/users/{userId}", (ctx) => {
  ctx.response.body = ctx.params.userId;
});
router.get("/stats", (ctx) => {
  ctx.response.body = 3;
});
router.post("/notify", (ctx) => {
  ctx.response.status = 202;
  ctx.response.body = { ok: true };
});

export { app, router };
export default router;
