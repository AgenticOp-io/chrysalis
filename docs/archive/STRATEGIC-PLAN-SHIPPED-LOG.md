# Strategic plan ship log (archived)

> **Status:** historical only (2026-06-19). Strategic plan phases **0–10 closed** at **G6257**. Do **not** treat as active backlog — see [`docs/PAUSED-AND-MAINTENANCE.md`](../PAUSED-AND-MAINTENANCE.md).

## Ship log

When the user says “build” without specifying, prefer this queue:


| Month | Focus                                                                       |
| ----- | --------------------------------------------------------------------------- |
| 1     | CWL authoring bootstrap: templates, diagnostics, preview/dev loop hardening |
| 1–2   | Runtime-cwl parity plan + first production-readiness gates                  |
| 2     | Full-stack CWL scope RFC (backend + frontend/SSR boundaries, holes policy)  |
| 2–3   | Second oracle origin flagship depth (Node/Express first)                    |
| 3     | Keep project-to-CWL + CWL diff mandatory on translate paths                 |
| 3–4   | Full-stack flagship pilot with explicit hole budget and evidence gate       |

**Month 1 reinforcement (2026-06-17):** **G5680–G5683** — `runCwlAuthoringBootstrapHardeningGate`, diagnose schema **v3**, `docs/RUNTIME-CWL-PARITY-PLAN.md`, `pnpm run hub:strategic-plan-month1-hardening-smoke`.

**Month 1–2 reinforcement (2026-06-17):** **G5690–G5693** — `runStrategicPlanMonth12RuntimeParityGate`, `pnpm run hub:strategic-plan-month12-runtime-parity-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1` for in-process-only).

**Month 2 reinforcement (2026-06-17):** **G5700–G5703** — `docs/CWL-FULLSTACK-SCOPE-RFC.md`, `runStrategicPlanMonth2FullstackScopeGate`, `pnpm run hub:strategic-plan-month2-fullstack-scope-smoke`.

