# Operations

This guide covers **routine use** of Chrysalis after [Installation](./INSTALLATION.md): ingesting PHP, emitting TypeScript, capturing traces, verifying behavior, and reading reports.

All examples assume repository root as current working directory and a built CLI (`pnpm -r build`).

## Command map

| Goal | Typical entrypoint |
| --- | --- |
| PHP to WebIR | `chrysalis ingest <php-root>` |
| WebIR to TS (Hono / Fastify) | `chrysalis emit … --target=hono` or `fastify`; optional **`--emit-resume`**, **`--emit-handler-import-barrel`**, **`--emit-route-path-constants`** (**DESIGN D256**, **D258**), **`--emit-handler-fingerprints`** (**D259**) |
| Record live PHP traffic | `chrysalis observe <php-root> --traces <dir> …` |
| Summarize a corpus | `chrysalis corpus <traces-dir>` |
| Replay corpus against emitted app | `chrysalis verify <traces-dir> --base-url <url> --report <dir>` |
| Dashboard JSON / text | `chrysalis status --project <php-root>` |
| Insight / rewrite catalog | `chrysalis insight …`, `chrysalis repair …` (see `packages/cli/README.md`) |
| Dual-stack routing | `chrysalis deploy …` (see `packages/runtime-chimera` and CLI help) |

Use `node packages/cli/dist/bin.js <subcommand> --help` if `chrysalis` is not on your PATH.

### Chimera deploy config (multi-node, V2-M5)

For **several chimera processes** behind a load balancer, every instance should read the **same** routing file (mounted from config management, object storage, or a release artifact). Use the versioned envelope so incompatible parsers fail loudly:

- **`kind`:** **`chrysalis.chimera.config`**
- **`schemaVersion`:** **1**

Omit **`kind`** only for legacy single-file configs (implicit v0). **`chrysalis deploy --config <path>`** validates JSON (including UTF-8 BOM), **`rules`**, **`canary`**, and **`schemaVersion`** when **`kind`** is set. Flags still override file fields. Example: **`fixtures/chimera-deploy-config-v1-smoke.json`** in this repo. **Optional signing (V2-M5, D255 / D257):** add top-level **`hmacSha256`**: either **one** 64-hex string, or an **object** **`{ "<keyId>": "<64-hex>", ... }`** (same signing payload for each digest). Use **`stableStringifyChimeraDeploySigningPayload`**, **HMAC-SHA256**, **`computeChimeraDeployConfigHmacHex`**, or **`computeChimeraDeployConfigHmacHexByKeyIds`** from **`@chrysalis/runtime-chimera`**. For a **string** digest, deploy with **`CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET`** / **`--config-hmac-secret`**, and optionally **`CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS`** (JSON array of strings) so a rotated file signed with an old key still verifies during cutover. For an **object** digest map, set **`CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON`** or **`chrysalis deploy --config-hmac-keys-json '<json object>'`** (key id → secret string). **Central config URL:** **`chrysalis deploy --config-url <https://…/chimera.json>`** or **`CHRYSALIS_CHIMERA_CONFIG_URL`** fetches the same JSON as **`--config`** (30s timeout, no redirect follow). Mutually exclusive with **`--config <file>`**. **HMAC** verification applies when the document includes **`hmacSha256`**.

**Hot reload (process-local):** send **`SIGHUP`** or **`SIGUSR2`** to the **`chrysalis deploy`** process to re-read **`--config`**, re-fetch **`--config-url`**, or re-parse flags-only state. On success the old chimera server is stopped and a new one starts (brief drop on that instance). On parse/HMAC/merge failure the previous server keeps running. **Windows:** signal support varies; prefer process manager restarts or Linux sidecars for production reload.

### Operator drift metrics (D258)

