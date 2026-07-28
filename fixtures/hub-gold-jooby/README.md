# hub-gold-jooby

Gold fixture for **Jooby** (`new Jooby() {{ get|post|… }}`) fluent routes as a Java
secondary dialect (secondary to Spring `hub-flagship-java` D6448-ST). Route surface only —
no module / MVC / filter invent (**D6447**).

## Files

- `src/HubApp.java` — 20 routes: `new Jooby() {{ get|post|put|patch|delete("/path", ctx -> …); }}`,
  `{id}` paths, `ctx.path` / `ctx.query`, `ctx.setResponseCode(n)`, Map.of / scalar returns.
  Dotted `app.get("/path", …)` is peeled by the same bridge (not exercised in this gold).

## Smoke

```bash
pnpm run hub:jooby-smoke
```

Expect 20/20 hole-free CWL projection.