**Month 2–3 reinforcement (2026-06-17):** **G5710–G5713** — `docs/NODE-EXPRESS-ORACLE-ORIGIN-PLAN.md`, `runStrategicPlanMonth23ExpressOracleGate`, `pnpm run hub:strategic-plan-month23-express-oracle-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for lift depth only).

**Month 3 reinforcement (2026-06-17):** **G5720–G5723** — `docs/PROJECT-TO-CWL-TRANSLATE-PATH.md`, `runStrategicPlanMonth3ProjectToCwlGate`, `pnpm run hub:strategic-plan-month3-project-to-cwl-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1` for fast oracle slice).

**Month 3–4 reinforcement (2026-06-17):** **G5730–G5733** — `docs/CWL-FULLSTACK-FLAGSHIP-PILOT.md`, `runStrategicPlanMonth34FullstackPilotGate`, `pnpm run hub:strategic-plan-month34-fullstack-pilot-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD=1` for preview/budget without gold verify).

**Next 90 days program:** **closed (2026-06-17)**. **Phases 0–8** reinforcement **closed** (**G5680–G6113**). Default build queue: **maintenance** unless plan amended (§13).

**Phase 1 reinforcement (2026-06-17):** **G5740–G5743** — `docs/PHP-WEDGE-PHASE-1.md`, `runStrategicPlanPhase1PhpWedgeGate`, `pnpm run hub:strategic-plan-phase1-php-wedge-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_PHP_WEDGE_FLAGSHIPS=1` for gaps/playbooks only).

**Phase 1 Laravel ingest depth (2026-06-17):** **G5750–G5753** — `docs/LARAVEL-VERIFY-GAPS-INGEST-DEPTH.md`, `runStrategicPlanPhase1LaravelIngestDepthGate`, `pnpm run hub:strategic-plan-phase1-laravel-ingest-depth-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_LARAVEL_LIVE_GAPS=1`).

**Phase 1 PHP emit parity (2026-06-17):** **G5760–G5763** — `docs/PHP-EMIT-PARITY-ORACLE-SLICE.md`, `runStrategicPlanPhase1PhpEmitParityGate`, `pnpm run hub:strategic-plan-phase1-php-emit-parity-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_PARITY_FLAGSHIPS=1`).

**Phase 1 Chimera cutover (2026-06-17):** **G5770–G5773** — `docs/CHIMERA-CUTOVER-PHASE-1.md`, `runStrategicPlanPhase1ChimeraCutoverGate`, `pnpm run hub:strategic-plan-phase1-chimera-cutover-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_CHIMERA_ORIGIN_BATCH=1`).

**Phase 2 Migration OS entry (2026-06-17):** **G5780–G5783** — `docs/MIGRATION-OS-PHASE-2.md`, `runStrategicPlanPhase2MigrationOsEntryGate`, `pnpm run hub:strategic-plan-phase2-migration-os-entry-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_STANDALONE_BATCH=1`).

**Phase 2 license tier alignment (2026-06-17):** **G5790–G5793** — `docs/MIGRATION-OS-LICENSE-TIER-ALIGNMENT.md`, `runStrategicPlanPhase2LicenseTierGate`, `pnpm run hub:strategic-plan-phase2-license-tier-smoke`.

**Phase 2 multi-origin batch (2026-06-17):** **G5800–G5803** — `docs/MIGRATION-OS-MULTI-ORIGIN-BATCH.md`, `runStrategicPlanPhase2MigrationOsMultiOriginGate`, `pnpm run hub:strategic-plan-phase2-migration-os-multi-origin-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_MEGA_BATCH=1`).

**Phase 2 delivery dashboard (2026-06-17):** **G5810–G5813** — hub-completion schema **511** + `phase2MigrationOs`, `runStrategicPlanPhase2DeliveryDashboardGate`, `pnpm run hub:strategic-plan-phase2-delivery-dashboard-smoke`.

**Phase 2 program close (2026-06-17):** **G5820–G5823** — `runStrategicPlanPhase2MigrationOsCloseGate`, `pnpm run hub:strategic-plan-phase2-migration-os-close-smoke`. Phase 2 reinforcement **closed**.

**Phase 3 CWL interchange entry (2026-06-17):** **G5830–G5833** — `docs/CWL-INTERCHANGE-PHASE-3.md`, `runStrategicPlanPhase3CwlInterchangeEntryGate`, `pnpm run hub:strategic-plan-phase3-cwl-interchange-entry-smoke`.

**Phase 3 CWL RFC reinforcement (2026-06-17):** **G5840–G5843** — `docs/CWL-RFC-PHASE-3-REINFORCEMENT.md`, `runStrategicPlanPhase3CwlRfcGate`, optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_RFC_ROUNDTRIP=1`.

**Phase 3 OpenAPI export (2026-06-17):** **G5850–G5853** — `docs/CWL-OPENAPI-EXPORT-PHASE-3.md`, `runStrategicPlanPhase3CwlOpenapiExportGate`.

**Phase 3 full-stack alignment (2026-06-17):** **G5860–G5863** — `docs/CWL-FULLSTACK-PHASE-3-ALIGNMENT.md`, `runStrategicPlanPhase3FullstackAlignmentGate`.

**Phase 3 program close (2026-06-17):** **G5870–G5873** — `runStrategicPlanPhase3CwlInterchangeCloseGate`, `pnpm run hub:strategic-plan-phase3-cwl-interchange-close-smoke`. Phase 3 **closed**.

