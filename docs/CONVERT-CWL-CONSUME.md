# Convert consumes CWL — pillar complete handoff

**Status:** Convert consumer aligned to CWL **`1.0.24`** — **Rosetta Step 2 (Translation) closed**  
**Date:** 2026-08-09

## Done (this lane)

| Ask | Result |
| --- | --- |
| WebIR reverse-home | Junction + `file:../chrysalis-cwl/packages/webir` — [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md) |
| Rewrite headers | `RequestInput.headers` + `pickBag(..., "header")` — Verified (CWL `04` runtime-ok) |
| Language pin | `file:../chrysalis-cwl/packages/cwl` ≡ **`1.0.24`** (`hub:cwl-pin-smoke`) |
| Cutover / pillar smokes | `hub:cwl-helix-cutover-smoke` · `hub:cwl-language-pillar-smoke` |
| Fat ingest 1.0.5–1.0.9 | response-header / HTML wrap / earlyGuards / foreach+else |
| Fat ingest 1.0.14 | Nested foreach/if after `return` kept as documentation IR (`cwl-control-lower` continue) |
| DNA seed 1.0.17+ | Package `dna-seed` exports Helix-parity FPs + `pathTemplateShapeEqual` (junction) |
| Fat emit reverse | Convert `hub-webir-routes`; pillar thin emit is CWL-owned |
| Dual-mode fmt | Locked — [`CWL-FMT-DUAL-MODE.md`](./CWL-FMT-DUAL-MODE.md) |
| Sibling dists | `rewrite` + `emit-shared` buildable for pillar `runtime-cwl` |
| **Step 2 Translation** | Honest peel/emit gravity — [`CONVERT-GRAVITY.md`](./CONVERT-GRAVITY.md) · `hub:convert-gravity-smoke` |

## Pin policy

**Default:** `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"`.

**Registry:** `@agenticop-io/cwl@1.0.24` via [`.npmrc.example`](../.npmrc.example) (do not commit tokens).

```json
"@agenticop-io/cwl": "1.0.24"
```

## Convert oracle wait (do not invent)

Opaque `g_*` / DB evaluate, foreach N-iteration HTML, browser island **execution** — honest holes until oracle authority (**D6447**). See CWL `DNA-BUILD-NEXT.md` (queue CLOSED for language; sibling wait remains).

## Reply shapes

```text
CONVERT_GRAVITY: ok
CWL_PIN: file:1.0.24 (registry @agenticop-io/cwl@1.0.24 ready via .npmrc.example)
WEBIR: reverse-home ok
SMOKES: hub:convert-gravity-smoke (pin · pillar · helix · holes · above-code)
PATH_STEP_2: Translation closed
```