**`chrysalis deploy`** can write versioned **`chrysalis.chimera.operator-snapshot`** JSON (**`schemaVersion`:** **1**; example **`fixtures/ci/chimera-operator-snapshot-v1-smoke.json`**) alongside live **`ChimeraStats`**. Each document includes **`deployRoutingFingerprintSha256`** over routing fields (**mode**, upstream URLs, **rules**, **canary**, **shadowLogDir**, **host**, **port**, optional **`toolVersion`**) — **no** HMAC material.

- **`--operator-metrics-json <path>`** — overwrite on each tick with pretty-printed JSON.
- **`--operator-metrics-ndjson <path>`** — append one JSON line per tick (log / fleet sinks).
- **`--operator-metrics-interval-ms <n>`** — default **10000**; minimum **1000**. Applies to both console stats and metrics files when either metrics path is set; otherwise stats still print every **10s** as before.
- **`CHRYSALIS_CHIMERA_INSTANCE_ID`** — defaults to **`hostname:pid`**.

**Offline fingerprint (CI/scripts):** `node scripts/chimera-routing-fingerprint.mjs path/to/chimera.json` prints the same routing fingerprint hex (**requires** built **`packages/runtime-chimera/dist/`**, i.e. **`pnpm -r build`**).

**Fleet batch merge (D259):** append **`--operator-metrics-ndjson`** lines from many nodes into one or more **NDJSON** files, then merge offline:

```bash
node scripts/aggregate-chimera-operator-snapshots.mjs ops-a.ndjson ops-b.ndjson > operator-batch.json
```

Stdout is a single **`chrysalis.chimera.operator-snapshot.batch`** document (**`schemaVersion`:** **1**; **`itemCount`**, **`items[]`**, **`wallTimeIso`**). Example committed fixture: **`fixtures/ci/chimera-operator-snapshot-batch-v1-smoke.json`**.

**Verify summary batch (D271):** collect **`chrysalis verify --json-summary`** lines (or one pretty-printed summary per file) from shard/replica runs, then merge:

```bash
node scripts/aggregate-verify-summaries.mjs shard0.json shard1.json > verify-batch.json
```

Stdout is **`chrysalis.verify.summary.batch`** (**`schemaVersion`:** **1**). Fixture: **`fixtures/ci/verify-summary-batch-v1-smoke.json`**. **`pnpm run ci:verify-summary-batch`** runs Vitest coverage.

### HMAC secret rotation (KMS-style runbook)

1. **Generate** a new HMAC key in your KMS; keep the old key available during cutover.
2. **Single digest field (string `hmacSha256`):** publish one file at a time, or use **`CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS`** (JSON `["oldSecret"]`) alongside the new **`CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET`** so nodes accept the file signed with the previous key until everyone rolls forward.
3. **Multi-digest field (object `hmacSha256`):** **`computeChimeraDeployConfigHmacHexByKeyIds`** can emit **`{ "k2025": hex, "k2026": hex }`** for the same payload. Nodes supply **`CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON`** with the subset of ids they still hold; verification succeeds if **any** listed digest matches (**DESIGN D257**).
4. **Update file** in your store (S3, Vault export, etc.); deploy nodes pick it up on **SIGHUP** / **SIGUSR2** or restart.
5. **Roll clients:** align secrets with the new file; then **retire** the old key after all instances validate.

**Not yet specified:** fleet-wide revision pins beyond operator discipline.

### Multi-AZ cutover, stickiness, and shadow across nodes

