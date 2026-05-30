# Chrysalis capability matrix

> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 0. Machine-readable export: `pnpm run hub:capability-matrix` → `reports/ci/hub-capability-matrix.json`.

This matrix is how we **talk honestly** about what Chrysalis can do today versus what the Translation Hub matrix measures as plumbing.

---

## Tiers

| Tier | Customer promise | Proof bar |
| --- | --- | --- |
| **Oracle product** | Migrate a real PHP backend slice with behavioral evidence | Oracle capture → ingest → emit → **verify replay** on traces |
| **Structural plumbing** | Lift/emit toy or literal routes without holes; optional trace replay | Hub gold suites; matrix pair is **gold** but not oracle |
| **Scaffold / advisory** | Planning, route shells, file-lift, path knowledge | Pattern-lift, migration planner, scans — **no** verify SLA |
| **Paused** | Do not sell | No oracle flagship; no real-app depth |

**Rule:** Structural matrix gold ≠ production-ready migration for that language pair.

---

## Oracle product pairs (7)

| Origin | Output | Fixture / program | Verify |
| --- | --- | --- | --- |
| PHP | Hono | `fixtures/tiny-blog`, flagship | `chrysalis verify` + hub `phpOracleSmoke` |
| PHP | Fastify | same | same |
| PHP | Next.js | same (when WPTP emit available) | emit smoke + trace replay (`hub-php-nextjs-verify`; flagship via `--flagship`) |
| PHP | TypeScript | same | ingest/emit + status |
| PHP | Hono | `fixtures/hub-flagship-plain-php` | `hub-plain-php-flagship` (plain procedural PHP) |
| PHP | Hono | `fixtures/hub-flagship-symfony` | `hub-symfony-flagship` (Symfony layout pilot) |
| JavaScript | Hono | `fixtures/hub-flagship-express` | `hub-node-express-oracle-verify` (live Express + replay) |

### Oracle micro-fixture (G176)

The canonical **oracle micro surface** is **`fixtures/tiny-blog`** (5 routes): ingest, hono/fastify/nextjs emit, migration-debt verify, and optional WPTP Next.js trace replay. Metadata: `pnpm run hub:oracle-micro-fixture`. Override path: `CHRYSALIS_ORACLE_MICRO_FIXTURE`.

All other **575×26** hub routes are **structural**, **scaffold**, or **asset** tiers unless listed in `hub-capability-matrix.json`.

---

## Hub CI signals (what each gate means)

| Artifact | Tier implied | Notes |
| --- | --- | --- |
| `hub-completion.json` `phpOracleSmoke` | Oracle | tiny-blog ingest + emit + verify debt |
| `hub-completion.json` `goldVerify` / `traceReplay` | Structural | 119+ structural suites; 93+ trace suites |
| `hub-gold-coverage.json` `coverageGaps` | Packaging truth | oracle tier without chrysalis CI gold |
| `hub-path-knowledge.json` | Scaffold | Planning only |
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
| 4+ | CWL body round-trip + hub-translate E2E on plain-php flagship | **G191–G200** (matrix schema v4) |

**Matrix schema v4** adds machine-readable pointers for CWL body round-trip (`hub:cwl-body-roundtrip-smoke`), hub-translate E2E (`hub:translate-e2e-smoke`), and node oracle product depth (spike v3 + express verify).

---

## External copy (approved)

- **Say:** “Verified PHP backend migration with oracle replay and dual-stack cutover.”
- **Say:** “Translation Hub operations for multi-site programs with evidence dashboards.”
- **Do not say:** “575 languages production-ready” or “convert any website.”

See also: `docs/STRATEGIC-PLAN.md`, `docs/HUB-CROSS-LANGUAGE-SYNTHESIS.md`, `docs/CWL.md`.
