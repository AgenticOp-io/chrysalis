# Git layout for this repository

This document explains **how Git is structured here** and why your IDE might list **extra repositories** that never appear on GitHub under the main project.

## Canonical repository

- **One Git history:** the monorepo root (directory that contains this file’s parent `.git/`).
- **Public remote:** `origin` → `https://github.com/theorem6/chrysalis.git` (see `DESIGN.md` D293; D286 is the historical org-home record).
- **Optional fork remote:** many contributors add `fork` (or `personal`) pointing at their GitHub fork; use `git remote -v` to see yours. Nothing in this doc requires renaming remotes.

There are **no Git submodules** in this tree; `git submodule status` is empty by design.

## GitHub listings are not Git “storage”

These pages are **useful bookmarks** but they are **not** something Git stores inside the monorepo or pushes to GitHub as part of Chrysalis:

| URL | What it is |
|-----|------------|
| [github.com/theorem6?tab=repositories](https://github.com/theorem6?tab=repositories) | **User profile** repository list (GitHub UI). Other **`theorem6`** repositories (e.g. tooling, pilots) are **separate clones** from this monorepo. |
| [github.com/theorem6/fragility-discovery-engine](https://github.com/theorem6/fragility-discovery-engine) | A **different repository** from Chrysalis—not a folder inside this tree unless you intentionally add a submodule or subtree. |

**Git only persists URLs you configure as [remotes](https://git-scm.com/docs/git-remote)**, in your local **`.git/config`** (or your global Git config). That file is **not committed** to Chrysalis. To “store” a second repo **next to** Chrysalis in Git’s sense, use a **second clone** on disk, or add an **optional remote** in this clone (see below).

## Related repositories (optional `git remote` bookmarks)

If you want **one workspace folder** but quick access to another GitHub repo’s branches (without nesting its files), add a **read-only bookmark remote** (name is arbitrary):

```bash
git remote add fragility-discovery https://github.com/theorem6/fragility-discovery-engine.git
git fetch fragility-discovery
git branch -r
```

- **Upstream / PR target:** keep **`origin`** → [`theorem6/chrysalis`](https://github.com/theorem6/chrysalis) per `DESIGN.md` D293 and root `package.json` `repository.url`.
- **Your fork:** many people use **`fork`** → `https://github.com/<you>/chrysalis.git` (same project, different owner). That is **local convention**, not enforced by the repo.
- **Other projects** (e.g. fragility-discovery-engine): optional extra remotes, or separate clone directories—both are valid; neither belongs inside `packages/` unless you deliberately integrate them.

To list what this clone knows:

```bash
git remote -v
```

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
