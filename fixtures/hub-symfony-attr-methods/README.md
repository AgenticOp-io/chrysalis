# Symfony method-list attribute probe (G123)

Focused fixture proving `#[Route]` method declarations are ingested faithfully
in both PHP forms:

- scalar string: `#[Route('/submit', methods: 'POST')]` -> `POST /submit`
- multi-method array: `#[Route('/resource', methods: ['GET', 'POST'])]` -> `GET /resource` + `POST /resource`

`hub-symfony-routes.mjs` expands each declaration to one route per method and
verifies parity across **attributes ↔ `config/routes.yaml` ↔ `chrysalis.routes.json`**.

```bash
pnpm run hub:symfony-routes fixtures/hub-symfony-attr-methods
```
