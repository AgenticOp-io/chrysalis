# Contributing

1. Read [`DESIGN.md`](./DESIGN.md) (architecture and non-negotiables) and [`AGENTS.md`](./AGENTS.md) (process, tests, and package rules).  
2. Read [`ROADMAP.md`](./ROADMAP.md) to see which milestone or lane your change belongs to.  
3. Prefer small, reviewable PRs with tests and, when behavior changes, updates to `CHANGELOG.md` under **Unreleased** (maintainers fold into a version at release time).  
4. Install and build per [`docs/INSTALLATION.md`](./docs/INSTALLATION.md); run `pnpm test` before pushing.

For AI-assisted edits in Cursor, the project rule [`.cursor/rules/chrysalis.mdc`](./.cursor/rules/chrysalis.mdc) loads automatically; it does not replace `AGENTS.md` / `DESIGN.md`.
