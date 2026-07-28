# hub-gold-lumen

Gold fixture for **Lumen / Laravel-router** as a PHP secondary dialect
(secondary to Laravel min / Symfony / plain-php D6448-ST). Route surface
only — no middleware onion or cross-file controller invent (**D6447**).
G10049 / D6511.

## Files

- `routes/web.php` — 20 Lumen routes: `$router->get|post|…`, `{id}` path
  args, `$request->query`, `response()->json` (+ status).

## Smoke

```bash
pnpm run hub:lumen-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `$router->group` / middleware chains | not lowered |
| Cross-file controller / invokable handlers | not lowered (Rails-class; no invent) |
| `Route::resource` / resource macros | not lowered |
| Non-literal path templates | not lowered |
| Request body / FormRequest validation | not lowered |
