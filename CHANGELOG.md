# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Parser-bridge vendor without global Composer:** `pnpm test` pretest and `pnpm run vendor:parser-bridge` use `scripts/parser-bridge-composer-install.mjs` — try `composer` on `PATH`, else bootstrap `packages/parser-bridge/composer.phar` via the official installer when `php` is available (Windows-friendly).

### Documentation

- **DESIGN D270**, **`docs/INSTALLATION.md`**, **`AGENTS.md`**, **`ROADMAP.md`**: document parser-bridge **`composer.phar`** bootstrap when global Composer is absent.

### Added

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

[1.0.1]: https://github.com/theorem6/chrysalis/releases/tag/v1.0.1
[1.0.0]: https://github.com/theorem6/chrysalis/releases/tag/v1.0.0
