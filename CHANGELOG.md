# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **GCE smoke VM:** **`scripts/gce-test-vm.ps1`** hardened for Windows PowerShell (**`Invoke-Gcloud`**, describe/SSH stderr under **`Stop`**, **`gcloud compute scp`** remote path without **`~/`**, optional **`-BillingAccountId`**, **`-DeployFromLocalGit`** via **`git archive`** + **`chrysalis-src.tgz`**). **`scripts/gce-test-vm-bootstrap.sh`** supports tarball extract, **`GIT_TERMINAL_PROMPT=0`**, **`python3`**, and non-strict **`pnpm run test:cli-shims`** on the VM. Documented in **`docs/DEPLOYMENT.md`** and [How-to scenario 24](./docs/HOW-TO.md#24-provision-a-cheap-gce-vm-and-smoke-test-the-repo).

- **Multi-runtime CLI shims (DESIGN D295):** **`go/shim/`** Go entrypoint that **`exec`s** the built Node CLI; **`python/chrysalis_shim/`** Python package with **`chrysalis-py`** and **`python -m chrysalis_shim`**. Both honor **`CHRYSALIS_CLI_JS`** and **`CHRYSALIS_NODE`**. **`pnpm run test:cli-shims`** skips missing interpreters locally; on **`GITHUB_ACTIONS`** (or **`CHRYSALIS_STRICT_CLI_SHIMS=1`**) **both** shims must pass. **`typecheck-and-test`** in **`.github/workflows/ci.yml`** runs **`pnpm run test:cli-shims`** after **`pnpm -r build`** with **`actions/setup-go@v5` (Go 1.22)** so both shims stay covered in CI.

- **AgenticOp** outbound identity (**`https://agenticop.io`**): **`docs/AGENTICOP.md`**, **`branding/agenticop/`** SVG logos + READMEs, cross-links from **`README.md`**, **`docs/README.md`**, **`docs/COMMERCIAL.md`** (**DESIGN D292**).
- **Firebase Hosting** for **`agenticop-site/`**: **`firebase.json`** target **`agenticop`** → site **`agenticops-production`** in project **`wisptools-production`**; committed **`.firebaserc`**; **`pnpm run deploy:agenticop-site`**.
- **`agenticop-site/`** expanded landing (navigation, approach, engine, reference pilots table linking **`fixtures/tiny-blog`**, **`flagship/laravel-min`**, **`flagship/laravel-full`**, **`generated/tiny-blog`**, FAQ, CTAs).

### Changed

- **Canonical public GitHub remote** is **`theorem6/chrysalis`** (clone URLs, **`package.json` `repository.url`**, issue templates, **`CODEOWNERS`**, **`CHANGELOG`** release link footers, **`scripts/bootstrap-github-project.mjs`** default owner, **`agenticop-site`**, **`ROADMAP`** backlog links). **DESIGN D293** (supersedes **D286** for forward-looking links).

