# Installation

Chrysalis is a **pnpm monorepo** (Node 20+). You install dependencies at the repository root and build all workspace packages from there.

## Prerequisites

| Requirement | Purpose |
| --- | --- |
| **Node.js** `>= 20` | Runtime and toolchain (`package.json` `engines`) |
| **pnpm** `9.x` (see root `packageManager`) | Workspace installs and scripts |
| **PHP** on `PATH` | Oracle prelude, `chrysalis observe`, parser-bridge **nikic** parity tests, redactor smoke tests |
| **Composer** (optional but recommended) | `packages/parser-bridge` vendor tree for **nikic**; CI runs `pretest` to create it when Composer is available |
| **Git** | Source checkout; release tarballs use `git archive` |

Optional: **SQLite** client tools for inspecting fixture DBs; not required for the default test pipeline.

## Clone and install

```bash
git clone https://github.com/theorem6/chrysalis.git
cd chrysalis
pnpm install
```

If Composer is not installed, `pnpm test` still runs: `pretest` prints a short warning and Vitest may skip **nikic**-specific cases. To skip vendor bootstrap entirely: `set CHRYSALIS_SKIP_PARSER_VENDOR=1` (Windows) or `export CHRYSALIS_SKIP_PARSER_VENDOR=1` (Unix) before `pnpm test`, or run `pnpm exec vitest run` directly (bypasses `pretest`).

Manual parser-bridge vendor install:

```bash
pnpm run vendor:parser-bridge
```

## Build

```bash
pnpm -r build
```

The CLI entrypoint used by scripts and docs is **`node packages/cli/dist/bin.js`** after a successful build. For local iteration without rebuilding every time, package READMEs may reference `pnpm --filter @chrysalis/cli dev` where applicable.

## Verify the install

```bash
pnpm test
```

With PHP on `PATH`, also run Oracle PHP redactor smoke tests (matches CI expectations):

```bash
pnpm run test:oracle-php-redactor
```

Optional end-to-end emit smoke (can download packages during `npm install` under `generated/`):

```bash
pnpm run ci:emit-check
```

Minimal vertical slice (ingest + emit tiny-blog) without full CI emit-check:

```bash
node scripts/run-e2e.mjs
```

See the root [`README.md`](../README.md) Quick start for `seed-db`, serving the emitted app, and `chrysalis verify`.

## Installing from a release tarball

Official **source archives** live on [GitHub Releases](https://github.com/theorem6/chrysalis/releases) (`chrysalis-<version>-source.tar.gz` / `.zip`). After download:

```bash
tar -xzf chrysalis-1.0.1-source.tar.gz
cd chrysalis-1.0.1
pnpm install
pnpm -r build
pnpm test
```

Then continue with **Prerequisites** and **Verify the install** above (PHP on `PATH`, optional `pnpm run test:oracle-php-redactor`, etc.). Full release mechanics: [`RELEASE.md`](./RELEASE.md).

## CLI on your PATH (optional)

The published binary name is **`chrysalis`**, wired from `@chrysalis/cli` after build. You can run via `npx` from the repo root after `pnpm -r build`:

```bash
npx --prefix packages/cli chrysalis --help
```

Or invoke the dist entrypoint directly:

```bash
node packages/cli/dist/bin.js --help
```

## Troubleshooting

| Symptom | Likely cause | Mitigation |
| --- | --- | --- |
| `pretest` / parser vendor failures | No Composer or network | `CHRYSALIS_SKIP_PARSER_VENDOR=1` or `pnpm run vendor:parser-bridge` on a networked machine |
| Vitest failures after pulling | Stale `dist/` vs source | `pnpm -r build` |
| `php` not found | PHP not on `PATH` | Install PHP 8.x and re-open shell |
| Windows path issues | Mixed slashes | Prefer `pnpm` and `node` from the repo root; use `/` in docs where shell-agnostic |
