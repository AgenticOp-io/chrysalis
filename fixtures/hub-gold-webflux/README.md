# hub-gold-webflux

Gold fixture for **Spring WebFlux RouterFunctions**
(`route(GET|POST|…("/path"), req -> …)` / `.andRoute`) as a Java secondary dialect
(secondary to Spring MVC `@RestController` `hub-flagship-java` D6448-ST). Route surface
only — no WebClient invent (**D6447**).

## Files

- `src/HubApp.java` — 20 routes: `route(GET("/path"), req -> …)` + `.andRoute`,
  `{id}` paths, `req.pathVariable` / `req.queryParam(…).orElse("")`,
  `ServerResponse.ok().bodyValue` / `ServerResponse.status(n).bodyValue`, Map.of / scalar bodies.

## Smoke

```bash
pnpm run hub:webflux-smoke
```

Expect 20/20 hole-free CWL projection.