- **`CONTRIBUTING.md`** — **Proof-of-concept and pilot trees**: table of paths that must stay in git vs reproducible/ignored outputs; **`.gitignore`** comments aligned (**`.firebase/`** cache only; **`tmp-corpus-rotate-*/`**, **`**/__pycache__/`** for corpus-rotate tests and Python bytecode).
- **Docs:** **`docs/README.md`** (How-to count); **`docs/DEPLOYMENT.md`** (GCE **`gce-test-vm.ps1`**); **`docs/HOW-TO.md`** (scenario 24); **`CONTRIBUTING.md`** (full local verification commands). Regenerated **`agenticop-site/`** artifacts via **`pnpm run sync:agenticop-site`** after **`docs/WHITEPAPER.md`** alignment.
- **Master program:** **`docs/MASTER-PROGRAM.md`** (Web Platform Translation Program charter + D0–D7 plan; Chrysalis as **D1**); **`docs/GITHUB_PROJECT.md`** + **`scripts/bootstrap-github-project.mjs`** — optional **`CHRYSALIS_GH_PROJECT_PRESET=master`** (program **Lane** values + **Workstream** field); **`master`** preset seeds **`docs/MASTER-PROGRAM.md`** section **12** draft project items unless **`CHRYSALIS_GH_PROJECT_SEED_ITEMS=0`**.
- **WPTP D2 closure:** **`docs/WPTP-D2-EXIT-REPORT.md`**; CI workflow **`webir-bundle-to-wptp-ir`** (tiny-blog export → **`@wptp/ir`** import, zero losses); **`scripts/verify-webir-bundle-wptp-ir.mjs`**; **`export-webir-bundle.mjs`** **`--help`**; Vitest **`export-webir-bundle-script.test.ts`**.
- **WPTP D3 closure:** **`docs/WPTP-D3-EXIT-REPORT.md`**; **`scripts/wptp-d3-silver-harness.mjs`** + CI **`wptp-d3-harness`** (OpenAPI/HAR silver → Chrysalis **`emit-hono`**); **`pnpm run wptp:d3-silver-harness`** (needs **`CHRYSALIS_ROOT`** + sibling **`wptp-matrix`**).
- **Canonical GitHub remote:** **`AgenticOp-io/chrysalis`** (**DESIGN D303**); **`package.json` `repository.url`**, install docs, bootstrap default owner. **`theorem6/chrysalis`** redirects.
- **Tests:** **`migration-debt-gates`** uses pinned **`fixtures/ci/tiny-blog-verify-for-status`** so parallel Vitest runs do not read polluted **`reports/verify`**.
- **WPTP D4 closure:** **`docs/WPTP-D4-EXIT-REPORT.md`**; **`scripts/wptp-d4-nextjs-harness.mjs`** + CI **`wptp-d4-harness`** (`@wptp/emit-nextjs` package tests + Next.js bronze compose); **`pnpm run wptp:d4-nextjs-harness`**.
- **WPTP D6 closure:** **`docs/WPTP-D6-ENTERPRISE-POLICY.md`**, **`docs/WPTP-D6-EXIT-REPORT.md`** (enterprise policy pack; aligns with **`docs/COMMERCIAL.md`**).
- **WPTP D7 playbook:** **`docs/WPTP-D7-ONGOING.md`** (quarterly matrix audit, CI hygiene).
- **WPTP silver Next.js (D306):** **`scripts/emit-webir-bundle-nextjs.mjs`**, **`scripts/wptp-silver-nextjs-harness.mjs`**, CI **`wptp-silver-nextjs-harness`**; **`pnpm run wptp:silver-nextjs-harness`** (Chrysalis WebIR bundle → **`@wptp/emit-nextjs`**; matrix paths **`openapi-ir-nextjs-chrysalis`**, **`har-ir-nextjs-chrysalis`**).
- **Verify replay (D308):** redacted form **`post`** fields replay from **`rawBody`**; SQL tape omitted when row values are redacted placeholders — fixes **`verify-tiny-blog`** at **`VERIFY_THRESHOLD=0.95`** in CI.
- **Flagship laravel-full:** recursive-stress SQL returns **`maxN=0`** when **`items`** is empty (fixes seed-matrix metamorphic gate in CI).
- **Deps:** **`tsx`** **4.22.3**; **`pnpm.overrides`** **`protobufjs@7.6.0`** (Dependabot-aligned).
- **Emit (Hono):** terminal PHP returns route through **`__respond`** so empty bodies no longer make **`app.fetch`** yield **`Context`** during verify replay; handler epilogue omitted only when the handler block ends with a provably terminal statement (**`packages/emit-shared`**).
- **Flagship templates:** null-safe **`first_item_show`** / **`last_item_show`** when the items table is empty.
- **CLI:** **`chrysalis status --json`** reads dual-backend verify summaries from **`hono/run-N`** / **`fastify/run-N`** stress directories.

### Added

- **Parser Lane A (Wave 6):** **`fixtures/parser-parity-probe`** pages **`coalesce_assign.php`** (`??=`) and **`string_interpolation.php`**; nikic/glayzzle parity tests in **`packages/parser-bridge/tests/nikic.test.ts`**.
- **WPTP D7:** **`pnpm run wptp:d7-audit`** — local quarterly audit helper (**`scripts/wptp-d7-audit.mjs`**).
- **`chrysalis init [<dir>]`** writes **`chrysalis.project.json`** (**`kind`:** **`chrysalis.project`**, **`schemaVersion`:** **`1.0.0`**, **`initializedAt`**) at the PHP project root; creates **`dir`** when missing; idempotent when the marker already matches. **`CHRYSALIS_REQUIRE_LICENSE`** does **not** gate **`init`** so vendor trees can be bootstrapped before keys ship (**DESIGN D290**). Vitest **`packages/cli/tests/init-cli.test.ts`**.

- **Commercial monetization stack (DESIGN D289):** **`docs/COMMERCIAL.md`** (revenue ordered: services, support, licensed distribution, training, examples); **`@chrysalis/license`** (Ed25519 **`claims` + `sig`**, **`assertMinLicenseTier`**, **`CHRYSALIS_LICENSE_MIN_TIER`**); **`chrysalis license`**, **`CHRYSALIS_REQUIRE_LICENSE`**, **`scripts/sign-license.mjs`**, root **`pnpm run license:sign`**; Vitest **`packages/license/tests`**, **`packages/cli/tests/license-cli.test.ts`**. Default OSS behavior unchanged (gate off). **Not a public commercial product launch** (no published SKU line or standalone npm commercial offering yet; docs state **publication status**).

- **`.github/CODEOWNERS`** default review routing to **`@4GEngineer/4gengineer`** (requires team **write** access). Superseded post-**2.0.1** by **`@theorem6`** (**DESIGN D293**). **`docs/ADMINISTRATION.md`** — *GitHub repository (org settings)* documents API-applied settings (**Discussions**, **Dependabot security updates**) and the **private-plan** limitation for branch protection / rulesets / secret scanning, with CI check names to require after upgrade.

- **Repository governance:** [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) (Contributor Covenant 2.1), [`.github/pull_request_template.md`](./.github/pull_request_template.md), [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/) (bug + feature forms; security/docs contact links), [`.github/dependabot.yml`](./.github/dependabot.yml) (npm + GitHub Actions), and expanded [`.gitattributes`](./.gitattributes) plus [`CONTRIBUTING.md`](./CONTRIBUTING.md) (branch naming, CoC, security reporting).

### Changed

