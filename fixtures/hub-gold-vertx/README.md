# hub-gold-vertx

Gold fixture for **Vert.x Web** (`Router.router(vertx)` + `router.get|post|….handler(ctx -> …)`)
as a Java secondary dialect (secondary to Spring `hub-flagship-java` D6448-ST). Route surface
only — no EventBus / BodyHandler / SockJS invent (**D6447**).

## Files

- `src/HubApp.java` — 20 routes: `Router.router(vertx)`, `router.get|post|put|patch|delete("/path").handler(ctx -> …)`,
  `:id` paths, `ctx.pathParam` / `ctx.queryParam`, `ctx.json(...)` /
  `ctx.response().setStatusCode(n)` / `ctx.response().end(...)`.

## Smoke

```bash
pnpm run hub:vertx-smoke
```

Expect 20/20 hole-free CWL projection.
