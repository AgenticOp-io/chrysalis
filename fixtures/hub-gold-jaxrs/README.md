# hub-gold-jaxrs

Gold fixture for **JAX-RS** (`@Path` + `@GET|POST|…`) attribute routes as a Java secondary dialect
(secondary to Spring `hub-flagship-java` D6448-ST). Route surface only —
no CDI / filters / Application subclass invent (**D6447**).

## Files

- `src/HubResource.java` — 20 routes: class `@Path` + method `@Path` +
  `@GET|POST|PUT|PATCH|DELETE`, `{id}` paths, `@PathParam` / `@QueryParam` +
  `@DefaultValue`, `Map.of` + `Response.status().entity().build()`.

## Smoke

```bash
pnpm run hub:jaxrs-smoke
```

Expect 20/20 hole-free CWL projection.
