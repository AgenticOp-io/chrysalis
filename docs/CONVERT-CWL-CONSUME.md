# Convert consumes CWL — pillar complete handoff

**Status:** Convert consumer aligned to CWL **`1.0.10`** (foreach/else fat lower + tip pin; includes 1.0.4–1.0.9)  
**Date:** 2026-08-09

## Done (this lane)

| Ask | Result |
| --- | --- |
| WebIR reverse-home | Junction + `file:../chrysalis-cwl/packages/webir` — [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md) |
| Rewrite headers | `RequestInput.headers` + case-insensitive `pickBag(..., "header")` — `@chrysalis/rewrite` |
| Language pin | `file:../chrysalis-cwl/packages/cwl` ≡ **`1.0.10`** (`hub:cwl-pin-smoke`) |
| Cutover / pillar smokes | `hub:cwl-helix-cutover-smoke` · `hub:cwl-language-pillar-smoke` |
| Honest landings | D6442/D6447 unchanged — peels emit holes, no façades |
| Fat ingest RFC-0024 | `attachmentHoles` — `hub:cwl-attachment-holes-smoke` |
| Fat ingest 1.0.5–1.0.6 | `response-header` + HTML single wrap — `hub:cwl-execute-ingest-parity-smoke` |
| Fat ingest 1.0.8–1.0.9 | `wrapWithEarlyGuards` + `appendForeachBindings` / else — `hub:cwl-early-exit-smoke` (v2) |
| Fat emit reverse | Convert `hub-webir-routes` already projects earlyGuards/foreach (pillar thin emit is CWL-owned `cwl-emit-control`) |
| Sibling dists | `rewrite` + `emit-shared` dists kept buildable for pillar `runtime-cwl` |

## Pin policy

**Default (sibling checkout):** keep `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"` so junctions + tip stay aligned.

**Registry (GitHub Packages):** published name `@agenticop-io/cwl@1.0.10`. Copy [`.npmrc.example`](../.npmrc.example) → local `.npmrc` (gitignored) with a Packages token (`gh auth token` with `read:packages`), then:

```json
"@agenticop-io/cwl": "1.0.10"
```

Do not commit tokens. Local `file:` remains valid cutover per CWL Exit 1.0 docs.

## CWL still owns (not Convert)

Opaque `g_*` / DB evaluate, foreach N-iteration HTML under simulate, browser island events — see CWL `DNA-BUILD-NEXT.md`. Do not invent from Convert.

## Reply shapes

```text
CONVERT_GRAVITY: ok
CWL_PIN: file:1.0.10 (registry @agenticop-io/cwl@1.0.10 ready via .npmrc.example)
WEBIR: reverse-home ok
SMOKES: hub:cwl-language-pillar-smoke · hub:cwl-helix-cutover-smoke · hub:cwl-attachment-holes-smoke · hub:cwl-execute-ingest-parity-smoke · hub:cwl-early-exit-smoke

CONVERT_EARLY_EXIT_LOWER: ok
CONVERT_FOREACH_ELSE: ok
```
