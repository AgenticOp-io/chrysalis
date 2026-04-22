# @chrysalis/runtime-chimera

## Purpose

The production-time runtime that makes **dual-stack coexistence** work. Runs
legacy PHP and the newly-generated TypeScript app behind a single origin and
controls per-request traffic steering between the two stacks.

This is the package that makes Chrysalis adoption safe.

## Public API (Milestone 1)

- `startChimera(config: ChimeraConfig): Promise<ChimeraHandle>` — starts an HTTP
  reverse proxy that dispatches to either the legacy or modern upstream based on
  `config.mode` and `config.rules`. Returns a handle with `port`, `stats()`, and
  `stop()`.
- `compileRules(rules) / routeFor(compiled, method, path)` — the tiny route
  matcher. Patterns are `"/path"`, `"/prefix/*"`, or `"METHOD /path"`. First
  match wins.
- `Mode = "legacy" | "cutover" | "shadow"`
  - `legacy`   — every request → legacy PHP (baseline).
  - `cutover`  — routes with `target: "modern"` go to the new app; everything
                 else to legacy.
  - `shadow`   — every request → legacy (response returned to client); the same
                 request is mirrored to modern in the background and the two
                 responses are diffed with `@chrysalis/verify`. Divergences are
                 appended to `<shadowLogDir>/shadow.ndjson`. The client never
                 sees modern's output.

### CLI

```
chrysalis deploy --mode=<legacy|cutover|shadow> \
                 --legacy http://127.0.0.1:18080 \
                 --modern http://127.0.0.1:3000 \
                 [--port 8080] [--host 127.0.0.1] \
                 [--config chimera.json] \
                 [--shadow-log-dir reports/shadow]
```

`chimera.json` (all fields optional; flags override file values):

```json
{
  "mode": "cutover",
  "legacy": "http://127.0.0.1:18080",
  "modern": "http://127.0.0.1:3000",
  "rules": [
    { "match": "GET /api/*", "target": "modern" },
    { "match": "/health",   "target": "modern" }
  ]
}
```

## Invariants

- **One request, one stack (to the client).** In `cutover`, a given request is
  served entirely by one stack. In `shadow`, both run, but only legacy's
  response is returned.
- **Shadow never affects user-visible latency or errors.** The mirror is
  fire-and-observe; failures on the modern side are recorded as divergences,
  not surfaced to the client.
- **Shadow diffs are first-class reports.** Emitted in the same NDJSON format
  `@chrysalis/verify` uses, so dashboards can consume both sources uniformly.
- **No hidden state.** The router config is declarative and loadable from a
  single JSON file per environment.
- **Observability headers.** `x-chrysalis-target: legacy | modern | legacy-shadow`
  is always set on the response so operators can see which stack served.

## Non-goals (Milestone 1)

- **Session bridge.** Shared PHP `$_SESSION` ↔ new-stack session store is
  deferred to Milestone 2 (provisionally Redis-backed). For now, if you cut a
  route over, it must be session-independent **or** the new stack must read
  the same session store PHP writes.
- **Canary / percentage routing.** Deferred to Milestone 2.
- **Protocols other than HTTP/1.1.** No websockets, SSE, or queue traffic.
- **Query translation.** There is no database abstraction here; both stacks talk
  to the same DB directly.
