# GitHub Project (v2) for Chrysalis

This repository ships a **bootstrap script** that creates a [GitHub Project](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) (table/board), **links it to `theorem6/chrysalis`**, and adds **custom fields** that mirror either the **Multi-lane program** in [`ROADMAP.md`](../ROADMAP.md) (**preset `chrysalis`**) or the **Web Platform Translation Program** (**preset `master`**) in [Master program](./MASTER-PROGRAM.md).

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

**Master program** (umbrella charter; Chrysalis as **D1** deliverable):

```bash
CHRYSALIS_GH_PROJECT_PRESET=master node scripts/bootstrap-github-project.mjs
```

Optional environment:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CHRYSALIS_GH_PROJECT_OWNER` | Owner parsed from root `package.json` `repository.url` | User or org that **owns** the project |
| `CHRYSALIS_GH_PROJECT_TITLE` | `Chrysalis` (preset **chrysalis**) or `Web Platform Translation Program` (preset **master**) | Project title; reused if a project with this title already exists |
| `CHRYSALIS_GH_REPO` | `<owner>/chrysalis` from `repository.url` | Repository to **link** |
| `CHRYSALIS_GH_PROJECT_PRESET` | `chrysalis` | `master` = program lanes **D0–D7** + **Workstream** field (see [Master program](./MASTER-PROGRAM.md)) |
| `CHRYSALIS_GH_PROJECT_SEED_ITEMS` | `1` when preset is **`master`**; ignored for **`chrysalis`** | `0` skips creating [Master program](./MASTER-PROGRAM.md) section **12** draft project items |

The script **does not create** `Lane` or `Board status` again when those fields already exist. It **reuses** an existing project with the same title instead of creating duplicates. **Lane option sets** are fixed at field creation time; to use different lanes, use a **new project title** or edit fields in the GitHub UI.

## What gets created

1. **Project** titled `Chrysalis` (or your `CHRYSALIS_GH_PROJECT_TITLE`), owned by your GitHub user or org.  
2. **Repository link** to this repo so Issues/PRs can be added from the **Projects** side panel.  
3. **Custom fields**  
   - **Lane** (single select): **chrysalis** preset = Lane A–D + **Release / infra**; **master** preset = **D0–D7** program phases (see [Master program](./MASTER-PROGRAM.md))  
   - **Board status** (single select): Backlog, In progress, Blocked, Done  
   - **Workstream** (single select, **master** preset only): Chrysalis (D1), IR hub, Adapters, Emitters, Verify harness, Matrix and product, Legal and trust  
4. **Master preset only:** up to nine **draft project items** from [Master program](./MASTER-PROGRAM.md) section **12** (idempotent by title), unless **`CHRYSALIS_GH_PROJECT_SEED_ITEMS=0`**.  

GitHub also provides built-in fields (Title, Assignees, **Status** for linked issues, Iteration, etc.). Use **Board status** for coarse workflow without overloading issue state.

## After bootstrap (manual in the UI)

1. **Views** — Add a *Table* view grouped by **Lane**; add a *Board* view if you prefer Kanban by **Board status**.  
2. **Roadmap items** — Create **draft issues** or link existing issues for each open “Next” bullet in `ROADMAP.md` (parser, oracle, verify, holes). Set **Lane** on each item. For the **master** program, section **12** draft items are created by the bootstrap script unless **`CHRYSALIS_GH_PROJECT_SEED_ITEMS=0`**; add more items manually as needed.  
3. **Releases** — Pin or link **[v2.0.1](https://github.com/theorem6/chrysalis/releases/tag/v2.0.1)** (or **[v2.0.0](https://github.com/theorem6/chrysalis/releases/tag/v2.0.0)** / **[v1.0.1](https://github.com/theorem6/chrysalis/releases/tag/v1.0.1)** / **[v1.0.0](https://github.com/theorem6/chrysalis/releases/tag/v1.0.0)**) in the project **Readme** field (if enabled) or a pinned draft issue titled “Released: v2.0.1”.  
4. **Workflows** — Optionally add a repository **rule set** or **branch protection** that references the project (org feature).  
5. **Org vs user** — For an **organization** project, set `CHRYSALIS_GH_PROJECT_OWNER` to the org name and ensure `gh` is authenticated with org access.

## Manual alternative (no script)

1. GitHub → **Projects** → **New project** → start from **Table** or **Board**.  
2. **Link repository** → `theorem6/chrysalis`.  
3. **Settings** (project) → **Custom fields** → add **Lane** and **Board status** as above.  
4. Invite collaborators and set **default repository**.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `missing required scopes [read:project]` | `gh auth refresh -s project,read:project` |
| `Could not resolve to a Repository` | Check `CHRYSALIS_GH_REPO` matches `owner/name` exactly. |
| Duplicate projects | Delete extras in the UI; keep one titled `Chrysalis` for the script to reuse. |
| `field-create` errors | Field may exist under another name; run `gh project field-list <N> --owner <owner>` |
| Draft item seed exits with “missing Lane option” | An older project reused the same title with different **Lane** options. Use a **new** `CHRYSALIS_GH_PROJECT_TITLE` or fix options in the GitHub UI, then re-run. |

## Automation in CI

Do **not** run the bootstrap script in GitHub Actions with the default `GITHUB_TOKEN` unless you add a PAT with `project` scope and accept the security tradeoffs. Prefer **local** or **maintainer** runs after auth refresh.