**Phase 4 second oracle origin entry (2026-06-17):** **G5880–G5883** — `docs/SECOND-ORACLE-ORIGIN-PHASE-4.md`, `runStrategicPlanPhase4SecondOracleOriginEntryGate`, `pnpm run hub:strategic-plan-phase4-second-oracle-origin-entry-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for lift depth only).

**Phase 4 live oracle verify (2026-06-17):** **G5890–G5893** — `docs/SECOND-ORACLE-LIVE-VERIFY-PHASE-4.md`, `runStrategicPlanPhase4LiveOracleVerifyGate`.

**Phase 4 Express depth batch (2026-06-17):** **G5900–G5903** — `docs/EXPRESS-DEPTH-BATCH-PHASE-4.md`, `runStrategicPlanPhase4ExpressDepthBatchGate`.

**Phase 4 Express delivery batch (2026-06-17):** **G5910–G5913** — `docs/EXPRESS-DELIVERY-BATCH-PHASE-4.md`, `runStrategicPlanPhase4ExpressDeliveryBatchGate`.

**Phase 4 program close (2026-06-17):** **G5920–G5923** — `runStrategicPlanPhase4SecondOracleOriginCloseGate`, `pnpm run hub:strategic-plan-phase4-second-oracle-origin-close-smoke`. Phase 4 **closed**.

**Phase 5 CWL runtime entry (2026-06-17):** **G5930–G5933** — `docs/CWL-RUNTIME-PHASE-5.md`, `runStrategicPlanPhase5CwlRuntimeEntryGate`, `pnpm run hub:strategic-plan-phase5-cwl-runtime-entry-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1`).

**Phase 5 production search (2026-06-17):** **G5940–G5943** — `docs/CWL-RUNTIME-PRODUCTION-SEARCH-PHASE-5.md`, `runStrategicPlanPhase5ProductionSearchGate`.

**Phase 5 session stub honesty (2026-06-17):** **G5950–G5953** — `docs/CWL-RUNTIME-SESSION-STUB-PHASE-5.md`, `runStrategicPlanPhase5SessionStubGate`.

**Phase 5 program close (2026-06-17):** **G5960–G5963** — `runStrategicPlanPhase5CwlRuntimeCloseGate`, `pnpm run hub:strategic-plan-phase5-cwl-runtime-close-smoke`. Phase 5 **closed**.

**Phase 6 runtime at scale entry (2026-06-17):** **G5970–G5973** — `docs/CWL-RUNTIME-SCALE-PHASE-6.md`, `runStrategicPlanPhase6RuntimeScaleEntryGate`.

**Phase 6 emit verify mega (2026-06-17):** **G5980–G5983** — `docs/CWL-RUNTIME-EMIT-VERIFY-PHASE-6.md`, `runStrategicPlanPhase6EmitVerifyMegaGate`.

**Phase 6 production graduation (2026-06-17):** **G5990–G5993** — `docs/CWL-RUNTIME-PRODUCTION-GRADUATION-PHASE-6.md`, `runStrategicPlanPhase6ProductionGraduationGate`.

**Phase 6 program close (2026-06-17):** **G6000–G6003** — `runStrategicPlanPhase6RuntimeScaleCloseGate`, `pnpm run hub:strategic-plan-phase6-runtime-scale-close-smoke`. Phase 6 **closed**.

**Phase 7 full-stack entry (2026-06-17):** **G6010–G6013** — `docs/CWL-FULLSTACK-PHASE-7.md`, `runStrategicPlanPhase7FullstackEntryGate` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD=1`).

**Phase 7 hole budget (2026-06-17):** **G6020–G6023** — `docs/CWL-FULLSTACK-HOLE-BUDGET-PHASE-7.md`, `runStrategicPlanPhase7HoleBudgetGate`.

**Phase 7 program close (2026-06-17):** **G6040–G6043** — `runStrategicPlanPhase7FullstackCloseGate`, `pnpm run hub:strategic-plan-phase7-fullstack-close-smoke`. Phase 7 **closed**.

**Phase 8 product proof entry (2026-06-17):** **G6050–G6053** — `docs/PRODUCT-PROOF-PHASE-8.md`, `resolveStrategicPlanSkips`, `runStrategicPlanPhase8ProductProofEntryGate`, `pnpm run hub:strategic-plan-phase8-product-proof-entry-smoke`.

**Phase 8 oracle proof (2026-06-17):** **G6060–G6063** — `runStrategicPlanPhase8OracleProofGate`, `pnpm run hub:strategic-plan-phase8-oracle-proof-smoke`.

**Phase 8 HTTP emit proof (2026-06-17):** **G6070–G6073** — `runStrategicPlanPhase8HttpEmitProofGate`, `pnpm run hub:strategic-plan-phase8-http-emit-proof-smoke`.

