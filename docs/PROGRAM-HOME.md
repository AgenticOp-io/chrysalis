# Chrysalis program home (AgenticOp-io)

> **Canonical org:** [AgenticOp-io](https://github.com/AgenticOp-io)  
> **Program board:** [Web Platform Translation Program](https://github.com/orgs/AgenticOp-io/projects/1)  
> **Authority:** DESIGN **D6373** (2026-07-09)

One **GitHub organization**, one **Project**, many **repositories**. Contributors get access at the org (or per-repo) once — not across fractured `theorem6` vs `AgenticOp-io` homes.

## Repositories (clone these)

| Repo | Role |
| --- | --- |
| [`chrysalis`](https://github.com/AgenticOp-io/chrysalis) | Engine — PHP/WebIR/CWL/verify (this monorepo) |
| [`wptp-ir`](https://github.com/AgenticOp-io/wptp-ir) | Neutral IR hub |
| [`wptp-matrix`](https://github.com/AgenticOp-io/wptp-matrix) | Compatibility matrix + harness |
| [`wptp-adapter-openapi`](https://github.com/AgenticOp-io/wptp-adapter-openapi) | OpenAPI → IR |
| [`wptp-adapter-browser`](https://github.com/AgenticOp-io/wptp-adapter-browser) | HAR → IR |
| [`wptp-emit-nextjs`](https://github.com/AgenticOp-io/wptp-emit-nextjs) | IR → Next.js |
| [`wptp-emit-hono`](https://github.com/AgenticOp-io/wptp-emit-hono) | IR → Hono |
| [`wptp-emit-fastify`](https://github.com/AgenticOp-io/wptp-emit-fastify) | IR → Fastify |
| [`WISP-Management`](https://github.com/AgenticOp-io/WISP-Management) | WISP showcase app |
| [`fragility-discovery-engine`](https://github.com/AgenticOp-io/fragility-discovery-engine) | Related AgenticOp product |
| [`agenticops-web`](https://github.com/AgenticOp-io/agenticops-web) | AgenticOp web |
| [`CynoEngine`](https://github.com/nimbus7772017/CynoEngine) (contributor) | Salience / sovereign-agent substrate — **sibling product**, not Chrysalis core ([collab plan](./CYNO-CHRYSALIS-COLLAB.md)) |

GitHub redirects old `theorem6/wptp-*` URLs to `AgenticOp-io/wptp-*`. Prefer the org URLs in new clones and docs.

**Privacy:** Cyno instance data (souls, lake, prod topology) stays on the Cyno maintainer’s machine/repo policy. Chrysalis does **not** push `.gitignore` or lockout files into their tree (**D6374**).

## Local layout

See [`MULTI-REPO-WORKSPACE.md`](./MULTI-REPO-WORKSPACE.md) — sibling clones under one parent, open `chrysalis-program.code-workspace`.

```bash
mkdir chrysalis-program && cd chrysalis-program
git clone https://github.com/AgenticOp-io/chrysalis.git
git clone https://github.com/AgenticOp-io/wptp-ir.git
git clone https://github.com/AgenticOp-io/wptp-matrix.git
# adapters / emitters as needed
```

## Adding contributors

1. Invite to **AgenticOp-io** org (preferred) **or** add as collaborator on each repo they need.
2. Point them at this doc + the [org project](https://github.com/orgs/AgenticOp-io/projects/1).
3. Engine work → `chrysalis`; WPTP IR/matrix/adapters → sibling repos above.

Do **not** invite only to a personal `theorem6` fork for program work — that re-fractures the home.
