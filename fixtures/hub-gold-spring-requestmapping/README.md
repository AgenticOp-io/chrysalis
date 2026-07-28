# hub-gold-spring-requestmapping

Gold fixture for **Spring MVC class+method `@RequestMapping` edge peels**
(secondary deepen of Spring `hub-flagship-java` D6448-ST; **G10071 / D6533**).
Route surface only — no DI / filter invent (**D6447**).

## Files

- `src/HubController.java` — 20 routes: class `@RequestMapping("/api")` prefix join,
  method `@GetMapping|PostMapping|…`, method-level `@RequestMapping(method=RequestMethod.*)`,
  multi-path `@GetMapping({"/health","/items"})`, `{id}` + `@PathVariable` / `@RequestParam`,
  `Map.of` + `ResponseEntity.status().body`.

## Smoke

```bash
pnpm run hub:spring-requestmapping-smoke
```

Expect 20/20 hole-free CWL projection (paths under `/api/…`).
