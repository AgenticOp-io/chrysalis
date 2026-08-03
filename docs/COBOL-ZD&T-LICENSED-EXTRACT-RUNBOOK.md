# Operator runbook — ZD&T ADCD licensed IBM member extract (3-day)

> **Window:** 3 calendar days  
> **Target:** ZD&T ADCD **Z25B** (z/OS 2.5), CICS TS **5.5**, volume **`B5C551`**  
> **Law:** **D6442** / **D6447** — translate/drop licensed origin only; **never invent** stubs  
> **Local drop root:** `fixtures/hub-cobol-clbs-mini/copybook/` (IBM/MQ files **gitignored**)  
> **Canon status:** [`COBOL-IBM-SDFHCOB-DROP.md`](./COBOL-IBM-SDFHCOB-DROP.md) · [`README-IBM-PROPRIETARY.md`](../fixtures/hub-cobol-clbs-mini/copybook/README-IBM-PROPRIETARY.md) · scoreboard Tier C ([`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md))

---

## 0. Goals / non-goals

### Goals
- Extract **remaining** licensed members needed to close residual **P0** proprietary COPY rows (`copy:EXTFMAP`, optional `copy:DFHATTR`). **CMQ\*** already closed via MQ Advanced for Developers drop.
- Inventory **SDFHMAC** map DSECT books and **BMS map source** (`DFHM*` / mapsets) for future structural work — drop what is entitled; catalog the rest.
- Reconstruct column-accurately when **IND$FILE** is unavailable (screenshot path proven for DFHAID/DFHBMSCA).
- After each batch: local **residual ledger + clbs prove** — **no** `git add` of IBM/MQ `.cpy`.

### Already done (do not redo)
| Member | Status |
| --- | --- |
| `DFHAID` | Reconstructed → `copybook/DFHAID.cpy` (gitignored); residual **closed** when present |
| `DFHBMSCA` | Reconstructed → `copybook/DFHBMSCA.cpy` (gitignored); residual **closed** when present |
| Broken-bar literals | Confirmed **`¦`** on `DFHCLRP` / `DFHOUTLN` / `DFHUNNON` / `DFHTRANS` |

### Non-goals / refuse
- Invented `EXTFMAP.cpy` / `CMQ*.cpy` / map DSECTs to force P0 green  
- `LISTC LVL(DFH)` alone as the discovery method  
- CICS TG / Data Gatherer / SMF Explorer trials (wrong product)  
- Publishing Restricted Materials (do not commit; do not attach to PRs)  
- Claiming LCB / runtime fidelity from copybook drop alone  

---

## 1. Environment facts (locked)

| Fact | Value |
| --- | --- |
| System | ADCD **Z25B**, CICS TS **5.5** |
| Volume serial | **`B5C551`** |
| COBOL copy PDS (known good) | **`DFH550.CICS.SDFHCOB`** |
| Distribution twin | **`DFH550.CICS.ADFHCOB`** |
| Catalog trap | `USERCAT.Z25B.CICS550` is thin (SVSC/ZFS); **volume 3.4 beats catalog LISTC** |
| USS | `/usr/lpp/cicsts/cicsts55` = JVM/Liberty only — **not** COBOL PDS |
| Local staging (optional) | GCE `chrysalis-staging/cics-ts-64-beta/` (`cicsts64.pax.Z`) — only if 5.5 books insufficient |

---

## 2. Golden discovery path (do this first, every day)

**Never rely on `LISTC LVL(DFH)` alone** — it misses uncataloged / volume-local target libs.

### ISPF 3.4 by volume (exact)

1. Log on ADCD (TSO/ISPF).  
2. **Option 3.4** (Data Set List Utility).  
3. On the DSLIST entry panel:
   - **Dsname Level:** blank **or** `DFH550.CICS` (optional filter)
   - **Volume serial:** `B5C551`
   - Leave catalog search defaults unless your shop requires otherwise  
4. Enter → DSLIST of datasets on **B5C551**.  
5. Confirm presence of at least:
   - `DFH550.CICS.SDFHCOB`
   - `DFH550.CICS.ADFHCOB`
6. Also **note** any siblings matching:
   - `DFH550.CICS.SDFHMAC` / `….ADFHMAC`
   - `DFH550.CICS.SDFHMSU` / `….SDFHSRC` / map/source-looking `….SDFH*`
   - Any `DFH550.CICS.*MAP*` / `*BMS*` / `*MSU*`
7. Line command **`E`** (edit) or **`B`** (browse) on the PDS → member list.  
8. On member list: **`S`** / **`B`** the member; page with **PF8/PF7**; screenshot each screen (see §E).

### Optional catalog cross-check (secondary only)

```text
LISTC LVL(DFH550) ALL
LISTC ENT('DFH550.CICS.SDFHCOB') ALL
```

If catalog is thin or points elsewhere, **trust B5C551 DSLIST**.

### Member-list hunt patterns (ISPF)

In the PDS member list, filter / scan for:

| Pattern | Track |
| --- | --- |
| `EXTFMAP`, `DFHATTR`, other `DFH*MAP*`, `DFHBMS*` | A |
| `DFHM*` (short names), `*DSECT*`, map-looking stubs | B |
| Mapset / `DFHMSD` source members | C |
| `CMQ*` | D (entitlement gate) |

---

## 3. Three-day plan (parallel tracks)

Operators may run **A+E**, **B+C**, and **D** in parallel. Day boundaries are soft; prove after every successful drop batch (§F).

| Day | Focus | Exit criteria |
| --- | --- | --- |
| **Day 1** | Re-open `SDFHCOB`/`ADFHCOB`; hunt **EXTFMAP** + BMS-adjacent COPY; start screenshot pipeline; confirm IND$FILE yes/no | Member inventory spreadsheet started; EXTFMAP found **or** proven absent from SDFHCOB |
| **Day 2** | **SDFHMAC** + BMS map source libs; list DFHM*/mapsets; drop any entitled DSECTs; MQ entitlement probe | Tracks B+C inventory complete; D SKIP or EXTRACT decided |
| **Day 3** | Finish reconstructions; local prove; residual P0 status; update operator checklist in `COBOL-IBM-SDFHCOB-DROP.md` (human edit) | Prove green for dropped books; open residuals documented as honest holes |

---

## 4. Parallel tracks

### Track A — SDFHCOB remaining members (EXTFMAP + BMS-related COPY)

**Libs:** `DFH550.CICS.SDFHCOB` and twin `….ADFHCOB` on **B5C551**.

#### Checklist — hunt these member names

**P0 / residual-linked (priority)**

| Member | Local file if dropped | Notes |
| --- | --- | --- |
| `EXTFMAP` | `EXTFMAP.cpy` | Referenced by `online/INQONLN.cbl`; treated as proprietary expand-skip. **May be application map DSECT, not IBM** — if absent from SDFHCOB/ADFHCOB, record **ABSENT** and leave honest hole (do not invent). Also search Track B/C. |
| `DFHATTR` | `DFHATTR.cpy` | Commented in CardDemo `COSGN00C`; gitignored if dropped |

**Already extracted (verify still present; do not re-type unless drift)**

| Member | Local |
| --- | --- |
| `DFHAID` | `DFHAID.cpy` |
| `DFHBMSCA` | `DFHBMSCA.cpy` |

**BMS / AID adjacent — inventory + drop if present and useful**

| Member | Why hunt |
| --- | --- |
| `DFHBMSCA` | Done — attribute bytes / `DFHBM*` symbols |
| `DFHAID` | Done — AID bytes / `DFHPF*` / `DFHENTER` … |
| `DFHATTR` | Attribute book sibling |
| `DFHEIBLK` | EIB DSECT (often separate; inventory) |
| `DFHCODE` / `DFHCICS` / `DFHU*` | CICS COBOL stubs — inventory only unless residual demands |
| Any `DFH*MAP*` / `*FMAP*` / `*BMS*` | Possible EXTFMAP neighbors |

**Broken-bar symbols inside DFHBMSCA (already confirmed)**  
When re-browsing DFHBMSCA for QA, expect literals:

- `DFHCLRP`, `DFHOUTLN`, `DFHUNNON`, `DFHTRANS` → character **`¦`** (broken bar), not `|` and not a guessed substitute.

#### Track A ISPF steps

1. ISPF **3.4** → Volume `B5C551` → select `DFH550.CICS.SDFHCOB`.  
2. Member list → locate `EXTFMAP` (exact). If missing, search `*FMAP*` / `*MAP*`.  
3. Repeat on `DFH550.CICS.ADFHCOB` (DLIB may differ).  
4. Browse each hit → screenshot / IND$FILE (§E) → write `copybook/<MEMBER>.cpy`.  
5. Run §F prove before Day 1 close if any new file landed.

#### Track A done when
- [ ] `EXTFMAP` dropped **or** logged **ABSENT from SDFHCOB/ADFHCOB** with next-hunt pointer (B/C)  
- [ ] `DFHATTR` dropped **or** logged ABSENT  
- [ ] Screenshot QA on DFHBMSCA broken-bar symbols still `¦`  

---

### Track B — SDFHMAC / map DSECT copybooks

**Goal:** Find whether ADCD ships **map DSECT** / macro-related books usable as COPY (or as evidence for EXTFMAP origin).

#### How to find the lib

1. ISPF **3.4**, Volume `B5C551`.  
2. Scan DSLIST for names containing:
   - `SDFHMAC` / `ADFHMAC`
   - `SDFHSRC` / `SDFHMSU`
   - `MACLIB` under `DFH550.CICS`
3. Browse member list; hunt:

| Hunt | Examples / patterns |
| --- | --- |
| Map DSECT-ish | `*MAP*`, `*DSECT*`, `DFHM*` |
| BMS macros | `DFHMSD`, `DFHMDI`, `DFHMDF` (often **macros**, not COBOL COPY) |
| EXTFMAP | Exact member `EXTFMAP` |

#### Operator rules
- **Macros ≠ COBOL copybooks.** If member is assembler macro source, **inventory only** — do not force into `copybook/*.cpy` unless it is true COBOL COPY text.  
- If a COBOL DSECT copybook is present and entitled, drop as `copybook/<NAME>.cpy` (gitignored if IBM).  
- CardDemo / CLBS **application** map DSECTs (e.g. generated from `COSGN00.bms`) are **not** substitutes for IBM books and are already handled via `_upstream` / inventory — do not relabel them as SDFHCOB.

#### Track B done when
- [ ] `SDFHMAC` (or equivalent) present/absent recorded with DSNAME  
- [ ] Member-name inventory attached to operator notes  
- [ ] Any true COBOL DSECT COPY dropped + §F prove  

---

### Track C — BMS map source libraries (`DFHM*`, mapsets)

**Goal:** List **where** BMS map source lives on this ADCD volume (for inventory / future DFHMSD work). CardDemo `.bms` already exists under `_upstream/` from aws-carddemo — this track is **IBM/ADCD system libs + any ADCD sample mapsets**, not re-fetching CardDemo.

#### How to find members

1. ISPF **3.4**, Volume `B5C551`, Dsname Level `DFH550.CICS` (or blank).  
2. Candidate lib name patterns:
   - `*.SDFHMSU` / `*.SDFHSRC` / `*.SDFHMAP*` / `*.ADFHMSU`
   - Sample / IVP libs under `DFH550.*` containing `MAP`, `BMS`, `MSU`
3. Open each PDS → member list.  
4. Identify map source by browsing a member for:
   - `DFHMSD` / `DFHMDI` / `DFHMDF`
   - `TYPE=MAP` / `TYPE=DSECT` / `LANG=COBOL`
5. Record: **DSNAME**, **member**, **mapset name**, whether `TYPE=DSECT` output would explain EXTFMAP-class COPY.

#### Checklist — member / mapset names to hunt

**IBM / ADCD samples (names vary by ADCD build — hunt patterns)**

| Hunt pattern | Why |
| --- | --- |
| `DFHM*` | Classic CICS sample map members |
| `*MAP` / `*MAPS` / `*SET` | Mapset naming |
| Members containing `DFHMSD` | Confirmed BMS source |
| Anything named like application `EXT*` / `INQ*` | Possible EXTFMAP provenance on this volume |

**Already in-repo (do not treat as IBM drop)**

`COSGN00`, `COMEN01`, `COADM01`, `COACTVW`, `COACTUP`, `COBIL00`, `CORPT00`, `COTRN00`–`02`, `COCRDLI`/`COCRDSL`/`COCRDUP`, `COTRTLI`/`COTRTUP`, `COPAU00`/`COPAU01`, … under `_upstream/*.bms`.

#### Track C output artifact (operator)
A table:

| DSNAME | Member | Mapset | Has DFHMSD? | Notes |
| --- | --- | --- | --- | --- |
| | | | Y/N | |

Optional: screenshot first page of 1–2 samples for evidence. Full BMS extract is **lower priority** than EXTFMAP/P0 unless EXTFMAP is only obtainable via map generation (out of scope for 3-day unless trivial).

#### Track C done when
- [ ] At least one BMS source lib confirmed **or** “none on B5C551” logged  
- [ ] Inventory table filed in operator notes  

---

### Track D — MQ `CMQ*` (entitlement gate)

**Default: SKIP** unless IBM MQ entitlement is clearly present on this ZD&T image.

#### Residual / fixture demand (if entitled)

From CardDemo VSAM-MQ / auth corpus — drop these if licensed:

| Member | Used by (examples) |
| --- | --- |
| `CMQODV` | `COACCT01`, `CODATE01`, `COPAUA0C` |
| `CMQMDV` | same |
| `CMQV` | same |
| `CMQTML` | same |
| `CMQPMOV` | same |
| `CMQGMOV` | same |

Local path: `copybook/CMQ*.cpy` (gitignore `CMQ*.cpy`).

#### How to detect entitlement / presence

1. ISPF **3.4**, Volume serial search — try common MQ vols **and** also scan `B5C551` / other ADCD vols for:
   - HLQ `CSQ*` / `MQM*` / `SYS1.MQ*` / `VENDOR.MQ*`
   - DSN patterns `*.SCSQ*` / `*.SCSQCOBC` / `*.SCSQCICS` / `*CMQ*`
2. Catalog assist (secondary):
   ```text
   LISTC LVL(CSQ) ALL
   LISTC LVL(MQM) ALL
   ```
3. USS probe (optional): look for `/usr/lpp/mqm` or similar — **absence is informative but not conclusive**.  
4. **Decision rule:**
   - **EXTRACT** only if a COBOL copy PDS with `CMQ*` members is found **and** operator confirms MQ license/entitlement for this ZD&T use.  
   - Otherwise **`SKIP — no MQ entitlement / no CMQ* PDS on ADCD`** → leave `copy:CMQ*` residual **open** (honest P0).

#### Track D done when
- [ ] SKIP note filed **or** all six `CMQ*` members dropped + §F prove  

---

### Track E — Screenshot / IND$FILE workflow (IND$FILE may be unavailable)

### E.1 Prefer IND$FILE when available

1. In Browse/Edit, use shop IND$FILE / **File Transfer** / Personal Communications **Transfer → Receive**.  
2. Host file: `DFH550.CICS.SDFHCOB(MEMBER)` (or ADFHCOB).  
3. PC file: staging folder outside git, then copy into `fixtures/hub-cobol-clbs-mini/copybook/<MEMBER>.cpy`.  
4. Transfer as **text**; verify line length / sequence numbers (see E.3).

If IND$FILE / emulator transfer fails or is blocked → **screenshot reconstruction** (proven path for DFHAID/DFHBMSCA).

### E.2 Screenshot reconstruction procedure

1. Browse member; set 3270 font large enough that **columns are readable**.  
2. Capture **full screen** PNGs; name `MEMBER_p01.png`, `MEMBER_p02.png`, …  
3. Page with **PF8** until `BOTTOM OF DATA`.  
4. Transcribe into UTF-8 `.cpy` in an editor with a **fixed-width font** and visible column ruler.  
5. Second operator (or same operator next day) **diff against screenshots** before prove.

### E.3 Column-accurate rules (mandatory)

COBOL fixed-form (or mixed) — preserve what the PDS shows:

| Rule | Detail |
| --- | --- |
| **Sequence / numbering** | If member shows cols 1–6 sequence numbers, either keep them **exactly** or strip **consistently**; do not half-strip. Prefer matching prior DFHAID/DFHBMSCA local style. |
| **Indicator area** | Col 7 `*` comments / `-` continuation — preserve. |
| **Area A / B** | Do not re-indent “to look nice.” |
| **`PIC` vs `PICTURE`** | Transcribe the **exact** reserved word on the screen. Never normalize `PICTURE` → `PIC` or the reverse. |
| **Figurative / hex / literals** | Copy character-for-character; watch `X'…'`, `C'…'`. |
| **Broken bar** | Use Unicode **`¦`** (U+00A6) where the 3270 shows broken bar — especially DFHBMSCA symbols `DFHCLRP`, `DFHOUTLN`, `DFHUNNON`, `DFHTRANS`. Do **not** substitute ASCII `\|`. |
| **Continuation lines** | Keep break points and leading spaces as shown. |
| **No “cleanup”** | No pretty-print, no SYMBOLIC CHARACTERS invention, no added comments beyond a single local header if your prior drops used one. |
| **Encoding** | Save UTF-8; avoid smart quotes. |

### E.4 Local drop naming

```text
fixtures/hub-cobol-clbs-mini/copybook/EXTFMAP.cpy
fixtures/hub-cobol-clbs-mini/copybook/DFHATTR.cpy
fixtures/hub-cobol-clbs-mini/copybook/CMQODV.cpy   # only if Track D EXTRACT
…
```

Header comment allowed (match DFHAID style if present): trial / non-production / licensed ADCD extract — still **gitignored**.

---

### Track F — Local drop + prove (after each batch) — **no git add**

Work from repo root: `$REPO` (Chrysalis / `engines/PHP_converter`).

### F.1 Confirm gitignore (do not force-add)

Expected `.gitignore` entries:

```gitignore
fixtures/hub-cobol-clbs-mini/copybook/DFHAID.cpy
fixtures/hub-cobol-clbs-mini/copybook/DFHBMSCA.cpy
fixtures/hub-cobol-clbs-mini/copybook/EXTFMAP.cpy
fixtures/hub-cobol-clbs-mini/copybook/DFHATTR.cpy
fixtures/hub-cobol-clbs-mini/copybook/CMQ*.cpy
```

Sanity:

```powershell
git check-ignore -v fixtures/hub-cobol-clbs-mini/copybook/EXTFMAP.cpy
git status -- fixtures/hub-cobol-clbs-mini/copybook/
```

**Must not** show IBM/MQ `.cpy` as staged/untracked-to-commit.  
**Forbidden:** `git add -f` on these files.

### F.2 Residual ledger

```powershell
pnpm run hub:cobol-residual-ledger
# or:
node scripts/hub-ingest/cobol-residual-ledger.mjs --origin fixtures/hub-cobol-clbs-mini --out reports/cobol/residual-ledger.json
```

**Expect for dropped books:** items `copy:EXTFMAP` / `copy:DFHATTR` / `copy:CMQ*` → `status: "closed"` when file resolves under `copybook/`.  
**Expect if SKIP/ABSENT:** those ids remain `open` with proprietary-copy issue text (honest).

### F.3 CLBS prove + best-fit

```powershell
pnpm run hub:cobol-clbs-prove-smoke
pnpm run hub:cobol-best-fit-smoke
```

Notes:
- Prove treats DFHAID/DFHBMSCA as OK when on disk; **EXTFMAP** may still be asserted as hole in some gates until drop exists — re-read smoke output after EXTFMAP land.  
- Expand path: `expandCobolCopybooks` expands proprietary names **only when licensed file exists**.

### F.4 Per-batch mini checklist

After each new `.cpy`:

- [ ] File exists under `copybook/` with correct name  
- [ ] `git check-ignore` greps it  
- [ ] `hub:cobol-residual-ledger` → matching `copy:*` **closed**  
- [ ] `hub:cobol-clbs-prove-smoke` exit 0 (or known pre-existing failures unrelated to this drop)  
- [ ] `hub:cobol-best-fit-smoke` exit 0 for licensed expand gate  
- [ ] **No** `git add` of IBM/MQ files  

---

## 5. Master hunt checklist (print / tick)

### SDFHCOB / ADFHCOB (Track A)

- [ ] `EXTFMAP`
- [ ] `DFHATTR`
- [ ] `DFHAID` (verify)
- [ ] `DFHBMSCA` (verify; `¦` QA)
- [ ] Other `DFH*MAP*` / `DFHBMS*` / `DFHEIBLK` (inventory)

### SDFHMAC / DSECT (Track B)

- [ ] DSNAME recorded: _______________
- [ ] `EXTFMAP` (if present here)
- [ ] `DFHM*` / `*DSECT*` inventory attached

### BMS source (Track C)

- [ ] DSNAME(s) recorded: _______________
- [ ] Sample members with `DFHMSD` listed
- [ ] `DFHM*` / mapset inventory attached

### MQ (Track D)

- [ ] Entitlement: **YES / NO**
- [ ] If NO → **SKIP** noted
- [ ] If YES → `CMQODV` `CMQMDV` `CMQV` `CMQTML` `CMQPMOV` `CMQGMOV`

### Transfer / reconstruct (Track E)

- [ ] IND$FILE available? **YES / NO**
- [ ] Screenshots archived (non-git) if NO
- [ ] `PIC`/`PICTURE` exact; `¦` exact

### Prove (Track F)

- [ ] Residual ledger reviewed
- [ ] CLBS prove run
- [ ] Best-fit smoke run
- [ ] Zero IBM files staged

---

## 6. Wrong paths (do not retry)

| Path | Why |
| --- | --- |
| `LISTC LVL(DFH)` only | Misses volume-local libs on **B5C551** |
| USS `/usr/lpp/cicsts/cicsts55` for COPY | Not COBOL PDS |
| CICS TG / SMF Explorer trials | Wrong product |
| Invented EXTFMAP/CMQ stubs | **D6447** |
| `git add -f` IBM `.cpy` | Restricted Materials — never publish |
| Normalizing `PICTURE`↔`PIC` or `¦`→`\|` | Breaks fidelity vs licensed member |

---

## 7. Day-3 close report (operator paste)

```text
ADCD Z25B / CICS TS 5.5 / vol B5C551
SDFHCOB: DFH550.CICS.SDFHCOB (ADFHCOB: …)
EXTFMAP: DROPPED | ABSENT (next: …)
DFHATTR: DROPPED | ABSENT
SDFHMAC DSNAME: … | ABSENT
BMS source DSNAME(s): …
CMQ*: SKIP (no entitlement) | DROPPED (list)
IND$FILE: YES | NO (screenshots)
Prove: residual P0 closed=[…] open=[…]
git: no IBM .cpy staged
```

Update [`docs/COBOL-IBM-SDFHCOB-DROP.md`](./COBOL-IBM-SDFHCOB-DROP.md) checklist boxes to match. Scoreboard Tier C: **CMQ* closed** (DHE drop); **EXTFMAP** sole open P0 until dropped or proven ABSENT.

---

## 8. References

- `docs/COBOL-IBM-SDFHCOB-DROP.md`  
- `fixtures/hub-cobol-clbs-mini/copybook/README-IBM-PROPRIETARY.md`  
- `docs/LEADERSHIP-SCOREBOARD.md` (COBOL primary / Tier C / next: EXTFMAP only)  
- `docs/COBOL-MODERNIZATION-PROVE.md` (licensed expand-when-present; G10093–G10094)  
- AgenticOps `docs/CHANGELOG.md` + Chrysalis `docs/CHANGELOG.md` (G10093–G10094 + CMQ closed)  
- Scripts: `pnpm run hub:cobol-residual-ledger` · `hub:cobol-clbs-prove-smoke` · `hub:cobol-best-fit-smoke`
``
