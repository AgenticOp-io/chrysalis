# Installation

This document tells you how to get Chrysalis running on a developer laptop or a CI agent. If you only want to know what the tools do, jump to the [User guide](./USER-GUIDE.md). If you are setting up production hosts, also read [Deployment](./DEPLOYMENT.md).

---

## What you are installing

Chrysalis is a single Node.js workspace published as a monorepo. After installing dependencies and running one build, you have:

- A CLI (`chrysalis`) that orchestrates everything.
- A handful of TypeScript packages it composes (parser, ingest, emit backends, replay, capture, etc.).
- A small PHP file (`packages/oracle-php/src/bootstrap.php`) you can load ahead of your PHP application to capture traffic. Optional.

You do **not** need to install Chrysalis into your PHP application's tree, set up a database, or run any service. The toolchain runs out of the workspace and writes its outputs (generated TypeScript projects, trace directories, reports) wherever you point it.

---

## Prerequisites

| Requirement | Version | Why you need it |
| --- | --- | --- |
| Node.js | `>= 20` | Runtime for the CLI and emitted apps. |
| pnpm | `9.x` | Package manager used by the workspace. |
| Git | any recent | To clone the repository (or unpack a release tarball). |
| PHP | `>= 8.0`, optional | Needed to capture traces from a PHP app, to run the optional `nikic` parser provider, and to run the PHP-side smoke tests. |
| Composer | optional | Convenient for installing the parser bridge's PHP dependencies. If absent and PHP is present, the workspace can bootstrap a local `composer.phar`. |

You do not need MySQL, Redis, Docker, or any cloud account to install or run the basic loop.

If your project uses Redis-backed sessions and you intend to run both stacks at once, you will eventually need a Redis 7+ instance — but only when you reach the dual-stack rollout step.

---

## Get the source

### Option A — Clone the public repository

```bash
git clone https://github.com/AgenticOp-io/chrysalis.git
cd chrysalis
```

### Option B — Download a release archive

Each tagged release publishes a source tarball and zip on the project's [Releases page](https://github.com/AgenticOp-io/chrysalis/releases) (`chrysalis-<version>-source.tar.gz` / `.zip`).

```bash
tar -xzf chrysalis-2.0.1-source.tar.gz
cd chrysalis-2.0.1
```

After either option, the rest of the steps are identical.

---

## Optional: Python and Go entrypoints (same CLI)

The **implementation** of ingest, emit, and verify stays in Node (`packages/cli/dist/bin.js` after `pnpm --filter @chrysalis/cli build`). If your team prefers to **invoke** Chrysalis from Python or Go without typing `node …/bin.js`, use the in-repo shims (**DESIGN D295**):

### Go (1.22+)

```bash
cd go/shim
go build -o chrysalis-go .
./chrysalis-go --help
```

From outside the repo, set **`CHRYSALIS_CLI_JS`** to the absolute path of `bin.js`.

### Python (3.10+)

```bash
# From repo root, without installing a wheel:
PYTHONPATH=python/chrysalis_shim/src python -m chrysalis_shim --help   # Unix
set PYTHONPATH=python\chrysalis_shim\src && python -m chrysalis_shim --help   # Windows cmd
```

Or `pip install -e ./python/chrysalis_shim` and run **`chrysalis-py --help`**.

### Environment (both shims)

| Variable | Purpose |
| --- | --- |
| `CHRYSALIS_CLI_JS` | Absolute path to `packages/cli/dist/bin.js` (skips upward search) |
| `CHRYSALIS_NODE` | Path to the `node` executable |

### CI

The **`typecheck-and-test`** job in **`.github/workflows/ci.yml`** runs **`pnpm run test:cli-shims`** after **`pnpm -r build`** (with **`actions/setup-go@v5`**, Go **1.22**, and the runner’s **`python3`**). On **`GITHUB_ACTIONS`**, that script runs in **strict** mode: **both** the Go and Python shims must succeed (it exits **1** if either is missing or broken). Contributors should run **`pnpm run test:cli-shims`** locally after editing **`go/shim/`** or **`python/chrysalis_shim/`**. To match CI’s strict bar on a developer machine, install **Go 1.22+** and **Python 3.10+**, then run **`CHRYSALIS_STRICT_CLI_SHIMS=1 pnpm run test:cli-shims`** (same checks as **`GITHUB_ACTIONS=true`**).

---

## Install and build

```bash
pnpm install
pnpm -r build
```

`pnpm install` fetches Node dependencies. `pnpm -r build` compiles every package's TypeScript into `dist/`. The CLI uses those built files.

After `pnpm -r build`, run the CLI as:

```bash
node packages/cli/dist/bin.js --help
```

If you want a shorter command, add a shim to your `PATH`:

```bash
# Bash / zsh
alias chrysalis='node /abs/path/to/chrysalis/packages/cli/dist/bin.js'

# PowerShell
function chrysalis { node 'C:\path\to\chrysalis\packages\cli\dist\bin.js' @args }
```

