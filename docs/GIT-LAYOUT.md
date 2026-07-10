# Git layout for this repository

This document explains **how Git is structured here** and why your IDE might list **extra repositories** that never appear on GitHub under the main project.

## Main repository

- **One Git history:** the monorepo root (directory that contains this file’s parent `.git/`).
- **Public remote:** `origin` → `https://github.com/AgenticOp-io/chrysalis.git` (see `DESIGN.md` **D303** / **D6373**; D293 is the historical `theorem6` user-namespace record).
- **Optional fork remote:** many contributors add `fork` (or `personal`) pointing at their GitHub fork; use `git remote -v` to see yours. Nothing in this doc requires renaming remotes.

There are **no Git submodules** in this tree; `git submodule status` is empty by design.

## Program home (one org, many repos)

Canonical contributor map: [`PROGRAM-HOME.md`](./PROGRAM-HOME.md).

WPTP siblings and related products live under **`AgenticOp-io/*`**, linked to org Project [Web Platform Translation Program](https://github.com/orgs/AgenticOp-io/projects/1). They are **separate clones**, not folders inside this monorepo.

| Repo | What it is |
|-----|------------|
| [AgenticOp-io/wptp-*](https://github.com/orgs/AgenticOp-io/repositories?q=wptp) | WPTP IR / matrix / adapters / emitters |
| [AgenticOp-io/fragility-discovery-engine](https://github.com/AgenticOp-io/fragility-discovery-engine) | Related product — separate clone |
| [AgenticOp-io/WISP-Management](https://github.com/AgenticOp-io/WISP-Management) | WISP showcase app |

**Git only persists URLs you configure as [remotes](https://git-scm.com/docs/git-remote)**, in your local **`.git/config`** (not committed). To work on siblings, use a **second clone** on disk (see [`MULTI-REPO-WORKSPACE.md`](./MULTI-REPO-WORKSPACE.md)), or add an **optional remote** bookmark.

## Related repositories (optional `git remote` bookmarks)

```bash
git remote add fragility-discovery https://github.com/AgenticOp-io/fragility-discovery-engine.git
git fetch fragility-discovery
git branch -r
```

- **Upstream / PR target:** keep **`origin`** → [`AgenticOp-io/chrysalis`](https://github.com/AgenticOp-io/chrysalis) per `DESIGN.md` **D6373** and root `package.json` `repository.url`.
- **Your fork:** many people use **`fork`** → `https://github.com/<you>/chrysalis.git`.
- Old **`theorem6/wptp-*`** URLs redirect to **`AgenticOp-io/wptp-*`**; prefer the org URLs.

To list what this clone knows:

```bash
git remote -v
```
