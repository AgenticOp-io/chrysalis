# @chrysalis/runtime-chimera

## Purpose

The production-time runtime that makes **dual-stack coexistence** work. Runs
legacy PHP and the newly-generated TypeScript app behind a single origin, with
shared session and shared database, and controls traffic per route, per cohort,
or per percentage.

This is the package that makes Chrysalis adoption safe.

## Public API

- `createChimera(config: ChimeraConfig)` — returns an HTTP server / middleware
- `Router` — per-route modes: `legacy`, `shadow`, `canary`, `cutover`, `done`
- `SessionBridge` — Redis-backed default; PHP-side handler provided as a
  small bundled script
- `SchemaLens` — typed views; both stacks import the same schema module

## Invariants

- **One request, one stack.** A given request is served entirely by PHP or
  entirely by the new stack (except in `shadow`, where both run but only
  legacy's response is returned to the client).
- **Session wire format is stable.** Changing it is a breaking change to
  existing migrations and requires a major version bump.
- **Shadow diffs are first-class reports.** Emitted in the same schema as
  `@chrysalis/verify`'s `CorrectnessReport`.
- **No hidden state.** The router's config is declarative and loadable from a
  single JSON/TOML file per environment.

## Non-goals

- Being a general-purpose service mesh or reverse proxy.
- Supporting non-HTTP protocols (queues, websockets) on day one.
- Abstracting away the database. The schema lens is a thin typed view; there
  is no query translation layer here.
