# hub-gold-micronaut

Gold fixture for **Micronaut** (`@Controller` + `@Get|Post|…`) attribute routes as a Java secondary dialect
(secondary to Spring `hub-flagship-java` D6448-ST). Route surface only —
no DI / filters / Application invent (**D6447**).

## Files

- `src/HubController.java` — 20 routes: class `@Controller` + method
  `@Get|Post|Put|Patch|Delete`, `{id}` paths, `@PathVariable` / `@QueryValue` +
  `defaultValue`, `Map.of` + `HttpResponse.status().body()`.

## Smoke

```bash
pnpm run hub:micronaut-smoke
```

Expect 20/20 hole-free CWL projection.
