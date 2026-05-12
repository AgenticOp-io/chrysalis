# Technical advisor review pack

Use this when sharing **documentation only** with someone who will not clone the full repository yet, or as the index inside the generated bundle.

## One-line pitch

Chrysalis is a **verification-first** path from legacy **PHP** web apps to **TypeScript** stacks: **WebIR** (typed IR), **oracle** traces as the behavioral spec, **`chrysalis verify`** replay, and optional **Chimera** dual-stack routing. See **`DESIGN.md`** for non-negotiables.

## Suggested reading order (about 2–4 hours for a serious pass)

| Order | Document | Why |
| ----- | -------- | --- |
| 1 | **`DESIGN.md`** (repo root) | North star: vision, architecture diagram, WebIR / Oracle / Verify / Chimera, holes, determinism. |
| 2 | **`docs/REQUIREMENTS-AND-SPEC.md`** | Functional requirements + technical spec traceable to `DESIGN.md`. |
| 3 | **`ROADMAP.md`** | What is shipped vs deferred; milestone acceptance language. |
| 4 | **`docs/WHITEPAPER.md`** | Narrative pipeline walkthrough (no code secrets). |
| 5 | **`README.md`** (repo root) | Status, machine-JSON contracts table, quick links. |
| 6 | **`AGENTS.md`** | How contributors must work (also signals engineering discipline). |
| 7 | **Package READMEs** under `packages/*/README.md` | Per-surface API and invariants (parser-bridge, ingest, webir, emit-*, oracle, verify, runtime-chimera, cli). |

Optional deeper ops: **`docs/OPERATIONS.md`**, **`docs/ADMINISTRATION.md`**, **`docs/INSTALLATION.md`**.

## If they clone the repo next

- **Build:** `pnpm install` then `pnpm -r build` (see **`docs/INSTALLATION.md`**).
- **Tests:** `pnpm test` (see **`AGENTS.md`** for parser vendor / PHP expectations).
- **Public URL:** **`https://agenticop.io`** (practice site); engine remains MIT in this repo.

## Generate a shareable archive (no source code)

From the repository root:

```bash
pnpm run advisor:package
```

This writes **`build/advisor-package/chrysalis-advisor-docs/`** (Markdown tree) and, when `tar` is available, **`build/advisor-package/chrysalis-advisor-docs.tar.gz`**. The `build/` directory is gitignored; send the **`.tar.gz`** (or zip the folder yourself).

The bundle includes **`START-HERE.md`** at the top of the tree (same guidance as this file) plus the documents listed in the script’s manifest.

## What is intentionally not in the doc-only bundle

- Application **source** (`packages/*/src`, fixtures, generated trees) — clone the repo or use a private export if they need line-level review.
- **Secrets**, CI tokens, or customer corpora.

## Repository

**https://github.com/theorem6/chrysalis** (canonical public remote per `DESIGN.md` D286).
