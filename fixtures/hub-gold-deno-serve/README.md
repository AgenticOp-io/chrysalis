# hub-gold-deno-serve

Secondary **Deno.serve** JS/TS ORIGIN dialect gold (route-surface). Express/TS remain D6448-ST.

- Gate: **G10118** / **D6543**
- Smoke: `pnpm run hub:deno-serve-smoke`
- Peels: `Deno.serve(handler)` + literal `${method} ${pathname}` switch + `Response.json` (CF Workers peel reuse)
- Honest holes: URLPattern, `@std/http` route, invented `{ routes }`, dynamic `:id` — see `fixtures/ci/deno-serve-honest-skip.json`
