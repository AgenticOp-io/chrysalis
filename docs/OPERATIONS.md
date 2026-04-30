# Operations

This guide covers **routine use** of Chrysalis after [Installation](./INSTALLATION.md): ingesting PHP, emitting TypeScript, capturing traces, verifying behavior, and reading reports.

All examples assume repository root as current working directory and a built CLI (`pnpm -r build`).

## Command map

| Goal | Typical entrypoint |
| --- | --- |
| PHP to WebIR | `chrysalis ingest <php-root>` |
| WebIR to TS (Hono / Fastify) | `chrysalis emit <php-root> --out <dir> --target=hono` or `fastify` |
| Record live PHP traffic | `chrysalis observe <php-root> --traces <dir> …` |
| Summarize a corpus | `chrysalis corpus <traces-dir>` |
| Replay corpus against emitted app | `chrysalis verify <traces-dir> --base-url <url> --report <dir>` |
| Dashboard JSON / text | `chrysalis status --project <php-root>` |
| Insight / rewrite catalog | `chrysalis insight …`, `chrysalis repair …` (see `packages/cli/README.md`) |
| Dual-stack routing | `chrysalis deploy …` (see `packages/runtime-chimera` and CLI help) |

Use `node packages/cli/dist/bin.js <subcommand> --help` if `chrysalis` is not on your PATH.

## Ingest and emit

```bash
node packages/cli/dist/bin.js ingest fixtures/tiny-blog
node packages/cli/dist/bin.js emit fixtures/tiny-blog --out generated/tiny-blog --target=hono
```

Optional **nikic** parser provider (requires parser-bridge vendor; see Installation):

```bash
node packages/cli/dist/bin.js ingest fixtures/tiny-blog --parser-provider nikic
```

Archaeology-backed domain types flow through emit when configured; see root README and `packages/archaeology/README.md`.

## Oracle: observe and corpus

1. Start observe (example port 8080):

   ```bash
   node packages/cli/dist/bin.js observe fixtures/tiny-blog --traces traces --port 8080
   ```

2. Drive HTTP against the PHP app (second terminal or scripted driver).

3. Summarize:

   ```bash
   node packages/cli/dist/bin.js corpus traces
   ```

Redaction defaults are conservative; customize via observe config as documented in `DESIGN.md` and `packages/oracle/README.md` (if present).

## Verify

Against a **running** emitted server:

```bash
node packages/cli/dist/bin.js verify traces \
  --base-url http://127.0.0.1:3000 \
  --threshold 0.95 \
  --report reports/verify
```

Machine-readable summary on stdout:

```bash
node packages/cli/dist/bin.js verify traces --base-url http://127.0.0.1:3000 --json-summary
```

Repository scripts wrap full loops (tiny-blog, flagship):

- `pnpm run verify:e2e`
- `pnpm run verify:flagship`
- `pnpm run verify:laravel-full` (when flagship worktree exists)

See [`packages/verify/README.md`](../packages/verify/README.md) for fields in `summary.json` and JSON summary output.

### Partitioned verify (large corpora, V2-M1)

To fan out replay across processes or machines, run multiple **`verify`** commands on the **same** traces directory with **`--shard-index i --shard-count K`** (and the same **`--base-url`** / **`--project`** / SQL flags). Each shard writes its own **`--report`** tree. Merge **`summary.json`** files without re-running HTTP:

```bash
node packages/cli/dist/bin.js verify-merge reports/verify-shard0/summary.json reports/verify-shard1/summary.json --json-out
```

Use **`--shard-count`** on **`verify-merge`** only when the replay fan-out **K** differs from the number of summary files (for example an empty shard produced no report).

**Ingest / emit sharding (V2-M2):** **`chrysalis ingest`** and **`chrysalis emit`** accept **`--shard-index i --shard-count K`** to lower only manifest routes in that bucket (relative **`chrysalis.routes.json`** **`file`** paths). Library **`buildCallEffectMap`** still scans the full route list for effect widening.

## Status and migration debt

```bash
node packages/cli/dist/bin.js status --project fixtures/tiny-blog
```

JSON for automation:

```bash
node packages/cli/dist/bin.js status --project fixtures/tiny-blog --json
```

Migration snapshot with optional gates:

```bash
pnpm run migration-debt -- --project fixtures/tiny-blog --max-holes 0 --json-out reports/migration-debt.json
```

See [`packages/cli/README.md`](../packages/cli/README.md) for `--max-holes`, `--min-correctness`, and `--json-out`.

## CI helper scripts (local parity)

Root `package.json` defines `pnpm run verify:e2e`, `ci:*` gates, `migration-debt:*`, etc. See root [`README.md`](../README.md) and [`ADMINISTRATION.md`](./ADMINISTRATION.md).

## Where outputs go

| Artifact | Typical location |
| --- | --- |
| Verify reports | `reports/verify/` (or per-backend subdirs for dual verify) |
| Insight / rewrite CI inputs | `reports/insight/`, `reports/rewrite/` |
| Migration sidecars | `reports/migration/*.json` |
| Dual-summary machine JSON | `reports/ci/*-summary.json` |
| Shadow diffs | `reports/shadow/shadow.ndjson` |

These paths are gitignored by default; treat them as **local or CI workspace state**, not something to commit unless you intend to snapshot fixtures.