- **Dev toolchain:** **`vitest`** **4.1.5** and explicit **`vite`** **6.4.2** at the repo root clear **`pnpm audit`** moderate findings on the historical **Vitest 1.x → Vite 5.4.x → esbuild** chain (development server / source-map handling advisories); **`pnpm test`** unchanged in scope.

- **GitHub canonical remote:** **`package.json`** `repository.url`, install and project docs, **`CHANGELOG.md`** release link footers, and **`scripts/bootstrap-github-project.mjs`** default owner fallback now use **`https://github.com/theorem6/chrysalis`** (user namespace after consolidation). **DESIGN D286** (org transfer) then **D293** (canonical **`theorem6`** home).

- **Semver:** root and **`packages/*/package.json`** **`version`** **2.0.0 → 2.0.1**; committed **`fixtures/ci/*-smoke.json`** **`toolVersion`** fields match **2.0.1**.

### Documentation

- **`docs/GITHUB_PROJECT.md`** — default release pin example points at **`v2.0.1`**.
- **`docs/INSTALLATION.md`** — **`chrysalis init`** / **`chrysalis.project.json`**; optional **commercial license** env vars and **`pnpm run license:sign`**; **Windows Git** note when **`credential-manager-core`** is missing from **`PATH`**.
- **`docs/OPERATIONS.md`** — **v0** fleet discipline: pin **`chrysalis.chimera.config`** (or equivalent) revision / digest in change tickets and uplinks until first-class revision pins land.
- **`ROADMAP.md`** Milestone 0 — workspace package count wording (no stale **“10 packages”**).
- **`AGENTS.md`**, **`CONTRIBUTING.md`**, **`README.md`**, **`packages/cli/README.md`**, **`packages/license/README.md`** — commercial / **`init`** cross-links as applicable.
- **`docs/RELEASE.md`** — examples and **`gh release create`** use **v2.0.1** / **`chrysalis-2.0.1-source.*`**; **`git ls-remote --tags origin <tag>`** vs **`git rev-parse <tag>^{commit}`** / **`HEAD`** checks; safe tag repair (**delete remote tag → retag → push**) when a semver tag was created on the wrong commit.
- **`.github/ISSUE_TEMPLATE/01-bug_report.yml`** — version hint **v2.0.1**.
- **GitHub branches (`origin`)** — removed **`feat/commercial-license-toolchain`** (work landed on **`main`**) and **8** stale **`dependabot/**`** branch heads to reduce remote clutter (**Dependabot** can open fresh PRs when updates apply).

## [2.0.0] - 2026-04-30

### Summary

This tag marks the **Chrysalis 2.0** scale-out line on the main branch: **`ROADMAP.md`** milestones **V2-M1** through **V2-M6** are complete, with operator runbooks and versioned machine JSON summarized in **`DESIGN.md`** (**D284–D285**). Work that remains explicitly **optional** in the roadmap (for example IR-level helper lifting, full WebIR ingest checkpointing beyond AST cache and shards, automated corpus rotation, third-party dashboards, PHP `rediss://`) continues after **2.0.0** without relaxing **`DESIGN.md`** non-negotiables.

### Changed

- **Release:** root and every **`packages/*/package.json`** **`version`** is **2.0.0** (was **1.0.1**). **`fixtures/ci/*-smoke.json`** **`toolVersion`** fields that pinned **1.0.1** now read **2.0.0** so embedded summaries match the workspace semver.

### Documentation

- **v2.0.0 tag criteria + five-nines operator path (DESIGN D284):** **`DESIGN.md`** Decision Log and **`docs/OPERATIONS.md`** (repository verify scripts) document the **`ROADMAP.md`** **v2.0.0 tag criteria (proposal)** checklist against shipped **`schemaVersion`** artifacts and the **`pnpm run verify:laravel-full:5nines`** prerequisite chain (**Composer** + **`pnpm run scaffold:laravel-full`** / optional **`:breeze`** for **`flagship/chrysalis-laravel-work/`**). **DESIGN §3:** docs only.

### Added

- **Within-module structural subgraph dedupe (DESIGN D283):** **`dedupeStructuralSubgraphsInModule`** in **`@chrysalis/webir`** (same structural key as **`mergeWebIrModules`** / **D247**); **`IngestOptions.dedupeStructuralSubgraphs`**; CLI **`--ingest-dedupe-structural-subgraphs`** on **`ingest`**, **`emit`**, **`status --project`**, **`verify --project`**, **`repair`**, **`insight`**, **`rewrite`**. Vitest **`packages/webir/tests/merge-modules.test.ts`**, **`packages/ingest/tests/tiny-blog.test.ts`**, **`packages/ingest/tests/merge-webir-modules.test.ts`** (monolithic dedupe **`nodes.size`** = **K=2** merged shards on **`fixtures/tiny-blog`**), **`packages/ingest/tests/many-routes-synthetic-ingest.test.ts`** (dedupe vs post-pass **`dedupeStructuralSubgraphsInModule`**), **`packages/cli/tests/cli-help-scaleout.test.ts`**, **`packages/cli/tests/ingest-dedupe-structural-subgraphs-cli.test.ts`** (**`ingest`** incl. route shard, **`merge-all-shards`**, **`emit`** Hono/Fastify, **`emit --merge-all-shards`**, **`convert`**, **`status --json`** **`migration.coverage`** parity, **`insight --json`**, **`rewrite --json`**), **`packages/cli/tests/merge-all-shards-emit-cli.test.ts`** (**`emit --merge-all-shards`** + D283), **`packages/cli/tests/migration-debt-json.test.ts`** (script forwards D283), **`packages/webir/tests/merge-modules.test.ts`** (meta + route keys preserved). **`docs/OPERATIONS.md`**, **`docs/ADMINISTRATION.md`**, **`ROADMAP.md`** V2-M4 *Remaining*; package READMEs (**`webir`**, **`ingest`**, **`cli`**, **`verify`**); **`DESIGN.md`** D283 empirical parity note.

