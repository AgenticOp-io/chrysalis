# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Project (v2) playbook [`docs/GITHUB_PROJECT.md`](./docs/GITHUB_PROJECT.md) and maintainer bootstrap [`scripts/bootstrap-github-project.mjs`](./scripts/bootstrap-github-project.mjs) (`pnpm run github:project-bootstrap`) after `gh auth refresh -s project,read:project`.

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

[1.0.0]: https://github.com/theorem6/chrysalis/releases/tag/v1.0.0
