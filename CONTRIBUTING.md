# Contributing

## Before you start

1. Read [`DESIGN.md`](./DESIGN.md) (architecture and non-negotiables) and [`AGENTS.md`](./AGENTS.md) (process, tests, and package rules).
2. Read [`ROADMAP.md`](./ROADMAP.md) to see which milestone, lane, or post-2.0 option your change belongs to.
3. Follow the [**Code of Conduct**](./CODE_OF_CONDUCT.md). Report security issues per [`SECURITY.md`](./SECURITY.md) (not public issues).

## Workflow

- Prefer **small, reviewable PRs** with a clear summary and linked **issue** or **roadmap** reference when applicable.
- Use **descriptive commit messages** (present tense, scoped by area when helpful, e.g. `fix(verify): …`, `docs(roadmap): …`).
- **Branching:** work from an up-to-date **`main`**; use feature branches (`feat/…`, `fix/…`, `docs/…`) for PRs.
- Install and build per [`docs/INSTALLATION.md`](./docs/INSTALLATION.md); run **`pnpm test`** before pushing substantive changes.

## Quality bar

- **TypeScript strict** everywhere; avoid `any` without a `// FIXME: …` note (see `AGENTS.md`).
- **Tests:** new behavior needs fixtures or Vitest coverage; generated-code changes need trace-based verification where the project already does so.
- **Changelog:** add an **Unreleased** bullet in [`CHANGELOG.md`](./CHANGELOG.md) for user-visible changes (maintainers fold into a version at release time).
- **Oracle / redaction lockstep:** if you touch [`packages/oracle/src/redaction.ts`](./packages/oracle/src/redaction.ts) or [`packages/oracle-php/src/Redactor.php`](./packages/oracle-php/src/Redactor.php), run **`pnpm run test:oracle-php-redactor`** with PHP on `PATH`.

## AI-assisted editing

For Cursor, the project rule [`.cursor/rules/chrysalis.mdc`](./.cursor/rules/chrysalis.mdc) loads automatically; it does not replace `AGENTS.md` / `DESIGN.md`.

## Pull requests

Opening a PR loads [`.github/pull_request_template.md`](./.github/pull_request_template.md). Complete the checklist so reviewers can merge with confidence.
