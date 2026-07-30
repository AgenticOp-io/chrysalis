# COBOL — IBM SDFHCOB / AID copybook drop (operator status)

> **As of:** 2026-07-29  
> **Purpose:** Track the licensed path to close residual ledger **P0** (`DFHAID` / `DFHBMSCA` / `EXTFMAP` / `DFHATTR` / `CMQ*`) without inventing stubs (**D6442** / **D6447**). **Closed on disk:** DFHAID, DFHBMSCA, six CMQ*. **Open:** EXTFMAP (sole P0; may be ABSENT).  
> **Related:** `hub:cobol-residual-ledger`, [`COBOL-MODERNIZATION-PROVE.md`](./COBOL-MODERNIZATION-PROVE.md), [`DO-NOT-INVENT.md`](./DO-NOT-INVENT.md), [`COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md`](./COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md).

---

## Goal

Drop licensed members into `fixtures/hub-cobol-clbs-mini/copybook/`:

- `DFHAID.cpy` (or PDS member export)
- `DFHBMSCA.cpy`
- optionally `EXTFMAP` / `DFHATTR` (same SDFHCOB family — **EXTFMAP may be ABSENT**)
- optionally IBM MQ `CMQ*` (separate MQ entitlement)

Then re-run `hub:cobol-clbs-prove-smoke` / residual ledger — P0 proprietary-copy rows should **close** when the file is present (`status: closed`). Files are **gitignored** (IBM Restricted Materials — do not publish).

Prove / best-fit treat on-disk proprietary books like AID: **resolve when present; honest hole when absent; never invent.**

---

## Located on ZD&T ADCD (2026-07-28)

| Fact | Value |
| --- | --- |
| System | ADCD Z25B (z/OS 2.5), CICS TS **5.5** |
| USS | `/usr/lpp/cicsts/cicsts55` present (JVM/Liberty only — **not** COBOL PDS) |
| Catalog HLQ | `DFH550` under `USERCAT.Z25B.CICS550` (thin: SVSC/ZFS) |
| **Target libs volume** | **`B5C551`** — list with ISPF **3.4** Volume serial (not catalog `LISTC` alone) |
| COBOL AID book | **`DFH550.CICS.SDFHCOB`** (also `….ADFHCOB` DLIB) |

### DFHAID / DFHBMSCA drop

- [x] Browse `DFH550.CICS.SDFHCOB(DFHAID)` / `….ADFHCOB(DFHBMSCA)` on ZD&T (`B5C551`)  
- [x] Reconstruct `copybook/DFHAID.cpy` + `copybook/DFHBMSCA.cpy` from 3270 screenshots (trial / non-production; **gitignored**)  
- [x] Broken-bar literals confirmed as **`¦`** (`DFHCLRP`, `DFHOUTLN`, `DFHUNNON`, `DFHTRANS`)  
- [x] **CMQ\*** via IBM MQ Advanced for Developers (public DHE Linux `inc/cobcpy32`) — residual closed when present  
- [ ] Optional: `EXTFMAP` / `DFHATTR` (EXTFMAP may be **absent** from SDFHCOB — leave honest hole)  

`expandCobolCopybooks` expands proprietary names **only when the licensed file exists**; otherwise they stay honest COPY holes.

---

## 3-day extract priority

Full operator steps: [`COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md`](./COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md) (tracks **A–F**).

| Day focus | Action |
| --- | --- |
| Day 1 | ISPF **3.4** on **`B5C551`**: member-list `DFH550.CICS.SDFHCOB` for `EXTFMAP` / `DFHATTR` / other BMS-related; note absences |
| Day 2 | Screenshot / IND$FILE reconstruct any hits → gitignored `copybook/`; hunt SDFHMAC / BMS map sources |
| Day 3 | MQ `CMQ*` **only if entitled**; residual ledger + prove; **no** `git add` of IBM/MQ `.cpy` |

---

## Have (local Downloads + GCE staging)

| Artifact | Notes |
| --- | --- |
| `cicsts64.pax.Z` (~957 MB) | CICS TS **6.4 open beta** (optional if ADCD 5.5 books suffice) |
| GCE staging | `chrysalis-test-vm:…/chrysalis-staging/cics-ts-64-beta/` |

---

## Wrong paths (do not retry for this goal)

| What | Why skip |
| --- | --- |
| **CICS Transaction Gateway** trial | Not SDFHCOB |
| **Data Gatherer + SMF Explorer** trial | Wrong product |
| Invented `DFHAID.cpy` / `EXTFMAP.cpy` stubs | Forbidden |
| Catalog-only `LISTC LVL(DFH)` without volume `B5C551` | Misses uncataloged target libs |
| Assuming `EXTFMAP` is always in SDFHCOB | Member may be **ABSENT** — leave residual open |

---

## Operator checklist

- [x] ZD&T ADCD up; find `DFH550.CICS.SDFHCOB` / `ADFHCOB` on **B5C551**  
- [x] Screenshot / extract **DFHAID** + **DFHBMSCA** → `copybook/` (gitignored)  
- [x] `pnpm run hub:cobol-residual-ledger` — `copy:DFHAID` + `copy:DFHBMSCA` **closed** when drop present  
- [x] Re-prove via `hub:cobol-best-fit-smoke` (licensed expand gate)  
- [x] **CMQ\*** dropped from IBM MQ Advanced for Developers (Linux non-install `inc/cobcpy32` → gitignored `CMQ*.cpy`); residual **closed**  
- [ ] 3-day ZD&T window: **EXTFMAP** / **DFHATTR** (if present) — see runbook  
- [ ] Do **not** `git add` DFHAID/DFHBMSCA/EXTFMAP/DFHATTR/CMQ* (gitignored)  

---

## IBM ID path — MQ Advanced for Developers (CMQ*)

CardDemo residual P0 needs: `CMQGMOV` `CMQPMOV` `CMQMDV` `CMQODV` `CMQV` `CMQTML`.

| Source | Notes |
| --- | --- |
| **Public DHE** (IBM-hosted; use IBM ID elsewhere if prompted) | https://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/messaging/mqadv/ — e.g. `9.4.5.0-IBM-MQ-Advanced-for-Developers-Win64.zip` |
| After unpack/install | Windows: `Tools\cobol\copybook\CMQ*` · Linux: `…/inc/CMQ*` · z/OS ADCD: `*.SCSQCOBC` |
| Drop helper | `node scripts/hub-ingest/drop-ibm-mq-cobol-copybooks.mjs --from "<copybook-dir>"` |
| ZD&T parallel (you) | ISPF **3.4** vol **`B5C551`** — hunt `EXTFMAP` / `DFHATTR` / `SDFHMAC` |

Full steps: [`COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md`](./COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md)
