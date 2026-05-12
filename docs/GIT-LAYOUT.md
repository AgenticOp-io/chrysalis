# Git layout for this repository

This document explains **how Git is structured here** and why your IDE might list **extra repositories** that never appear on GitHub under the main project.

## Canonical repository

- **One Git history:** the monorepo root (directory that contains this file’s parent `.git/`).
- **Public remote:** `origin` → `https://github.com/4GEngineer/chrysalis.git` (see `DESIGN.md` D286).
- **Optional fork remote:** many contributors add `fork` (or `personal`) pointing at their GitHub fork; use `git remote -v` to see yours. Nothing in this doc requires renaming remotes.

There are **no Git submodules** in this tree; `git submodule status` is empty by design.

## Nested `.git` directories on disk (local only)

These are **not** part of the revision history pushed to `origin`. They exist only on developer machines when certain tools run, and the paths are **gitignored** so the main repo never tracks them.

| Path | Why a `.git` exists | Tracked by main repo? |
|------|---------------------|------------------------|
| `flagship/chrysalis-laravel-work/` | Laravel scaffold / worktree created by flagship scripts (`flagship/laravel-full/README.md`). | **No** — see `.gitignore`. |
| `packages/parser-bridge/vendor/` (e.g. `nikic/php-parser/.git`) | Composer `vendor` checkout; some installs keep upstream `.git`. | **No** — see `.gitignore`. |

**Git’s view:** `git status` from the repo root does not list files inside those trees. **IDE view:** Some editors scan the filesystem and still offer a “second repository” for nested `.git` folders. That is normal; it does not mean the monorepo is broken.

### Optional IDE hygiene (no data loss)

If duplicate repository roots annoy you, you can still keep the folders and code:

- Open the **repository root** (`PHP_converter` / `chrysalis`), not a parent like `Downloads` containing multiple clones.
- Use the committed **`.vscode/settings.json`** (shallow Git scan + do not attach parent-folder repos) when using VS Code or Cursor.
- Or open **`chrysalis.code-workspace`** from the repo root so the workspace folder is explicitly this tree.

Removing a **nested** `.git` inside an **ignored** Composer `vendor` tree is a local choice (Composer does not require it for normal installs); this repo does not script that deletion.

## Worktrees

This project does not ship extra `git worktree` paths. To see any you created locally:

```bash
git worktree list
```

## Routine maintenance (safe)

```bash
git fetch origin --prune
```

Prunes **stale remote-tracking branches** only; it does not delete local branches or remotes.

## Related docs

- Contributor workflow: **`CONTRIBUTING.md`**
- Advisor doc bundle (no source): **`docs/TECHNICAL-ADVISOR-PACK.md`**
