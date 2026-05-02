# dedupe-identical-handlers

Minimal Chrysalis fixture: two GET routes whose PHP sources are **byte-identical**, so ingest + **`emitHandlerBody`** produce the same lowered body and **DESIGN D282** dedupe can emit one **`src/chrysalis-deduped/`** module. Used by **`packages/cli/tests/emit-dedupe-identical-handler-bodies-cli.test.ts`**.