You can also let pnpm run it through its package entry:

```bash
npx --prefix packages/cli chrysalis --help
```

---

## Optional: prepare PHP and the alternate parser

If you only plan to translate PHP-to-TypeScript, the default Glayzzle parser runs entirely in Node and you can skip this section. The optional `nikic` parser provider catches edge cases (deep namespaces, certain dynamic constructs) that Glayzzle handles less precisely.

### Make sure PHP is on `PATH`

```bash
php -v
# PHP 8.2.x (cli) ...
```

On Windows, install [PHP for Windows](https://windows.php.net/download/) and add the install directory to `PATH`. On macOS, `brew install php`. On Debian/Ubuntu, `apt install php-cli`.

### Install the parser bridge's PHP dependencies

The first `pnpm test` runs a script (`scripts/ensure-parser-bridge-vendor.mjs`) that:

1. Looks for an existing `packages/parser-bridge/vendor/` directory and uses it.
2. Otherwise, calls `composer` if it is on `PATH`.
3. Otherwise, downloads the official Composer installer to `packages/parser-bridge/composer.phar` and uses that — this needs network access exactly once and PHP on `PATH`.

To trigger it explicitly:

```bash
pnpm run vendor:parser-bridge
```

To skip the bootstrap entirely (offline build, you do not care about `nikic`):

```bash
# Bash / zsh
export CHRYSALIS_SKIP_PARSER_VENDOR=1

# PowerShell
$Env:CHRYSALIS_SKIP_PARSER_VENDOR = '1'

pnpm test
```

Tests that require `nikic` will skip cleanly.

---

## Verify the install

The simplest check is the test suite:

```bash
pnpm test
```

A successful run takes a few minutes. Some Vitest cases skip when PHP is absent; that is expected.

To exercise the full pipeline against the bundled `tiny-blog` fixture:

```bash
node scripts/run-e2e.mjs
```

This ingests, emits, runs the new app in-process, captures synthetic traces, and replays them. If it ends with `e2e: ok`, the workspace is healthy.

If you have PHP on `PATH`, run the PHP-side smoke tests too:

```bash
pnpm run test:oracle-php-redactor
```

These exercise the redaction logic the capture file applies before writing trace data to disk. The Node and PHP redaction rules are kept in sync; the smoke test catches drift.

---

## Mark a PHP project (optional)

When you start using Chrysalis on a real project, run:

```bash
node packages/cli/dist/bin.js init /path/to/your-php-app
```

This writes a small `chrysalis.project.json` at the root of your application so other tools (and humans) can recognize a Chrysalis-managed tree. It is safe to run twice; if the file already exists and is well-formed, the command leaves it alone.

The Chrysalis monorepo itself already contains this file at its root, so running `init` from inside the workspace is a no-op.

---

## Optional: a commercial license

The open-source distribution leaves the license gate off. Some vendor distributions set `CHRYSALIS_REQUIRE_LICENSE=1` and ship a small Ed25519 envelope plus a public key. When the gate is on, every command except `init` and `license` requires a valid local envelope. The verification is offline; there is no license server.

If you are using a vendor build, the vendor will give you instructions and the env vars to set (`CHRYSALIS_LICENSE` or `CHRYSALIS_LICENSE_PATH`, `CHRYSALIS_LICENSE_PUBLIC_KEY` or `CHRYSALIS_LICENSE_PUBLIC_KEY_PATH`). See [`docs/COMMERCIAL.md`](./COMMERCIAL.md) for the rest.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `pnpm: command not found` | pnpm is not installed. | `npm install -g pnpm@9` or use [Corepack](https://nodejs.org/api/corepack.html): `corepack enable && corepack use pnpm@9`. |
| `error This project requires Node.js >= 20` | Older Node. | Install Node 20+. Use `nvm install 20` if you have nvm. |
| `pretest` warns about parser vendor | PHP is missing or there is no network for the first bootstrap. | Install PHP 8.x and re-run, or run `pnpm run vendor:parser-bridge`, or set `CHRYSALIS_SKIP_PARSER_VENDOR=1` to skip. |
| Vitest fails immediately after `git pull` | `dist/` is stale. | `pnpm -r build`. |
| `php: command not found` on Windows | PHP is not on `PATH`. | Install PHP for Windows and add the install directory to `PATH`; reopen the shell. |
| `git: 'credential-manager-core' is not a git command` (Windows) | Your global Git config sets a helper Git no longer recognizes. | `git config --global --unset credential.helper`, then let the system config use `manager`. |
| Path issues on Windows (`/` vs `\`) | Mixed slashes in shell scripts. | Run pnpm and node from the workspace root; documentation uses `/` so it copy-pastes safely on both PowerShell and Bash. |

---

## What to do next

- Read the [User guide](./USER-GUIDE.md) to learn the commands, in order, on a real example.
- If you are putting Chrysalis into CI or production, read [Deployment](./DEPLOYMENT.md).
- For environment variables, signed configuration, and CI gate scripts, see [Administration](./ADMINISTRATION.md).
