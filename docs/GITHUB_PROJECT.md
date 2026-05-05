# GitHub Project (v2) for Chrysalis

This repository ships a **bootstrap script** that creates a [GitHub Project](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) (table/board), **links it to `4GEngineer/chrysalis`**, and adds **custom fields** that mirror the **Multi-lane program** in [`ROADMAP.md`](../ROADMAP.md).

## One-time: GitHub CLI scopes

The default `gh` token often lacks Projects scopes. Refresh:

```bash
gh auth refresh -s project,read:project
gh auth status
```

## Automated bootstrap

From the repository root (after `pnpm install` is **not** required; only `gh` is required):

```bash
node scripts/bootstrap-github-project.mjs
```

Optional environment:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CHRYSALIS_GH_PROJECT_OWNER` | Owner parsed from root `package.json` `repository.url` | User or org that **owns** the project |
| `CHRYSALIS_GH_PROJECT_TITLE` | `Chrysalis` | Project title; reused if a project with this title already exists |
| `CHRYSALIS_GH_REPO` | `<owner>/chrysalis` from `repository.url` | Repository to **link** |

The script is **idempotent for fields**: it skips creating `Lane` or `Board status` if they already exist. It **reuses** an existing project with the same title instead of creating duplicates.

## What gets created

1. **Project** titled `Chrysalis` (or your `CHRYSALIS_GH_PROJECT_TITLE`), owned by your GitHub user or org.  
2. **Repository link** to this repo so Issues/PRs can be added from the **Projects** side panel.  
3. **Custom fields**  
   - **Lane** (single select): Lane A–D from the roadmap + **Release / infra**  
   - **Board status** (single select): Backlog, In progress, Blocked, Done  

GitHub also provides built-in fields (Title, Assignees, **Status** for linked issues, Iteration, etc.). Use **Board status** for coarse workflow without overloading issue state.

## After bootstrap (manual in the UI)

1. **Views** — Add a *Table* view grouped by **Lane**; add a *Board* view if you prefer Kanban by **Board status**.  
2. **Roadmap items** — Create **draft issues** or link existing issues for each open “Next” bullet in `ROADMAP.md` (parser, oracle, verify, holes). Set **Lane** on each item.  
3. **Releases** — Pin or link **[v2.0.1](https://github.com/4GEngineer/chrysalis/releases/tag/v2.0.1)** (or **[v2.0.0](https://github.com/4GEngineer/chrysalis/releases/tag/v2.0.0)** / **[v1.0.1](https://github.com/4GEngineer/chrysalis/releases/tag/v1.0.1)** / **[v1.0.0](https://github.com/4GEngineer/chrysalis/releases/tag/v1.0.0)**) in the project **Readme** field (if enabled) or a pinned draft issue titled “Released: v2.0.1”.  
4. **Workflows** — Optionally add a repository **rule set** or **branch protection** that references the project (org feature).  
5. **Org vs user** — For an **organization** project, set `CHRYSALIS_GH_PROJECT_OWNER` to the org name and ensure `gh` is authenticated with org access.

## Manual alternative (no script)

1. GitHub → **Projects** → **New project** → start from **Table** or **Board**.  
2. **Link repository** → `4GEngineer/chrysalis`.  
3. **Settings** (project) → **Custom fields** → add **Lane** and **Board status** as above.  
4. Invite collaborators and set **default repository**.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `missing required scopes [read:project]` | `gh auth refresh -s project,read:project` |
| `Could not resolve to a Repository` | Check `CHRYSALIS_GH_REPO` matches `owner/name` exactly. |
| Duplicate projects | Delete extras in the UI; keep one titled `Chrysalis` for the script to reuse. |
| `field-create` errors | Field may exist under another name; run `gh project field-list <N> --owner <owner>` |

## Automation in CI

Do **not** run the bootstrap script in GitHub Actions with the default `GITHUB_TOKEN` unless you add a PAT with `project` scope and accept the security tradeoffs. Prefer **local** or **maintainer** runs after auth refresh.
