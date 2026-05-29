# Symfony flagship pilot (G118)

Twenty-route **Symfony-shaped** PHP app (10 baseline + 10 CRUD/search slice) for hub structural + trace gold. **`config/routes.yaml`** is the human source of truth; **`hub-symfony-routes.mjs`** derives the route manifest from it and verifies parity with **`chrysalis.routes.json`** (which **`@chrysalis/ingest`** consumes). The engine stays manifest-driven (no YAML dependency); the JSON is the verified ingest projection.

```bash
pnpm run hub:symfony-routes   # parity: config/routes.yaml <-> chrysalis.routes.json
```

```bash
pnpm run hub:symfony-flagship
node scripts/hub-ingest/hub-gold-verify.mjs --suite symfony-flagship-hono
```

Controllers use **`__invoke()`** with real Symfony **`#[Route(...)]`** attributes and hole-free `header` / `json_encode` bodies (same semantics as **`hub-flagship-plain-php`**). The `__invoke()` method bodies are lifted as the route handler (parser bridge hoists `__invoke` to a `Class::__invoke` `FunctionDecl`; ingest's `selectRouteHandlerStatements` selects it when there are no top-level statements — keyed off the PHP invokable convention, not Symfony), so the CWL projection carries full object/param/status fidelity (G132). `hub-symfony-routes.mjs` verifies **attributes ↔ `config/routes.yaml` ↔ `chrysalis.routes.json`** all agree. Class-level `#[Route('/prefix')]` prefixes are combined with method routes — see **`fixtures/hub-symfony-attr-prefix`** (G122). The four `/items/{id}` controllers (**show / update / patch / delete**) carry a live class-level `#[Route('/items', name: 'items_')]` prefix + method `#[Route('/{id}', name: 'show', ...)]`, exercising both **path** and **name** prefix combination end-to-end: the resolved names (`items_show`, …) match the `config/routes.yaml` keys, verified by `routesNameParity` (G127 path, G129 name). The **collection** controllers `ItemsListController` (GET) and `ItemsCreateController` (POST) use the same prefix with an **empty method path** (`#[Route('', name: 'list', ...)]`), resolving to the bare `/items` with names `items_list`/`items_create` (G130).
