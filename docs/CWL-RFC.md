# Chrysalis Web Language (CWL) — RFC index

CWL evolves by **RFC**: each proposal must cite cross-language evidence (path knowledge, gold suites, or oracle traces) and lower to WebIR without a second IR.

| RFC | Title | Status |
| --- | --- | --- |
| [0001](CWL-RFC-0001-module-use-middleware.md) | Module `use json` / `use urlencoded` | accepted |
| [0002](CWL-RFC-0002-path-parameters.md) | Path parameters (`:id` templates) | draft |

**Process**

1. Open RFC in `docs/CWL-RFC-NNNN-*.md` with motivation, syntax, WebIR mapping, and verify plan.
2. Add parser + ingest + fixture; extend `hub-gold-manifest` when behavior is CI-gated.
3. Record decision in `DESIGN.md` and checklist item in `ROADMAP.md`.