**Phase 8 CWL interchange proof (2026-06-17):** **G6080–G6083** — `runStrategicPlanPhase8CwlInterchangeProofGate`, `pnpm run hub:strategic-plan-phase8-cwl-interchange-proof-smoke`.

**Phase 8 Hub operator proof (2026-06-17):** **G6090–G6093** — `runHubEvidenceUiProofGate`, `runStrategicPlanPhase8HubOperatorProofGate`, `pnpm run hub:strategic-plan-phase8-hub-operator-proof-smoke`.

**Phase 8 cutover proof (2026-06-17):** **G6100–G6103** — `runRuntimeSessionSqlHonestyGate`, `runStrategicPlanPhase8CutoverProofGate`, `pnpm run hub:strategic-plan-phase8-cutover-proof-smoke`.

**Phase 8 program close (2026-06-17):** **G6110–G6113** — `runStrategicPlanPhase8ProductProofCloseGate`, `pnpm run hub:strategic-plan-phase8-product-proof-close-smoke`. **Strict:** `CHRYSALIS_STRICT_STRATEGIC_PLAN=1`. Phase 8 **closed**. **Strict proof passed on GCE (2026-06-18).**

**Phase 9 operational hardening entry (2026-06-18):** **G6120–G6123** — `docs/OPERATIONAL-HARDENING-PHASE-9.md`, hub-completion schema **512** + `phase8ProductProof`, `runStrategicPlanPhase9OperationalEntryGate`.

**Phase 9 program close (2026-06-18):** **G6150–G6153** — `runStrategicPlanPhase9OperationalCloseGate`, `pnpm run hub:strategic-plan-phase9-operational-close-smoke`. Phase 9 **closed**.

**Phase 10 production parity (2026-06-19):** **G6200–G6257** — Runtime Phase C, WordPress vertical, matrix expansion, multi-language evidence; `docs/PRODUCTION-PARITY-PHASE-10.md`; `pnpm run hub:strategic-plan-phase10-production-parity-close-smoke`.

**Phase 10 program close (2026-06-19):** **G6254–G6257** — `runStrategicPlanPhase10ProgramArchiveCloseGate`, `pnpm run hub:strategic-plan-phase10-program-archive-close-smoke`. Phase 10 **closed**. Default build queue → **maintenance**.


### Full-stack CWL — next 10 steps (after G1158)

**Full-stack queue (2026-06-17):** **Queues 111–437 complete** (schema **510**) — post-110 authoring replay program **closed**; maintenance only.

**Fast batch proof:** set `**CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN=1`** so v31+ chains use v30 graduation-only (skips re-running batches v2–v29).

**Default test execution (2026-06-01):** run the full suite on Linux GCE, not on a sleeping laptop — `**pnpm run test:gce`** (see `**docs/GCE-LOCAL-VERIFY.md**`).

### Hub verify-gaps program (post–Next 90 days) — **Closed (2026-06-16)**

**Status:** months **26–30** shipped (**hub-completion schema 74** baseline); **Phase B** reinforcement complete on GCE (**G2272**, **`pnpm run hub:verify-gaps-post110-reinforcement-smoke`**). Maintenance only — no new schema fork unless hub-completion bumps.


| Month | Focus | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 26 | Auth-probe verify seed closure after strict reingest (schema 70) | **Closed** |
| 27 | **Real verify replay** after reingest (`CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY`); multi-flagship replay; IR helper lifting hub smoke (schema 71) | **Closed** |
| 28 | **HTTP oracle verify** after reingest (`CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP`); multi-flagship HTTP verify; IR helper semantic lifting (schema 72) | **Closed** |
| 29 | **Fastify HTTP oracle verify** + IR helper embed lifting B4 (`--ingest-embed-shared-helper-bodies`); multi-flagship Fastify HTTP batch (schema 73) | **Closed** |
| 30 | **Hub verify-gaps graduation** — reingest + Fastify HTTP (`CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET`); IR helper B1–B4 full path; dual-backend HTTP verify loop complete (schema 74) | **Closed** |


HTTP verify runs emit + live server + `chrysalis verify --base-url` — stronger than in-process replay. Replay and seed closure remain for faster probes. Fastify HTTP verify proves the second emit backend on live HTTP.
