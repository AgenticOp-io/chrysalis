# Chrysalis Web Language (CWL) — RFC index

CWL evolves by **RFC**: each proposal must cite cross-language evidence (path knowledge, gold suites, or oracle traces) and lower to WebIR without a second IR.

| RFC | Title | Status |
| --- | --- | --- |
| [0001](CWL-RFC-0001-module-use-middleware.md) | Module `use json` / `use urlencoded` | accepted |
| [0002](CWL-RFC-0002-path-parameters.md) | Path parameters (`:id` templates) | accepted |
| [0003](CWL-RFC-0003-query-parameters.md) | Query parameters (`query name;`) | accepted |
| [0004](CWL-RFC-0004-request-context.md) | Headers and cookies | accepted |
| [0005](CWL-RFC-0005-request-body.md) | JSON request body fields | accepted |
| [0006](CWL-RFC-0006-response-status.md) | Response status | accepted |
| [0007](CWL-RFC-0007-auth-effects.md) | Auth presets and effects | accepted |
| [0008](CWL-RFC-0008-response-content-type.md) | Response content-type | accepted |

**Process**

1. Open RFC in `docs/CWL-RFC-NNNN-*.md` with motivation, syntax, WebIR mapping, and verify plan.
2. Add parser + ingest + fixture; extend `hub-gold-manifest` when behavior is CI-gated.
3. Record decision in `DESIGN.md` and checklist item in `ROADMAP.md`.
