import { Router, json } from "itty-router";

// hub-gold-itty — 20-route itty-router TypeScript dialect (secondary to Express flagship).
// `Router()` + `router.get|post|…` + `:id` + `request.params` + URL searchParams
// + `json()` / `Response.json` / `new Response` (Workers-style).
// Middleware / nested Router / named handlers stay honest holes (**D6447** —
// no invented middleware runtime).

const router = Router();

router.get("/health", () => json(true));
router.get("/ping", () => json(42));
router.get("/version", () => json(1));
router.get("/ready", () => new Response("ok"));
router.get("/count", () => json(3));
router.get("/flag", () => json("chrysalis"));
router.get("/build", () => json(2026));
router.get("/tier", () => json("gold"));

router.get("/meta", () => json({ service: "hub-gold-itty", version: 1 }));

router.post("/echo", () => json({ echo: true }));

router.get("/items", () => json(true));
router.get("/items/:id", (request) => json({ id: request.params.id }));
router.post("/items", () => json({ created: true }, { status: 201 }));
router.get("/search", (request) => {
  const url = new URL(request.url);
  return json({ q: url.searchParams.get("q") ?? "" });
});
router.put("/items/:id", (request) => json({ updated: true, id: request.params.id }));
router.delete("/items/:id", () => json(true));
router.patch("/items/:id", (request) => json({ patched: true, id: request.params.id }));
router.get("/users/:userId", (request) => json(request.params.userId));
router.get("/stats", () => json(3));
router.post("/notify", () => Response.json({ ok: true }, { status: 202 }));

export default router;
