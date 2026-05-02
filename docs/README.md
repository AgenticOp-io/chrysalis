# Chrysalis documentation

Start with the repository root [`README.md`](../README.md), then [`DESIGN.md`](../DESIGN.md) (architecture and non-negotiables) and [`ROADMAP.md`](../ROADMAP.md) (milestones). Contributor rules live in [`AGENTS.md`](../AGENTS.md).

## Guides

| Guide | Audience | Contents |
| --- | --- | --- |
| [Installation](./INSTALLATION.md) | Developers and CI operators | Prerequisites, clone, install, build, optional PHP/Composer, smoke checks |
| [Operations](./OPERATIONS.md) | Day-to-day users of the CLI | Ingest, emit, observe, verify, status, repair, chimera deploy, operator-snapshot NDJSON batch merge (**`scripts/aggregate-chimera-operator-snapshots.mjs`**, **DESIGN D259**, **D260–D269**), verify-summary batch (**`scripts/aggregate-verify-summaries.mjs`**, **D271**), common scripts |
| [Administration](./ADMINISTRATION.md) | SRE / platform / release owners | Reports layout, env vars, CI gates (**`verify-merged-summary`**, **`corpus-merge-summary`**, dual verify summaries, …), migration sidecars, redaction, upgrades |
| [Release process](./RELEASE.md) | Maintainers | Version tags, tarballs, GitHub Releases, checklist |
| [GitHub Project](./GITHUB_PROJECT.md) | Maintainers & PM | Bootstrap a GitHub Project (v2) linked to the repo, lanes, fields |

## Package references

- CLI flags and JSON contracts: [`packages/cli/README.md`](../packages/cli/README.md)
- Verify / replay: [`packages/verify/README.md`](../packages/verify/README.md)
- Flagship pilots: [`flagship/laravel-min/README.md`](../flagship/laravel-min/README.md), [`flagship/laravel-full/README.md`](../flagship/laravel-full/README.md)
