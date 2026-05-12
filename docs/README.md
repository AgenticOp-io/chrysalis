# Chrysalis documentation

Start with the repository root [`README.md`](../README.md), then [`DESIGN.md`](../DESIGN.md) (architecture and non-negotiables) and [`ROADMAP.md`](../ROADMAP.md) (milestones). Contributor rules live in [`AGENTS.md`](../AGENTS.md).

## Guides

| Guide | Audience | Contents |
| --- | --- | --- |
| [Installation](./INSTALLATION.md) | Developers and CI operators | Prerequisites, clone, install, build, optional PHP/Composer, smoke checks |
| [Operations](./OPERATIONS.md) | Day-to-day users of the CLI | Ingest, emit (incl. **`--emit-runtime-facade`**, **D272**; **`--emit-shared-runtime-imports`**, **D281**; **`--emit-dedupe-identical-handler-bodies`**, **D282**), **V2-M2** ingest cache / shard / merge runbook (**DESIGN D275**), **`--ingest-progress-file`** + **`parseIngestProgressJson`** / **`readIngestProgressFile`** (**D277**, **D278**, **`verify`/`repair`/`insight`**: **D280**), **`--ingest-dedupe-structural-subgraphs`** (**D283**), synthetic ingest CI guards (**D255**, **D276**), observe, verify, status, repair, chimera deploy, operator-snapshot NDJSON batch merge (**`scripts/aggregate-chimera-operator-snapshots.mjs`**, **DESIGN D259**, **D260–D269**), verify-summary batch (**`scripts/aggregate-verify-summaries.mjs`**, **D271**), Redis session bridge (**`packages/oracle-php`**, **D273**), **V2-M6** fleet aggregation reference (**closed**, **DESIGN D274**), common scripts |
| [Administration](./ADMINISTRATION.md) | SRE / platform / release owners | Reports layout, env vars, CI gates (**`verify-merged-summary`**, **`corpus-merge-summary`**, dual verify summaries, …), migration sidecars, redaction, upgrades, **GitHub org/repo** (Dependabot security updates, **CODEOWNERS**, branch-protection notes for public/Team) |
| [Release process](./RELEASE.md) | Maintainers | Version tags, tarballs, GitHub Releases, checklist |
| [GitHub Project](./GITHUB_PROJECT.md) | Maintainers & PM | Bootstrap a GitHub Project (v2) linked to the repo, lanes, fields |
| [AgenticOp](./AGENTICOP.md) | Operators & services leads | **AgenticOp** at **`https://agenticop.io`**: practice positioning vs **Chrysalis** (MIT); links to logo assets |
| [Git layout (nested repos, remotes, IDE)](./GIT-LAYOUT.md) | Contributors hitting “extra” repositories in the IDE | Explains ignored local `.git` trees, `origin` vs fork, worktrees, safe `fetch --prune` |

**Community:** [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`SECURITY.md`](../SECURITY.md), and [`.github/pull_request_template.md`](../.github/pull_request_template.md) / [`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE/).

**Commercial:** [`COMMERCIAL.md`](./COMMERCIAL.md) (services, support, licensed CLI distribution, **`@chrysalis/license`** — playbook + in-tree tooling; **not a public product launch yet**). Primary outbound practice site: **[AgenticOp](https://agenticop.io)** (details in [`AGENTICOP.md`](./AGENTICOP.md)).

## Package references

- CLI flags and JSON contracts: [`packages/cli/README.md`](../packages/cli/README.md)
- Optional **PHP** session bridge smoke (**`pnpm run test:oracle-php-session-redis`**, needs **phpredis** + **`CHRYSALIS_SESSION_REDIS_URL`**; **DESIGN D273**): [`packages/oracle-php/README.md`](../packages/oracle-php/README.md)
- Verify / replay: [`packages/verify/README.md`](../packages/verify/README.md)
- Flagship pilots: [`flagship/laravel-min/README.md`](../flagship/laravel-min/README.md), [`flagship/laravel-full/README.md`](../flagship/laravel-full/README.md)
