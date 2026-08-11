# CWL pillar home (Convert pointer)

**CWL is THE language of the web for Chrysalis.**  
This convert tree **translates** into and out of it ï¿½ it does not redefine it.

## Canonical docs (read these)

| Doc | Path |
| --- | --- |
| **Constitution** | [`../chrysalis-cwl/docs/language/CWL-PILLAR-HOME.md`](../../chrysalis-cwl/docs/language/CWL-PILLAR-HOME.md) |
| Language reference | [`../chrysalis-cwl/docs/language/CWL.md`](../../chrysalis-cwl/docs/language/CWL.md) |
| RFC index | [`../chrysalis-cwl/docs/language/CWL-RFC.md`](../../chrysalis-cwl/docs/language/CWL-RFC.md) |
| RFC-0022 DNA bridge | [`../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md`](../../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md) |
| **Fmt dual-mode** | [`CWL-FMT-DUAL-MODE.md`](./CWL-FMT-DUAL-MODE.md) ï¿½ pillar parse?print; convert keeps WebIR fmt |
| Version | [`../chrysalis-cwl/LANGUAGE_VERSION.md`](../../chrysalis-cwl/LANGUAGE_VERSION.md) |
| Roadmap | [`../chrysalis-cwl/docs/history/ROADMAP.md`](../../chrysalis-cwl/docs/history/ROADMAP.md) |
| Portfolio | `AgenticOps/docs/THREE_PILLARS.md` |

**Primary tree:** `engines/chrysalis-cwl`  
**Repo:** https://github.com/AgenticOp-io/chrysalis-cwl  
**Pinned language:** see sibling `LANGUAGE_VERSION.md` (currently **`1.0.23`** -- genome deepen OPEN (named UI islands + form event contracts / gold 33))
**Consume closeout:** [`CONVERT-CWL-CONSUME.md`](./CONVERT-CWL-CONSUME.md) — WebIR: [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md)

## Pin note (Exit 1.0+)

Convert pins `@chrysalis/cwl` as **`file:../chrysalis-cwl/packages/cwl`** (tip **1.0.23**). Registry name `@agenticop-io/cwl` is published on GitHub Packages ï¿½ see [`.npmrc.example`](../.npmrc.example). Also resolve the language pillar via:

1. Sibling `../chrysalis-cwl` under `AgenticOps/engines/`  
2. Env **`CHRYSALIS_CWL_ROOT`** ? absolute path to that repo root (smokes / tools)

Authority + registry pin: [`chrysalis-cwl/docs/language/CWL-PUBLISH.md`](../../chrysalis-cwl/docs/language/CWL-PUBLISH.md). Junctions / `sync:convert` remain the ops path for mirrored scripts.

## Before changing CWL behavior

1. Open / edit **`engines/chrysalis-cwl`**
2. Add or update `fixtures/language-gold` when syntax/semantics change
3. Run `npm run test:language` there (round-trip + diagnose + DNA bridge contract)
4. Sync mirrors: from CWL tree run `npm run sync:convert`  
   Prefer **junctions** (`npm run setup:mirrors` / `test:cwl-mirrors`) over copies.  
   Language-owned: `cwl-parser`, `cwl-print`, `cwl-ui-tree`, module-graph, diagnose, fullstack-holes (+ WebIR helpers when syncing)

Do **not** invent divergent parser/grammar semantics only under convert.

## What Convert owns vs pulls

| Owns (convert) | Pulls from CWL |
| --- | --- |
| Origin lift / inventory / Chimera | Grammar, RFCs, parse/print AST |
| WebIR package (until extracted) | Language golds / version |
| Hub product golds + ST proves | Hole honesty bar |
| WebIR round-trip `cwl-fmt` (`fmt:cwl:webir`) | Local parse?print fmt (`chrysalis-cwl` `fmt:cwl`) |
| Cutover product gates (Chimera / pilot) | Surface identity for optional DNA compare |

**Fmt:** dual-mode is **locked** ï¿½ see [`CWL-FMT-DUAL-MODE.md`](./CWL-FMT-DUAL-MODE.md). Do **not** overwrite convert `cwl-fmt.mjs` with pillar fmt.

## RFC-0022 (honest split)

| Concern | Owner |
| --- | --- |
| CWL ? `app-dna-v1` **contract** + gold `24-dna-bridge` | **CWL** |
| Seed / **compare** / **enforce** DNA; cutover identity compare | **Secure / Helix** (`engines/chrysalis-security`) |
| Convert WebIR round-trip on that gold | **Convert** (consume surface; do not fork DNA) |

Convert does **not** own DNA enforce, learn/shadow, signing, or the UT?Helix spine. Cutover identity compare lives in Secure; surface contract + `smoke:ut-spine` live in **chrysalis-cwl**.

## Laws (unchanged)

- **D6442** ï¿½ Translate origin ? WebIR/CWL ? emit  
- **D6447** ï¿½ No demo faï¿½ades; honest holes  
- Language north star ï¿½ `chrysalis-cwl`, not this monorepoï¿½s POC schedule  

## Core vs peel

Language + WebIR contracts are **core**. Hub peels/smokes/oracles are **peel**.  
Charter: [`CORE-VS-PEEL.md`](./CORE-VS-PEEL.md) (**D6551**).

## Prove bridge

```bash
pnpm run hub:cwl-language-pillar-smoke
```

## One line

**CWL is THE language of the web. Convert lifts apps into it. Secure proves live DNA ï¿½ and bridges when surface must match.**