- **Same route map everywhere:** mount one versioned **`chrysalis.chimera.config`** (or legacy implicit v0 file) on every chimera instance, or inject equivalent env/flags at boot. The load balancer must not pin “different configs” per node during cutover.
- **Drain before config flips:** shrink traffic on a cell, wait for **`chimera`** in-flight requests (and upstream PHP-FPM / Node pools) to finish, then roll the file and restart instances in a wave. Roll back by restoring the prior file revision and reversing the wave.
- **Canary and shadow:** **`ChimeraStats`** (**`@chrysalis/runtime-chimera`**) exposes per-process counters; aggregate in your metrics stack. Canary stickiness uses the configured cookie/header/IP salt so a user stays on one stack; keep that cookie **sticky to the chimera layer** (LB session affinity or client → same chimera IP) so the bucket is meaningful across retries.
- **Sessions:** until **M6** Redis (or equivalent) is the shared session store, file-backed SQLite sessions in emitted apps are per-instance; dual-stack login flows that rely on shared session state need either **one** modern node behind chimera or the **Redis** bridge described in **`packages/runtime-chimera`** / **`ROADMAP`** session items.
- **Hot reload:** **`chrysalis deploy`** reloads on **SIGHUP** / **SIGUSR2** when using **`--config`** or **`--config-url`** (**DESIGN D256**). **Windows** signal support is limited; prefer restarts there.
- **Emit crash resume:** **`chrysalis emit … --emit-resume`** skips rewriting handler files already recorded under **`<outDir>/.chrysalis-emit-state.json`**; scaffolding and **`chrysalis.holes.json`** are always regenerated on a successful run. Remove **`--emit-resume`** for a clean slate (the CLI clears stale state when resume is off).

### Fleet JSON and privacy (V2-M6)

Chrysalis provides **schemas, fixtures, and CLI exporters** only. It does **not** send telemetry to third parties. Treat **`chrysalis.fleet.status-uplink`**, **`chrysalis.chimera.operator-snapshot`**, verify summaries, **`chrysalis status --json`**, and trace corpora as **sensitive operator artifacts**: store them on infrastructure you control (self-hosted metrics, air-gapped object stores, VPC buckets). Align **`packages/oracle`** redaction defaults before merging multi-host traces.

### Fleet status uplink (reference JSON, V2-M6 v0)

Operators may aggregate **`chrysalis status --json`**, verify summaries, and chimera stats into dashboards. A minimal versioned envelope lives at **`fixtures/ci/fleet-status-uplink-v0-smoke.json`** (**`kind`:** **`chrysalis.fleet.status-uplink`**, **`schemaVersion`:** **0**). Each **`items[]`** entry has **`projectLabel`** and a nested **`status`** object (arbitrary JSON, typically **`chrysalis status --json`**).

Local wrapper script (stdout only, no network):

```bash
node packages/cli/dist/bin.js status --project fixtures/tiny-blog --json > /tmp/st.json
pnpm run fleet:export-status-uplink -- --payload-json /tmp/st.json --project-label fixtures/tiny-blog
```

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

- `pnpm run verify:e2e` — runs **`scripts/verify-tiny-blog.mjs`**: after PHP capture, splits NDJSON into two synthetic host trees under **`reports/ci/`**, **`mergeCorpusDirectories`** into **`reports/ci/traces-merged-multi-host`**, and replays that merged corpus against **Hono** at the same **`VERIFY_THRESHOLD`** as the monolithic corpus (V2-M3), using a **pristine sqlite copy** so the merged replay is not affected by earlier in-process replays on **`generated/tiny-blog/blog.sqlite`**.
- `pnpm run verify:flagship`
- `pnpm run verify:laravel-full` (when flagship worktree exists)

See [`packages/verify/README.md`](../packages/verify/README.md) for fields in `summary.json` and JSON summary output.

### Partitioned verify (large corpora, V2-M1)

To fan out replay across processes or machines, run multiple **`verify`** commands on the **same** traces directory with **`--shard-index i --shard-count K`** (and the same **`--base-url`** / **`--project`** / SQL flags). Each shard writes its own **`--report`** tree. Merge **`summary.json`** files without re-running HTTP:

```bash
node packages/cli/dist/bin.js verify-merge reports/verify-shard0/summary.json reports/verify-shard1/summary.json --json-out
```

Use **`--shard-count`** on **`verify-merge`** only when the replay fan-out **K** differs from the number of summary files (for example an empty shard produced no report).

### Merging trace directories (multi-host, V2-M3)

Combine several **`readCorpus`**-shaped roots (each with **`YYYY-MM-DD/*.ndjson`**) into one output tree for **`chrysalis verify`** or **`chrysalis corpus`**:

