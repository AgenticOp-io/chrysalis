# Symfony class-prefix attribute probe (G122)

Focused fixture proving class-level `#[Route('/api')]` prefixes combine with
method-level `#[Route('/items/{id}', ...)]` attributes. `hub-symfony-routes.mjs`
resolves the combined path (`/api/items/{id}`) and verifies parity across
**attributes ↔ `config/routes.yaml` ↔ `chrysalis.routes.json`**.

```bash
pnpm run hub:symfony-routes fixtures/hub-symfony-attr-prefix
```
