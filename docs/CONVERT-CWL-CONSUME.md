# Convert consumes CWL — pillar complete handoff

**Status:** Convert consumer aligned to CWL **`1.0.88`** — **Rosetta Step 2 (Translation) closed**  
**Date:** 2026-10-01 (tip pin refreshed 2026-10-10 — tag `cwl-v1.0.88`, Convert [PR #100](https://github.com/AgenticOp-io/chrysalis/pull/100))  
**Doc index:** [`DOC-MAP.md`](./DOC-MAP.md) · gaps [`DOC-HOLES.md`](./DOC-HOLES.md)

## Done (this lane)

| Ask | Result |
| --- | --- |
| WebIR reverse-home | Junction + `file:../chrysalis-cwl/packages/webir` — [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md) |
| Rewrite headers | `RequestInput.headers` + `pickBag(..., "header")` — Verified (CWL `04` runtime-ok) |
| Language pin | `file:../chrysalis-cwl/packages/cwl` ≡ **`1.0.88`** (`hub:cwl-pin-smoke` → `CONVERT_TIP_1_0_88_OK`) |
| CI sibling | [`fixtures/ci/cwl-sibling.json`](../fixtures/ci/cwl-sibling.json) → `ref: cwl-v1.0.88` · `tipVersion: 1.0.88` |
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

**Registry:** `@agenticop-io/cwl@1.0.88` via [`.npmrc.example`](../.npmrc.example) (do not commit tokens).

```json
"@agenticop-io/cwl": "1.0.88"
```

## DNA fingerprint / proof consume honesty (tips 1.0.85–1.0.88)

Convert peels these as **document facts** (parse + hole catalog + peel smoke). It does **not** invent Helix verify, witness fetch, digests, or PQ hashes. Canonical RFCs live only in **chrysalis-cwl**.

| Tip | CWL RFC (SoR) | Gold | Convert honesty |
| --- | --- | --- | --- |
| 1.0.85 | [RFC-0042 dna-fingerprint](../../chrysalis-cwl/docs/language/CWL-RFC-0042-dna-fingerprint.md) | `94` | `dna certificate` / `dna fingerprint` / `dna bank` / `match live` — refuse bad URL/bank shapes |
| 1.0.86 | [RFC-0043 fingerprint-strong](../../chrysalis-cwl/docs/language/CWL-RFC-0043-dna-fingerprint-strong.md) | `95` | sha384+/sha512 required; `sha256` → `cwl:dna-fingerprint-too-weak` |
| 1.0.87 | [RFC-0044 dna-proof](../../chrysalis-cwl/docs/language/CWL-RFC-0044-dna-proof.md) | `96` | Multi-fingerprint · `match bank` · `dna expect` — document facts |
| **1.0.88** | [RFC-0045 dna-proof-unit](../../chrysalis-cwl/docs/language/CWL-RFC-0045-dna-proof-unit.md) | `97` | Named `dna proof` / `use dna proof` · quorum · lineage · supersedes · witness · scope |

Gate: `hub:genome-deepen-peel-smoke` (peel `40`–`63`; golds `94`–`97` catalogued). DESIGN **D6596–D6599**.

## Convert oracle wait (do not invent)

Opaque `g_*` / DB evaluate, foreach N-iteration HTML, browser island **execution** — honest holes until oracle authority (**D6447**). Named residual ledger: [`CONVERT-EXEC-CEILINGS.md`](./CONVERT-EXEC-CEILINGS.md). See CWL `DNA-BUILD-NEXT.md` (queue CLOSED for language; sibling wait remains).

## Reply shapes

```text
CONVERT_GRAVITY: ok
CWL_PIN: file:1.0.88 (registry @agenticop-io/cwl@1.0.88 ready via .npmrc.example)
CWL_SIBLING_REF: cwl-v1.0.88
WEBIR: reverse-home ok
SMOKES: hub:convert-gravity-smoke (pin · pillar · helix · holes · above-code)
PATH_STEP_2: Translation closed
DNA_DOCS: RFC-0042..0045 / golds 94–97 document facts only
```