```bash
node packages/cli/dist/bin.js corpus-merge traces-cell-a traces-cell-b --out traces-merged
```

Default **`--on-duplicate`** is **`error`** (refuse if the same day + filename already exists under **`--out`**). Use **`--on-duplicate skip`** when duplicates are expected; the **first** source in the argument list wins.

Optional **content-level** dedupe by trace identity:

```bash
node packages/cli/dist/bin.js corpus-merge traces-cell-a traces-cell-b --out traces-merged --dedupe-trace-id skip
```

With **`--dedupe-trace-id skip`**, later files whose header **`traceId`** already appeared in an earlier copied file are skipped (source argument order still defines winner).

Optional deterministic sampling (bucket by **`traceId`** hash):

```bash
node packages/cli/dist/bin.js corpus-merge traces-cell-a traces-cell-b --out traces-merged --sample-modulo 8 --sample-remainder 0
```

This keeps approximately **1/8** of traces with stable selection across runs for the same corpus + flags, which is useful for quick replay smoke checks before full-corpus verify.

Preview merge effects without writing files:

```bash
node packages/cli/dist/bin.js corpus-merge traces-cell-a traces-cell-b --out traces-merged --dry-run
```

Write a machine-readable merge summary (for runbooks / CI artifacts):

```bash
node packages/cli/dist/bin.js corpus-merge traces-cell-a traces-cell-b --out traces-merged --json-out reports/corpus-merge/summary.json
```

The summary uses **`kind`**: **`"chrysalis.corpus-merge.summary"`** and **`schemaVersion`**: **`1`**. CI validates the shape with **`pnpm run ci:corpus-merge-summary -- fixtures/ci/corpus-merge-summary-smoke.json`** (see root **`README.md`**).

**Ingest / emit sharding (V2-M2):** **`chrysalis ingest`** and **`chrysalis emit`** accept **`--shard-index i --shard-count K`** to lower only manifest routes in that bucket (relative **`chrysalis.routes.json`** **`file`** paths). Library **`buildCallEffectMap`** still scans the full route list for effect widening. For a **single merged WebIR module** covering all shards, use **`--merge-all-shards --shard-count K`** (runs **`mergeWebIrModules`** in **`@chrysalis/webir`**, which **dedupes** structurally identical IR across shards per **DESIGN D247**). **`chrysalis status --project …`** supports the same flags for full-route migration metrics.

**Ingest AST cache (V2-M2, opt-in):** the same commands accept **`--ingest-cache <dir>`** to reuse on-disk PHP AST JSON between runs (invalidated when file bytes, parser provider, or ingest cache version change). Omit the flag for a cold parse every time.

## Status and migration debt

```bash
node packages/cli/dist/bin.js status --project fixtures/tiny-blog
```

JSON for automation:

```bash
node packages/cli/dist/bin.js status --project fixtures/tiny-blog --json
```

With **`--merge-all-shards`** or **`--shard-index`**, shard/merge progress is printed to **stderr** when **`--json`** is set so **stdout** remains one parseable JSON object.

The JSON object includes **`ingestSharding`** when **`--project`** ingest succeeds (**`monolithic`**, **`routeShard`**, or **`mergedShards`**; **DESIGN D248**). **`scripts/migration-debt.mjs --json-out`** forwards the same field for fleet dashboards.

Migration snapshot with optional gates:

```bash
pnpm run migration-debt -- --project fixtures/tiny-blog --max-holes 0 --json-out reports/migration-debt.json
```

Scale-out ingest mode is forwarded (same flags as **`status`**), e.g. merged shards:

```bash
pnpm run migration-debt -- --project fixtures/tiny-blog --merge-all-shards --shard-count 2 --json-out reports/migration-debt-merged.json
```

Or a single route shard (partial route set for **`oracleFootprint`** / holes):

```bash
pnpm run migration-debt -- --project fixtures/tiny-blog --shard-index 0 --shard-count 2 --json-out reports/migration-debt-r0.json
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
