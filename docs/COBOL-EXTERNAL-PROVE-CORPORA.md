# External COBOL prove corpora

> **Status:** active  
> **Gate:** `pnpm run hub:cobol-external-prove-smoke`  
> **Does not claim:** LegacyCodeBench public leaderboard scores  

Public COBOL modernization / training demos run through Chrysalis **inventory + pattern-lift + optional cobc probe**, plus the in-repo CLBS 3-track prove.

## Corpora

| Id | Upstream |
| --- | --- |
| `clbs` | [COBOL-Legacy-Benchmark-Suite](https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite) |
| `aws-carddemo` | [aws-mainframe-modernization-carddemo](https://github.com/aws-samples/aws-mainframe-modernization-carddemo) |
| `ibm-cobol-fun` | [IBM/cobol-is-fun](https://github.com/IBM/cobol-is-fun) |
| `cobol-course` | [openmainframeproject/cobol-programming-course](https://github.com/openmainframeproject/cobol-programming-course) |
| `dscobol-projects` | [dscobol/Cobol-Projects](https://github.com/dscobol/Cobol-Projects) |
| `gnucobol-examples` | [OlegKunitsyn/gnucobol-examples](https://github.com/OlegKunitsyn/gnucobol-examples) |
| `az-legacy-engineering` | [AZ-Legacy-Engineering](https://github.com/bhbandam/AZ-Legacy-Engineering) |
| `rocket-bank` | [RocketSoftware BankDemo](https://github.com/RocketSoftwareCOBOLandMainframe/BankDemo) |

Sources overlap [LegacyCodeBench](https://github.com/Kalmantic/legacycodebench) `DATASET_SOURCES` (COBOL only).

## Setup (GCE / Linux)

```bash
bash scripts/gce-clone-cobol-corpora.sh
export CHRYSALIS_COBOL_CORPORA_ROOT=$HOME/chrysalis-cobol-corpora
export CHRYSALIS_COBOL_CLBS_ROOT=$HOME/COBOL-Legacy-Benchmark-Suite
pnpm run hub:cobol-external-prove-smoke
# or all COBOL gates:
bash scripts/gce-cobol-full-prove-gates.sh
```

Report: `reports/cobol/external-prove.json` (includes **scoreboard** + `cobcBar` + `emitRefContracts` + `emitGeneratedContracts`).

### Scoreboard fields (honest)

Per corpus: file count, sampled PROGRAM-IDs, CICS/SQL/`EVALUATE TRUE`/`PROCEDURE USING` counts, pattern-lift ok, cobc syntax probe, **`cobcViaCurated`**, structural ok.

**`cobcViaCurated` (provenance):** `true` when the successful `cobc -fsyntax-only` probe file lives under `fixtures/hub-cobol-external-curated/<corpus-id>/`. That is an **honest curated path** — not a claim that the full upstream clone compiles under GnuCOBOL. Enterprise corpora (aws-carddemo / az-legacy-engineering / rocket-bank) prefer curated probes first (CARDPROBE+CARDTRAN / AZPROBE+AZBATCH / BANKPROBE+BANKWDRW) because upstream CICS/VSAM/JSON/COPY stay holes. Gnu curated-first corpora (`cobol-course` / `dscobol-projects`) prefer COURSEPROBE / DSCOBPROBE first so `cobcViaCurated=true` strengthens honesty when upstream fixed-form/COPY fails; other gnu-friendly corpora may pass on upstream files first with curated fallback (IBMPROBE / banking). **Enterprise bar requires `cobcViaCurated=true`** (≥2 corpora) and fails if curated probe fixtures are missing when cobc is present (`enterprise-curated-fixtures-present` + `enterprise-cobc-curated-provenance`).

Also mirrored under `cobcBar.cobcViaCurated` (list of corpus ids) and `cobcBar.note`.

**Raise bar (gate):**

| Check | Meaning |
| --- | --- |
| `emit-ref-contracts` | In-repo subjects (… cardstat, **histldrn**, **idxprobe**, **cardaccf**) Python run + Java/C# `EXPECTED:` tags |
| `emit-generated-contracts` | Same subjects via `cobol-pattern-emit.mjs` (… /indexed-key-read /card-account-fee-table/…) — generated Python runs + Java/C# tags match expected |
| `cobc-bar-gnu-friendly` | ≥2 of gnucobol-examples / ibm-cobol-fun / cobol-course / dscobol-projects pass `cobc -fsyntax-only` when cobc is present (preferred paths + multi-candidate + curated fallback under `fixtures/hub-cobol-external-curated/`) |
| `cobc-bar-enterprise-curated` | ≥2 of aws-carddemo / az-legacy-engineering / rocket-bank pass cobc with **`cobcViaCurated=true`** — upstream CICS/VSAM/JSON stay honest holes |
| `enterprise-curated-fixtures-present` | Curated probe `.cbl` files exist under `fixtures/hub-cobol-external-curated/<id>/` when cobc is present |
| `enterprise-cobc-curated-provenance` | Enterprise bar green only with curated fixtures + `cobcViaCurated` rows |
| `clbs-prove-smoke` | Nested multi-subject behavioral prove |

## Honest limits

- CICS / VSAM / DB2 programs inventory as holes — not silent green.  
- `cobc -fsyntax-only` may fail fixed-form / dialect programs — recorded, not force-passed.  
- Curated samples are labeled; they do **not** claim full upstream trees compile under GnuCOBOL (e.g. IBM Enterprise FXSORT / JSON PARSE, CardDemo CICS, BankDemo OPENFIL).  
- Behavioral greens are the CLBS mini subjects under GnuCOBOL parallel (`hub:cobol-clbs-prove-smoke`) — **not** a LegacyCodeBench leaderboard claim.
