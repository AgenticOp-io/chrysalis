# chrysalis-shim (Python)

## Purpose

Run the **same** Chrysalis CLI as Node (`packages/cli/dist/bin.js`) from a Python environment. This is an **exec shim**, not a second implementation of ingest, WebIR, or verify.

## Usage

From the repository root (after `pnpm --filter @chrysalis/cli build`):

```bash
# Option A — module (no install)
PYTHONPATH=python/chrysalis_shim/src python -m chrysalis_shim --help

# Option B — editable install
pip install -e ./python/chrysalis_shim
chrysalis-py --help
```

Override discovery:

- **`CHRYSALIS_CLI_JS`** — absolute path to `packages/cli/dist/bin.js`
- **`CHRYSALIS_NODE`** — path to the `node` binary

## CI / smoke

From the repository root, **`pnpm run test:cli-shims`** (after **`pnpm --filter @chrysalis/cli build`**) exercises this shim and the Go one. On **`GITHUB_ACTIONS`** or with **`CHRYSALIS_STRICT_CLI_SHIMS=1`**, both interpreters must be present and pass.

## Public API

The package is a CLI only: `chrysalis_shim.cli:main` and `python -m chrysalis_shim`.

## Invariants

- All subcommands, flags, exit codes, and JSON artifacts match the Node CLI.
- No PHP parsing or replay logic lives in this package.

## Non-goals

- Replacing the Node workspace or reimplementing pipeline stages in Python.
