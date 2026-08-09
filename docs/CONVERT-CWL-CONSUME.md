# Convert consumes CWL — pillar complete handoff

**Status:** Convert consumer aligned to CWL **`1.0.6`** (execute matrix 16; includes 1.0.4–1.0.5)  
**Date:** 2026-08-09

## Done (this lane)

| Ask | Result |
| --- | --- |
| WebIR reverse-home | Junction + `file:../chrysalis-cwl/packages/webir` — [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md) |
| Rewrite headers | `RequestInput.headers` + case-insensitive `pickBag(..., "header")` — `@chrysalis/rewrite` (CWL `04` runtime-ok) |
| Language pin | `file:../chrysalis-cwl/packages/cwl` ≡ **`1.0.6`** (`hub:cwl-pin-smoke`) |
| Cutover / pillar smokes | `hub:cwl-helix-cutover-smoke` · `hub:cwl-language-pillar-smoke` |
| Honest landings | D6442/D6447 unchanged — peels emit holes, no façades |
| Package subpaths | Pin smoke proves `parser` / `print` / `diagnose` / `lsp-map` / `dna-seed` |
| Fat ingest RFC-0024 | `attachmentHoles` + return body — `hub:cwl-attachment-holes-smoke` |
| Fat ingest 1.0.5–1.0.6 | `response-header` → `ResponseAttrs.headers`; HTML single response wrap — `hub:cwl-execute-ingest-parity-smoke` |
| Sibling dists | `rewrite` + `emit-shared` dists kept buildable for pillar `runtime-cwl` |

## Pin policy

**Default (sibling checkout):** keep `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"` so junctions + tip stay aligned.

**Registry (GitHub Packages):** published name `@agenticop-io/cwl@1.0.6`. Copy [`.npmrc.example`](../.npmrc.example) → local `.npmrc` (gitignored) with a Packages token (`gh auth token` with `read:packages`), then:

```json
"@agenticop-io/cwl": "1.0.6"
```

Do not commit tokens. Local `file:` remains valid cutover per CWL Exit 1.0 docs.

## CWL still owns (not Convert)

Optional remaining golds stay ingest/diagnose-only until simulate can prove them (holes, form-action, middleware depth, nested control, DNA bridge) — see CWL `DNA-BUILD-NEXT.md`.

## Reply shapes

```text
CONVERT_GRAVITY: ok
CWL_PIN: file:1.0.6 (registry @agenticop-io/cwl@1.0.6 ready via .npmrc.example)
WEBIR: reverse-home ok
SMOKES: hub:cwl-language-pillar-smoke · hub:cwl-helix-cutover-smoke · hub:webir-resolve-smoke · hub:cwl-attachment-holes-smoke · hub:cwl-execute-ingest-parity-smoke

CONVERT_REWRITE_HEADERS: ok
REWRITE: RequestInput.headers + pickBag header

CONVERT_FAT_ATTACHMENT_HOLES: ok
RFC-0024: fat cwl-ingest keeps attachmentHoles + return body

CONVERT_EXECUTE_INGEST_PARITY: ok
1.0.5 response-header · 1.0.6 HTML single wrap
```
