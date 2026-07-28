# COBOL modernization prove (CLBS-aligned)

> **Status:** **active** — Chrysalis COBOL origin pattern-lift + prove gates  
> **Corpus guide:** [COBOL Legacy Benchmark Suite (CLBS)](https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite) — Investment Portfolio Management System  
> **Commercial emit focus:** Java / C# / Python (same as CLBS modernization targets)

This is the north star for COBOL in Chrysalis. Fixture gold and pattern-lift are necessary but **not** “100% behavioral equivalence.” Equivalence is proved only by parallel execution against a COBOL runtime.

---

## What we are trying to achieve

CLBS is a production-shaped COBOL system (batch + online/CICS + copybooks + DB2/VSAM + JCL) built to stress **legacy → modern** translation. Chrysalis aims to:

1. **Ingest** CLBS-shaped COBOL honestly (PROGRAM-ID, PROCEDURE paragraphs, COPY, EXEC CICS/SQL, PERFORM → WebIR routes + holes).
2. **Emit** to hub targets (esp. Java / C# / Python / Go / hono).
3. **Prove** translation quality with a **3-track** bar inspired by LegacyCodeBench — not marketing claims.

### External prove frameworks (goals / references)

| Framework | Role for us |
| --- | --- |
| **[LegacyCodeBench](https://github.com/search?q=LegacyCodeBench)** (execution-based) | 3-track score: **Structural Completeness (30%)**, **Documentation Quality (20%)**, **Behavioral Fidelity (50%)**. Feed identical inputs to GnuCOBOL and emitted code; compare outputs. |
| **Legacy-Bench (Factory AI)** | Tasks spanning file I/O, VSAM-style mappings, legacy math — shapes our hole inventory + future task packs. |
| **Azure Legacy Modernization Agents / LegacyBridge OSS** | Multi-agent convert + schema/compile validation loops — optional later for Quarkus/Java drift checks. |

Chrysalis does **not** re-implement those products. We align our gates and scoring vocabulary so a CLBS pilot can plug into them.

---

## Recommended 3-step strategy (locked)

| Step | Action | Chrysalis gate |
| --- | --- | --- |
| **1. Local COBOL compiler** | Install [GnuCOBOL](https://gnucobol.sourceforge.io/) (`cobc`) or use a GnuCOBOL Docker image | `hub:cobol-clbs-prove-smoke` detects `cobc` / `CHRYSALIS_COBOL_COBC` |
| **2. Direct translation** | Start from a **small** CLBS-shaped program (batch math or online inquiry shell); lift PROCEDURE → WebIR → emit | Pattern-lift + `hub:cobol-best-fit-smoke` + CLBS mini fixture |
| **3. Parallel execution** | Same mock transaction inputs → GnuCOBOL binary **and** emitted Java/C#/Python; outputs must match | Behavioral track in `hub:cobol-clbs-prove-smoke` (skip honest if no `cobc`) |

**Pass bar for a conversion claim:** identical formatting / rounding / payloads across a continuous record set (LegacyCodeBench-style). Until that green, say **“pattern-lift + emit + structural prove”** — not “behavioral equivalence.”

---

## Chrysalis scoring (LegacyCodeBench-shaped)

Implemented in `hub:cobol-clbs-prove-smoke` (weights sum to 100):

| Track | Weight | What we measure today |
| --- | --- | --- |
| **Structural Completeness** | 30 | PROGRAM-ID / PROCEDURE paragraphs found; COPY + EXEC CICS/SQL + PERFORM inventoried; lift routeCount ≥ 1 |
| **Documentation Quality** | 20 | Comment density / identification headers present on CLBS mini |
| **Behavioral Fidelity** | 50 | GnuCOBOL vs emitted Python **per subject** (65 subjects incl. **histldrn**, **idxprobe**, **cardaccf**, **rptposrn**, **idxaltrn**, **cardschd**, **rptaurn**, **idxstrwr**, **rptstarn**, **prcseqrn**, **idxdelrn**, **idxaltrw**, **rtnanarn**, **bchctlrn**, **posupdrn**, **rcvprcrn**, **rtncdern**, **utlmntrn**, **utlvalrn**, **idxgtnrn**, **utlmonrn**, **tstvalrn**, **portvalrn**, **idxnlprn**, **utlmntls**, **tstgenrn**, **portaddrn**, **portupdrn**, **idxltprn**, **portdelrn**, **portreadrn**, **porttranrn**, **idxeqprn**, **portvaldn**, **idxngtrn**, **portmstrn**, **portcomrn**, **idxeqnrn**, **idxnlnrn**, **idxltnrn**, **idxngprn**, **ckprstdn**, **portfliodn**, **errhanddn**, **ckprstph**); Java/C# `EXPECTED:` tags; **plus** `cobol-pattern-emit` generated contracts; or skip with `behavioralSkipped: true` when no compiler |

Overall score is reported; smoke **ok** requires structural+docs floors and either behavioral green **or** an honest toolchain skip (not a silent pass).

### Behavioral subjects (CLBS mini batch)

| Subject | Source | Expected | Idiom |
| --- | --- | --- | --- |
| `clbsmath` | `batch/CLBSMATH.cbl` | `52.50` | `COMPUTE … ROUNDED` |
| `ckprstrn` | `batch/CKPRSTRN.cbl` | `20` | `EVALUATE TRUE` entry-point dispatch (VSAM-free extract of CLBS `CKPRST`) |
| `deptpay` | `batch/DEPTPAY.cbl` | `5847.95` | OMP course avg salary (`COMPUTE` truncate) |
| `emppayrn` | `batch/EMPPAYRN.cbl` | `446.50` | OMP Course #4 EMPPAY weekly gross extract (`IF` OT + `COMPUTE`) |
| `seqsum` | `batch/SEQSUM.cbl` | `35.75` | LINE SEQUENTIAL write/read sum (not VSAM) |
| `cardintrn` | `batch/CARDINTRN.cbl` | `29.00` | CardDemo bill-fee `COMPUTE … ROUNDED` extract (CICS-free) |
| `varysum` | `batch/VARYSUM.cbl` | `55` | OMP Course #2 `PERFORM VARYING` sum 1..10 (TOTEN2 / CBL0033 idiom) |
| `nestbr` | `batch/NESTBR.cbl` | `2` | OMP Course #2 nested `IF`/`ELSE` grade bands (score 75 → 2) |
| `srchtab` | `batch/SRCHTAB.cbl` | `350` | `OCCURS` table + `SEARCH` keyed lookup (banking-shaped, no IBAN/linkage) |
| `evalmany` | `batch/EVALMANY.cbl` | `25` | Multi-`WHEN` `EVALUATE` on subject (not `EVALUATE TRUE`) |
| `cardfeein` | `batch/CARDFEEIN.cbl` | `44.44` | CardDemo fee→interest multi-`COMPUTE ROUNDED` chain |
| `ckprusrn` | `batch/CKPRUSRN.cbl` | `20` | Nested `PROCEDURE DIVISION USING` + `CALL … USING` (VSAM-free CKPRST shape) |
| `seqmax` | `batch/SEQMAX.cbl` | `30.00` | LINE SEQUENTIAL write/read **max** (distinct from `seqsum`) |
| `entryrn` | `batch/ENTRYRN.cbl` | `55` | Quoted `ENTRY 'ALTPHASE'` via `PROGRAM-ID … IS RECURSIVE` (nested programs cannot host ENTRY under GnuCOBOL) |
| `idxkeyrn` | `batch/IDXKEYRN.cbl` | `77.50` | LINE SEQUENTIAL key-scan (VSAM INDEXED substitute) |
| `cardbill` | `batch/CARDBILL.cbl` | `69.44` | CardDemo fee + late-`IF` + interest bill pipeline |
| `idxupdrn` | `batch/IDXUPDRN.cbl` | `82.50` | LINE SEQUENTIAL key-scan + `ADD` update (VSAM REWRITE substitute) |
| `cardpay` | `batch/CARDPAY.cbl` | `125.00` | CardDemo pay-option `EVALUATE` F/P/M + late-`IF` |
| `idxrngrn` | `batch/IDXRNGRN.cbl` | `70.00` | LINE SEQUENTIAL START-from-key range sum (VSAM `START KEY >=` substitute) |
| `cardstat` | `batch/CARDSTAT.cbl` | `80.00` | CardDemo multi-status A/D/C × multi-rate + late-`IF` |
| `histldrn` | `batch/HISTLDRN.cbl` | `45.75` | CLBS `HISTLD00`-shaped history load — LINE SEQUENTIAL (no INDEXED/DB2) |
| `idxprobe` | `batch/IDXPROBE.cbl` | `77.50` | **GnuCOBOL INDEXED** (BDB) key read — documents ≠ mainframe VSAM |
| `cardaccf` | `batch/CARDACCF.cbl` | `100.00` | CardDemo multi-account fee table (`OCCURS` × A/D/C + late-`IF` + `COMPUTE` sum) |
| `rptposrn` | `batch/RPTPOSRN.cbl` | `405.75` | CLBS `RPTPOS00`-shaped position report — LINE SEQUENTIAL master + report (no INDEXED/COPY) |
| `idxaltrn` | `batch/IDXALTRN.cbl` | `88.25` | **GnuCOBOL INDEXED + ALTERNATE KEY** (BDB) alt-key read — still ≠ mainframe VSAM |
| `cardschd` | `batch/CARDSCHD.cbl` | `39.00` | CardDemo multi-tran fee schedule (`OCCURS` schedule × txs + `SEARCH` rate + `COMPUTE` sum) |
| `rptaurn` | `batch/RPTAUDRN.cbl` | `85.75` | CLBS `RPTAUD00`-shaped audit report — LINE SEQUENTIAL audit+error + report (no INDEXED/COPY) |
| `idxstrwr` | `batch/IDXSTRWR.cbl` | `82.50` | **GnuCOBOL INDEXED START + REWRITE** (BDB) — still ≠ mainframe VSAM |
| `rptstarn` | `batch/RPTSTARN.cbl` | `71.75` | CLBS `RPTSTA00`-shaped stats report — LINE SEQUENTIAL DB2+batch metrics + report (no INDEXED/COPY) |
| `prcseqrn` | `batch/PRCSEQRN.cbl` | `10` | CLBS `PRCSEQ00`-shaped control extract — `USING` + `EVALUATE TRUE` FUNC-INIT/NEXT/STAT/TERM (no sequential-file façade) |
| `idxdelrn` | `batch/IDXDELRN.cbl` | `77.50` | **GnuCOBOL INDEXED DELETE** (BDB) — still ≠ mainframe VSAM |
| `idxaltrw` | `batch/IDXALTRW.cbl` | `92.25` | **GnuCOBOL INDEXED alt-key START + REWRITE** (BDB) — still ≠ mainframe VSAM |
| `rtnanarn` | `batch/RTNANARN.cbl` | `23.75` | CLBS `RTNANA00`-shaped return-code analysis — LINE SEQUENTIAL status-weight sum + report (no DB2/COPY) |
| `bchctlrn` | `batch/BCHCTLRN.cbl` | `15` | CLBS `BCHCTL00`-shaped control extract — `USING` + `EVALUATE TRUE` FUNC-INIT/CHEK/UPDT/TERM (no sequential-file façade) |
| `posupdrn` | `batch/POSUPDRN.cbl` | `78.25` | CLBS `POSUPDT`-shaped position update — LINE SEQUENTIAL txn→position+history (upstream `POSUPDT.cbl` empty stub; architecture-shaped) |
| `rcvprcrn` | `batch/RCVPRCRN.cbl` | `12` | CLBS `RCVPRC00`-shaped recovery extract — `USING` + `EVALUATE TRUE` FUNC-INIT/RECV/TERM (no VSAM/COPY) |
| `rtncdern` | `batch/RTNCDERN.cbl` | `06` | CLBS `RTNCDE00`-shaped return-code extract — `USING` + `EVALUATE TRUE` FUNC-INIT/SETC/GETC/ANLZ (no SQL LOG) |
| `utlmntrn` | `batch/UTLMNTRN.cbl` | `14` | CLBS `UTLMNT00`-shaped maintenance extract — `USING` + `EVALUATE TRUE` FUNC-INIT/ARCH/CLEN/REOR/ANYS (no VSAM/seq façade) |
| `utlvalrn` | `batch/UTLVALRN.cbl` | `38` | CLBS `UTLVAL00`-shaped validation extract (CLBS has **no** `TRNVAL00`) — `USING` + `EVALUATE TRUE` FUNC-INIT/INTG/XREF/FMT/BAL (no INDEXED) |
| `idxgtnrn` | `batch/IDXGTNRN.cbl` | `45.00` | **GnuCOBOL INDEXED** `START KEY >` + `READ NEXT` range sum (BDB) — still ≠ VSAM; distinct from LINE SEQUENTIAL `idxrngrn` |
| `utlmonrn` | `batch/UTLMONRN.cbl` | `26` | CLBS `UTLMON00`-shaped monitoring extract — `USING` + `EVALUATE TRUE` FUNC-INIT/COLL/THRS/ALOG/ALRT (no INDEXED/seq façade) |
| `tstvalrn` | `batch/TSTVALRN.cbl` | `31` | CLBS `TSTVAL00`-shaped test-validation extract — `USING` + `EVALUATE TRUE` FUNC-INIT/FUNC/INTG/PERF/ERR (no sequential-file façade) |
| `portvalrn` | `batch/PORTVALRN.cbl` | `31` | CLBS `PORTVALD`-shaped portfolio-validation extract — `USING` + `EVALUATE TRUE` FUNC-INIT/VID/VACT/VTYP/VAMT + STK/BND/MMF/ETF membership (COPY-free) |
| `idxnlprn` | `batch/IDXNLPRN.cbl` | `45.50` | **GnuCOBOL INDEXED** `START KEY NOT LESS` + `READ PREVIOUS` backward sum incl. positioned key (BDB) — still ≠ VSAM; distinct from `idxgtnrn` 45.00 / `idxrngrn` |
| `utlmntls` | `batch/UTLMNTLS.cbl` | `72` | CLBS `UTLMNT00` LINE SEQUENTIAL control-file façade — ARCHIVE+CLEANUP+REORG RC sum (distinct from `utlmntrn` USING-only control) |
| `tstgenrn` | `batch/TSTGENRN.cbl` | `76` | CLBS `TSTGEN00`-shaped test-gen extract — LINE SEQUENTIAL config PORTFOLIO+TRANSACTN+VOLUME RC sum (distinct from `tstvalrn` USING control) |
| `portaddrn` | `batch/PORTADDRN.cbl` | `3` | CLBS `PORTADD`-shaped add extract — LINE SEQUENTIAL validate ID/status A + add-count (INDEXED/COPY-free) |
| `portupdrn` | `batch/PORTUPDRN.cbl` | `63` | CLBS `PORTUPDT`-shaped update extract — LINE SEQUENTIAL + `EVALUATE TRUE` UPDT-STATUS/VALUE/NAME RC sum (INDEXED/COPY-free) |
| `idxltprn` | `batch/IDXLTPRN.cbl` | `20.50` | **GnuCOBOL INDEXED** `START KEY LESS THAN` + `READ PREVIOUS` backward sum excl. start key (BDB) — still ≠ VSAM; distinct from `idxnlprn` 45.50 / `idxgtnrn` 45.00 |
| `portdelrn` | `batch/PORTDELRN.cbl` | `60` | CLBS `PORTDEL`-shaped delete extract — LINE SEQUENTIAL + `EVALUATE TRUE` DEL-CLOSED/TRANSFERRED/REQUESTED RC sum (INDEXED/COPY-free) |
| `portreadrn` | `batch/PORTREADRN.cbl` | `4` | CLBS `PORTREAD`-shaped read extract — LINE SEQUENTIAL write/read record count (INDEXED/COPY-free) |
| `porttranrn` | `batch/PORTTRANRN.cbl` | `104` | CLBS `PORTTRAN`-shaped tran extract — LINE SEQUENTIAL + `EVALUATE TRN-TYPE` BU/SL/TR/FE RC sum (INDEXED/COPY-free) |
| `idxeqprn` | `batch/IDXEQPRN.cbl` | `33.00` | **GnuCOBOL INDEXED** `START KEY EQUAL` + limited `READ PREVIOUS` (BDB) — still ≠ VSAM; distinct from `idxstrwr` EQUAL+REWRITE / `idxnlprn` NOT LESS+PREV |
| `portvaldn` | `batch/PORTVALDN.cbl` | `3` | CLBS `PORTVALD` **COPY-linked** behavioral — `COPY PORTVAL` + validate ID/ACCT/TYPE/AMT RC sum (distinct from `portvalrn` 31 / structural `PORTVALCP`) |
| `idxngtrn` | `batch/IDXNGTRN.cbl` | `70.00` | **GnuCOBOL INDEXED** `START KEY NOT GREATER` + `READ NEXT` forward sum incl. positioned key (BDB) — still ≠ VSAM; distinct from `idxgtnrn` 45.00 GREATER+NEXT |
| `portmstrn` | `batch/PORTMSTRN.cbl` | `108` | CLBS `PORTMSTR`-shaped master CRUD extract — `USING` + `EVALUATE TRUE` CREATE/READ/UPDATE/DELETE (INDEXED/COPY-free) |
| `portcomrn` | `batch/PORTCOMRN.cbl` | `120` | PORTCOM **COPY-linked** portfolio CRUD — `EVALUATE TRUE` CREA/READ/UPDT/DELE (INDEXED-free; deepens PORTONLN COMMAREA) |
| `idxeqnrn` | `batch/IDXEQNRN.cbl` | `63.00` | **GnuCOBOL INDEXED** `START KEY EQUAL` + limited `READ NEXT` forward (BDB) — still ≠ VSAM; distinct from `idxeqprn` EQUAL+PREV |
| `idxnlnrn` | `batch/IDXNLNRN.cbl` | `78.00` | **GnuCOBOL INDEXED** `START KEY NOT LESS` + `READ NEXT` forward (BDB) — still ≠ VSAM; distinct from `idxnlprn` NOT LESS+PREV / `idxgtnrn` GREATER+NEXT / `idxngtrn` NOT GREATER+NEXT |
| `idxltnrn` | `batch/IDXLTNRN.cbl` | `90.50` | **GnuCOBOL INDEXED** `START KEY LESS THAN` + `READ NEXT` forward (BDB) — still ≠ VSAM; distinct from `idxltprn` LESS+PREV / `idxnlnrn` NOT LESS+NEXT |
| `idxngprn` | `batch/IDXNGPRN.cbl` | `75.50` | **GnuCOBOL INDEXED** `START KEY NOT GREATER` + `READ PREVIOUS` backward (BDB) — still ≠ VSAM; distinct from `idxngtrn` NOT GREATER+NEXT / `idxnlprn` NOT LESS+PREV |
| `ckprstdn` | `batch/CKPRSTDN.cbl` | `150` | CKPRST **COPY-linked** status 88 RC sum (I/A/C/F/R) — distinct from `ckprstrn` / structural `CKPRSTCP` |
| `portfliodn` | `batch/PORTFLIODN.cbl` | `66` | PORTFLIO **COPY-linked** client-type+status 88 RC sum — distinct from `PORTTEST` RANDOM hole |
| `errhanddn` | `batch/ERRHANDDN.cbl` | `40` | ERRHAND **COPY-linked** return-code sum 0+4+8+12+16 — no FUNCTION RANDOM |
| `ckprstph` | `batch/CKPRSTPH.cbl` | `100` | CKPRST **COPY-linked** phase 88 RC sum — distinct from `ckprstdn` status |

### Indexed / VSAM structural (hole, not behavioral)

| Fixture | Prove checks |
| --- | --- |
| `batch/IDXVSAM.cbl` | `ORGANIZATION IS INDEXED` + `RECORD KEY` + `ALTERNATE RECORD KEY` + `ACCESS MODE DYNAMIC` + START/READ/REWRITE/DELETE + `INVALID KEY` inventoried as `indexed-file` / `record-key` / `alternate-record-key` / `invalid-key` / `file-io` holes. **Not** in `BEHAVIORAL_SUBJECTS`. Parallel green: `idxprobe` (primary) + `idxaltrn` (ALTERNATE KEY BDB) + `idxstrwr` (START+REWRITE BDB) + `idxdelrn` (DELETE BDB) + `idxaltrw` (alt START+REWRITE BDB) + `idxgtnrn` (START KEY `>` + READ NEXT BDB) + `idxnlprn` (START NOT LESS + READ PREV BDB) + `idxltprn` (START LESS + READ PREV BDB) + `idxeqprn` (START EQUAL + limited READ PREV BDB) + `idxngtrn` (START NOT GREATER + READ NEXT BDB) + `idxeqnrn` (START EQUAL + limited READ NEXT BDB) + `idxnlnrn` (START NOT LESS + READ NEXT BDB) + `idxltnrn` (START LESS + READ NEXT BDB) + `idxngprn` (START NOT GREATER + READ PREV BDB) + `idxkeyrn` / `idxupdrn` / `idxrngrn` (LINE SEQUENTIAL substitutes). |
| `batch/IDXPROBE.cbl` | Behavioral GnuCOBOL INDEXED (BDB handler on GCE). **≠ VSAM** — no SHAREOPTIONS / IDCAMS claim. |
| `batch/IDXALTRN.cbl` | Behavioral GnuCOBOL INDEXED + `ALTERNATE RECORD KEY` read (BDB on GCE). **≠ VSAM** — still no IDCAMS / SHAREOPTIONS claim. |
| `batch/IDXSTRWR.cbl` | Behavioral GnuCOBOL INDEXED `START KEY EQUAL` + `REWRITE` (BDB on GCE). **≠ VSAM**. |
| `batch/IDXDELRN.cbl` | Behavioral GnuCOBOL INDEXED `DELETE` (BDB on GCE). **≠ VSAM**. |
| `batch/IDXALTRW.cbl` | Behavioral GnuCOBOL INDEXED alt-key `START` + `REWRITE` (BDB on GCE). **≠ VSAM**. |
| `batch/IDXGTNRN.cbl` | Behavioral GnuCOBOL INDEXED `START KEY IS GREATER THAN` + `READ NEXT` range sum (BDB on GCE). **≠ VSAM**. |
| `batch/IDXNLPRN.cbl` | Behavioral GnuCOBOL INDEXED `START KEY IS NOT LESS THAN` + `READ PREVIOUS` backward sum (BDB on GCE). **≠ VSAM**. |
| `batch/IDXLTPRN.cbl` | Behavioral GnuCOBOL INDEXED `START KEY IS LESS THAN` + `READ PREVIOUS` backward sum (BDB on GCE). **≠ VSAM**. |
| `batch/IDXEQPRN.cbl` | Behavioral GnuCOBOL INDEXED `START KEY IS EQUAL TO` + limited `READ PREVIOUS` (BDB on GCE). **≠ VSAM**. |
| `batch/IDXNGTRN.cbl` | Behavioral GnuCOBOL INDEXED `START KEY IS NOT GREATER THAN` + `READ NEXT` (BDB on GCE). **≠ VSAM**. |
| `batch/IDXEQNRN.cbl` | Behavioral GnuCOBOL INDEXED `START KEY IS EQUAL TO` + limited `READ NEXT` (BDB on GCE). **≠ VSAM**. |
| `batch/IDXNLNRN.cbl` | Behavioral GnuCOBOL INDEXED `START KEY IS NOT LESS THAN` + `READ NEXT` (BDB on GCE). **≠ VSAM**. |
| `batch/IDXLTNRN.cbl` | Behavioral GnuCOBOL INDEXED `START KEY IS LESS THAN` + `READ NEXT` (BDB on GCE). **≠ VSAM**. |
| `batch/IDXNGPRN.cbl` | Behavioral GnuCOBOL INDEXED `START KEY IS NOT GREATER THAN` + `READ PREVIOUS` (BDB on GCE). **≠ VSAM**. |

### EXEC SQL structural (hole, not behavioral)

| Fixture | Prove checks |
| --- | --- |
| `batch/SQLINV00.cbl` | `execSqlOps` catalog: BEGIN/END-DECLARE, INCLUDE, DECLARE-TABLE, DECLARE-CURSOR, INSERT/UPDATE/DELETE/SELECT, OPEN/FETCH/CLOSE, COMMIT/ROLLBACK — all stay `exec-sql` holes (no invented DB2 runtime). `EXEC SQL INCLUDE SQLCA` resolves `copybook/SQLCA.cpy` (prove `batch-sqlca-dual-resolve`). Upstream: `_upstream/HISTLD00.cbl`, `_upstream/CBLDB21.cbl`. Runnable non-SQL adaptation: `histldrn`. |
| `batch/SQLCPY00.cbl` + `copybook/SQLCA.cpy` | `COPY SQLCA` resolves under mini `copybook/` (prove `batch-sqlca-copy-resolve`). Dual path vs `EXEC SQL INCLUDE` — same `SQLCA.cpy`; **not** a DB2 runtime. |
| `batch/PORTVALCP.cbl` + `copybook/PORTVAL.cpy` | `COPY PORTVAL` resolves under mini `copybook/` (prove `batch-portval-copy-resolve`). Upstream PORTVALD path; **not** a portfolio runtime. |
| `batch/CKPRSTCP.cbl` + `copybook/CKPRST.cpy` | `COPY CKPRST` resolves under mini `copybook/` (prove `batch-ckprst-copy-resolve`). Upstream CKPRST path; **not** a checkpoint runtime. |
| `batch/PORTVALDN.cbl` + `copybook/PORTVAL.cpy` | COPY-linked **behavioral** (prove `batch-portvaldn-copy-linked-behavioral` + cobc `-I copybook`). Distinct from COPY-free `portvalrn` and structural-only `PORTVALCP`. |
| `batch/PORTTEST.cbl` + `copybook/PORTFLIO.cpy` + `copybook/ERRHAND.cpy` | Honest COPY resolve (prove `batch-porttest-copy-structural`); `FUNCTION RANDOM` stays `function-random` hole — **not** behavioral (no invented RANDOM façade). |
| `online/COTRTLIC.cbl` + `online/COTRTUPC.cbl` | CardDemo Db2 transaction-type **programs** (not maps): EXEC SQL cursor/DML + EXEC CICS catalog floors; COPY COTRTLI/COTRTUP resolve; **INCLUDE** CSDB2RWY/DCLTRTYP/CSDB2RPY (list) + DCLTRTYP/DCLTRCAT (update) resolve under `copybook/`; COTRTUPC also resolves CVCRD01Y/CSMSG02Y/CSSTRPFY/**CSUTLDWY/CSSETATY**; DFHAID+DFHBMSCA BMS holes (prove `online-cotrtlic-sql-cics-holes` / `online-cotrtupc-sql-cics-holes`). Upstream `_upstream/COTRTLIC.cbl` / `COTRTUPC.cbl` + CSDB2*/DCLTR*. |
| `online/COACTUPC.cbl` + `copybook/CVCUS01Y.cpy` | CardDemo account-update **program** (not map-only): EXEC CICS READ/REWRITE + HANDLE/RECEIVE/SEND/XCTL/RETURN/SYNCPOINT/ABEND; COPY COACTUP/COCOM01Y/CVCUS01Y/CSUTLDPY/CSLKPCDY/**CSUTLDWY/CSSETATY** resolve; **DFHAID/DFHBMSCA** stay unresolved BMS holes; `file-io` hole — no invented VSAM/date/REPLACING runtime (prove `online-coactupc-cics-copy-holes`). |
| `online/COMEN01C.cbl` + `copybook/COMEN02Y.cpy` | CardDemo main-menu **program**: EXEC CICS INQUIRE + XCTL dispatch; COPY COMEN01/COMEN02Y/COCOM01Y resolve; DFHAID+DFHBMSCA BMS holes (prove `online-comen01c-cics-copy-holes`). |
| `online/COACTVWC.cbl` + `copybook/COACTVW.cpy` | CardDemo account-view **program** (READ-only sibling of COACTUPC; COMEN01C XCTLs here): EXEC CICS HANDLE/RECEIVE/SEND/READ/XCTL/RETURN/ABEND (+ SEND TEXT); COPY COACTVW/COCOM01Y/CVACT01Y–03Y/CVCUS01Y/CVCRD01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/CSMSG02Y/CSUSR01Y/CSSTRPFY resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole — no REWRITE/SQL façade (prove `online-coactvwc-cics-copy-holes`). |
| `online/COSGN00C.cbl` + `copybook/COSGN00.cpy` | CardDemo sign-on **program** (CARDONLN LINKs here): EXEC CICS RECEIVE/SEND/SEND TEXT/ASSIGN/READ USRSEC/XCTL/RETURN; COPY COSGN00/COCOM01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/CSUSR01Y resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole — no fake auth/VSAM runtime (prove `online-cosgn00c-cics-copy-holes`). Upstream `_upstream/COSGN00C.cbl`. |
| `online/COADM01C.cbl` + `copybook/COADM01.cpy` + `COADM02Y.cpy` | CardDemo admin-menu **program** (CARDONLN LINKs here; XCTLs to COUSR00C): EXEC CICS HANDLE/RECEIVE/SEND/XCTL/RETURN/ABEND; COPY COADM01/COADM02Y/COCOM01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/CSUSR01Y resolve; **DFHAID+DFHBMSCA** BMS holes (prove `online-coadm01c-cics-copy-holes`). |
| `online/COUSR00C.cbl` + `copybook/COUSR00.cpy` | CardDemo user-list **program** (COADM01C XCTLs here): EXEC CICS HANDLE/RECEIVE/SEND/READ USRSEC/SEND TEXT/XCTL/RETURN/ABEND; COPY COUSR00/COCOM01Y/COTTL01Y/CSDAT01Y/CSMSG01Y/CSUSR01Y resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cousr00c-cics-copy-holes`). |
| `online/COUSR01C.cbl` + `copybook/COUSR01.cpy` | CardDemo user-add **program**: EXEC CICS HANDLE/RECEIVE/SEND/WRITE USRSEC/XCTL/RETURN/ABEND; COPY COUSR01 + shared resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cousr01c-cics-copy-holes`). |
| `online/COUSR02C.cbl` + `copybook/COUSR02.cpy` | CardDemo user-update **program**: EXEC CICS HANDLE/RECEIVE/SEND/READ UPDATE/REWRITE USRSEC/XCTL/RETURN/ABEND; COPY COUSR02 + shared resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cousr02c-cics-copy-holes`). |
| `online/COUSR03C.cbl` + `copybook/COUSR03.cpy` | CardDemo user-delete **program**: EXEC CICS HANDLE/RECEIVE/SEND/READ UPDATE/DELETE USRSEC/XCTL/RETURN/ABEND; COPY COUSR03 + shared resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cousr03c-cics-copy-holes`). |
| `online/COCRDLIC.cbl` + `copybook/COCRDLI.cpy` | CardDemo card-list **program**: EXEC CICS RECEIVE/SEND + STARTBR/READNEXT/READPREV/ENDBR + XCTL; COPY COCRDLI + CVCRD/CVACT/COTTL/CSDAT/CSMSG/CSUSR/CSSTRPFY resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cocrdlic-cics-copy-holes`). |
| `online/COCRDSLC.cbl` + `copybook/COCRDSL.cpy` | CardDemo card-view **program**: EXEC CICS HANDLE/RECEIVE/SEND/READ/XCTL/RETURN/ABEND; COPY COCRDSL + CVCRD/CVACT/CVCUS + shared resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cocrdslc-cics-copy-holes`). |
| `online/COCRDUPC.cbl` + `copybook/COCRDUP.cpy` | CardDemo card-update **program**: EXEC CICS HANDLE/RECEIVE/SEND/READ/REWRITE/XCTL/RETURN/ABEND; COPY COCRDUP + shared resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cocrdupc-cics-copy-holes`). |
| `online/COBIL00C.cbl` + `copybook/COBIL00.cpy` | CardDemo bill-payment **program**: EXEC CICS ASKTIME/FORMATTIME/RECEIVE/SEND + READ/REWRITE ACCTDAT + STARTBR/READPREV/ENDBR + WRITE TRANSACT + XCTL; COPY COBIL00/COCOM01Y/COTTL/CSDAT/CSMSG/CVACT01Y/CVACT03Y/CVTRA05Y resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cobil00c-cics-copy-holes`). |
| `online/COTRN00C.cbl` + `copybook/COTRN00.cpy` | CardDemo transaction-list **program**: EXEC CICS RECEIVE/SEND + STARTBR/READNEXT/READPREV/ENDBR browse + XCTL; COPY COTRN00/COCOM01Y/COTTL/CSDAT/CSMSG/CVTRA05Y resolve; **DFHAID+DFHBMSCA** BMS holes; browse-only (no COBOL READ/WRITE verb → no `file-io` hole; `exec-cics` covers VSAM) (prove `online-cotrn00c-cics-copy-holes`). |
| `online/COTRN01C.cbl` + `copybook/COTRN01.cpy` | CardDemo transaction-view **program**: EXEC CICS RECEIVE/SEND/READ/XCTL/RETURN; COPY COTRN01 + shared + CVTRA05Y resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cotrn01c-cics-copy-holes`). |
| `online/COTRN02C.cbl` + `copybook/COTRN02.cpy` | CardDemo transaction-add **program**: EXEC CICS RECEIVE/SEND + READ ACCTDAT/CXACAIX + STARTBR/READPREV/ENDBR + WRITE TRANSACT + XCTL; COPY COTRN02 + CVTRA05Y/CVACT01Y/CVACT03Y resolve; **DFHAID+DFHBMSCA** BMS holes; `file-io` hole (prove `online-cotrn02c-cics-copy-holes`). |
| `online/CORPT00C.cbl` + `copybook/CORPT00.cpy` | CardDemo report **program** (CARDONLN LINKs here): EXEC CICS RECEIVE/SEND + WRITEQ TD (`JOBS` intrdr submit) + XCTL; COPY CORPT00/COCOM01Y/COTTL/CSDAT/CSMSG/CVTRA05Y resolve; **DFHAID+DFHBMSCA** BMS holes; WRITEQ-only (no COBOL READ/WRITE verb → no `file-io` hole; `exec-cics` covers TDQ — no invented JES runtime) (prove `online-corpt00c-cics-copy-holes`). Upstream `_upstream/CORPT00C.cbl`. |
| `batch/COBTUPDT.cbl` + `_upstream/COBTUPDT.cbl` | CardDemo batch Db2 TRANSACTION_TYPE maintain — sequential INPFILE A/U/D + EXEC SQL INSERT/UPDATE/DELETE; INCLUDE SQLCA/DCLTRTYP resolve; SQL+file-io holes (prove `batch-cobtupdt-sql-holes`). Driven by **MNTTRDB2** `RUN PROGRAM(COBTUPDT)` — no invented DB2 runtime. |
| `batch/CBACT04C.cbl` + `copybook/CVTRA01Y.cpy` | CardDemo batch **INTCALC** interest (aws-carddemo `CBACT04C`) — INDEXED account/xref + sequential interest WRITE; COPY CVACT01Y/CVACT03Y/CVTRA01Y resolve; **indexed-file + file-io** holes (prove `batch-cbact04c-indexed-copy-holes`). Not behavioral. |
| `batch/CBACT01C.cbl` | CardDemo batch **account dump** (aws-carddemo `CBACT01C`) — INDEXED account sequential read → sequential out; COPY CVACT01Y resolve; **indexed-file + file-io** holes (prove `batch-cbact01c-indexed-copy-holes`). Not behavioral. |
| `batch/CBACT02C.cbl` | CardDemo batch **card dump** (aws-carddemo `CBACT02C`) — INDEXED card sequential read; COPY CVACT02Y resolve; **indexed-file + file-io** holes (prove `batch-cbact02c-indexed-copy-holes`). Not behavioral. |
| `batch/CBACT03C.cbl` | CardDemo batch **xref dump** (aws-carddemo `CBACT03C`) — INDEXED xref sequential read; COPY CVACT03Y resolve; **indexed-file + file-io** holes (prove `batch-cbact03c-indexed-copy-holes`). Not behavioral. |
| `batch/CBTRN02C.cbl` | CardDemo batch **POSTTRAN** (aws-carddemo `CBTRN02C`) — sequential daily feed + INDEXED account/tran/xref; COPY CVACT01Y/CVACT03Y resolve; **indexed-file + file-io** holes (prove `batch-cbtrn02c-indexed-copy-holes`). Not behavioral. |
| `batch/CBTRN01C.cbl` + `copybook/CVTRA06Y.cpy` | CardDemo batch **daily post** (aws-carddemo `CBTRN01C`) — sequential daily + INDEXED xref/acct/tran; COPY CVTRA06Y/CVCUS01Y/CVACT*/CVTRA05Y resolve; **indexed-file + file-io** holes (prove `batch-cbtrn01c-indexed-copy-holes`). Not behavioral. |
| `batch/CBTRN03C.cbl` + `copybook/CVTRA03Y.cpy`/`CVTRA04Y.cpy`/`CVTRA07Y.cpy` | CardDemo batch **TRANREPT** (aws-carddemo `CBTRN03C`) — sequential tran + INDEXED xref/type; COPY CVTRA05Y/CVACT03Y/CVTRA03Y/CVTRA04Y/CVTRA07Y resolve; **indexed-file + file-io** holes (prove `batch-cbtrn03c-indexed-copy-holes`). Not behavioral. |
| `batch/CBSTM03A.cbl` + `copybook/COSTM01.cpy`/`CUSTREC.cpy` | CardDemo batch **CREASTMT** (aws-carddemo `CBSTM03A`) — sequential stmt/html + CALL `CBSTM03B`; COPY COSTM01/CVACT03Y/CUSTREC/CVACT01Y resolve; **call + file-io** holes (prove `batch-cbstm03a-copy-call-holes`). Not behavioral. |
| `batch/CBSTM03B.cbl` | CardDemo batch **stmt I/O subroutine** (aws-carddemo `CBSTM03B`) — INDEXED TRNX/XREF/CUST/ACCT + LINKAGE USING / EVALUATE DD; **indexed-file + file-io** holes (prove `batch-cbstm03b-indexed-linkage-holes`). Not behavioral. |
| `batch/CBCUS01C.cbl` | CardDemo batch **customer dump** (aws-carddemo `CBCUS01C`) — INDEXED customer sequential read + DISPLAY; COPY CVCUS01Y resolve; **indexed-file + file-io** holes (prove `batch-cbcus01c-indexed-copy-holes`). Not behavioral. |
| `batch/COBSWAIT.cbl` | CardDemo batch **wait utility** (aws-carddemo `COBSWAIT`) — ACCEPT SYSIN centisecond parm + CALL `MVSWAIT`; **call + accept** holes (prove `batch-cobswait-accept-call-holes`). Not behavioral — no invented sleep runtime. |
| `batch/CSUTLDTC.cbl` | CardDemo **date-validate utility** (aws-carddemo `CSUTLDTC`; CALLed from CORPT00C) — LINKAGE USING date/format/result + CALL `CEEDAYS` + EVALUATE TRUE on feedback; **call** hole (prove `batch-csutldtc-ceedays-call-holes`). Not behavioral — no LE CEEDAYS façade. |
| `batch/CBEXPORT.cbl` + `copybook/CVEXPORT.cpy` | CardDemo batch **branch export** — INDEXED masters → multi-record export; COPY CVCUS01Y/CVACT01Y/CVACT02Y/CVACT03Y/CVEXPORT resolve; **indexed-file + file-io** holes (prove `batch-cbexport-indexed-copy-holes`). Not behavioral. |
| `batch/CBIMPORT.cbl` | CardDemo batch **branch import** — INDEXED export → sequential outs; EVALUATE rec-type C/A; COPY CVEXPORT/CVCUS01Y/CVACT* resolve; **indexed-file + file-io** holes (prove `batch-cbimport-indexed-copy-holes`). Not behavioral. |
| `_upstream/*.jcl` + `INQSET.bms` | Cheap JCL/map inventory (prove `upstream-jcl-map-inventory`): `EXEC PGM=` + `DD` + BMS `DFHM*` macros; **PORTDEF** IDCAMS `DEFINE CLUSTER` INDEXED (+ PORTADD/PORTDEL/PORTREAD/PORTUPDT/**PORTTEST**); CardDemo **TRANEXTR** (IEBGENER) + **MNTTRDB2** (IKJEFT01 + **COBTUPDT**) + **CREADB21** (IKJEFT01 + DSNTIAD/DSNTEP4 utilities only — no additional app `RUN PROGRAM`); **honest holes** — no invented JES/BMS/VSAM/DB2 runtime. |
| `_upstream/COSGN00.bms` (+ COMEN01/COADM01/COACTVW/COBIL00/CORPT00) | CardDemo BMS map corpus (aws-carddemo `app/bms`) — prove `upstream-carddemo-bms-inventory`; DFHMSD/DFHMDI/DFHMDF macros counted; **no BMS runtime**; DFHAID/DFHBMSCA remain unresolved until copybooks exist (refuse invent). |
| `_upstream/CBEXPORT.jcl` (+ CBIMPORT/WAITSTEP/CREASTMT/POSTTRAN/INTCALC) | CardDemo batch JCL samples (aws-carddemo `app/jcl`) — prove `upstream-carddemo-jcl-inventory`; EXEC PGM= + DD inventory only; no JES invent. |

CICS / indexed VSAM remain **holes** on full upstream programs — D6442.

### Online structural deepen

| Fixture | Prove checks |
| --- | --- |
| `online/INQONLN.cbl` | EXEC CICS op catalog (HANDLE/RECEIVE/SEND/LINK/RETURN/READ/WRITE/XCTL/STARTBR/WRITEQ/READQ/DELETEQ/ENQ/DEQ), HANDLE CONDITION+AID, RESP clauses, SECTION routes, EVALUATE WHEN maps — all stay `exec-cics` holes. COPY: `INQCOM`/`ERRHND`/`INQPORT` resolve under `copybook/`; `EXTFMAP` stays unresolved hole. |
| `online/CARDONLN.cbl` | CardDemo-shaped bill/browse/report/account-view/account-update/user-admin/admin-menu/card-list/card-view/card-update/signon/Db2-tran-type-list/update + **LINKAGE `DFHCOMMAREA` / `PROCEDURE DIVISION USING` / browse LINK `COMMAREA`+`LENGTH`** (+ GETMAIN/FREEMAIN/DELAY/INQUIRE) — structural only; `COCOM01Y`/`COBIL00`/`COTRN00`/`COTRN01`/`COTRN02`/`CORPT00`/`COACTVW`/`COACTUP`/`COMEN01`/`COUSR00`/`COUSR01`/`COUSR02`/`COUSR03`/`COADM01`/`COADM02Y`/`COCRDLI`/`COCRDSL`/`COCRDUP`/`COSGN00`/`COTRTLI`/`COTRTUP`/`CSUSR01Y`/`CSMSG01Y`/`COTTL01Y`/`CSDAT01Y`/`CVTRA05Y`/`CVACT01Y`/`CVACT02Y`/`CVACT03Y`/`CSUTLDPY`/`CSLKPCDY` resolve; `DFHAID`+`DFHBMSCA` stay unresolved BMS holes; no fake CICS/DB2 runtime |
| `online/COTRTLIC.cbl` | CardDemo Db2 tran-type **list** program — SQL cursor+DML + CICS holes; map `COTRTLI` + INCLUDE CSDB2RWY/DCLTRTYP/CSDB2RPY resolve |
| `online/COTRTUPC.cbl` | CardDemo Db2 tran-type **update** program — SQL DML + CICS holes; map `COTRTUP` + INCLUDE DCLTRTYP/DCLTRCAT + CVCRD01Y/CSMSG02Y/CSSTRPFY/CSUTLDWY/CSSETATY resolve; DFHAID/DFHBMSCA unresolved |
| `online/COACTUPC.cbl` | CardDemo account-update **program** — VSAM READ/REWRITE CICS holes; CVCUS01Y/CSUTLDPY/CSLKPCDY/CSUTLDWY/CSSETATY resolve; DFHAID/DFHBMSCA holes |
| `online/COMEN01C.cbl` | CardDemo main-menu **program** — INQUIRE + XCTL; COMEN02Y resolve; DFHAID/DFHBMSCA holes |
| `online/COACTVWC.cbl` | CardDemo account-view **program** — READ-only + SEND TEXT; CVACT*/CVCUS/CVCRD/COTTL/CSDAT/CSMSG/CSUSR/CSSTRPFY resolve; DFHAID/DFHBMSCA holes |
| `online/COSGN00C.cbl` | CardDemo sign-on **program** — ASSIGN + READ USRSEC + XCTL; COSGN00/COCOM01Y/COTTL/CSDAT/CSMSG/CSUSR resolve; DFHAID/DFHBMSCA holes |
| `online/COADM01C.cbl` | CardDemo admin-menu **program** — XCTL COUSR00C; COADM01/COADM02Y/COCOM/COTTL/CSDAT/CSMSG/CSUSR resolve; DFHAID/DFHBMSCA holes |
| `online/COUSR00C.cbl` | CardDemo user-list **program** — READ USRSEC + XCTL COADM01C; COUSR00 + shared copy resolve; DFHAID/DFHBMSCA holes |
| `online/COUSR01C.cbl` | CardDemo user-add **program** — WRITE USRSEC + XCTL COADM01C; COUSR01 + shared resolve; DFHAID/DFHBMSCA holes |
| `online/COUSR02C.cbl` | CardDemo user-update **program** — READ UPDATE/REWRITE USRSEC + XCTL COADM01C; COUSR02 + shared resolve; DFHAID/DFHBMSCA holes |
| `online/COUSR03C.cbl` | CardDemo user-delete **program** — READ UPDATE/DELETE USRSEC + XCTL COADM01C; COUSR03 + shared resolve; DFHAID/DFHBMSCA holes |
| `online/COCRDLIC.cbl` | CardDemo card-list **program** — STARTBR/READNEXT/READPREV/ENDBR + COCRDLI/CVCRD/CVACT/CSSTRPFY resolve; DFHAID/DFHBMSCA holes |
| `online/COCRDSLC.cbl` | CardDemo card-view **program** — READ + COCRDSL/CVCUS resolve; DFHAID/DFHBMSCA holes |
| `online/COCRDUPC.cbl` | CardDemo card-update **program** — READ/REWRITE + COCRDUP resolve; DFHAID/DFHBMSCA holes |
| `online/COBIL00C.cbl` | CardDemo bill-payment **program** — ASKTIME/FORMATTIME + READ/REWRITE/WRITE + STARTBR/READPREV/ENDBR; COBIL00/CVACT*/CVTRA05Y resolve; DFHAID/DFHBMSCA holes |
| `online/COTRN00C.cbl` | CardDemo transaction-list **program** — browse STARTBR/READNEXT/READPREV/ENDBR; COTRN00/CVTRA05Y resolve; DFHAID/DFHBMSCA holes (no file-io verb) |
| `online/COTRN01C.cbl` | CardDemo transaction-view **program** — READ TRANSACT; COTRN01/CVTRA05Y resolve; DFHAID/DFHBMSCA holes |
| `online/COTRN02C.cbl` | CardDemo transaction-add **program** — READ/WRITE + STARTBR/READPREV/ENDBR; COTRN02/CVACT*/CVTRA05Y resolve; DFHAID/DFHBMSCA holes |
| `online/CORPT00C.cbl` | CardDemo report **program** — WRITEQ TD intrdr submit + CORPT00/CVTRA05Y resolve; DFHAID/DFHBMSCA holes (no file-io verb) |
| `online/PORTONLN.cbl` | Portfolio-shaped (VERIFY/SUSPEND/queues/ENQ/DEQ/maps/LINK/XCTL) + PORTCOM CREA/READ/UPDT/DELE CRUD arms — `PORTCOM` resolves; honest CICS holes |
| `batch/PORTCOMRN.cbl` | PORTCOM COPY-linked **behavioral** CRUD (INDEXED-free) — prove `batch-portcomrn-copy-linked-behavioral` |

---

## CLBS layout we care about

```text
src/programs/{batch,online,utility,portfolio,common,test}
src/copybook/{batch,online,db2,common}
src/database/{vsam,db2}
src/jcl, src/maps, src/cics
```

Online example: `INQONLN.cbl` — CICS HANDLE/RECEIVE/SEND/LINK, COPY books, PERFORM THRU, EVALUATE.  
Batch examples: position update / history load / reporting programs.

Point a local clone with:

```bash
set CHRYSALIS_COBOL_CLBS_ROOT=C:\path\to\COBOL-Legacy-Benchmark-Suite
pnpm run hub:cobol-clbs-prove-smoke
```

Without a clone, the in-repo **CLBS mini** fixture still exercises the same idioms at reduced scale.

---

## Honest limits

- Full CLBS is **not** vendored in Chrysalis (license unspecified on upstream). Use a local clone.
- CICS / DB2 / VSAM remain **holes** until bound to real adapters — D6442 translate-only.
- Matrix fixture gold (627 pairs) ≠ CLBS behavioral fidelity.
- “100% equivalence” requires the behavioral track green on GnuCOBOL parallel runs for **all** `BEHAVIORAL_SUBJECTS` (not a single demo program).
- Do **not** claim LegacyCodeBench public leaderboard rank unless actually submitted and scored there.
- **Behavioral queue paused (honesty):** gnu-honest subjects are **65/65** after Tier B Small complete (**G10076**–**G10078**: ckprstdn/portfliodn/errhanddn/ckprstph). Further Db2/CICS/VSAM/RANDOM/BMS behavioral extracts still invent façades — **refuse** without charter (D6442/D6447).
- **Tier A structural COPY closed (G10075):** Census of `fixtures/hub-cobol-clbs-mini` — **228/271** COPY/INCLUDE refs resolve against `copybook/`; remaining **43** are only **DFHAID** / **DFHBMSCA** / **EXTFMAP** (already-expected BMS holes). **Zero** hole-missing-cpy; no further cheap COPY peels. CardDemo online/batch hole catalogs stay green via `hub:cobol-clbs-prove-smoke`. Tier B Small closed (G10076); further Tier B (Db2/CICS/VSAM) or Tier C BMS still need charter — not dialect agents.

## Build queue

COBOL is **primary**; every other origin follows the same inventory → lift → prove → private taxonomy shape:

→ [`COBOL-PRIMARY-UNIVERSAL-BUILD.md`](./COBOL-PRIMARY-UNIVERSAL-BUILD.md)

## Pattern-lift deepen (inventory)

`cobol-pattern-lift.mjs` inventories (and prove checks assert):

- `EVALUATE TRUE` counters · numeric multi-`WHEN` · `OCCURS` / `SEARCH` · `PROCEDURE DIVISION USING` args · `ENTRY` names · PROCEDURE `SECTION` → routes  
- Online mini stamps honest `exec-cics` / `copy` holes plus **CICS op catalog** (`execCicsOps` with **SEND-MAP** / **SEND-TEXT** / **RECEIVE-MAP**, `execCicsMaps` / `execCicsMapsets`, `execCicsLinkPrograms` / `execCicsXctlPrograms`, `handleCondition`, `handleAid`, `respClauses`) — no invented CICS runtime (**G10082**)
- **WebIR deepen (**G10085**–**G10088**):** `buildCobolWebIrHoleAttrs` attaches inventory catalogs to `data.hole` attrs; proven `detectEmitPattern` expecteds lower onto MAIN/sole-entry WebIR literals (CLBSMATH / CKPRSTRN / SEQSUM / EMPPAYRN / COPY-linked literals); `expandCobolCopybooks` inlines resolved in-repo `.cpy` (skips DFHAID/DFHBMSCA/EXTFMAP/CMQ*). Pattern-emit sidecar remains for cobc∥ multi-lang.
- **BMS structural (**G10079** / **G10080** / **G10081**):** `inventoryBmsSource` (DFHMSD/DFHMDI/DFHMDF + POS/LENGTH/ATTRB); CardDemo + COTRTLI/COTRTUP + COPAU00/COPAU01 `.bms` in `_upstream/`; online MAP/MAPSET ↔ BMS label crosswalk with honest holes for `INQMAP`/`INQMNU`/`PORT*`/`PORTSET`. No DFHAID/DFHBMSCA/EXTFMAP invent.
- **Tier B Medium+ structural (**G10083**):** CardDemo VSAM-MQ (`COACCT01`/`CODATE01`) + IMS/Db2/MQ auth (`COPAUA0C`/`COPAUS*`/`CBPAUP0C`) inventoried — `ibmMqCallOps`, `execDliOps`, EXEC SQL DML; holes `ibm-mq` / `exec-dli` / `exec-sql`; CMQ* COPY stay proprietary.
- **Tier C AID catalog (**G10084**):** `cicsAidSymbols` / `bmsAttrSymbols` from real upstream (DFHENTER/DFHPF*/DFHBMPRF/…); `DFHAID`/`DFHBMSCA`/`EXTFMAP` COPY remain unresolved until licensed SDFHCOB.
## Pattern emit (beyond hand `reference_emit_*`)

`cobol-pattern-emit.mjs` lifts recognized COMPUTE / multi-COMPUTE chains / EVALUATE TRUE / multi-WHEN EVALUATE / OCCURS+SEARCH / OT-weekly / seq-sum / seq-max / seq-key-scan / seq-key-update / seq-key-range / seq-ctl-func-sum / indexed-key-read (GnuCOBOL INDEXED) / indexed-alt-key-read / indexed-start-rewrite / indexed-delete / indexed-alt-start-rewrite / indexed-start-gt-next / indexed-start-nless-prev / indexed-start-less-prev / indexed-start-less-next / indexed-start-equal-prev / indexed-start-equal-next / indexed-start-ngt-next / indexed-start-ngt-prev / indexed-start-nless-next / evaluate-func (PRCSEQ FUNC-* + BCHCTL FUNC-INIT/CHEK/UPDT/TERM + RCVPRC FUNC-INIT/RECV/TERM + RTNCDE FUNC-INIT/SETC/GETC/ANLZ + UTLMNT FUNC-INIT/ARCH/CLEN/REOR/ANYS + UTLVAL FUNC-INIT/INTG/XREF/FMT/BAL + UTLMON FUNC-INIT/COLL/THRS/ALOG/ALRT + TSTVAL FUNC-INIT/FUNC/INTG/PERF/ERR + PORTVAL FUNC-INIT/VID/VACT/VTYP/VAMT) / PORTMSTR C/R/U/D USING sum / CardDemo bill-pipeline / card-pay-option / card-status-multi-rate / card-account-fee-table / card-fee-schedule / PERFORM VARYING / nested IF patterns into Python/Java/C# snippets. Gates `emit-generated-contracts` (CLBS + external prove) require generated Python stdout to match `expected-*.txt`.

`cobol-pattern-lift.mjs` inventories `execSqlOps` (INSERT/UPDATE/DELETE/SELECT/DECLARE-CURSOR/COMMIT/…) and `execSqlIncludes` (for `EXEC SQL INCLUDE` ↔ `COPY` dual-resolve) alongside CICS op catalogs — structural only.

## Related

- [`CAPABILITY-MATRIX.md`](./CAPABILITY-MATRIX.md) — COBOL origin lane
- [`HUB-TRANSLATION-PATHS.md`](./HUB-TRANSLATION-PATHS.md) — pattern-lift
- [`COBOL-EXTERNAL-PROVE-CORPORA.md`](./COBOL-EXTERNAL-PROVE-CORPORA.md) — public COBOL demos through Chrysalis
- [`TRADE-SECRET-AND-OSS-BOUNDARY.md`](./TRADE-SECRET-AND-OSS-BOUNDARY.md) — OSS vs secret
- `scripts/hub-ingest/cobol-pattern-lift.mjs`
- `pnpm run hub:cobol-best-fit-smoke`
- `pnpm run hub:cobol-clbs-prove-smoke`
- `pnpm run hub:cobol-external-prove-smoke`
