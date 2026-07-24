# hub-gold-quarkus

Gold fixture for **Quarkus** HTTP resources as a Java secondary dialect
(secondary to Spring `hub-flagship-java` D6448-ST). Quarkus uses standard
**JAX-RS** (`jakarta.ws.rs.*` `@Path` + `@GET|POST|…`). Route surface only —
**reuses G10012 JAX-RS peels**; no CDI / RESTEasy filters / Panache invent (**D6447**).

## Files

- `src/HubResource.java` — 20 routes: class `@Path` + method `@Path` +
  `@GET|POST|PUT|PATCH|DELETE`, `{id}` paths, `@PathParam` / `@QueryParam` +
  `@DefaultValue`, `Map.of` + `Response.status().entity().build()` (same shape
  as `hub-gold-jaxrs`; Quarkus-labeled + `jakarta.ws.rs` imports).

## Smoke

```bash
pnpm run hub:quarkus-smoke
```

Expect 20/20 hole-free CWL projection via existing JAX-RS lift path (`hub:jaxrs-smoke` peels).
Leadership claim: Quarkus route surface via JAX-RS peels (**D6496** / **G10034**).
