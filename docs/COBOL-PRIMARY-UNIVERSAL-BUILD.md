# COBOL-primary + universal build queue

> **Status:** active (2026-07-23)  
> **IP path:** trade secret + Apache OSS ? [`TRADE-SECRET-AND-OSS-BOUNDARY.md`](./TRADE-SECRET-AND-OSS-BOUNDARY.md)  
> **COBOL prove:** [`COBOL-MODERNIZATION-PROVE.md`](./COBOL-MODERNIZATION-PROVE.md)  
> **Private pack:** `AgenticOps/commercial/chrysalis-private-pack/` (never OSS)

**Priority:** deepen **COBOL ??? WebIR/CWL ??? commercial emits** with GnuCOBOL parallel prove first; every other origin follows the **same template**, not a WISP-only path.

**Parallel GTM (do not block):** Cursor Pilot Kit + public engine claim ? [`CURSOR-PILOT-KIT.md`](./CURSOR-PILOT-KIT.md) (portfolio brief 07-23-26 #1).

---

## 0. Non-negotiables (every language)

| Law | Meaning |
| --- | --- |
| **D6442** | Translate only |
| **D6447** | No demo fa?ades |
| **D6448 / ST** | Hole-close + success template |
| **Inventory first** | Language adapter / census before wire |
| **Propose ??? dispose** | LLM/IS propose; oracle+verify dispose |
| **Honest matrix** | Structural gold ??? behavioral / oracle-product claim |

---

## 1. COBOL-primary track (build now)

| # | Work | Gate / artifact |
| --- | --- | --- |
| C1 | Pattern-lift depth (PROGRAM-ID, PROCEDURE, COPY, CICS/SQL holes, EVALUATE TRUE, USING, ENTRY, SECTION) | `hub:cobol-best-fit-smoke` |
| C2 | CLBS-aligned 3-track prove + GnuCOBOL parallel (multi-subject) | `hub:cobol-clbs-prove-smoke` |
| C3 | CLBS corpus inventory (programs + PROGRAM-IDs + CICS sample) | same smoke `clbs-root-inventory` |
| C4 | Multi-lang reference contracts (Python run + Java/C# EXPECTED tags) | CLBS mini `reference_emit*` + external `emit-ref-contracts` |
| C5 | Private engagement pack for first COBOL pilot | `chrysalis-private-pack/engagements/cobol-clbs-pilot/` |
| C6 | Multi-subject behavioral green (61 subjects incl. ENTRY, idx key-scan/update/range/START+REWRITE/DELETE/alt START+REWRITE/START `>`+READ NEXT/START NOT LESS+READ PREV/START LESS+READ PREV/START EQUAL+limited READ PREV/START NOT GREATER+READ NEXT/START EQUAL+limited READ NEXT/START NOT LESS+READ NEXT/START LESS+READ NEXT/START NOT GREATER+READ PREV, GnuCOBOL INDEXED + ALTERNATE KEY probes, HISTLD00/RPTPOS00/RPTAUD00/RPTSTA00/RTNANA00/POSUPDT/RCVPRC00/RTNCDE00/UTLMNT00/UTLVAL00/UTLMON00/TSTVAL00/TSTGEN00/PORTVALD/PORTADD/PORTUPDT/PORTDEL/PORTREAD/PORTTRAN/PORTMSTR/PORTCOM-shaped, PRCSEQ00/BCHCTL00 USING+EVALUATE TRUE, UTLMNT/TSTGEN LINE SEQ fa?ades, CardDemo bill+pay+status+multi-account+fee-schedule, PORTVAL COPY-linked) on GCE cobc? | prove smoke `behavioralGreen` |
| C7 | External corpora scoreboard + cobc bar (?2 gnu-friendly) | `hub:cobol-external-prove-smoke` |
| C8 | Indexed/VSAM structural inventory + honest holes (`IDXVSAM` + alt key/INVALID KEY/DELETE/START/REWRITE); GnuCOBOL INDEXED probes (`idxprobe`, `idxaltrn`, `idxstrwr`, `idxdelrn`, `idxaltrw`, `idxgtnrn`, `idxnlprn`, `idxltprn`, `idxeqprn`, `idxngtrn`, `idxeqnrn`, `idxnlnrn`, `idxltnrn`, `idxngprn`); sequential substitutes (`idxkeyrn`, `idxupdrn`, `idxrngrn`) | prove `batch-idxvsam-indexed-holes` + indexed probe checks |
| C9 | Online/CICS mini deepen ? INQONLN/CARDONLN/PORTONLN (+ PORTCOM CRUD) + **COTRTLIC/COTRTUPC** SQL/CICS + INCLUDE CSDB2RWY/DCLTRTYP/CSDB2RPY/DCLTRCAT resolve vs hole; **COACTUPC** (VSAM READ/REWRITE + CVCUS01Y/CSUTLDPY/CSLKPCDY/CSUTLDWY/CSSETATY resolve; DFHAID/DFHBMSCA holes) + **COMEN01C** (INQUIRE + COMEN02Y) + **COACTVWC** (READ-only view + CVACT*/CVCUS/CVCRD/COTTL/CSDAT/CSMSG/CSUSR/CSSTRPFY resolve; DFHAID+DFHBMSCA holes) + **COSGN00C** (sign-on ASSIGN/READ USRSEC/XCTL + COSGN00/COCOM01Y/COTTL/CSDAT/CSMSG/CSUSR resolve; DFHAID+DFHBMSCA holes) + **COADM01C** (admin menu + COADM01/COADM02Y + XCTL COUSR00C; DFHAID+DFHBMSCA holes) + **COUSR00C** (user list READ USRSEC + XCTL COADM01C; DFHAID+DFHBMSCA holes) + **COUSR01C?COUSR03C** (user add WRITE / update READ+REWRITE / delete READ+DELETE USRSEC + XCTL COADM01C; DFHAID+DFHBMSCA holes) + **COCRDLIC/COCRDSLC/COCRDUPC** (card list STARTBR/READNEXT/READPREV/ENDBR / view READ / update READ+REWRITE + COCRDLI/COCRDSL/COCRDUP + CVCRD/CVACT/CVCUS/CSSTRPFY resolve; DFHAID+DFHBMSCA holes) + **COBIL00C** (bill ASKTIME/FORMATTIME + READ/REWRITE/WRITE + STARTBR/READPREV/ENDBR; COBIL00/CVACT*/CVTRA05Y resolve; DFHAID+DFHBMSCA holes) + **COTRN00C/COTRN01C/COTRN02C** (tran list browse / view READ / add WRITE + COTRN00-02/CVTRA05Y/CVACT* resolve; DFHAID+DFHBMSCA holes) + **CORPT00C** (report WRITEQ TD intrdr + CORPT00/CVTRA05Y resolve; DFHAID+DFHBMSCA holes); CardDemo LINKAGE/COMMAREA browse + CSMSG/COTTL/CSDAT/CVTRA/COTRN00/COTRN01/COTRN02/CORPT00/COACTVW/CVACT*/COADM01/COADM02Y/COCRDLI/COCRDSL/COCRDUP/COSGN00/COTRTLI/COTRTUP/CSUSR01Y/CVCRD01Y/CSMSG02Y/CSSTRPFY/CSUTLDPY/CSLKPCDY resolve / CSUTLDWY+CSSETATY resolve + DFHAID+DFHBMSCA BMS holes | `fixtures/hub-cobol-clbs-mini/online` + `copybook/` |
| C10 | EXEC SQL op catalog + curated extract (`SQLINV00` + upstream HISTLD00/CBLDB21); SQLCA dual-resolve (`COPY` on `SQLCPY00` + `EXEC SQL INCLUDE` on `SQLINV00`); PORTVAL COPY resolve (`PORTVALCP`) + COPY-linked behavioral (`PORTVALDN`/`PORTCOMRN`); PORTTEST honest PORTFLIO/ERRHAND + `function-random` hole; JCL/BMS inventory holes (PORTDEF IDCAMS + PORTADD/DEL/READ/UPDT/TEST + TRANEXTR/MNTTRDB2/CREADB21/COBTUPDT); no invented DB2/portfolio/JES/RANDOM runtime | prove `batch-sqlinv-exec-sql-holes` + `batch-sqlca-copy-resolve` + `batch-sqlca-dual-resolve` + `batch-portval-copy-resolve` + `batch-portvaldn-copy-linked-behavioral` + `batch-portcomrn-copy-linked-behavioral` + `batch-porttest-copy-structural` + `batch-cobtupdt-sql-holes` + `online-cotrtlic-sql-cics-holes` + `online-cotrtupc-sql-cics-holes` + `upstream-jcl-map-inventory` |

Do **not** claim ???modernized CLBS??? until C6 behavioral matches on a continuous record set.

---

## 2. Universal track (same shape, all origins)

For each origin language / framework (PHP, SvelteKit, Laravel, Next, Vue, Angular, Blade, Java, C#, Python, Go, ???):

1. **Inventory adapter** (or honest skip)  
2. **Lift lane** (pattern / AST / file ? labeled honestly)  
3. **Emit** to best-fit commercial targets + control (hono/CWL)  
4. **Prove** ? structural gold ??? ST; oracle/trace where gated  
5. **Private failure taxonomy row** after each paid or pilot convert  

Matrix expansion must not mark Bronze/Silver edges as production-ready. Gold suite growth (full cartesian) is **inventory**, not fidelity.

---

## 3. OSS vs secret while building

| Publish (Apache) | Keep private |
| --- | --- |
| Engine, fixtures, smokes, CLBS mini, this queue | Filled ST packs, customer corpora, live thresholds |
| Honest capability matrix grades | Rate cards, signing keys, GCE secrets |

---

## 4. Operator commands (Linux / GCE preferred)

```bash
export CHRYSALIS_COBOL_CLBS_ROOT=$HOME/COBOL-Legacy-Benchmark-Suite
export CHRYSALIS_COBOL_CORPORA_ROOT=$HOME/chrysalis-cobol-corpora
pnpm run hub:cobol-best-fit-smoke
pnpm run hub:cobol-clbs-prove-smoke
pnpm run hub:cobol-external-prove-smoke
# Universal regress (do not confuse with COBOL behavioral):
pnpm run test:gce   # full suite on chrysalis-test-vm
```

---

## 5. Done when (COBOL pilot bar)

- [x] CLBS prove green with cobc present (multi-subject behavioral on GCE)
- [x] CLBS root inventory shows real PROGRAM-IDs + CICS
- [x] Best-fit java/csharp/python/go green (+ CLBS mini / CKPRSTRN / DEPTPAY inventory)
- [x] External prove scoreboard + cobc bar + emit-ref contracts
- [x] At least one **non-extract** CLBS batch with real file I/O parallel-green (`histldrn` from HISTLD00; VSAM/DB2 stay holes)
- [x] Private pack engagement folder filled for the pilot (secret)
- [x] COBOL gnu-honest behavioral **paused** at 61/61 (no near-duplicate extracts)
- [x] **G10075 Tier A** — mini COPY/INCLUDE census closed (228 resolved; only BMS holes left; no cheap COPY peels remain)
- [x] Universal inventory-first: `chrysalis:site-inventory-adapters-smoke` green (local + GCE)
- [x] Universal Express depth batch: `hub:express-depth-batch-smoke` green on GCE (path-advice gold + project-to-cwl hole-free)
- [x] Universal Pilot Kit wedge: `pilot:laravel-min` **green on GCE** (`chrysalis-test-vm`) with PHP `mysqli` + `pdo_sqlite` (`php8.2-mysql` + `php8.2-sqlite3`); packaging smoke green. Emit fix: handler epilogue uses path-sensitive termination so early `__exit` does not suppress fall-through `__respond` (Hono Context coerce). Local Node 25 may still differ ? prefer GCE Node 22.
- [x] Universal: ST close on next paid/non-flagship origin without demo fa?ades ? **`hub-flagship-plain-php`** (`proveProfile: cwl-api`, hole-free CWL + fixture verify gold); `pnpm run hub:complete-conversion-prove:plain-php` ? `stGreen`+`stClosed` (2026-07-24). **Second non-flagship:** **`tiny-blog`** ? RFC-0021 early-exit cond exprs + opaque `g_<callee>` / `g_member_<path>` / `g_empty_<name>` + projectable `!param` + stmt-level `foreach` collection binding (loop chrome not unrolled into outer HTML; dynamic leaves still omitted); Hono verify gold retained; `pnpm run hub:complete-conversion-prove:tiny-blog` ? `stGreen`+`stClosed` (2026-07-24). **First non-PHP:** **`hub-flagship-express`** JS?CWL cwl-api ST. **First Symfony:** **`hub-flagship-symfony`** attribute `#[Route]` + final-class `__invoke` body lift ? `pnpm run hub:complete-conversion-prove:symfony` ? `stGreen`+`stClosed` (2026-07-24). **Flagship laravel-min:** session_start elide ? RFC-0007 effects + `__ternary` lit-branch if-guards ? `pnpm run hub:complete-conversion-prove:laravel-min` ? `stGreen`+`stClosed` (2026-07-24, 20/20 hole-free).  **First Python:** **hub-flagship-python** Flask 20-route cwl-api ST (status tuples + path/query) ? pnpm run hub:complete-conversion-prove:python ? stGreen+stClosed (2026-07-24). **First Go:** **hub-flagship-go** Gin 20-route cwl-api ST (brace-bounded gin.H + string/status/scalar) ? pnpm run hub:complete-conversion-prove:go ? stGreen+stClosed (2026-07-24). **First C#:** **hub-flagship-csharp** ASP.NET Minimal API 20-route cwl-api ST (bounded Map lambdas + Results.Json statusCode + string/scalar/path-ref) ? pnpm run hub:complete-conversion-prove:csharp ? stGreen+stClosed (2026-07-24). **First Java:** **hub-flagship-java** Spring `@RestController` 20-route cwl-api ST (brace-bounded methods + ResponseEntity status+body + Map.of/string/scalar/path-ref) ? pnpm run hub:complete-conversion-prove:java ? stGreen+stClosed (2026-07-24). **First Ruby:** **hub-flagship-ruby** Sinatra 20-route cwl-api ST (string/status/json depth + path/query) ? pnpm run hub:complete-conversion-prove:ruby ? stGreen+stClosed (2026-07-24). **First filled UI ST:** **`hub-wisp-management`** (`proveProfile: wisp-ui`, evidence-only hole zero + origin-compare islands/overlays) ? `pnpm run hub:complete-conversion-prove:wisp` ? `stGreen`+`stClosed` (2026-07-24; no deepen injectors).

**Do not claim** LegacyCodeBench #1 / public leaderboard unless submitted there.