- **Tests — D282 dedupe combinations:** **`emit-hono`** / **`emit-fastify`** **`emit.test.ts`** cover dedupe with **`emitRoutePathConstants`**, **`runtimeFacadeModule`**, **`emitHandlerFingerprints`**, and **`emitSharedRuntimeImports`** (incl. SRI + **`runtimeFacadeModule`**); **`packages/cli/tests/emit-dedupe-identical-handler-bodies-cli.test.ts`** covers Hono **`emit`** with **`--emit-route-path-constants`** and **`--emit-shared-runtime-imports`**; **`packages/ingest/tests/tiny-blog.test.ts`** ingests **`fixtures/dedupe-identical-handlers/`**.

- **Identical handler body dedupe (DESIGN D282):** **`emitStrategy.emitDedupeIdenticalHandlerBodies`**; **`chrysalis emit --emit-dedupe-identical-handler-bodies`**; **`@chrysalis/emit-shared`** **`computeEmittedHandlerDedupeKey`**, **`chrysalisBodyDedupeExportId`**; **`emit-hono`** / **`emit-fastify`** emit **`src/chrysalis-deduped/<id>.ts`** and thin per-route handlers. Fixture **`fixtures/dedupe-identical-handlers/`** (byte-identical route pages for subprocess **`emit`**). Vitest **`packages/emit-shared/tests/emit-handler-body-dedupe.test.ts`**, **`packages/emit-shared/tests/emitted-ts-layout.test.ts`** (**`src/chrysalis-deduped/`** path), **`packages/emit-hono/tests/emit.test.ts`**, **`packages/emit-fastify/tests/emit.test.ts`** (incl. **`handlerImportBarrel`** + **`routeRegistration.lazy`** with dedupe), **`packages/cli/tests/cli-help-scaleout.test.ts`**, **`packages/cli/tests/emit-dedupe-identical-handler-bodies-cli.test.ts`** (Hono + Fastify **`emit`**). **`DESIGN.md`** Decision Log; **`ROADMAP.md`** V2-M4; package READMEs + **`docs/OPERATIONS.md`**, **`docs/README.md`**, **`docs/ADMINISTRATION.md`** + root **`README.md`** machine table.

- **Emit shared runtime imports (DESIGN D281):** **`emitStrategy.emitSharedRuntimeImports`** → **`src/chrysalis-runtime-imports.ts`**; **`chrysalis emit --emit-shared-runtime-imports`**; **`emit-hono`** / **`emit-fastify`** + **`@chrysalis/emit-shared`** **`buildChrysalisRuntimeSharedImportsModuleSource`**. Mutually exclusive with **`handlerImportBarrel`** / **`--emit-handler-import-barrel`**. **`docs/OPERATIONS.md`** command map + emit-side artifacts + **`--emit-resume`** note (aggregated import modules rewritten each successful emit). Vitest **`packages/cli/tests/emit-shared-runtime-imports-cli.test.ts`** (reject barrel combo + successful **`emit`** + **`--merge-all-shards`** + **`--emit-route-path-constants`** with flag), **`packages/emit-shared/tests/chrysalis-handler-imports.test.ts`**, **`packages/emit-shared/tests/emitted-ts-layout.test.ts`** (**`chrysalis-runtime-imports.ts`** path), **`emit-hono` / `emit-fastify`** **`emitResume`** + **`routeRegistration.lazy`** + **`emitRoutePathConstants`** + **`emitHandlerFingerprints`** combined with shared-imports; **`emit-hono`** **`golden-emit`** + **`summarizeEmittedTypeScriptLayout`** +1 **`tsFileCount`** vs default emit. **`docs/ADMINISTRATION.md`** scale-out one-liner mentions **`--emit-shared-runtime-imports`**.

- **Ingest progress on verify/repair/insight (DESIGN D280):** **`chrysalis verify --ingest-progress-file`** (requires **`--project`**), **`repair`**, **`insight`** — same **`ingestDirectory`** option as **D277**.

- **Ingest progress validation (DESIGN D278):** **`parseIngestProgressJson`**, **`readIngestProgressFile`** in **`@chrysalis/ingest`**; fixture **`fixtures/ci/ingest-progress-v0-smoke.json`**; **`docs/OPERATIONS.md`**, **`ROADMAP.md`** V2-M4, **`packages/emit-shared/README.md`**.

