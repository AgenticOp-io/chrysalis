# Convert consumes CWL — pillar complete handoff

**Status:** Convert consumer aligned to CWL **`1.0.13`** (CI WebIR + emit catalog/CLI; includes 1.0.4–1.0.12)
**Date:** 2026-08-09

## Done (this lane)

| Ask | Result |
| --- | --- |
| WebIR reverse-home | Junction + `file:../chrysalis-cwl/packages/webir` — [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md) |
| Rewrite headers | `RequestInput.headers` + case-insensitive `pickBag(..., "header")` — `@chrysalis/rewrite` |
| Language pin | `file:../chrysalis-cwl/packages/cwl` ≡ **`1.0.13`** (`hub:cwl-pin-smoke`) |
| Cutover / pillar smokes | `hub:cwl-helix-cutover-smoke` · `hub:cwl-language-pillar-smoke` |
| Fat ingest 1.0.5–1.0.9 | response-header / HTML wrap / earlyGuards / foreach+else — parity + early-exit smokes |
| Fat emit reverse | Convert `hub-webir-routes` (response chrome, earlyGuards, foreach); pillar thin emit is CWL-owned (`cwl-emit-*` / `hub-emit-cwl-webir`) |
| Dual-mode fmt | Locked — Convert WebIR fmt vs pillar parse→print; pillar `--webir` is **thin** emit reverse, not a replace for Convert fat fmt — [`CWL-FMT-DUAL-MODE.md`](./CWL-FMT-DUAL-MODE.md) |
| Hole catalog | Junctioned `cwl-fullstack-holes` includes `cwl:emit:*` residuals (1.0.13) |
| Sibling dists | `rewrite` + `emit-shared` dists kept buildable for pillar `runtime-cwl` |

## Pin policy

**Default (sibling checkout):** keep `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"`.

**Registry:** `@agenticop-io/cwl@1.0.13` via [`.npmrc.example`](../.npmrc.example) (do not commit tokens).

```json
"@agenticop-io/cwl": "1.0.13"
```

## CWL still owns / Convert oracle wait

Opaque `g_*` / DB evaluate, foreach N-iteration HTML, browser island **execution** — honest holes until oracle authority; do not invent (**D6447**).

## Reply shapes

```text
CONVERT_GRAVITY: ok
CWL_PIN: file:1.0.13 (registry @agenticop-io/cwl@1.0.13 ready via .npmrc.example)
WEBIR: reverse-home ok
SMOKES: hub:cwl-language-pillar-smoke · hub:cwl-helix-cutover-smoke · hub:cwl-early-exit-smoke · hub:cwl-attachment-holes-smoke
```
