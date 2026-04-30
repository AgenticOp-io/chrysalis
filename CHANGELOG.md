# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **V2-M1 — CI gate for merged verify JSON:** `scripts/ci-gates.mjs verify-merged-summary`, root **`pnpm run ci:verify-merged-summary`**, fixture **`fixtures/ci/verify-merged-summary-smoke.json`**, **`verify-tiny-blog.mjs`** emits **`reports/ci/verify-e2e-merged-summary.json`** (K=2 partition parity smoke or single-shard fallback). Optional **`CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS`** in CI.

- **V2-M2 — ingest / emit route sharding:** **`ingestDirectory`** accepts **`shardIndex` / `shardCount`**; **`buildCallEffectMap`** still uses all manifest routes. **`chrysalis ingest`** and **`chrysalis emit`** accept **`--shard-index`** / **`--shard-count`**. FNV bucket helper **`packages/ingest/src/route-shard.ts`**.

- **V2-M2 — opt-in ingest AST cache:** **`ingestDirectory`** **`ingestCacheDir`**, **`INGEST_AST_CACHE_VERSION`**, **`packages/ingest/src/parse-cache.ts`**; CLI **`--ingest-cache <dir>`** on **`ingest`** and **`emit`**.

- **V2-M3 — corpus tree merge:** **`mergeCorpusDirectories`** in **`@chrysalis/oracle`**, CLI **`chrysalis corpus-merge`** with **`--out`**, **`--on-duplicate error|skip`**, optional **`--dedupe-trace-id skip`**, deterministic sampling **`--sample-modulo K --sample-remainder R`**, **`--dry-run`** preview mode, and **`--json-out <file>`** machine summary (**`chrysalis.corpus-merge.summary`**). **`scripts/ci-gates.mjs corpus-merge-summary`**, fixture **`fixtures/ci/corpus-merge-summary-smoke.json`**, root **`pnpm run ci:corpus-merge-summary`**, Vitest **`packages/cli/tests/ci-gates-corpus-merge-summary.test.ts`**, and **`typecheck-and-test`** gate step.

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
