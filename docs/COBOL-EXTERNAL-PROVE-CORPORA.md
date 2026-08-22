# External COBOL prove corpora

> **Status:** active  
> **Gate:** `pnpm run hub:cobol-external-prove-smoke` · census `pnpm run hub:cobol-corpus-census` (**G10120**)  
> **Does not claim:** LegacyCodeBench public leaderboard scores · does **not** close `copy:EXTFMAP`

Public COBOL modernization / training demos run through Chrysalis **inventory + pattern-lift + optional cobc probe**, plus the in-repo CLBS 3-track prove.

## Mega-corpus strategy (commercial deepen)

A 5k–20k public copybook/BMS/DCLGEN corpus **helps** layout peels (COMP-3 / OCCURS / REDEFINES / national), BMS inventory stress, and external prove scale. It does **not** replace:

| Need | Why corpora are not enough |
| --- | --- |
| `copy:EXTFMAP` P0 | Application/licensed member — ZD&T drop or proven ABSENT only (**D6447**) |
| CardDemo CICS online runtime | Needs CICS TS / CICS TX — not inventable |
| IBM Restricted Materials on `main` | Forbidden — blobs stay under `CHRYSALIS_COBOL_CORPORA_ROOT` |

**How we assemble:** clone public repos off-repo (`scripts/gce-clone-cobol-corpora.sh`), registry in [`fixtures/ci/cobol-public-corpus-registry.json`](../fixtures/ci/cobol-public-corpus-registry.json), census via `hub:cobol-corpus-census`. Deferred until license review: Hercules/MVS/CBT Tape dumps, Micro Focus redistributables.

## Phased map (external mega-corpus advice → Chrysalis)

Adopt the 8-phase commercial corpus plan **only** where it stays translate/inventory-honest (**D6442** / **D6447**). Realistic public totals (20k–50k) are fine **off-repo**; they do not replace ZD&T/ABSENT for `EXTFMAP`.

| Phase | External advice | Chrysalis stance |
| --- | --- | --- |
| **1** Production apps | AWS CardDemo ★★★★★ + bank demos | **Already primary** — CardDemo in external prove + online CICS/SQL hole inventory; Rocket Bank / AZ-Legacy also cloned |
| **2** IBM samples | Enterprise / DB2 / CICS / DFDL / Z Open Editor | **Partial** — `cobol-is-fun`, OMP course, `ibm-zopeneditor-sample`. DFDL only when clearly redistributable — never Restricted Materials on `main` |
| **3** GnuCOBOL | Compiler tests, intrinsics, REPORT WRITER, SORT | **Active** — examples + CLBS behavioral prove; full testsuite = optional off-repo deepen |
| **4** CICS / BMS folders | Harvest maps into login/menu/inquiry/… trees | **Inventory-only** — census `DFHMSD` + CardDemo `app/bms`. **Refuse** inventing BMS folder façades |
| **5** DB2 | DCLGEN, SQLCA/SQLDA, embedded SQL | **Partial** — CardDemo `DCL*` + `EXEC SQL` inventory; no invented DB2 runtime |
| **6** IMS | PCB / PSB / segments | **Deferred** — public redistributable only; `EXEC DLI` stays hole |
| **7** Layout stress | Artificial COMP-*/ODO/66/77/78/88 books | **Prefer upstream** (JRecord/cb2xml/CardDemo). Artificial stress = **labeled fixtures** only — not fake production apps. **Closed peels:** ODO **G10121**, RENAMES **G10122**, COPY REPLACING **G10124** |
| **8** Parser torture | COPY REPLACING, nested REDEFINES/OCCURS, HANDLE/LINK/XCTL | **Prefer upstream** CardDemo online programs already exercising those shapes; COPY REPLACING inventory closed **G10124** (no expansion invent) |

**Metadata index:** `reports/cobol/corpus-feature-index.json` (per-file feature tags) + census rollups. Query on any machine that has the fetched index (no cobc):

```powershell
pnpm run hub:cobol-corpus-query -- --all odo --limit 20
pnpm run hub:cobol-corpus-query -- --all redefines,comp3 --corpus jrecord
pnpm run hub:cobol-corpus-query -- --any execCics,dfhmsd
pnpm run hub:cobol-peel-candidates   # ranked layout/BMS candidates → reports/cobol/peel-candidates.json
```

SQLite is optional later if clones hit multi-k and JSON query UX is too slow.

**CardDemo scale note:** upstream marketing “250+ programs” includes generated/variant trees; a shallow clone typically yields on the order of tens of `.cbl` + tens of `.cpy` + BMS/JCL — census reports the on-disk truth, not brochure counts.

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
| `jrecord` | [bmTas/JRecord](https://github.com/bmTas/JRecord) — layout copybook gold (COMP-3/OCCURS/REDEFINES) |
| `cb2xml` | [bmTas/cb2xml](https://github.com/bmTas/cb2xml) — copybook→XML layouts |
| `ibm-zopeneditor-sample` | [IBM/zopeneditor-sample](https://github.com/IBM/zopeneditor-sample) — phase 2 IBM public sample |
| `copybook-rs` | [EffortlessMetrics/copybook-rs](https://github.com/EffortlessMetrics/copybook-rs) — layout stress fixtures |
| `zalmane-copybook` / `cobol-copybook-to-json` | Public copybook parser/sample fixtures |
| `cobol-check` / `omp-cobol-check` | neopragma + OMP cobol-check samples |
| `cobol-unit-test` / `cobol-rekt` | Unit-test samples + reverse-eng toolkit |
| `ibm-db2-samples` | [IBM/db2-samples](https://github.com/IBM/db2-samples) — EXEC SQL inventory |
| `gnucobol-src` | [OCamlPro/gnucobol](https://github.com/OCamlPro/gnucobol) — compiler tests (large) |
| `copybook2json` / `proleap-cobol-parser` | Layout + parser torture fixtures |

Sources overlap [LegacyCodeBench](https://github.com/Kalmantic/legacycodebench) `DATASET_SOURCES` (COBOL only).

## Setup (GCE / Linux only)

**Do not run Node COBOL prove/census on Windows** — cobc / fixture timing blocks there. Use GCE:

```powershell
pnpm run test:gce:cobol            # detached: clone + census + full prove
pnpm run test:gce:cobol:status
pnpm run test:gce:cobol:fetch
```

On the VM (or after sync):

```bash
bash scripts/gce-clone-cobol-corpora.sh
export CHRYSALIS_COBOL_CORPORA_ROOT=$HOME/chrysalis-cobol-corpora
export CHRYSALIS_COBOL_CLBS_ROOT=$HOME/COBOL-Legacy-Benchmark-Suite
pnpm run hub:cobol-corpus-census          # G10120 layout/BMS/DCLGEN counts
pnpm run hub:cobol-external-prove-smoke
# or all COBOL gates:
bash scripts/gce-cobol-full-prove-gates.sh
```

Report: `reports/cobol/external-prove.json` (includes **scoreboard** + `cobcBar` + `emitRefContracts` + `emitGeneratedContracts`); census: `reports/cobol/corpus-census.json`.

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
