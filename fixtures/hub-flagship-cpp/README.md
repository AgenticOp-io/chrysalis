# hub-flagship-cpp

Twenty-route **C++** flagship via **Crow** HTTP framework AST (`cpp-ast-ingest.mjs`): express-depth verbs, path/query params, JSON objects, and non-200 status — hole-free. Mirrors `hub-flagship-express` / Go Gin / Rust Actix (**D6447** — real Crow idioms, not an invented dialect). Secondary **cpp-httplib** dialect: `fixtures/hub-gold-cpp-httplib` + `pnpm run hub:cpp-httplib-smoke`.

## Prove

```bash
pnpm run hub:cpp-flagship
pnpm run hub:complete-conversion-prove:cpp
pnpm run hub:cpp-httplib-smoke
```

Expect `stGreen`+`stClosed` (`proveProfile: cwl-api`) for the Crow express-depth surface above.
