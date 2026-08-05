# CWL fmt — dual-mode decision (Convert)

**Status:** locked (2026-08-05) — Slice 4 remainder of CWL WebIR extract  
**Authority:** pillar constitution §7 (`chrysalis-cwl/docs/language/CWL-PILLAR-HOME.md`); convert pointer [`CWL-PILLAR-HOME.md`](./CWL-PILLAR-HOME.md); sync note [`../scripts/hub-ingest/CWL-SCRIPTS-CANONICAL.md`](../scripts/hub-ingest/CWL-SCRIPTS-CANONICAL.md)

## Decision

There are **two** formatters. They are **not** interchangeable. Sync/mirrors must **never** overwrite convert `cwl-fmt.mjs` with the pillar file.

| Mode | Owner | Path | Mechanism | Schema |
| --- | --- | --- | --- | --- |
| **Language fmt** | **CWL pillar** | `chrysalis-cwl/scripts/hub-ingest/cwl-fmt.mjs` | parse → print (AST only; no WebIR) | `CWL_FMT_SCHEMA_VERSION` **2** |
| **WebIR fmt** | **Convert** | `chrysalis-convert/scripts/hub-ingest/cwl-fmt.mjs` | lift CWL → WebIR → render routes | `CWL_FMT_SCHEMA_VERSION` **1** (G1164 / D1164) |

Pillar `fmt:cwl` = language normalize. Convert `fmt:cwl:webir` (and `chrysalis cwl fmt`) = WebIR round-trip normalize used by hub/product gates.

## Operator commands

```bash
# Convert — WebIR round-trip fmt (this tree; do not replace with pillar)
pnpm run fmt:cwl:webir -- path/to/file.cwl
# or: node scripts/hub-ingest/cwl-fmt.mjs path/to/file.cwl
# or: chrysalis cwl fmt path/to/file.cwl

# CWL pillar — parse→print fmt (sibling tree; language bar)
cd ../chrysalis-cwl && npm run fmt:cwl -- path/to/file.cwl
```

## Why dual (honesty)

- **Language maturity** needs a WebIR-free fmt so `test:language` / CLI `fmt` stay runnable from the pillar alone.
- **Convert product gates** already depend on WebIR round-trip normalize (route list/render, import preservation). Replacing that with parse→print would silently change hub golds — a façade risk (**D6447**).
- Slice 4 of [`../chrysalis-cwl/docs/history/WEBIR-EXTRACT-PLAN.md`](../../chrysalis-cwl/docs/history/WEBIR-EXTRACT-PLAN.md) called for an **explicit** dual-mode decision; this doc is that decision.

## RFC-0022 / DNA — Convert does **not** own enforce

| Concern | Owner |
| --- | --- |
| CWL ↔ `app-dna-v1` **contract** + gold `24-dna-bridge` | **CWL** ([RFC-0022](../../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md)) |
| Seed / **compare** / **enforce** DNA; cutover identity compare | **Secure / Helix** (`engines/chrysalis-security`) |
| Convert WebIR round-trip on surface gold; consume bridge fixture | **Convert** (this lane) |

Convert may **consume** surface identity for optional cutover **compare notes**. It does **not** implement Helix learn/shadow/enforce, DNA signing, or firewall policy. Point cutover identity compare at Secure — not at `cwl-fmt` or convert hub smokes.

Prove language consume still green:

```bash
pnpm run hub:cwl-language-pillar-smoke
```
