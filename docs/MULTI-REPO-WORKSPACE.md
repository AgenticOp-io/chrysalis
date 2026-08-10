# Multi-repo workspace (Chrysalis + WPTP siblings)

Chrysalis Convert is **one repository**, but it still consumes the **Web Platform
Translation Program (WPTP)** as an **optional Convert orbit** (Hub Next.js, contract-first
compose, matrix grades) — not as CWL DNA. Constitution: [`WPTP-CONVERT-ORBIT.md`](./WPTP-CONVERT-ORBIT.md).
Charter: [`MASTER-PROGRAM.md`](./MASTER-PROGRAM.md) · layout: [`GIT-LAYOUT.md`](./GIT-LAYOUT.md).

> TL;DR: prefer **`AgenticOps/platforms/wptp-*`** clones; resolve via
> `scripts/lib/wptp-siblings.mjs`. Open **`chrysalis-program.code-workspace`** (multi-root).
> Do **not** nest repos; do **not** open the shared parent folder as a single git root.

---

## 1. Why multi-repo (and not one giant repo)

The program is **deliberately multi-repo** (`MASTER-PROGRAM.md` §"Fork policy"): sibling
repos depend on Chrysalis **by license/package boundary**, not by copy-paste, so a change
in one repo has a **bounded blast radius**. Chrysalis stays the **reference leg** (PHP →
WebIR → verified TypeScript); the siblings own the neutral IR hub, the compatibility
matrix, and the additional source/target adapters.

| Repo | Deliverable | Role |
| --- | --- | --- |
| `chrysalis` (this repo) | **D1** | PHP oracle, WebIR, emit-hono/fastify, verify, chimera, docs |
| `wptp-ir` | **D2** | Neutral IR v0 schema, validators, WebIR-bundle import, loss reports |
| `wptp-matrix` | **D5** | Public source × target × grade compatibility matrix |
| `wptp-adapter-openapi` | **D3** | OpenAPI 3 → IR v0 (bronze) |
| `wptp-adapter-browser` | **D3** | HAR browser trace → IR v0 (bronze) |
| `wptp-emit-nextjs` | **D4** | IR v0 → Next.js App Router (bronze + silver WebIR bridge) |

Clone names map to GitHub as `<owner>/<repo>` (canonical: **`AgenticOp-io/*`** — see [`PROGRAM-HOME.md`](./PROGRAM-HOME.md)). The workspace template uses **local
folder names only**, so it works regardless of which owner/fork you cloned from.

---

## 2. Recommended on-disk layout

**AgenticOps portfolio (preferred):**

```
AgenticOps/
  engines/chrysalis-convert/   # this repo
  engines/chrysalis-cwl/       # WebIR/CWL SoR (junctioned)
  platforms/wptp-ir/
  platforms/wptp-matrix/
  platforms/wptp-emit-nextjs/
  platforms/wptp-emit-hono/
  platforms/wptp-emit-fastify/
  platforms/wptp-adapter-openapi/
  platforms/wptp-adapter-browser/
```

Resolver: `pnpm run hub:wptp-orbit-smoke` · `scripts/lib/wptp-siblings.mjs` prefers `platforms/` when `wptp-ir` is present.

**Legacy flat siblings** (still supported):

```
program/                       # any parent folder you like
  chrysalis/                   # this repo  (its own .git)
  wptp-ir/                     # its own .git
  wptp-matrix/                 # its own .git
  wptp-adapter-openapi/        # its own .git
  wptp-adapter-browser/        # its own .git
  wptp-emit-nextjs/            # its own .git
```

Clone what you need (siblings are optional — the workspace tolerates missing folders):

```bash
# portfolio
git clone https://github.com/AgenticOp-io/wptp-ir.git platforms/wptp-ir
# …or flat parent
git clone https://github.com/AgenticOp-io/chrysalis.git
git clone https://github.com/AgenticOp-io/wptp-ir.git
git clone https://github.com/AgenticOp-io/wptp-matrix.git
git clone https://github.com/AgenticOp-io/wptp-adapter-openapi.git
git clone https://github.com/AgenticOp-io/wptp-adapter-browser.git
git clone https://github.com/AgenticOp-io/wptp-emit-nextjs.git
```

---

## 3. Open the multi-root workspace

This repo ships a tracked **`chrysalis-program.code-workspace`** at its root. In VS Code or
Cursor:

> **File → Open Workspace from File…** → select `chrysalis-program.code-workspace`.

You get one window with **each repo as a separate root folder** (and a separate Source
Control group). The workspace pins three things that prevent phantom repos:

- `git.openRepositoryInParentFolders: "never"` — the IDE won't attach a repo for the
  parent folder when you open a subfolder.