- **Ingest progress JSON (DESIGN D277):** **`chrysalis.ingest.progress`** **`schemaVersion` 0** — optional **`--ingest-progress-file <path>`** on **`chrysalis ingest`**, **`emit`**, **`status --project`**; **`IngestOptions.ingestProgressFile`** in **`@chrysalis/ingest`**. Vitest **`packages/ingest/tests/ingest-progress-file.test.ts`**, **`packages/cli/tests/ingest-progress-file-cli.test.ts`**.

### Documentation

- **Operator JSON index (DESIGN D279):** root **`README.md`** machine-readable table — **`chrysalis.ingest.progress`** **`schemaVersion` 0**; **`docs/README.md`** Operations row (**D277** / **D278**).

- **V2-M2 synthetic ingest CI guards (DESIGN D276):** **`docs/OPERATIONS.md`**, **`ROADMAP.md`**, **`packages/ingest/README.md`**, **`docs/README.md`**, **`docs/ADMINISTRATION.md`** — document **`CHRYSALIS_INGEST_RSS_MAX_BYTES`** / **`CHRYSALIS_INGEST_BUDGET_MS`** (Vitest **`many-routes-synthetic-ingest`**, **D255** alignment); **`DESIGN.md`** Decision Log.
- **V2-M2 ingest runbook (DESIGN D275):** **`docs/OPERATIONS.md`** — *Ingest scale and resume (V2-M2 runbook)*; **`ROADMAP.md`** V2-M2 progress; **`docs/README.md`**; **`docs/ADMINISTRATION.md`** CI gates paragraph; **`DESIGN.md`** Decision Log.
- **V2-M6 closure (DESIGN D274):** **`docs/OPERATIONS.md`** — *Fleet aggregation reference (V2-M6 closure)*; **`ROADMAP.md`** marks **V2-M6** closed and updates **`v2.0.0` tag criteria**; **`docs/README.md`** Operations row; **`DESIGN.md`** Decision Log.
- **`chrysalis --help`:** scale-out line mentions **`--emit-runtime-facade`** and **`pnpm run test:oracle-php-session-redis`**; **`packages/cli/README.md`**, **`docs/ADMINISTRATION.md`** aligned.
- **Emit READMEs:** **`emit-hono`** / **`emit-fastify`** document **`runtimeFacadeModule`** / **`--emit-runtime-facade`** (**D272**). Root **`README.md`** machine-readable table adds the runtime-facade row.
- **Root `README.md`:** replaces outdated “Milestone 1 session bridge” polish with **D178 / D273** Redis + PHP **`registerFromEnv()`** pointer. **`docs/README.md`** (Operations guide row + **`oracle-php`** package reference), **`docs/OPERATIONS.md`** (contributor **`test:oracle-php-session-redis`** note). **`ROADMAP.md`** V2-M6 operator doc refresh bullet (**D272–D273**).

### CI

- **`typecheck-and-test`:** Redis **7** service + PHP **redis** extension; **`pnpm run test:oracle-php-session-redis`** with **`CHRYSALIS_SESSION_REDIS_URL`** (**DESIGN D273**). Redis service health check aligned with **`shivammathur/setup-php`** examples; smoke step asserts **phpredis** before running.

### Fixed

- **`buildFastifyChrysalisHandlerImportsSource`:** use **`runtimeExportNamesForAgg`** for the Fastify handler-import barrel (was a stale **`runtimeExportNames`** reference).

- **Parser-bridge vendor without global Composer:** `pnpm test` pretest and `pnpm run vendor:parser-bridge` use `scripts/parser-bridge-composer-install.mjs` — try `composer` on `PATH`, else bootstrap `packages/parser-bridge/composer.phar` via the official installer when `php` is available (Windows-friendly).

### Documentation

- **DESIGN D270**, **`docs/INSTALLATION.md`**, **`AGENTS.md`**, **`ROADMAP.md`**: document parser-bridge **`composer.phar`** bootstrap when global Composer is absent.

### Added

- **V2-M5 session bridge (D273):** **`Chrysalis\Oracle\Session\RedisChrysalisSessionHandler`** + **`registerFromEnv()`** (**`packages/oracle-php`**) — PHP sessions in Redis using the same **`chrysalis:sess:`** JSON keys as emitted apps with **`CHRYSALIS_SESSION_REDIS_URL`** (**DESIGN D178**). Optional smoke **`packages/oracle-php/tests/redis_session_bridge_smoke.php`**. **`docs/OPERATIONS.md`** and **`oracle-php` README** updated.

- **V2-M4 (D272):** **`emitStrategy.runtimeFacadeModule`**, **`buildChrysalisRuntimeFacadeModuleSource`**, emitted **`src/chrysalis-runtime-facade.ts`**; **`emit-hono`** / **`emit-fastify`** + optional **`chrysalis-handler-imports`** barrel route runtime imports through the facade; CLI **`chrysalis emit --emit-runtime-facade`**.

- **V2-M6 / fleet (D271):** **`chrysalis.verify.summary.batch`** (**`schemaVersion`:** **1**); **`scripts/aggregate-verify-summaries.mjs`**; **`@chrysalis/verify`** **`VERIFY_SUMMARY_*`** constants; fixture **`fixtures/ci/verify-summary-batch-v1-smoke.json`**; **`pnpm run ci:verify-summary-batch`**; **`chrysalis --help`** scale-out line; **`docs/OPERATIONS.md`**.

