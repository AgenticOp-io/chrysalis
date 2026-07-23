# Chrysalis capability matrix

> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 0. Machine-readable export: `pnpm run hub:capability-matrix` → `reports/ci/hub-capability-matrix.json`.

This matrix is how we **talk honestly** about what Chrysalis can do today versus what the Translation Hub matrix measures as plumbing.

---

## Tiers

| Tier | Customer promise | Proof bar |
| --- | --- | --- |
| **Oracle product** | Migrate a real backend slice with behavioral evidence | Oracle capture → ingest → emit → **verify replay** on traces |
| **Structural plumbing** | Lift/emit toy or literal routes without holes; optional trace replay | Hub gold suites; matrix pair is **gold** but not oracle |
| **Scaffold / advisory** | Planning, route shells, file-lift, path knowledge | Pattern-lift, migration planner, scans — **no** verify SLA |
| **Paused** | Do not sell | No oracle flagship; no real-app depth |

**Rule:** Structural matrix gold ≠ production-ready migration for that language pair.

---

## Core matrix oracle product (72 pairs — Phase 41 closed)

**Program:** [`FULL-MATRIX-ORACLE-PROGRAM.md`](./FULL-MATRIX-ORACLE-PROGRAM.md) closed at **G8790** (**D6301**, 2026-07-03).

