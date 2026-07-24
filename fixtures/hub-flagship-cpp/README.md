# hub-flagship-cpp

Twenty-route **C++** flagship via existing **silver file-lift** (`HUB_SILVER_FILE_LIFT_ORIGIN_IDS`): one `GET` route per `.cpp` under `routes/`, literal body, hole-free. Mirrors express **route count**, not verb/JSON/param depth (**D6447** — no invented Crow/httplib dialect).

## Blocker

C++ ingest today has no HTTP-framework AST. Cannot honestly lower `POST`/`PUT`/`PATCH`/`DELETE`, path/query params, JSON objects, or non-200 status. Strongest green ST is GET-literal 20/20.

## Prove

```bash
pnpm run hub:cpp-flagship
pnpm run hub:complete-conversion-prove:cpp
```

Expect `stGreen`+`stClosed` (`proveProfile: cwl-api`) for the silver surface above.
