# Chrysalis documentation

Chrysalis is a Node.js toolchain for migrating a legacy PHP application to a modern TypeScript service while keeping evidence — not faith — that the new code matches the old one.

If you are new to the project, read the [Whitepaper](./WHITEPAPER.md) for the architecture story, then the [User guide](./USER-GUIDE.md) to learn the commands. If you would rather learn by following complete worked scenarios end-to-end, jump straight to the [How-to cookbook](./HOW-TO.md). If you are setting up CI or production hosts, read [Installation](./INSTALLATION.md), [Deployment](./DEPLOYMENT.md), and [Administration](./ADMINISTRATION.md) in that order.

---

## Guides by role

| Guide | Audience | Contents |
| --- | --- | --- |
| [Whitepaper](./WHITEPAPER.md) | Anyone evaluating or coming back to the project | The architecture in narrative form: why the system is split into translate / capture / replay, what each piece does, and how they compose. |
| [Installation](./INSTALLATION.md) | First-time users, CI agents | Prerequisites, install, build, smoke checks. Optional **Python** / **Go** CLI shims that invoke the same Node `bin.js` (**DESIGN D295**). |
| [User guide](./USER-GUIDE.md) | Engineers using the CLI | Plain-English explanation of every command with worked examples, exit codes, output conventions, and recipes. |
| [How-to cookbook](./HOW-TO.md) | Anyone trying to do a specific thing | 24 end-to-end scenarios — from "first-time setup" to "GCE smoke VM" — each as a copy-pasteable, top-to-bottom walkthrough. |
| [Operations](./OPERATIONS.md) | Day-to-day operators | Runbooks for ingest scale-out, capture, verify sharding, the dual-stack router, signed routing config, sessions across stacks, fleet rollups. |
| [Deployment](./DEPLOYMENT.md) | Platform engineers, release engineers, SRE | Where each component runs in CI and production, the three deployment patterns, rollback playbooks. |
| [Administration](./ADMINISTRATION.md) | SRE, platform, release owners | Environment variables, CI gates, the report tree, redaction policy, corpus retention, repository settings. |

---

## Architecture and contribution

| Document | Audience | Purpose |
| --- | --- | --- |
| [`DESIGN.md`](../DESIGN.md) (root) | Contributors and integrators | The non-negotiable principles, the project vocabulary, and the decision log. The rules every change has to live within. |
| [`ROADMAP.md`](../ROADMAP.md) (root) | Contributors | Milestones, what is done, and what is deferred. |
| [`AGENTS.md`](../AGENTS.md) (root) | Contributors and automation | Repository contribution rules, pass naming, file layout discipline. |
| [`README.md`](../README.md) (root) | Operators consuming machine output | Operator-facing tables for the JSON shapes Chrysalis emits (`schemaVersion`, `kind`, gate scripts). |

Per-package details live under `packages/<name>/README.md`. Each package README states purpose, public API, invariants, and non-goals.

---

## Other references

| Document | Audience | Purpose |
| --- | --- | --- |
| [Release process](./RELEASE.md) | Maintainers | Version tags, source archives, GitHub Releases checklist. |
| [Master program](./MASTER-PROGRAM.md) | Sponsors, architecture board | Umbrella **Web Platform Translation Program**: charter, D0–D7 plan, repo topology, grades; **Chrysalis = D1**. GitHub preset: **`pnpm run github:project-bootstrap:master`**. |
| [WPTP D1 exit report](./WPTP-D1-EXIT-REPORT.md) | Program board | D1 **technical exit** recorded; **funding** is a future non-blocking lane (MASTER-PROGRAM §10.1). |
| [WPTP global scope](./WPTP-GLOBAL-SCOPE.md) | Program / architects | Cross-platform repos, matrix, adapters — above Chrysalis D1. |
| [wptp-ir](https://github.com/theorem6/wptp-ir) | IR hub (D2) | Neutral IR **v0**, WebIR bundle import, loss reports, conformance fixtures. |
| [wptp-matrix](https://github.com/theorem6/wptp-matrix) | Matrix (D5) | Source × target × grade JSON with CI validation. |
| [wptp-adapter-openapi](https://github.com/theorem6/wptp-adapter-openapi) | Adapter (D3) | OpenAPI 3 → IR v0 (bronze). |
| [GitHub Project](./GITHUB_PROJECT.md) | Maintainers | Bootstrap a GitHub Project (**chrysalis** or **master** preset). |
| [Git layout](./GIT-LAYOUT.md) | Contributors | Nested `.git` trees, remotes, worktrees. |
| [Commercial offering](./COMMERCIAL.md) | Operators, vendors | Optional vendor build, license tiers, services posture. |
| [AgenticOp site](./AGENTICOP.md) | Anyone | Optional public practice site; independent of the toolchain. |

Community: [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`SECURITY.md`](../SECURITY.md), and the issue/PR templates under [`.github/`](../.github/).

---

## Reading order suggestions

**"I want to translate one PHP app today."**

1. [Installation](./INSTALLATION.md) — get the CLI built.
2. [How-to cookbook](./HOW-TO.md), scenarios 1–2 — guided setup and your first translation.
3. [User guide](./USER-GUIDE.md) — the command reference for the flags you'll need next.
4. [Operations](./OPERATIONS.md) — the verify section when you reach it; the dual-stack router section if you plan to roll over gradually.

**"I want to evaluate Chrysalis for a planned migration."**

1. [Whitepaper](./WHITEPAPER.md) — the architecture story.
2. [How-to cookbook](./HOW-TO.md), scenarios 13–16 — what the rollout actually looks like in production.
3. [User guide](./USER-GUIDE.md) — the command reference for what is shipping today.
4. [Deployment](./DEPLOYMENT.md) — the three deployment patterns to pick the one that fits.

**"I am setting Chrysalis up in CI for a team."**

1. [Installation](./INSTALLATION.md) — for the CI agent.
2. [How-to cookbook](./HOW-TO.md), scenario 12 — a full GitHub Actions workflow you can paste in.
3. [Administration](./ADMINISTRATION.md) — environment variables and the gate scripts.
4. [Operations](./OPERATIONS.md) — for the rollback and rotation tooling.

**"I am putting Chrysalis in front of production traffic."**

1. [Deployment](./DEPLOYMENT.md) — Pattern C, end to end.
2. [How-to cookbook](./HOW-TO.md), scenarios 13, 14, 16, 17 — shadow, canary, rollback, and shared sessions.
3. [Operations](./OPERATIONS.md) — the dual-stack rollout, signed routing config, and Redis session sections.
4. [Administration](./ADMINISTRATION.md) — the operator metrics, fleet rollups, and retention sections.

**"Something is broken right now."**

1. [How-to cookbook](./HOW-TO.md), scenario 7 — triage a verify failure in five minutes.
2. [How-to cookbook](./HOW-TO.md), scenario 16 — roll back the canary in under a minute.
3. [Operations](./OPERATIONS.md) — incident-time references for hot config reload, signed routing, and metrics.

**"I only invoke Chrysalis from Python or Go."**

1. [Installation](./INSTALLATION.md) — build the Node CLI, then the **Optional: Python and Go entrypoints** section.
2. [How-to cookbook](./HOW-TO.md), scenario 23 — copy-paste examples and environment variables.
3. After **`packages/cli/dist/bin.js` exists**, run **`pnpm run test:cli-shims`** (skips a missing Go or Python locally). Set **`CHRYSALIS_STRICT_CLI_SHIMS=1`** with both on **`PATH`** to match **`GITHUB_ACTIONS`** / CI (**DESIGN D295**).
