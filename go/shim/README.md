# Go CLI shim (`chrysalis-go`)

## Purpose

Small **Go** binary that runs the canonical Node CLI (`packages/cli/dist/bin.js`). Same flags, exit codes, and artifacts as `chrysalis`; no duplicated pipeline logic.

## Build

From the repository root (requires Go 1.22+):

```bash
cd go/shim
go build -o chrysalis-go .
./chrysalis-go --help
```

Install into `$GOPATH/bin` from a local clone:

```bash
cd go/shim
go install .
```

The installed binary name matches the module directory (`shim`) unless you use `go build -o chrysalis-go .`.

## Environment

| Variable | Meaning |
| --- | --- |
| `CHRYSALIS_CLI_JS` | Absolute path to `bin.js` (skips upward search) |
| `CHRYSALIS_NODE` | Path to the `node` executable |

## CI / smoke

From the repo root, **`pnpm run test:cli-shims`** (after **`pnpm --filter @chrysalis/cli build`**) exercises this shim plus the Python one. On **`GITHUB_ACTIONS`** or with **`CHRYSALIS_STRICT_CLI_SHIMS=1`**, Go and Python must both be available and pass.

## Invariants

- All behavior is delegated to Node; this shim only discovers paths and execs.

## Non-goals

- Reimplementing ingest, WebIR, emit, or verify in Go.
