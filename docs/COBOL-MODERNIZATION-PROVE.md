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
| **Behavioral Fidelity** | 50 | GnuCOBOL vs emitted Python (or skip with `behavioralSkipped: true` when no compiler) |

Overall score is reported; smoke **ok** requires structural+docs floors and either behavioral green **or** an honest toolchain skip (not a silent pass).

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
- “100% equivalence” requires the behavioral track green on GnuCOBOL parallel runs.

## Related

- [`CAPABILITY-MATRIX.md`](./CAPABILITY-MATRIX.md) — COBOL origin lane
- [`HUB-TRANSLATION-PATHS.md`](./HUB-TRANSLATION-PATHS.md) — pattern-lift
- `scripts/hub-ingest/cobol-pattern-lift.mjs`
- `pnpm run hub:cobol-best-fit-smoke`
- `pnpm run hub:cobol-clbs-prove-smoke`
