# oracle-python

## Purpose

Minimal **HTTP trace recorder** for Python web apps (Flask/FastAPI-style). Produces NDJSON traces compatible with `@chrysalis/oracle` / `@chrysalis/verify` replay — the hub lane for non-PHP origins, not a second `@chrysalis/ingest`.

## Public API

- `Recorder` — request-scoped capture (`on_request_start`, `on_response`, `flush`)
- `record_smoke.py` — CLI smoke that writes one trace under `traces/`

## Invariants

- No `Date.now()` / env / network inside generated handlers; recorder runs on the **legacy** Python process only.
- Redaction hooks mirror `oracle-php` semantics at a minimal subset (authorization, cookie headers).

## Non-goals

- Full WSGI/ASGI middleware packaging for every framework.
- Replacing Chrysalis PHP oracle for Laravel/WordPress stacks.