| Scope | Count | Proof |
| --- | --- | --- |
| Core 9×9 language pairs (CWL, C#, Go, Java, JS, PHP, Python, Ruby, TS) | **72** directed | Gold fixtures + **trace replay** on each pair |
| Regression smoke | — | `pnpm run hub:full-matrix-oracle-close-smoke` |
| Progress census | — | `pnpm run hub:full-matrix-oracle-progress-smoke` (**G8701**) |

**Honest limit:** These 72 pairs are **gold-fixture oracle product** — not full production parity on arbitrary customer repos. The open hub grid is larger (see below).

---

## Flagship oracle product pairs (customer routes)

Separate from the core 72 matrix, these are **real-app / flagship** oracle routes we sell today:

| Origin | Output | Fixture / program | Verify |
| --- | --- | --- | --- |
| PHP | Hono | `fixtures/tiny-blog`, flagship | `chrysalis verify` + hub `phpOracleSmoke` |
| PHP | Fastify | same | same |
| PHP | Next.js | same (when WPTP emit available) | emit smoke + trace replay (`hub-php-nextjs-verify`; flagship via `--flagship`) |
| PHP | TypeScript | same | ingest/emit + status |
| PHP | Hono | `fixtures/hub-flagship-plain-php` | `hub-plain-php-flagship` (plain procedural PHP) |
| PHP | Hono | `fixtures/hub-flagship-symfony` | `hub-symfony-flagship` (Symfony layout pilot) |
| JavaScript | Hono | `fixtures/hub-flagship-express` | `hub-node-express-oracle-verify` (live Express + replay) |
| PHP | Hono | `fixtures/mysqli-probe` | SQL expansion (mysqli/SQLite3); verify replay |

### Oracle micro-fixture (G176)

The canonical **oracle micro surface** is **`fixtures/tiny-blog`** (5 routes): ingest, hono/fastify/nextjs emit, migration-debt verify, and optional WPTP Next.js trace replay. Metadata: `pnpm run hub:oracle-micro-fixture`. Override path: `CHRYSALIS_ORACLE_MICRO_FIXTURE`.

---

## Open hub grid (627 directed pairs)

The Translation Hub catalog exposes **627** directed origin→output pairs (25 origins × 26 outputs minus identity overlaps; **`svelte`** and **`cobol`** are origin-only). Machine count: `hubDirectedPairCount()` in `language-catalog.mjs`.

**COBOL:** pattern-lift origin (`.cob` / `.cbl` / `.cpy`) — `PROGRAM-ID` and optional `chrysalis-route` / `chrysalis-return` annotations → WebIR → full outbound matrix. CALL/ACCEPT/DISPLAY without a declared return stay honest holes. Best commercial depth targets remain **Java / C# / Python / Go**. Not a full COBOL dialect AST.

**Census (maintenance close, G9160 / D6357):** **627/627** pairs have at least one **trace-replay** suite (`hub:extended-matrix-oracle-progress-smoke`). Waves **1–16** closed the extended-matrix promote bar; COBOL added as origin-only silver file-lift.

**Depth (closed through Wave 9 + COBOL origin):** [`MATRIX-DEPTH-PROGRAM.md`](./MATRIX-DEPTH-PROGRAM.md) — **full gold 627/627**; all nextjs gold-verify; flagship→swift/assets via structured body lowering. Smokes include `hub:matrix-depth-wave7-nextjs-smoke`, `hub:matrix-depth-wave8-nextjs-replay-smoke`, `hub:matrix-depth-wave9-nextjs-smoke`, `hub:matrix-depth-program-close-smoke`, `hub:matrix-depth-full-gold-smoke`.

**Honest limit:** Suite-depth full gold is closed (**structured + middleware / pair**). Flagship depth remains concentrated on **PHP** (+ Express/JS) and the **WISP** UI POC (**D6448-ST** evidence-only green). **Do not** headline “627 languages production-ready” without that caveat.

All pairs without flagship/customer evidence stay **gold-fixture** depth unless promoted with richer traces.

---

## Hub CI signals (what each gate means)

| Artifact | Tier implied | Notes |
| --- | --- | --- |
| `hub-capability-matrix.json` `fullMatrixOracle` | Oracle (core 72) | Phase 41 census; `programComplete: true` |
| `hub-completion.json` `phpOracleSmoke` | Oracle | tiny-blog ingest + emit + verify debt |
| `hub-completion.json` `goldVerify` / `traceReplay` | Structural | 119+ structural suites; 93+ trace suites |
| `hub-gold-coverage.json` `coverageGaps` | Packaging truth | oracle tier without chrysalis CI gold |
| `hub-path-knowledge.json` | Scaffold | Planning only (627-pair grid) |
| `hub-migration-plan` API | Scaffold | Steps, not correctness proof |

---

## Phase roadmap (locked)

| Phase | Deliverable | Status |
| --- | --- | --- |
| 0 | This document + capability JSON in completion | **G88** |
| 1 | Laravel/plain/Symfony depth, verify playbooks, emit parity, Hub verify gate | **G89–G109**, **G116** plain PHP, **G118** Symfony |
| 2 | Evidence dashboard, migration programs, contract export | **G90–G98**, **G114** trend |
| 3 | CWL RFC 0005–0007+, project-to-CWL on translate | **G99–G106** |
| 4 | Second oracle (Node/Express flagship) | **G110–G112**, **G115** matrix |
| 41 | Core 9×9 matrix oracle product | **G8790** closed |
| 42 | LLM-assisted convert (verify-gated propose) | **G8830** closed — [`LLM-ASSISTED-CONVERT-PROGRAM.md`](./LLM-ASSISTED-CONVERT-PROGRAM.md) |
| 43 | LLM convert full (enrich + verify-gated apply + repair bridge) | **G8940** closed — [`LLM-CONVERT-FULL-PROGRAM.md`](./LLM-CONVERT-FULL-PROGRAM.md) |
| 44 | Extended matrix + hole closure + Horizon C | **G9140** closed — [`PHASE-44-PROGRAM.md`](./PHASE-44-PROGRAM.md) |

**Matrix schema v43** adds wave-3 extended matrix + operator UI gate (**G9121**).

**Matrix schema v42** adds wave-2 extended matrix + `horizonCTrain` operator close (**G9130**).

**Matrix schema v41** adds `extendedMatrixOracle` census (directed-pair waves, **G9030** wave-1 close; count from `hubDirectedPairCount()`).

**Matrix schema v40** adds Phase 44 `phase44` (active **G9000**).

---

## External copy (approved)

- **Say:** “Verified PHP backend migration with oracle replay and dual-stack cutover.”
- **Say:** “72 core language pairs with gold-fixture trace oracle evidence (Phase 41).”
- **Say:** “627-pair hub census is full fixture gold (structured + middleware per directed pair) — not customer-repo parity.”
- **Say:** “Translation Hub operations for multi-site programs with evidence dashboards.”
- **Do not say:** “627 languages production-ready” or “convert any website.”

See also: `docs/STRATEGIC-PLAN.md`, `docs/HUB-CROSS-LANGUAGE-SYNTHESIS.md`, `docs/CWL.md`, `docs/PHASE-46-PROGRAM.md` (post-close waves 8–16 → full directed-pair census).