- **V2-M6 operator ergonomics (D260–D269):** **`chrysalis --help`** scale-out line documents **`--emit-handler-fingerprints`** + **`aggregate-chimera-operator-snapshots.mjs`**; root **`README.md`** machine-JSON table rows; **`docs/README.md`**, **`emit-shared`**, **`emit-hono`**, **`emit-fastify`** README updates; Vitest **stdin**, **invalid JSON**, and **wrong kind** coverage for the aggregate script.

- **V2-M5 / V2-M6 (D259):** **`chrysalis.chimera.operator-snapshot.batch`** (**`schemaVersion`:** **1**); **`scripts/aggregate-chimera-operator-snapshots.mjs`** (NDJSON → batch JSON); fixture **`fixtures/ci/chimera-operator-snapshot-batch-v1-smoke.json`**; **`emitStrategy.emitHandlerFingerprints`**, **`chrysalis.emit-handler-fingerprints.json`**, CLI **`--emit-handler-fingerprints`**; Vitest + extended **`pnpm run ci:chimera-operator-snapshot`**.

- **V2-M4 / V2-M5 / V2-M6 (D258):** **`chrysalis.chimera.operator-snapshot`** + **`deployRoutingFingerprintSha256`**; **`chrysalis deploy --operator-metrics-json`**, **`--operator-metrics-ndjson`**, **`--operator-metrics-interval-ms`**, **`CHRYSALIS_CHIMERA_INSTANCE_ID`**; **`scripts/chimera-routing-fingerprint.mjs`**; **`pnpm run ci:chimera-operator-snapshot`**; **`emitStrategy.emitRoutePathConstants`**, **`buildChrysalisRoutePathsModuleSource`**, **`src/chrysalis-route-paths.ts`**, CLI **`--emit-route-path-constants`**; **`docs/OPERATIONS.md`** operator drift + fleet privacy; fixture **`fixtures/ci/chimera-operator-snapshot-v1-smoke.json`**.

- **V2-M5 (D257):** Multi-key chimera deploy HMAC — **`hmacSha256`** as hex **string** or **`{ keyId: hex }`**; **`parseChimeraDeployConfigJson`** **`hmacPreviousSecrets`** / **`hmacSecretsByKeyId`**; **`computeChimeraDeployConfigHmacHexByKeyIds`**; CLI **`--config-hmac-keys-json`**; **`CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON`**, **`CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS`**; **`docs/OPERATIONS.md`** / **`ADMINISTRATION.md`** updated.

- **V2-M4 / V2-M5 (D256):** **`emitStrategy.handlerImportBarrel`**, **`src/chrysalis-handler-imports.ts`**, CLI **`--emit-handler-import-barrel`**; **`chrysalis deploy --config-url`** + **`CHRYSALIS_CHIMERA_CONFIG_URL`**; **SIGHUP/SIGUSR2** config reload; **`ci:chimera-lb-smoke`** + round-robin LB Vitest; **`docs/OPERATIONS.md`** KMS/HMAC rotation; **`aggregateEmittedHandlerImports`** / barrel builders in **`@chrysalis/emit-shared`**.

- **V2-M5 / V2-M2 / V2-M6 (D255):** Optional **`hmacSha256`** on chimera deploy JSON; **`parseChimeraDeployConfigJson`** HMAC verification; CLI **`--config-hmac-secret`**; **`computeChimeraDeployConfigHmacHex`** / **`stableStringifyChimeraDeploySigningPayload`**; optional **`CHRYSALIS_INGEST_RSS_MAX_BYTES`**; **`scripts/export-fleet-status-uplink.mjs`** + **`pnpm run fleet:export-status-uplink`**; fleet fixture **`items[].status`**; deploy **`stats`** log includes shadow line/canary fields; two-instance chimera Vitest.

- **V2-M2 / V2-M5 / V2-M6 (D254):** **`ChimeraStats`** — shadow **`divergenceLines`**, **`mirrorErrors`**, and canary aggregate counters; **`emitResume`** + **`.chrysalis-emit-state.json`** in **`@chrysalis/emit-hono`** / **`emit-fastify`**; CLI **`chrysalis emit --emit-resume`**; optional **`CHRYSALIS_INGEST_BUDGET_MS`** in **`many-routes-synthetic-ingest`**; fixture **`fixtures/ci/fleet-status-uplink-v0-smoke.json`** + Vitest **`fleet-status-uplink-schema.test.ts`**; **`docs/OPERATIONS.md`** multi-AZ / stickiness / emit-resume; **`docs/ADMINISTRATION.md`** env row.

- **V2-M1 — CI gate for merged verify JSON:** `scripts/ci-gates.mjs verify-merged-summary`, root **`pnpm run ci:verify-merged-summary`**, fixture **`fixtures/ci/verify-merged-summary-smoke.json`**, **`verify-tiny-blog.mjs`** emits **`reports/ci/verify-e2e-merged-summary.json`** (K=2 partition parity smoke or single-shard fallback). Optional **`CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS`** in CI.

