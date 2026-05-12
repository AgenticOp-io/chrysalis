# Contributing

## Before you start

1. Read [`DESIGN.md`](./DESIGN.md) (architecture and non-negotiables) and [`AGENTS.md`](./AGENTS.md) (process, tests, and package rules).
2. Read [`ROADMAP.md`](./ROADMAP.md) to see which milestone, lane, or post-2.0 option your change belongs to.
3. Follow the [**Code of Conduct**](./CODE_OF_CONDUCT.md). Report security issues per [`SECURITY.md`](./SECURITY.md) (not public issues). Maintainer-facing commercial playbook (optional license gate; **not a public product launch yet**): [`docs/COMMERCIAL.md`](./docs/COMMERCIAL.md).

## Workflow

- Prefer **small, reviewable PRs** with a clear summary and linked **issue** or **roadmap** reference when applicable.
- Use **descriptive commit messages** (present tense, scoped by area when helpful, e.g. `fix(verify): …`, `docs(roadmap): …`).
- **Branching:** work from an up-to-date **`main`**; use feature branches (`feat/…`, `fix/…`, `docs/…`) for PRs.
- **Git / IDE:** if your editor lists “extra” repositories under this tree, read [`docs/GIT-LAYOUT.md`](./docs/GIT-LAYOUT.md) (ignored nested `.git`, remotes). Prefer opening the **repo root** or **`chrysalis.code-workspace`**.
- Install and build per [`docs/INSTALLATION.md`](./docs/INSTALLATION.md); run **`pnpm test`** before pushing substantive changes. On **Windows**, if Git prints **`credential-manager-core` is not a git command**, see **Troubleshooting** in **`docs/INSTALLATION.md`** (credential helper / **`PATH`**).

## Quality bar

- **TypeScript strict** everywhere; avoid `any` without a `// FIXME: …` note (see `AGENTS.md`).
- **Tests:** new behavior needs fixtures or Vitest coverage; generated-code changes need trace-based verification where the project already does so.
- **Changelog:** add an **Unreleased** bullet in [`CHANGELOG.md`](./CHANGELOG.md) for user-visible changes (maintainers fold into a version at release time).
- **Oracle / redaction lockstep:** if you touch [`packages/oracle/src/redaction.ts`](./packages/oracle/src/redaction.ts) or [`packages/oracle-php/src/Redactor.php`](./packages/oracle-php/src/Redactor.php), run **`pnpm run test:oracle-php-redactor`** with PHP on `PATH`.

## Proof-of-concept and pilot trees (version control)

These paths are part of the product: **do not** leave them out of commits when you change fixtures, flags, or flagship apps. They are the shared ground truth for CI and contributors.

| Area | Tracked in git | Intentionally not tracked (reproducible or huge) |
| --- | --- | --- |
| PHP fixtures | [`fixtures/`](./fixtures/) (e.g. **`fixtures/tiny-blog`**, probe fixtures under **`fixtures/*`**) | Local **`fixtures/tiny-blog/blog.sqlite`**, **`traces/`**, **`reports/`** |
| Flagship pilots | [`flagship/laravel-min/`](./flagship/laravel-min/), [`flagship/laravel-full/`](./flagship/laravel-full/) (sources + **`chrysalis-templates/`**) | Composer scaffold output **`flagship/chrysalis-laravel-work/`** (see flagship README) |
| Emitted snapshots | [`generated/tiny-blog/`](./generated/tiny-blog/) TypeScript reference emit | **`generated/**/package-lock.json`**, **`generated/**/*.sqlite`**, **`generated/tiny-blog-fastify/`**, **`generated/flagship-*`**, **`generated/tiny-n1/`** (regenerate via scripts / CI) |

If you add a **new** fixture or flagship slice that should ship with the repo, include it in **`pnpm test`** or the documented smoke path in [`docs/INSTALLATION.md`](./docs/INSTALLATION.md) / package READMEs.

## AI-assisted editing

For Cursor, the project rule [`.cursor/rules/chrysalis.mdc`](./.cursor/rules/chrysalis.mdc) loads automatically; it does not replace `AGENTS.md` / `DESIGN.md`.

## Pull requests

Opening a PR loads [`.github/pull_request_template.md`](./.github/pull_request_template.md). Complete the checklist so reviewers can merge with confidence.

[`.github/CODEOWNERS`](./.github/CODEOWNERS) requests review from **`@theorem6`** by default; branch protection may optionally require code-owner approval when the org enables it (**`docs/ADMINISTRATION.md`**).
