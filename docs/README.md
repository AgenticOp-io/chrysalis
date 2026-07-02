# Chrysalis documentation

**Start here:** [`MIGRATION-OS.md`](./MIGRATION-OS.md) — the operator stack (Site → CWL → LLM, VMF federation, Migration Evidence hub, Intelligence Shorthand, open web-LLM).

Chrysalis migrates legacy web applications to verified **CWL** over **WebIR** with oracle replay — not faith. The converter is the adoption vector; the product is **verified migration infrastructure**.

---

## The prize (Migration OS)

| Doc | What |
| --- | --- |
| [**Migration OS**](./MIGRATION-OS.md) | **Primary entry** — pipeline, demos, gates, reading order |
| [Site → CWL → LLM](./SITE-TO-CWL-LLM-PROGRAM.md) | `chrysalis port-site`, trajectories, WVB |
| [Verified Migration Federation](./SITE-PORT-FEDERATION-PROGRAM.md) | VMF, Open Legacy Index, hub API |
| [Migration Evidence POC](./MIGRATION-EVIDENCE-POC-PROGRAM.md) | Unified evidence hub (**G8480** / **G8550**) |
| [Intelligence Shorthand](./INTELLIGENCE-SHORTHAND.md) | CPU-only IS-T3/T4/T5 (**G8560**) |
| [Open web-LLM program](./OPEN-WEB-LLM-PROGRAM.md) | Trajectories, WVB, MCP (**G8290**) |
| [Web-LLM agent POC](./OPEN-WEB-LLM-POC.md) | Scripted scenarios (**G8300** / **G8310**) |
| [Web-LLM training recipe](./WEB-LLM-TRAINING-RECIPE.md) | Shard export |
| [Web Verify Benchmark](./WEB-VERIFY-BENCHMARK.md) | WVB manifest |

**Governance:** [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) (locked build order) · [`ROADMAP.md`](../ROADMAP.md) (status) · [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) (default queue)

---

## Engine and CLI (substrate)

| Guide | Audience | Contents |
| --- | --- | --- |
| [Whitepaper](./WHITEPAPER.md) | Evaluators | Architecture narrative: translate / capture / replay |
| [Use cases](./USE-CASES.md) | Anyone with a goal | Goal → command → deep doc |
| [Installation](./INSTALLATION.md) | First-time / CI | Prerequisites, build, CLI shims |
| [User guide](./USER-GUIDE.md) | Engineers | Every CLI command |
| [How-to cookbook](./HOW-TO.md) | Hands-on | 24 copy-paste scenarios |
| [Operations](./OPERATIONS.md) | Operators | Verify, dual-stack, sessions, fleet |
| [Deployment](./DEPLOYMENT.md) | Platform / SRE | CI and production patterns |
| [Administration](./ADMINISTRATION.md) | SRE | Env vars, gates, reports, retention |
| [GCE test runner](./GCE-LOCAL-VERIFY.md) | CI-scale tests | `pnpm run test:gce` on Linux VM |
| [GCE GPU lab](./GCE-GPU-LAB.md) | IS-T2 LoRA (optional) | Spot T4 on/off; CPU prep gate **G8610** |
| [Windows vs Linux](./WINDOWS-COMPAT.md) | Windows devs | Local vs GCE split |

---

## Hub and commercial

| Guide | Audience |
| --- | --- |
| [Hub connectivity](./HUB-CONNECTIVITY.md) | Translation Hub operators |
| [Hub demo install](./HUB-DEMO-INSTALL.md) | Public demo on port **19090** |
| [Hub server install](./HUB-SERVER-INSTALL.md) | Multi-site SSH batch |
| [Commercial offering](./COMMERCIAL.md) | License tiers, services |
| [GitHub Project](./GITHUB_PROJECT.md) | Project board bootstrap |
| [Multi-repo workspace](./MULTI-REPO-WORKSPACE.md) | WPTP sibling repos |

---

## Architecture and contribution

| Document | Purpose |
| --- | --- |
| [`DESIGN.md`](../DESIGN.md) | Non-negotiables, vocabulary, decision log |
| [`AGENTS.md`](../AGENTS.md) | Rules for AI assistants and contributors |
| [`ROADMAP-ARCHIVE.md`](../ROADMAP-ARCHIVE.md) | Shipped milestones and G-series history |
| Package `README.md` files | Per-package API, invariants, non-goals |

---

## Archive (closed programs — source material)

Closed strategic-plan phases, CWL language waves, and WISP programs remain in-tree for **gates, fixtures, and design history**. They are **not** the default build queue.

| Index | Contents |
| --- | --- |
| [**Archive index**](./archive/INDEX.md) | Catalog of all closed phase and program docs |
| [Strategic plan ship log](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) | G5680–G6257 reinforcement history |
| [CWL full-stack build log](./archive/CWL-FULLSTACK-BUILD-LOG.md) | Queues 6–437 build log |

**WISP showcase (subordinate):** [`WISP-CWL-UI-PARITY-PROGRAM.md`](./WISP-CWL-UI-PARITY-PROGRAM.md) · [`WISP-PRODUCTION-COMPLETION-PROGRAM.md`](./WISP-PRODUCTION-COMPLETION-PROGRAM.md) — optional operator regression only.

**WPTP umbrella:** [`MASTER-PROGRAM.md`](./MASTER-PROGRAM.md) and `WPTP-D*.md` exit reports.

---

## Reading order

**"I want the Migration OS demo today."**

1. [`MIGRATION-OS.md`](./MIGRATION-OS.md) — one-command demos and gates.
2. [`INSTALLATION.md`](./INSTALLATION.md) — build the CLI if needed.
3. Open `reports/migration-evidence/poc/index.html` after `pnpm run migration-evidence:demo`.

**"I want to translate one PHP app."**

1. [`INSTALLATION.md`](./INSTALLATION.md)
2. [`HOW-TO.md`](./HOW-TO.md) scenarios 1–2
3. [`USER-GUIDE.md`](./USER-GUIDE.md)
4. [`OPERATIONS.md`](./OPERATIONS.md) when you reach verify / dual-stack

**"I am contributing or using an AI agent."**

1. [`DESIGN.md`](../DESIGN.md) + [`AGENTS.md`](../AGENTS.md)
2. [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12
3. [`MIGRATION-OS.md`](./MIGRATION-OS.md)
4. [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md)

**"Something is broken in CI."**

1. [`HOW-TO.md`](./HOW-TO.md) scenario 7 — verify triage
2. [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §2 — maintenance triggers
3. [`GCE-LOCAL-VERIFY.md`](./GCE-LOCAL-VERIFY.md) — if Windows or long smokes

Community: [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`SECURITY.md`](../SECURITY.md).