- **V2-M2 — ingest / emit route sharding:** **`ingestDirectory`** accepts **`shardIndex` / `shardCount`**; **`buildCallEffectMap`** still uses all manifest routes. **`chrysalis ingest`** and **`chrysalis emit`** accept **`--shard-index`** / **`--shard-count`**. FNV bucket helper **`packages/ingest/src/route-shard.ts`**.

- **V2-M2 — opt-in ingest AST cache:** **`ingestDirectory`** **`ingestCacheDir`**, **`INGEST_AST_CACHE_VERSION`**, **`packages/ingest/src/parse-cache.ts`**; CLI **`--ingest-cache <dir>`** on **`ingest`** and **`emit`**.

- **V2-M3 — corpus tree merge:** **`mergeCorpusDirectories`** in **`@chrysalis/oracle`**, CLI **`chrysalis corpus-merge`** with **`--out`**, **`--on-duplicate error|skip`**, optional **`--dedupe-trace-id skip`**, deterministic sampling **`--sample-modulo K --sample-remainder R`**, **`--dry-run`** preview mode, and **`--json-out <file>`** machine summary (**`chrysalis.corpus-merge.summary`**). **`scripts/ci-gates.mjs corpus-merge-summary`**, fixture **`fixtures/ci/corpus-merge-summary-smoke.json`**, root **`pnpm run ci:corpus-merge-summary`**, Vitest **`packages/cli/tests/ci-gates-corpus-merge-summary.test.ts`**, and **`typecheck-and-test`** gate step.

- **V2 operator tests / help:** **`chrysalis --help`** documents scale-out flag families; Vitest **`packages/cli/tests/cli-help-scaleout.test.ts`**. **`corpus-merge-summary`** invalid JSON + wrong-**`kind`** stderr coverage. **`mergeCorpusDirectories`** dry-run vs live counter parity; CLI **`corpus-merge`** tests for **`--json-out`** fields and **`--dry-run --json-out`**. **`docs/ADMINISTRATION.md`**, **`packages/verify/README.md`**, and **`packages/cli/README.md`** cross-link **`--help`** / gate tests.

- **V2-M3 — multi-host merge verify (tiny-blog e2e):** **`scripts/verify-tiny-blog.mjs`** splits captured traces into **`reports/ci/traces-host-{a,b}`**, merges to **`reports/ci/traces-merged-multi-host`**, replays merged corpus vs **Hono** at **`VERIFY_THRESHOLD`** using a **pristine `blog.sqlite` copy** (**`reports/ci/pristine-hono-blog.sqlite`**) so merged replay is isolated from earlier in-process replays. **`docs/OPERATIONS.md`** and **`ROADMAP.md`** updated.

- **V2-M2 — synthetic many-route ingest:** Vitest **`packages/ingest/tests/many-routes-synthetic-ingest.test.ts`** (12-route temp tree, K=4 shard partition). **`ROADMAP.md`** progress note for remaining merge-model / emit-resume / RSS work.

- **V2-M2 — WebIR shard merge (v1):** **`mergeWebIrModules`** (**`@chrysalis/webir`**), CLI **`--merge-all-shards --shard-count K`** on **`ingest` / `emit` / `status`**, Vitest + CLI subprocess coverage. Cross-shard structural dedupe landed in **D247** (**`merge-dedupe-key.ts`**); monolithic per-route ingest may still inflate **`nodes.size`** vs merged.

### Added

- **V2-M4 — emit layout metrics (D250):** **`summarizeEmittedTypeScriptLayout`** in **`@chrysalis/emit-shared`**; **`hono.layout`** / **`fastify.layout`** on flagship **`emit-stats`** JSON from **`verify-flagship-laravel-*.mjs`**. Vitest **`packages/emit-shared/tests/emitted-ts-layout.test.ts`**. **Docs:** **`flagship/laravel-min/README.md`** and **`flagship/laravel-full/README.md`** describe **`layout`** on **`emit-stats`**.

- **V2-M4 — optional emit layout CI ceilings (D251):** **`scripts/ci-gates.mjs emit-layout-floors`** reads flagship **`emit-stats`** and enforces **`CHRYSALIS_EMIT_LAYOUT_MAX_*`** ceilings when set; **`pnpm run ci:emit-layout-floors`** (no-op skip when no env). Vitest **`packages/cli/tests/ci-gates-json-artifacts.test.ts`**.

- **V2-M4 — emit strategy v1 (D252):** **`emitStrategy.routeRegistration`** **`eager`** (default) vs **`lazy`** on **`@chrysalis/emit-hono`** / **`emit-fastify`**; **`chrysalis emit --emit-route-registration=lazy|eager`**. **`provenanceRoot`** + **`formatEmitProvenanceDisplay`** + **`@chrysalis-provenance`** on handler modules. **`chrysalis rewrite`** emits with **`provenanceRoot`**. Vitest: **`packages/emit-shared/tests/emit-provenance.test.ts`**, lazy **`server.ts`** in **`emit-hono`** / **`emit-fastify`** tests; golden **`tiny-blog-login.ts`** updated.

- **V2-M5 — chimera deploy config v1 (D253):** **`parseChimeraDeployConfigJson`** + **`chrysalis.chimera.config`** / **`schemaVersion: 1`** in **`@chrysalis/runtime-chimera`**; **`chrysalis deploy --config`** validates (BOM-safe, **`rules`** / **`canary`** shape). Fixture **`fixtures/chimera-deploy-config-v1-smoke.json`**. Vitest **`packages/runtime-chimera/tests/chimera-deploy-config.test.ts`**.

