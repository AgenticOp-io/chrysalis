# lift-helper-dedupe-control

Positive control for **D283** structural dedupe (**`docs/IR-HELPER-LIFTING.md`** B1).

PHP ingest of separate route files does **not** shrink with dedupe when only the handler bodies match: each
**`web.request` / `route`** node carries a distinct **`path`** (and per-file **`origin`**). That is expected.

The **dedupe shrink** control lives in Vitest (synthetic WebIR with shared **`origin`**, same as
**`packages/webir/tests/merge-modules.test.ts`**). This fixture provides a minimal ingest smoke target.

Contrast **`fixtures/lift-helper-gap-probe/`** (near-duplicate helpers; dedupe does not merge).

Vitest: **`packages/ingest/tests/lift-helper-gap-probe.test.ts`**.
