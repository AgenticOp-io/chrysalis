# Chrysalis documentation

Chrysalis is a Node.js toolchain for migrating a legacy PHP application to a modern TypeScript service while keeping evidence — not faith — that the new code matches the old one.

If you are new to the project, read the [Whitepaper](./WHITEPAPER.md) for the architecture story, then the [User guide](./USER-GUIDE.md) to learn the commands. If you know *what* you want to do but not *how*, start at the goal-indexed [Use cases](./USE-CASES.md) map. If you would rather learn by following complete worked scenarios end-to-end, jump straight to the [How-to cookbook](./HOW-TO.md). If you are setting up CI or production hosts, read [Installation](./INSTALLATION.md), [Deployment](./DEPLOYMENT.md), and [Administration](./ADMINISTRATION.md) in that order.

---

## Guides by role

| Guide | Audience | Contents |
| --- | --- | --- |
| [Whitepaper](./WHITEPAPER.md) | Anyone evaluating or coming back to the project | The architecture in narrative form: why the system is split into translate / capture / replay, what each piece does, and how they compose. |
| [Use cases](./USE-CASES.md) | Anyone with a concrete goal | Goal-indexed catalog: map a task (evaluate, translate, capture, verify, dual-stack, scale, hub, multi-repo, commercial) to the exact command(s) and the deep-dive doc. |
| [Installation](./INSTALLATION.md) | First-time users, CI agents | Prerequisites, install, build, smoke checks. Optional **Python** / **Go** CLI shims that invoke the same Node `bin.js` (**DESIGN D295**). |
| [User guide](./USER-GUIDE.md) | Engineers using the CLI | Plain-English explanation of every command with worked examples, exit codes, output conventions, and recipes. |
| [How-to cookbook](./HOW-TO.md) | Anyone trying to do a specific thing | 24 end-to-end scenarios — from "first-time setup" to "GCE smoke VM" — each as a copy-pasteable, top-to-bottom walkthrough. |
| [Operations](./OPERATIONS.md) | Day-to-day operators | Runbooks for ingest scale-out, capture, verify sharding, the dual-stack router, signed routing config, sessions across stacks, fleet rollups. |
| [Deployment](./DEPLOYMENT.md) | Platform engineers, release engineers, SRE | Where each component runs in CI and production, the three deployment patterns, rollback playbooks. |
| [Hub connectivity](./HUB-CONNECTIVITY.md) | Translation Hub operators | SSH/local access model, origin scan agent install, database and Redis reachability, connectivity probes. |
| [Hub demo install](./HUB-DEMO-INSTALL.md) | Demo server visitors | Walkthrough for the public Translation Hub on port **19090** (URL, SSH, web-only output targets). |
| [Hub server install](./HUB-SERVER-INSTALL.md) | Hub operators | Client/server install, multi-site SSH batch, automated deploy scripts. |
| [Administration](./ADMINISTRATION.md) | SRE, platform, release owners | Environment variables, CI gates, the report tree, redaction policy, corpus retention, repository settings. |
| [GCE test runner](./GCE-LOCAL-VERIFY.md) | Anyone running CI-scale tests | **Default:** `pnpm run test:gce` on `chrysalis-test-vm` (detached; laptop can sleep). |
| [Windows vs Linux tests](./WINDOWS-COMPAT.md) | Windows developers | What runs locally vs on GCE; env flags and known platform gaps. |
| [Post–queue 110 program](./CWL-FULLSTACK-POST-110-PROGRAM.md) | Contributors after G2258 | Default build queue: GCE green gate, then hub verify-gaps depth. |

---

## Architecture and contribution

| Document | Audience | Purpose |
| --- | --- | --- |
| [`DESIGN.md`](../DESIGN.md) (root) | Contributors and integrators | The non-negotiable principles, the project vocabulary, and the decision log. The rules every change has to live within. |
| [Strategic plan](./STRATEGIC-PLAN.md) | Product owners, contributors, agents | **Locked** build order: PHP oracle wedge, Hub migration OS, CWL interchange; what to refuse. |
| [`ROADMAP.md`](../ROADMAP.md) (root) | Contributors | The **active** plan: status, post-2.0 depth options, multi-lane program, and what's next. |
| [`ROADMAP-ARCHIVE.md`](../ROADMAP-ARCHIVE.md) (root) | Contributors | Completed history: shipped G-series slices, Milestones 0–6A, and the Road to Chrysalis 2.0 program. |
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
| [WPTP D2 exit report](./WPTP-D2-EXIT-REPORT.md) | Program board | D2 **IR hub v0** exit (`@wptp/ir`, CI **`webir-bundle-to-wptp-ir`**). |
| [WPTP D3 exit report](./WPTP-D3-EXIT-REPORT.md) | Program board | D3 **OpenAPI + HAR** sources → Chrysalis Hono (CI **`wptp-d3-harness`**). |
| [WPTP D4 exit report](./WPTP-D4-EXIT-REPORT.md) | Program board | D4 **Next.js** emit (`@wptp/emit-nextjs`, CI **`wptp-d4-harness`**). |
| [WPTP D6 exit report](./WPTP-D6-EXIT-REPORT.md) | Program board | D6 **enterprise policy** pack (private adapters, SSO, residency). |
| [WPTP D6 enterprise policy](./WPTP-D6-ENTERPRISE-POLICY.md) | Sponsors, legal, security | In-tree policy; pairs with [Commercial offering](./COMMERCIAL.md). |
| [WPTP D7 ongoing](./WPTP-D7-ONGOING.md) | Program board | Quarterly matrix hygiene and CI checklist. |
| [IR helper lifting (design)](./IR-HELPER-LIFTING.md) | Ingest / architecture | Post-**D283** shared-helper lifting plan (**D311**); implementation gated by **D310**. |
| [WPTP global scope](./WPTP-GLOBAL-SCOPE.md) | Program / architects | Cross-platform repos, matrix, adapters — above Chrysalis D1. |
| [wptp-ir](https://github.com/theorem6/wptp-ir) | IR hub (D2) | Neutral IR **v0**, WebIR bundle import, loss reports, conformance fixtures. |
| [wptp-matrix](https://github.com/theorem6/wptp-matrix) | Matrix (D5) | Source × target × grade JSON with CI validation. |
| [wptp-adapter-openapi](https://github.com/theorem6/wptp-adapter-openapi) | Adapter (D3) | OpenAPI 3 → IR v0 (bronze). |
| [wptp-adapter-browser](https://github.com/theorem6/wptp-adapter-browser) | Adapter (D3) | HAR browser trace → IR v0 (bronze). |
| [wptp-emit-nextjs](https://github.com/theorem6/wptp-emit-nextjs) | Emit (D4) | IR v0 → Next.js App Router stubs (bronze). |
| [GitHub Project](./GITHUB_PROJECT.md) | Maintainers | Bootstrap a GitHub Project (**chrysalis** or **master** preset). |
| [Git layout](./GIT-LAYOUT.md) | Contributors | Nested `.git` trees, remotes, worktrees. |
| [Multi-repo workspace](./MULTI-REPO-WORKSPACE.md) | Contributors working across program repos | Recommended multi-root workspace (`chrysalis-program.code-workspace`) + IDE hygiene so siblings don't surface as phantom repos; use cases per deliverable. |
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
