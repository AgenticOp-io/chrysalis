# COBOL — IBM SDFHCOB / AID copybook drop (operator status)

> **As of:** 2026-07-28  
> **Purpose:** Track the licensed path to close residual ledger **P0** (`DFHAID` / `DFHBMSCA` / `EXTFMAP` / `CMQ*`) without inventing stubs (**D6442** / **D6447**).  
> **Related:** `hub:cobol-residual-ledger`, [`COBOL-MODERNIZATION-PROVE.md`](./COBOL-MODERNIZATION-PROVE.md), [`DO-NOT-INVENT.md`](./DO-NOT-INVENT.md).

---

## Goal

Drop licensed members into `fixtures/hub-cobol-clbs-mini/copybook/`:

- `DFHAID.cpy` (or PDS member export)
- `DFHBMSCA.cpy`
- optionally `EXTFMAP` / IBM MQ `CMQ*` (separate MQ entitlement)

Then re-run `hub:cobol-clbs-prove-smoke` / residual ledger — P0 proprietary-copy rows should **close** when the file is present (`status: closed`). Files are **gitignored** (IBM Restricted Materials — do not publish).

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
- [ ] Optional: `EXTFMAP` / `CMQ*` (separate entitlement)  

`expandCobolCopybooks` expands proprietary names **only when the licensed file exists**; otherwise they stay honest COPY holes.

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
| Invented `DFHAID.cpy` stubs | Forbidden |
| Catalog-only `LISTC LVL(DFH)` without volume `B5C551` | Misses uncataloged target libs |

---

## Operator checklist

- [x] ZD&T ADCD up; find `DFH550.CICS.SDFHCOB` / `ADFHCOB` on **B5C551**  
- [x] Screenshot / extract **DFHAID** + **DFHBMSCA** → `copybook/` (gitignored)  
- [x] `pnpm run hub:cobol-residual-ledger` — `copy:DFHAID` + `copy:DFHBMSCA` **closed** when drop present  
- [x] Re-prove via `hub:cobol-best-fit-smoke` (licensed expand gate)  
- [ ] Optional later: EXTFMAP / CMQ*  
- [ ] Do **not** `git add` DFHAID/DFHBMSCA (gitignored)  

