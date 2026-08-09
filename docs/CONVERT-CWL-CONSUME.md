# Convert consumes CWL — pillar complete handoff

**Status:** Convert consumer closeout vs CWL **`1.0.3`** ([`DNA-CWL-COMPLETE.md`](../../chrysalis-cwl/docs/history/DNA-CWL-COMPLETE.md))  
**Date:** 2026-08-09

## Done (this lane)

| Ask | Result |
| --- | --- |
| WebIR reverse-home | Junction + `file:../chrysalis-cwl/packages/webir` — [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md) |
| Rewrite headers | `RequestInput.headers` + case-insensitive `pickBag(..., "header")` — `@chrysalis/rewrite` |
| Language pin | `file:../chrysalis-cwl/packages/cwl` ≡ **`1.0.3`** (`hub:cwl-pin-smoke`) |
| Cutover / pillar smokes | `hub:cwl-helix-cutover-smoke` · `hub:cwl-language-pillar-smoke` |
| Honest landings | D6442/D6447 unchanged — peels emit holes, no façades |
| Package subpaths | Pin smoke proves `parser` / `print` / `diagnose` / `lsp-map` / `dna-seed` |

## Pin policy

**Default (sibling checkout):** keep `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"` so junctions + tip stay aligned.

**Registry (GitHub Packages):** published name `@agenticop-io/cwl@1.0.3`. Copy [`.npmrc.example`](../.npmrc.example) → local `.npmrc` (gitignored) with a Packages token (`gh auth token` with `read:packages`), then:

```json
"@agenticop-io/cwl": "1.0.3"
```

Do not commit tokens. Local `file:` remains valid cutover per CWL Exit 1.0 docs.

## CWL still owns (not Convert)

- Wire HTTP `Headers` → `RequestInput.headers` in pillar `buildRequestInput`
- Mark `04-request-context` **`runtime-ok`** and runtime matrix **6**

Rewrite contract is ready on Convert (`packages/rewrite` dist).

## Reply shapes

```text
CONVERT_GRAVITY: ok
CWL_PIN: file:1.0.3 (registry @agenticop-io/cwl@1.0.3 ready via .npmrc.example)
WEBIR: reverse-home ok
SMOKES: hub:cwl-language-pillar-smoke · hub:cwl-helix-cutover-smoke · hub:webir-resolve-smoke

CONVERT_REWRITE_HEADERS: ok
REWRITE: RequestInput.headers + pickBag header
READY_FOR_CWL: mark 04 runtime-ok · matrix 6
```
