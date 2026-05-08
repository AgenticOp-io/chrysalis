# Installation

Chrysalis is a **pnpm monorepo** (Node 20+). You install dependencies at the repository root and build all workspace packages from there.

## Prerequisites

| Requirement | Purpose |
| --- | --- |
| **Node.js** `>= 20` | Runtime and toolchain (`package.json` `engines`) |
| **pnpm** `9.x` (see root `packageManager`) | Workspace installs and scripts |
| **PHP** on `PATH` | Oracle prelude, `chrysalis observe`, parser-bridge **nikic** parity tests, redactor smoke tests |
| **Composer** on `PATH` (optional) | Faster **`composer install`** for **`packages/parser-bridge/vendor`**; if missing, **`pretest`** / **`pnpm run vendor:parser-bridge`** can bootstrap **`composer.phar`** when **PHP** + network are available (**`scripts/parser-bridge-composer-install.mjs`**, **DESIGN D270**) |
| **Git** | Source checkout; release tarballs use `git archive` |

Optional: **SQLite** client tools for inspecting fixture DBs; not required for the default test pipeline.

## Clone and install

```bash
git clone https://github.com/4GEngineer/chrysalis.git
cd chrysalis
pnpm install
```

If **PHP** is on `PATH` but **Composer** is not, `pretest` tries to download the official Composer installer and place **`packages/parser-bridge/composer.phar`**, then installs **`vendor/`** (requires network once). If **PHP** is missing, `pretest` prints a warning and Vitest may skip **nikic**-specific cases.

To skip vendor bootstrap entirely: `set CHRYSALIS_SKIP_PARSER_VENDOR=1` (Windows) or `export CHRYSALIS_SKIP_PARSER_VENDOR=1` (Unix) before `pnpm test`, or run `pnpm exec vitest run` directly (bypasses `pretest`).

Manual parser-bridge vendor install (same logic as `pretest`):

```bash
pnpm run vendor:parser-bridge
```

## Build

```bash
pnpm -r build
```

The CLI entrypoint used by scripts and docs is **`node packages/cli/dist/bin.js`** after a successful build. For local iteration without rebuilding every time, package READMEs may reference `pnpm --filter @chrysalis/cli dev` where applicable.

**Scale-out / operator CLI** (ingest route sharding, **`--merge-all-shards`**, **`--ingest-cache`**, **`--ingest-dedupe-structural-subgraphs`** for optional within-module WebIR dedupe — **DESIGN D283**, verify corpus sharding, emit layout flags, etc.): see **[`docs/OPERATIONS.md`](./OPERATIONS.md)** and run **`chrysalis --help`** after build (Vitest **`packages/cli/tests/cli-help-scaleout.test.ts`** pins key banner strings).

## Marking a PHP project (optional)

The upstream **monorepo checkout** already includes **`chrysalis.project.json`** at the repository root (same schema as **`chrysalis init`**); **`chrysalis init`** from that directory is a no-op (**DESIGN D291**). Use **`chrysalis init`** on **your** PHP application tree when you adopt Chrysalis outside this workspace.

After build, **`chrysalis init [<dir>]`** (default: current directory) writes **`chrysalis.project.json`** at the PHP application root so operators and scripts can detect a Chrysalis-managed tree (**DESIGN D290**). The file is **idempotent** when it already matches the supported schema.

## Optional commercial CLI license (vendor builds)

Some distributions set **`CHRYSALIS_REQUIRE_LICENSE=1`** and ship **Ed25519** keys plus a signed envelope; open-source clones default to **no** gate. Env vars, tiers, and **publication status**: **[`docs/COMMERCIAL.md`](./COMMERCIAL.md)**. Maintainer signing after **`pnpm --filter @chrysalis/license build`**: **`pnpm run license:sign`** (see **`scripts/sign-license.mjs`**).

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

Official **source archives** live on [GitHub Releases](https://github.com/4GEngineer/chrysalis/releases) (`chrysalis-<version>-source.tar.gz` / `.zip`). After download:

```bash
tar -xzf chrysalis-<version>-source.tar.gz
cd chrysalis-<version>
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
| `pretest` / parser vendor failures | No **PHP**, no network during bootstrap, or Composer install error | Install **PHP 8.x**; ensure network for first bootstrap; **`pnpm run vendor:parser-bridge`**; or **`CHRYSALIS_SKIP_PARSER_VENDOR=1`** to skip **nikic** tests |
| Vitest failures after pulling | Stale `dist/` vs source | `pnpm -r build` |
| `php` not found | PHP not on `PATH` | Install PHP 8.x and re-open shell |
| Windows path issues | Mixed slashes | Prefer `pnpm` and `node` from the repo root; use `/` in docs where shell-agnostic |
| `git: 'credential-manager-core' is not a git command` (Windows) | Git Credential Manager executable not on **`PATH`** (rename to **`git-credential-manager.exe`** on some installs) | Install [Git for Windows](https://git-scm.com/download/win) current build; or run **`git config --global credential.helper manager`**; pushes may still succeed if another helper is configured |