- **V2-M2 — `chrysalis status --json` `ingestSharding` (D248):** machine-readable ingest mode (**`monolithic`**, **`routeShard`**, **`mergedShards`**) when **`--project`** succeeds; human dashboard prints **`ingest`** line only for shard / merge modes.

- **V2-M2 — `mergeWebIrModules` structural dedupe (D247):** cross-shard nodes with the same structural key (dialect/op/type/effects/attrs/origin/provenance/operand keys) share one **`NodeId`**; collapses duplicate **`lib/`** IR across shards. **`packages/webir/src/merge-dedupe-key.ts`**.

- **Docs + CLI test:** **`AGENTS.md`**, **`docs/OPERATIONS.md`**, root **`README.md`**, **`packages/cli` / `ingest` READMEs** reference **D247**; Vitest **`packages/cli/tests/merge-all-shards-emit-cli.test.ts`** for **`emit --merge-all-shards`** (parity with ingest/status subprocess coverage).

- **V2-M2 — merge dedupe key tests:** **`packages/webir/tests/merge-dedupe-key.test.ts`** locks **`mergeDedupeStructuralKey`** / **`canonicalWebIRType`** (origin sensitivity, operand order, union/record canonicalization).

- **Ingest AST cache:** Vitest corrupt-cache re-parse coverage in **`packages/ingest/tests/parse-cache.test.ts`**.

- **Docs (10-slice V2 batch):** **`packages/verify/README.md`** (trace vs route sharding); **`docs/ADMINISTRATION.md`** corpus retention v0; **`ROADMAP.md`** V2-M2/M3 checkboxes aligned; **`cli-help-scaleout.test.ts`** asserts **`--shard-count`** in **`--help`**.

- **`migration-debt.mjs`:** human output + **`--json-out`** include **`ingestSharding`** when present; Vitest **`migration-debt-json.test.ts`** covers **`mergedShards`**, **`routeShard`**, and monolithic human line + **`docs/OPERATIONS.md`** route-shard **`migration-debt`** example.

- **CLI:** Vitest **`packages/cli/tests/route-shard-status-cli.test.ts`** for **`status --project … --shard-index/--shard-count --json`** (**`ingestSharding.routeShard`**). **`docs/OPERATIONS.md`** migration-debt example with **`--merge-all-shards`**. **`ROADMAP.md`** removes stale “merge future work” note on incremental cache line.

### Fixed

- **`chrysalis status --json` with shard flags:** merge/shard progress lines go to **stderr** in JSON mode so **stdout** is a single JSON object (machine-readable contract).

## [1.0.1] - 2026-04-29

### Added

- **Install from release:** [`docs/INSTALLATION.md`](./docs/INSTALLATION.md) now documents unpacking **`chrysalis-1.0.1-source.{tar.gz,zip}`** from GitHub Releases and running **`pnpm install` / `pnpm -r build` / `pnpm test`** before deeper smoke checks.
- **GitHub Project (v2)** playbook [`docs/GITHUB_PROJECT.md`](./docs/GITHUB_PROJECT.md) and maintainer bootstrap [`scripts/bootstrap-github-project.mjs`](./scripts/bootstrap-github-project.mjs) (`pnpm run github:project-bootstrap`) after `gh auth refresh -s project,read:project`.

### Fixed

- **Release workflow:** `.github/workflows/release.yml` uses **bash** + **`GH_REPO`**, and if a GitHub Release for the tag already exists, runs **`gh release upload … --clobber`** instead of failing on duplicate **`gh release create`**.

## [1.0.0] - 2026-04-30

### Added

- **Documentation set** under `docs/`: [Installation](./docs/INSTALLATION.md), [Operations](./docs/OPERATIONS.md), [Administration](./docs/ADMINISTRATION.md), [Release process](./docs/RELEASE.md), and [docs index](./docs/README.md).
- **`LICENSE`** (MIT) and **`SECURITY.md`** (reporting policy).
- **`scripts/make-release-artifacts.mjs`** and root script **`pnpm run release:artifacts`** to emit `release/chrysalis-<version>-source.{tar.gz,zip}` via `git archive`.

### Changed

- **Root and workspace `package.json` versions** set to **1.0.0** for the first tagged source release.

### Notes

- **Milestone 4 v1 pilot** and scoped **Milestones 5–6 / 6A** are complete per `ROADMAP.md`; cross-cutting parser, oracle, verify depth, and optional repair follow-ons remain on the roadmap after v1.0.0.
- This release is a **source distribution** (monorepo); it does not imply npm publication of `@chrysalis/*` packages to a registry unless separately documented.

[2.0.1]: https://github.com/theorem6/chrysalis/releases/tag/v2.0.1
[2.0.0]: https://github.com/theorem6/chrysalis/releases/tag/v2.0.0
[1.0.1]: https://github.com/theorem6/chrysalis/releases/tag/v1.0.1
[1.0.0]: https://github.com/theorem6/chrysalis/releases/tag/v1.0.0