- `git.repositoryScanMaxDepth: 1` — Git scanning stops at the first level, so nested
  `.git` trees under `vendor/` or `flagship/` aren't surfaced.
- `git.detectSubmodules: false` — Chrysalis has **no** submodules by design
  (`GIT-LAYOUT.md`); this stops false submodule detection.

It also sets `files.watcherExclude` / `search.exclude` for `node_modules`, `dist`,
`vendor`, `generated`, `traces`, and `reports` so the file watcher and search stay fast and
never walk into a reproducible or ignored tree.

> The same settings are mirrored in the tracked single-repo **`.vscode/settings.json`**, so
> you get the hygiene even when you open just `chrysalis/` on its own (or via the simpler
> `chrysalis.code-workspace`, which has a single Chrysalis root).

---

## 4. Why you might still see "extra repositories"

If the IDE lists a repo you didn't expect, it's almost always one of these **local, ignored**
nested `.git` trees (full table in [`GIT-LAYOUT.md`](./GIT-LAYOUT.md)):

| Path | Why a `.git` exists | Tracked? |
| --- | --- | --- |
| `packages/parser-bridge/vendor/` | Composer checkout (some installs keep upstream `.git`). | No — `.gitignore` |
| `flagship/chrysalis-laravel-work/` | Laravel scaffold/worktree from flagship scripts. | No — `.gitignore` |

These are **normal** and never pushed. The workspace settings above hide them. If they still
annoy you, you can delete the nested `vendor/**/.git` directory locally (Composer does not
need it); this repo does not script that deletion.

---

## 5. Use cases

### 5.1 "I only work on Chrysalis"
Open `chrysalis/` directly, or open `chrysalis.code-workspace`. You do **not** need the
program workspace or any sibling clones. The tracked `.vscode/settings.json` already gives
you shallow Git scanning and the watcher/search excludes.

### 5.2 "I'm changing the WebIR bundle and the IR hub at the same time" (D1 ↔ D2)
Clone `wptp-ir` next to `chrysalis`, open `chrysalis-program.code-workspace`. Edit the
exporter in Chrysalis (`scripts/export-webir-bundle.mjs`), run it, then jump to `wptp-ir`
to import the bundle and check the **loss report** — all in one window, with two distinct
Source Control groups so commits never cross repos.

### 5.3 "I'm adding a new source adapter" (D3)
Clone `wptp-adapter-openapi` (or `-browser`). Develop the adapter against the **IR v0**
contract in `wptp-ir`, and use Chrysalis fixtures/CI harness names (`wptp-d3-harness`) as
the reference. The matrix repo (`wptp-matrix`) is where you record the new edge's grade.

### 5.4 "I'm adding a new emit target" (D4)
Clone `wptp-emit-nextjs` as the template for an `wptp-emit-*` repo. Keep Chrysalis as the
**silver** WebIR source (`wptp-silver-nextjs-harness`) so your target gets real, verified IR
instead of stubs.

### 5.5 "I maintain the public compatibility matrix" (D5)
Open `wptp-matrix` alongside Chrysalis so you can re-run the Chrysalis harnesses
(`wptp-harness-smoke.yml` with `CHRYSALIS_ROOT`) that **prove** an edge before you mark it
Bronze/Silver/Gold. Never hand-promote an edge to green without a passing harness.

### 5.6 "I review across the whole program"
The multi-root window gives you per-repo Source Control, search across all roots at once,
and one terminal panel where you can `cd` between repos. Commit each repo independently;
there is no monorepo that ties their histories together.

### 5.7 "The IDE keeps showing my Downloads/parent folder as a repo"
You opened a **parent folder** that contains multiple clones. Close it and open the
**workspace file** (or the specific repo root) instead. With
`git.openRepositoryInParentFolders: "never"` this should not recur.

---

## 6. Hygiene checklist

- [ ] Each program repo is its **own clone** in a shared parent; none nested inside another.
- [ ] You open **`chrysalis-program.code-workspace`** (multi-repo) or a single repo root —
      never the bare parent folder.
- [ ] `git status` at each repo root is clean of the other repos' files.
- [ ] Scratch/probe outputs (`scripts/_probe-*`, `generated/_probe-*/`, root
      `*Controller.php`) are gitignored and do not appear in `git status`.
- [ ] No submodules: `git submodule status` is empty (`GIT-LAYOUT.md`).

---

## Related docs

- [`GIT-LAYOUT.md`](./GIT-LAYOUT.md) — nested `.git` trees, remotes, worktrees.
- [`MASTER-PROGRAM.md`](./MASTER-PROGRAM.md) — the program charter and repo topology.
- [`WPTP-GLOBAL-SCOPE.md`](./WPTP-GLOBAL-SCOPE.md) — cross-platform repos and adapters.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — contributor workflow.
