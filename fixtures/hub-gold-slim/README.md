# hub-gold-slim

Gold fixture for **Slim** as a PHP secondary dialect (secondary to Laravel min /
Symfony / plain-php D6448-ST). Route surface only — no PSR-15 middleware onion
invent (**D6447**). G10028 / D6490.

## Files

- `app.php` — 20 Slim routes: `$app->get|post|…`, `{id}` paths,
  `$args['…']`, `$request->getQueryParams()`, `$response->withJson` /
  `withStatus(n)->withJson` / `getBody()->write(json_encode(...))`.

## Smoke

```bash
pnpm run hub:slim-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `$app->add` / PSR-15 middleware chains | not lowered |
| `$app->group` nesting beyond cheap peel | not lowered |
| Named class / invokable handlers | not lowered (no invent) |
| Non-literal path templates | not lowered |
