# Session resolve probe

PHP **`$_SESSION`** read lowered to **`effect.session.read`** for runtime-cwl **`resolveSession`** parity (**G6226**).

| Route | File |
| --- | --- |
| `GET /whoami` | `pages/whoami.php` |

```bash
pnpm exec vitest run packages/runtime-cwl/tests/runtime.test.ts -t "session-resolve-probe"
```
