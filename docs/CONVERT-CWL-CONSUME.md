# Convert consumes CWL — pillar complete handoff

**Status:** Convert consumer aligned to CWL **`1.0.16`** (CWL-owned DNA queue **CLOSED**)  
**Date:** 2026-08-09

## Done (this lane)

| Ask | Result |
| --- | --- |
| WebIR reverse-home | Junction + `file:../chrysalis-cwl/packages/webir` — [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md) |
| Rewrite headers | `RequestInput.headers` + `pickBag(..., "header")` — Verified (CWL `04` runtime-ok) |
| Language pin | `file:../chrysalis-cwl/packages/cwl` ≡ **`1.0.16`** (`hub:cwl-pin-smoke`) |
| Cutover / pillar smokes | `hub:cwl-helix-cutover-smoke` · `hub:cwl-language-pillar-smoke` |
| Fat ingest 1.0.5–1.0.9 | response-header / HTML wrap / earlyGuards / foreach+else |
| Fat ingest 1.0.14 | Nested foreach/if after `return` kept as documentation IR (`cwl-control-lower` continue) |
| Fat emit reverse | Convert `hub-webir-routes`; pillar thin emit is CWL-owned |
| Dual-mode fmt | Locked — [`CWL-FMT-DUAL-MODE.md`](./CWL-FMT-DUAL-MODE.md) |
| Sibling dists | `rewrite` + `emit-shared` buildable for pillar `runtime-cwl` |

## Pin policy

**Default:** `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"`.

**Registry:** `@agenticop-io/cwl@1.0.16` via [`.npmrc.example`](../.npmrc.example) (do not commit tokens).

```json
"@agenticop-io/cwl": "1.0.16"
```

## Convert oracle wait (do not invent)

Opaque `g_*` / DB evaluate, foreach N-iteration HTML, browser island **execution** — honest holes until oracle authority (**D6447**). See CWL `DNA-BUILD-NEXT.md` (queue CLOSED for language; sibling wait remains).

## Reply shapes

```text
CONVERT_GRAVITY: ok
CWL_PIN: file:1.0.16 (registry @agenticop-io/cwl@1.0.16 ready via .npmrc.example)
WEBIR: reverse-home ok
SMOKES: hub:cwl-language-pillar-smoke · hub:cwl-helix-cutover-smoke · hub:cwl-early-exit-smoke · hub:cwl-attachment-holes-smoke
```
