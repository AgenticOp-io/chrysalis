# User guide

This guide walks you through using Chrysalis from start to finish: turning a PHP application into a TypeScript application, recording the old app's real behavior as a test suite, replaying that test suite against the new code, and (optionally) running both stacks side by side while you migrate.

It is written for engineers who will run the tools, not for people maintaining Chrysalis itself. If you are looking for the architecture story, read [Whitepaper](./WHITEPAPER.md). If you would rather follow complete worked scenarios from start to finish, read [How-to](./HOW-TO.md). If you are setting up CI or production hosts, read [Deployment](./DEPLOYMENT.md) and [Administration](./ADMINISTRATION.md). If you have not built the workspace yet, start with [Installation](./INSTALLATION.md).

---

## Table of contents

1. [What Chrysalis actually does](#what-chrysalis-actually-does)
2. [The three names you need to know](#the-three-names-you-need-to-know)
3. [How to run the CLI](#how-to-run-the-cli)
4. [Output, exit codes, and where files land](#output-exit-codes-and-where-files-land)
5. [Recommended workflow (start here)](#recommended-workflow-start-here)
6. [Command reference](#command-reference)
   - [`init` — mark a directory as a Chrysalis project](#init)
   - [`ingest` — read PHP into the internal graph](#ingest)
   - [`emit` — generate a TypeScript project](#emit)
   - [`convert` — ingest and emit in one step](#convert)
   - [`archaeology` — recover types from your database and forms](#archaeology)
   - [`observe` — capture real PHP traffic as test data](#observe)
   - [`corpus` — summarize captured traffic](#corpus)
   - [`corpus-merge` — combine traces from multiple machines](#corpus-merge)
   - [`verify` — replay traffic against the new app](#verify)
   - [`verify-merge` — combine verify reports from parallel runs](#verify-merge)
   - [`status` — one-page migration dashboard](#status)
   - [`insight` — find code-quality opportunities](#insight)
   - [`rewrite` — apply automated graph transforms](#rewrite)
   - [`repair` — verify-driven patch loop](#repair)
   - [`deploy` — run both stacks behind one URL](#deploy)
   - [`license` — check a commercial license envelope](#license)
7. [Recipes](#recipes)
8. [Troubleshooting](#troubleshooting)

---

## What Chrysalis actually does

Chrysalis is a toolchain for **incremental modernization** of a legacy PHP web application. Most converters read your source code and hope. Chrysalis does three independent things and combines them so you do not have to take its output on faith:

1. **It translates your PHP into a TypeScript service.** It parses PHP, lowers each route into an internal graph, and writes out a normal Node project (Hono or Fastify). When it cannot translate something safely, it inserts a *hole*: a typed placeholder that compiles, that you can count, and that delegates to your old PHP code at run time. It never silently guesses.

2. **It records your real PHP traffic as a test suite.** A small PHP file loaded ahead of your application captures every request, every SQL query, every session change, and every outgoing HTTP call into newline-delimited JSON files (NDJSON). This collection is called a *corpus*. The corpus is the actual behavior of your old app, not somebody's interpretation of it.

3. **It replays the corpus against the new TypeScript service.** It sends the same requests, in the same order, with time and randomness pinned to the values from the original capture. It compares status codes, headers, and bodies after applying a small allowed list of normalizations (timestamps, session ids, UUIDs). You get a correctness score per route plus a `summary.json` you can gate CI on.

On top of that you get optional pieces: a small static analyzer that flags things like SQL string concatenation and N+1 queries; an automated rewriter that fixes those it knows how to fix; a verify-driven repair loop; a domain-type recovery tool that reads your SQL DDL and confirms types from observed data; and a traffic router that lets the legacy and new stacks coexist on one URL while you cut over.

You do not have to use everything. The minimum loop is **ingest → emit → observe → verify**.

---

## The three names you need to know

A few names show up in command output, file names, and folder paths. They are all internal Chrysalis names; none of them refer to outside products.

| Name | What it means |
| --- | --- |
| **WebIR** | The internal graph between PHP and the generated TypeScript. *Web Intermediate Representation*. Built by `ingest`, consumed by `emit`. You normally never look at it. When the docs mention "the IR", this is what they mean. |
| **Oracle** | The capture system. Has two halves: a PHP file loaded ahead of your app (`packages/oracle-php/src/bootstrap.php`) that writes the trace files, and a Node side (`@chrysalis/oracle`) that reads them. **Has nothing to do with Oracle Corporation or the Oracle database.** |
| **Chimera** | The dual-stack HTTP router started by `chrysalis deploy`. One process listens on a port and forwards each request to either your old PHP server or your new Node server, based on rules and a mode (legacy / shadow / canary / cutover). |

Three more terms worth knowing:

- **Trace** — One captured request and its side effects, written as NDJSON.
- **Corpus** — A directory of trace files, normally arranged as `traces/YYYY-MM-DD/*.ndjson`.
- **Hole** — A node in the IR that says "we did not translate this safely; the reason is …". Holes compile and delegate; they are the unit you measure migration progress against.

---

## How to run the CLI

After installing and building (see [Installation](./INSTALLATION.md)):

```bash
node packages/cli/dist/bin.js <command> [args...]
```

If you have placed the workspace bin on your `PATH`, you can run `chrysalis <command>` instead. All examples below use the explicit `node packages/cli/dist/bin.js` form so they work in a fresh checkout.

To see the list of commands and the optional large-repo flags:

```bash
node packages/cli/dist/bin.js --help
```

Every subcommand also accepts `--help` and prints its own usage line.

**Python and Go entrypoints (same behavior):** you can run the same CLI via **`python -m chrysalis_shim`** (or **`chrysalis-py`** after `pip install -e ./python/chrysalis_shim`) or a binary built from **`go/shim/`**. Both forward to **`packages/cli/dist/bin.js`**; see [Installation](./INSTALLATION.md#optional-python-and-go-entrypoints-same-cli) and **DESIGN D295**.

---

## Output, exit codes, and where files land

Chrysalis follows two simple rules:

- **Stdout is for results that another tool might read.** When a command supports `--json`, `--json-summary`, or `--json-out`, that machine output goes to stdout, one parseable JSON object, with everything else (progress, warnings, summaries) on stderr. You can pipe stdout to `jq` without filtering.
- **Stderr is for humans.** Progress, errors, and "here is what I am about to do" lines all go to stderr.

| Exit code | Meaning |
| --- | --- |
| **0** | The command succeeded. For `verify`, also means the correctness score met `--threshold`. |
| **1** | A measurement failed. For `verify`, the replay completed but correctness was below `--threshold`. For `insight --strict`, opportunities were found. |
| **2** | The command refused to run. Bad flags, missing files, malformed config, license check failed when enforcement is on. |

By default, generated artefacts land under sensibly named directories that are gitignored in the workspace:

```
generated/<your-app>/    # output of `emit`
traces/                  # NDJSON traces from `observe`
reports/verify/          # output of `verify`
reports/shadow/          # diffs from `deploy --mode=shadow`
reports/migration/       # optional sidecars
reports/insight/         # output of `insight`
reports/rewrite/         # output of `rewrite`
```

Treat all of these as build outputs. Do not commit them unless you want to snapshot a fixture.

---

## Recommended workflow (start here)

This is the path that gets you from "PHP repo on disk" to "verified TypeScript replacement" with the smallest number of moving parts. Run from the Chrysalis workspace root.

```bash
# 0. Build once (or after pulling).
pnpm -r build

# 1. Mark your PHP project so other Chrysalis tools recognize it.
node packages/cli/dist/bin.js init /path/to/my-php-app

# 2. Look at how much of the app is translatable today.
node packages/cli/dist/bin.js ingest /path/to/my-php-app

# 3. Generate a TypeScript service.
node packages/cli/dist/bin.js emit /path/to/my-php-app \
    --out generated/my-app --target=hono

# 4. Run the new service in a separate terminal.
cd generated/my-app && npm install && npm start
# Listening on http://127.0.0.1:3000

# 5. In another terminal, capture real PHP traffic.
node packages/cli/dist/bin.js observe /path/to/my-php-app \
    --traces traces --port 8080
# Drive your usual smoke tests against http://127.0.0.1:8080
# Stop with Ctrl+C when you have enough traces.

# 6. Sanity-check what you captured.
node packages/cli/dist/bin.js corpus traces

# 7. Replay the captured traffic against the new service.
node packages/cli/dist/bin.js verify traces \
    --base-url http://127.0.0.1:3000 \
    --threshold 0.95 --report reports/verify

# 8. Read the dashboard.
node packages/cli/dist/bin.js status \
    --project /path/to/my-php-app \
    --traces traces --report reports/verify
```

If step 7 reports holes or divergences, you have three choices:

- Open a hole and write the missing PHP-to-TS lowering (a Chrysalis change), or
- Use `chrysalis insight` and `chrysalis rewrite` to apply known-good transforms, or
- Use `chrysalis repair` to drive a verify-gated patch loop.

Once verify is green, optionally use `chrysalis deploy` to put both stacks behind one URL and roll traffic over.

---

## Command reference

Every subsection below is laid out the same way: **what it does**, **how to run it**, **important flags**, **what you should see**, **what files it writes**, and **notes**.

---

### `init`

**What it does.** Writes a small marker file (`chrysalis.project.json`) at the root of your PHP application so other Chrysalis tools and humans can tell at a glance that the directory is being managed by Chrysalis. It is safe to run twice: if the file is already present and well-formed, the command leaves it alone and prints a friendly note. Not subject to the optional commercial license gate.

**Usage.**

```bash
chrysalis init [<dir>]
```

If `<dir>` is omitted, the current working directory is used.

**Example 1 — first run inside your PHP project.**

```bash
$ cd /var/www/legacy-blog
$ node /opt/chrysalis/packages/cli/dist/bin.js init
[chrysalis] initialized project: /var/www/legacy-blog/chrysalis.project.json
$ cat chrysalis.project.json
{
  "kind": "chrysalis.project",
  "schemaVersion": "1.0.0",
  "initializedAt": "2026-05-12T22:00:00.000Z"
}
```

**Example 2 — running it twice.**

```bash
$ node /opt/chrysalis/packages/cli/dist/bin.js init
[chrysalis] project already initialized (/var/www/legacy-blog/chrysalis.project.json)
```

Exit code is still `0`. Nothing is overwritten.

**Example 3 — pointing at a directory that does not exist yet.**

```bash
$ node packages/cli/dist/bin.js init /opt/new-project
[chrysalis] initialized project: /opt/new-project/chrysalis.project.json
```

The directory is created (recursively) if it does not exist.

**Common errors.**

| Stderr | Cause | Fix |
| --- | --- | --- |
| `[init] cannot create directory <path>: …` | Permission denied or invalid path. | Pick a writable path or run with the right permissions. |
| `[init] <path> exists but is not a recognized Chrysalis project file (refusing to overwrite).` | Some other file lives at `chrysalis.project.json`. | Move or delete it; rerun. |
| `[init] <path> exists but is not valid JSON (refusing to overwrite).` | A previous run left a corrupted marker. | Delete the file and rerun. |

**File written.** `chrysalis.project.json` with `kind: chrysalis.project`, `schemaVersion: 1.0.0`, and an `initializedAt` ISO-8601 timestamp.

---

### `ingest`

**What it does.** Walks a PHP project, parses each file, and lowers every route it can recognize into the internal graph (WebIR). Unsupported PHP becomes a typed *hole* with a reason string. Prints a small summary: how many routes it found, how many graph nodes it produced, how many holes were inserted, and a breakdown of which parts of the IR were touched.

The graph is held in memory for this command. Other commands (`emit`, `verify --project`, `status --project`, `insight`, `rewrite`, `repair`) re-run ingest internally, sharing the same flags.

**Usage.**

```bash
chrysalis ingest <php-project-dir>
  [--parser-provider glayzzle|nikic]
  [--ingest-cache <dir>]
  [--ingest-progress-file <path>]
  [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint]
  [--ingest-dedupe-structural-subgraphs]
  [--ingest-dedupe-structural-subgraphs-ignore-origin]
  [--shard-index I --shard-count K] [--merge-all-shards --shard-count K]
```

**Important flags.**

| Flag | Use it when |
| --- | --- |
| `--parser-provider nikic` | Default `glayzzle` mis-parses something edge-case (namespaces, dynamic constructs). Requires `php` on `PATH` and the parser-bridge vendor (see Installation). |
| `--ingest-cache <dir>` | You re-run ingest often on the same tree. Caches parsed PHP ASTs by file hash so unchanged files are skipped. |
| `--ingest-progress-file <path>` | You want a record of how far ingest got. Each finished route appends one line. Useful when a giant ingest crashes; the file shows you the last route completed. |
| `--ingest-checkpoint-file <path>` plus `--ingest-resume-checkpoint` | You want a true resume: if the process crashes, restart it with `--ingest-resume-checkpoint` and ingest skips already-completed routes. |
| `--shard-index I --shard-count K` | Your project is too large for one process. Run `K` separate ingest jobs (`I=0..K-1`) in parallel; each one only handles its slice of routes. |
| `--merge-all-shards --shard-count K` | You want a single combined graph from all `K` shards in one command. Internally runs each shard in turn and merges the results, dropping duplicate IR structure across shards. |
| `--ingest-dedupe-structural-subgraphs` | Optional pass that, after lowering, merges duplicate subgraphs that have the same shape. Reduces the node count when many routes share helpers. Default is off. |

**Example 1 — vanilla ingest of a small project.**

```bash
$ node packages/cli/dist/bin.js ingest fixtures/tiny-blog
routes:   5
nodes:    312
holes:    0
dialects: {"web":18,"effect":24,"data":270}
```

Read this output as: "5 routes were recognized, 312 nodes were produced in the IR, no constructs were refused, and the IR is split across three dialects in those proportions". A non-zero hole count would print like `holes: 7  (3 auth-tagged ingest holes)`, which means three of the seven holes are auth-related.

**Example 2 — ingest with an AST cache and the alternate parser.**

```bash
$ mkdir -p .chrysalis/ast-cache
$ node packages/cli/dist/bin.js ingest /opt/legacy-app \
      --parser-provider nikic \
      --ingest-cache .chrysalis/ast-cache
[ingest] AST cache: /var/www/legacy-blog/.chrysalis/ast-cache
routes:   148
nodes:    9842
holes:    21  (3 auth-tagged ingest holes)
dialects: {"web":612,"effect":1820,"data":7410}
```

The first run populates the cache. Re-running the same command on an unchanged tree skips parsing entirely and finishes in seconds.

**Example 3 — sharded ingest for a huge tree.**

```bash
# On worker 0
$ node packages/cli/dist/bin.js ingest /opt/legacy-app --shard-index 0 --shard-count 4
[ingest] shard 0/4 (route file filter; call map uses full manifest)
routes:   38
nodes:    2402
holes:    5
dialects: {"web":151,"effect":462,"data":1789}

# On a coordinating box, after all four shards have completed:
$ node packages/cli/dist/bin.js ingest /opt/legacy-app --merge-all-shards --shard-count 4
[ingest] merge-all-shards: 4 shard ingests -> mergeWebIrModules
routes:   148
nodes:    9842
holes:    21
dialects: {"web":612,"effect":1820,"data":7410}
```

The merged result matches a monolithic ingest exactly.

**Example 4 — opting into duplicate-IR collapse.**

```bash
$ node packages/cli/dist/bin.js ingest fixtures/tiny-blog --ingest-dedupe-structural-subgraphs
[ingest] structural subgraph dedupe: dedupeStructuralSubgraphsInModule (DESIGN D283)
routes:   5
nodes:    198          # was 312 without the flag
holes:    0
dialects: {"web":18,"effect":24,"data":156}
```

The two `[ingest]` log lines on stderr name the internal pass; read them as "this optional duplicate-merge pass ran".

**Common errors.**

| Stderr | Fix |
| --- | --- |
| `error: --shard-count must be a finite integer >= 2` | You passed something like `--shard-count abc`. |
| `error: --shard-index must satisfy 0 <= index < shard-count (got 4, 4)` | Indices are zero-based. With `--shard-count 4` use `0..3`. |
| `error: --merge-all-shards requires --shard-count <int>` | Add the count. |
| `error: --ingest-progress-file cannot be used with --merge-all-shards (each shard overwrites the same path; use per-shard runs with distinct files instead)` | Run shards individually with distinct progress files. |

**What it does not do.** It does not write the graph to disk. To get a TypeScript project, run `emit` (which calls ingest internally).

---

### `emit`

**What it does.** Runs ingest, then writes a complete Node/TypeScript project to `--out`: handlers (one file per route), a server entry point, a runtime helper module, and supporting files (`package.json`, `tsconfig.json`). Optionally writes a `domain.ts` and a Drizzle `schema.ts` when `--schema` points to your SQL DDL.

The output is a normal Node project. You can `cd` into it, run `npm install`, and `npm start`.

**Usage.**

```bash
chrysalis emit <php-project-dir> --out <out-dir>
  [--target=hono|fastify]
  [--emit-route-registration eager|lazy]
  [--emit-handler-import-barrel]
  [--emit-shared-runtime-imports]
  [--emit-dedupe-identical-handler-bodies]
  [--emit-route-path-constants]
  [--emit-handler-fingerprints]
  [--emit-runtime-facade]
  [--emit-resume]
  [--schema <schema.sql>]
  [--parser-provider glayzzle|nikic]
  [--ingest-cache <dir>] [--ingest-progress-file <path>]
  [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint]
  [--ingest-dedupe-structural-subgraphs]
  [--shard-index I --shard-count K] [--merge-all-shards --shard-count K]
```

**Important flags.**

| Flag | Use it when |
| --- | --- |
| `--target=hono` (default) or `--target=fastify` | You want one or the other Node framework. Both are fully supported and pass the same tests. |
| `--schema <schema.sql>` | You want typed row generics on `queryOne` and `queryAll`. Chrysalis will run `archaeology` against your DDL and write `domain.ts` (TypeScript interfaces) and, when `drizzle-orm` is appropriate, `schema.ts`. |
| `--emit-resume` | You ran emit on a huge project and it crashed. Re-running with this flag skips handlers already written; remove it for a clean rewrite. |
| `--emit-handler-import-barrel` | You want one shared `chrysalis-handler-imports.ts` that re-exports every handler, instead of N individual imports in `server.ts`. |
| `--emit-shared-runtime-imports` | You want one shared module (`chrysalis-runtime-imports.ts`) re-exporting the runtime helpers, instead of repeating the same imports across handlers. Cannot be combined with `--emit-handler-import-barrel`. |
| `--emit-dedupe-identical-handler-bodies` | Many of your routes have identical lowered bodies (common in template-shaped apps). Writes one shared module (`src/chrysalis-deduped/<id>.ts`) and turns each duplicate route into a thin wrapper. |
| `--emit-route-path-constants` | You want one `src/chrysalis-route-paths.ts` that names every route path as a constant for downstream tooling. |
| `--emit-handler-fingerprints` | You want a JSON file (`chrysalis.emit-handler-fingerprints.json`) that records a SHA-256 of each emitted handler. Useful for change-detection. |
| `--emit-runtime-facade` | You want a stable `src/chrysalis-runtime-facade.ts` that re-exports the runtime so PHP-shaped shims have one well-known import path. |
| `--emit-route-registration lazy` | You have many routes and want them registered lazily on first request rather than eagerly at boot. |

**Example 1 — minimum invocation, Hono target.**

```bash
$ node packages/cli/dist/bin.js emit fixtures/tiny-blog \
      --out generated/tiny-blog --target=hono
handlers:     5
files:        14
emit holes:   0
  posts_index_show          effects: query_all
  posts_show                effects: query_one
  posts_create_show         effects: (none)
  posts_create_post         effects: query_one, redirect
  posts_delete_post         effects: query_one, redirect
```

After this command finishes:

```bash
$ ls generated/tiny-blog
package.json  tsconfig.json  src/  chrysalis.holes.json
$ ls generated/tiny-blog/src
domain.ts  handlers/  index.ts  runtime.ts  schema.ts  server.ts  session.ts
$ cd generated/tiny-blog && npm install && npm start
> tiny-blog@0.0.0 start
> node dist/index.js
listening on http://0.0.0.0:3000
```

**Example 2 — typed rows from your real schema.**

```bash
$ node packages/cli/dist/bin.js emit /opt/legacy-app \
      --out generated/legacy-app --target=hono \
      --schema /opt/legacy-app/db/schema.sql
handlers:     148
files:        178
emit holes:   2
  comments_index_show       effects: query_all
  ...
```

Now `src/handlers/comments_index_show.ts` calls `queryAll<Comment>(...)` instead of `queryAll(...)`, and `src/domain.ts` carries one TypeScript interface per table with `@chrysalis-provenance` JSDoc citing where each field came from.

**Example 3 — Fastify target with a barreled handler import.**

```bash
$ node packages/cli/dist/bin.js emit /opt/legacy-app \
      --out generated/legacy-app-fastify --target=fastify \
      --emit-handler-import-barrel
handlers:     148
files:        177
emit holes:   2
  ...
$ ls generated/legacy-app-fastify/src
chrysalis-handler-imports.ts  domain.ts  handlers/  index.ts  runtime.ts  schema.ts  server.ts  session.ts
```

`server.ts` now imports every handler from `chrysalis-handler-imports.ts` instead of writing 148 individual import lines.

**Example 4 — shrinking the output for a template-shaped app.**

```bash
$ node packages/cli/dist/bin.js emit /opt/template-app \
      --out generated/template-app --target=hono \
      --emit-shared-runtime-imports \
      --emit-dedupe-identical-handler-bodies
handlers:     312
files:        88           # 312 routes; many share a body
emit holes:   0
$ ls generated/template-app/src/chrysalis-deduped
__body_a4f9e1.ts  __body_91c2d3.ts  ...
```

Each route in `src/handlers/` becomes a thin wrapper that calls one of the shared bodies under `src/chrysalis-deduped/`.

**Example 5 — recovering from an interrupted emit.**

```bash
$ node packages/cli/dist/bin.js emit /opt/legacy-app --out generated/legacy-app --target=hono
... (imagine the process is killed halfway through)

$ node packages/cli/dist/bin.js emit /opt/legacy-app --out generated/legacy-app --target=hono \
      --emit-resume
[emit] resume: skipping 89 handlers already written
handlers:     148
files:        178
emit holes:   2
```

Drop `--emit-resume` later for a fresh write.

**Files written.** A complete Node project under `--out`. Notable files:

- `package.json`, `tsconfig.json`
- `src/server.ts` — exports `app` (so verify can call it in-process)
- `src/index.ts` — listens on a port (`PORT`, default 3000)
- `src/runtime.ts` — small helper module (DB, sessions, time, randomness)
- `src/handlers/<route>.ts` — one file per translated route
- `src/domain.ts`, `src/schema.ts` — when `--schema` is set
- `chrysalis.holes.json` — list of holes Chrysalis emitted in this build
- `chrysalis.emit-handler-fingerprints.json` — when `--emit-handler-fingerprints` is set

**Running the emitted app.**

```bash
cd generated/tiny-blog
npm install
npm start                                # listens on http://127.0.0.1:3000
PORT=4000 npm start                       # different port
CHRYSALIS_DB_PATH=/tmp/blog.sqlite npm start
```

The emitted app reads a few environment variables; the relevant ones are listed in [Administration](./ADMINISTRATION.md).

---

### `convert`

**What it does.** Today this is a one-shot wrapper around `ingest` followed by `emit`. The flags and behavior are identical to `emit`. Use whichever name you prefer.

---

### `archaeology`

**What it does.** Reads your SQL schema (DDL), optionally reads a captured corpus and any HTML/PHP form scans you point it at, and produces typed TypeScript interfaces for each table. Each field carries provenance comments — where the type came from (DDL line, observed traces, form input). When DDL says `int` but observed data is strings, both are recorded so you can inspect the conflict.

Most users do not run this command directly: `emit --schema <schema.sql>` calls into archaeology internally. Run it standalone when you want to inspect the recovered types or feed them into another tool.

**Usage.**

```bash
chrysalis archaeology <schema.sql>
  [--traces <dir>] [--php-root <dir>] [--out <file>]
```

`--php-root` may be repeated to scan multiple PHP trees for form fields. `--out` writes the generated TypeScript to a file; otherwise it goes to stdout.

**Example 1 — DDL-only run, output to stdout.**

```bash
$ node packages/cli/dist/bin.js archaeology fixtures/tiny-blog/schema.sql
[archaeology] entities:        2
[archaeology]   posts          fields=4
[archaeology]   comments       fields=5
[archaeology] schema source:   fixtures/tiny-blog/schema.sql

// generated TypeScript follows on stdout:
export interface Post {
  /** @chrysalis-provenance schema fixtures/tiny-blog/schema.sql:3 */
  id: number;
  /** @chrysalis-provenance schema fixtures/tiny-blog/schema.sql:4 */
  title: string;
  ...
}
```

**Example 2 — DDL plus traces, written to a file.**

```bash
$ node packages/cli/dist/bin.js archaeology fixtures/tiny-blog/schema.sql \
      --traces traces --out reports/arch/domain.ts
[archaeology] entities:        2
[archaeology]   posts          fields=4   trace-confirmed=4
[archaeology]   comments       fields=5   trace-confirmed=5
[archaeology] wrote reports/arch/domain.ts
```

Each field in the file now carries an extra provenance line like `@chrysalis-provenance trace — observed in 18 statements`.

**Example 3 — DDL plus PHP form scans for unknown columns.**

```bash
$ node packages/cli/dist/bin.js archaeology /opt/legacy-app/db/schema.sql \
      --traces traces --php-root /opt/legacy-app/public --out reports/arch/domain.ts
[archaeology] entities:        12
[archaeology] ⚠ unattributed form fields: 3
[archaeology] wrote reports/arch/domain.ts
```

Each unattributed form field is rendered as a comment in the generated TypeScript so a human can decide what to do with it.

---

### `observe`

**What it does.** Starts a local PHP built-in server with the Chrysalis capture file loaded ahead of your application via `auto_prepend_file`. Each HTTP request to that server produces NDJSON trace lines under `--traces`. Captures HTTP requests and responses, SQL statements (with parameters and, for SELECTs, optionally rows), session reads and writes, outbound HTTP, and time/randomness reads.

By default the capture redacts well-known sensitive values (Authorization headers, session cookies, CSRF/token POST fields, common sensitive query parameters). To extend or override redaction rules, drop a `chrysalis.observe.json` at your PHP root.

**Usage.**

```bash
chrysalis observe <php-project-dir>
  [--traces <dir>] [--port 8080] [--host 127.0.0.1]
```

**Example 1 — start observe, drive a few requests, stop.**

Terminal A:

```bash
$ node packages/cli/dist/bin.js observe /opt/legacy-app --traces ./captures --port 8080
[observe] php root:   /opt/legacy-app
[observe] trace dir:  /var/www/legacy-blog/captures
[observe] prelude:    /opt/chrysalis/packages/oracle-php/src/bootstrap.php
[observe] listening:  http://127.0.0.1:8080
[observe] redaction:  12 rule(s) (built-in defaults only)
[Tue May 12 22:10:01 2026] PHP 8.2.6 Development Server started
```

Terminal B (or your test runner):

```bash
$ curl -s http://127.0.0.1:8080/ > /dev/null
$ curl -s http://127.0.0.1:8080/posts/1 > /dev/null
$ curl -s -X POST -d 'body=hi' http://127.0.0.1:8080/comments > /dev/null
```

Back in Terminal A, `Ctrl+C` to stop:

```text
^C
[observe] shutting down...
```

After this:

```bash
$ ls captures
2026-05-12/
$ ls captures/2026-05-12/
0193b3a4-1f60-7a4b-8d92-a5d8c7e9b401.ndjson
0193b3a4-1f61-7a4b-8d92-a5d8c7e9b402.ndjson
0193b3a4-1f62-7a4b-8d92-a5d8c7e9b403.ndjson
```

Each file is one captured request and its side effects, line-delimited JSON.

**Example 2 — observe with custom redaction.**

Drop `chrysalis.observe.json` at the PHP root before starting:

```json
{
  "rules": [
    { "path": "request.post.password",  "kind": "drop" },
    { "path": "request.post.api_token", "kind": "mask" },
    { "path": "sql.row.email",          "kind": "mask" }
  ]
}
```

Then:

```bash
$ node packages/cli/dist/bin.js observe /opt/legacy-app --traces ./captures
[observe] redaction:  15 rule(s) (built-in defaults + 3 from chrysalis.observe.json)
```

The number of rules in the banner reflects the merge.

**Example 3 — observe a different host or port.**

```bash
$ node packages/cli/dist/bin.js observe /opt/legacy-app --host 0.0.0.0 --port 18080
[observe] listening:  http://0.0.0.0:18080
```

**Common errors.**

| Stderr | Cause | Fix |
| --- | --- | --- |
| `[observe] error parsing chrysalis.observe.json: …` | The redaction file is invalid JSON. | Fix or remove it. |
| `php: command not found` (from the underlying spawn) | PHP is not on `PATH`. | Install PHP 8.x and reopen the shell. |

**What it does not do.** It does not patch your real production servers. The recommended way to capture from production is to load `packages/oracle-php/src/bootstrap.php` from your existing PHP-FPM or Apache configuration with `auto_prepend_file=...` and set `CHRYSALIS_TRACE_DIR` to a writable directory; `observe` is a convenience wrapper around the same bootstrap for development and staging.

---

### `corpus`

**What it does.** Counts the traces in a directory, groups them by route, and prints how many of each. Quick sanity check after `observe` finishes.

**Usage.**

```bash
chrysalis corpus <traces-dir>
```

**Example 1 — basic summary.**

```bash
$ node packages/cli/dist/bin.js corpus ./captures
traces: 42
  GET /                         18
  GET /posts/:id                10
  POST /comments                14
  side effects: http.outbound=2 mail.send=0
```

**Example 2 — tiny corpus to confirm capture is working.**

After running `observe` and a single `curl http://127.0.0.1:8080/`:

```bash
$ node packages/cli/dist/bin.js corpus ./captures
traces: 1
  GET /                         1
```

If you get `traces: 0`, capture did not write anything. Common causes: the PHP server died at startup, `auto_prepend_file` was not honored (check the PHP `disable_functions` and `php.ini` `open_basedir`), or `CHRYSALIS_TRACE_DIR` was unset.

**Common errors.**

| Stderr | Cause | Fix |
| --- | --- | --- |
| `usage: chrysalis corpus <traces-dir>` | You ran `corpus` with no argument. | Pass the directory. |
| Missing or empty corpus | The directory exists but has no NDJSON files. | Confirm `observe` is writing somewhere readable. |

---

### `corpus-merge`

**What it does.** Combines several trace directories into one. Use it when you captured on multiple hosts or in multiple environments and want one corpus to verify against.

**Usage.**

```bash
chrysalis corpus-merge <traces-dir>... --out <merged-dir>
  [--on-duplicate error|skip]
  [--dedupe-trace-id off|skip]
  [--sample-modulo K --sample-remainder R]
  [--dry-run]
  [--json-out <file>]
```

**Important flags.**

| Flag | Effect |
| --- | --- |
| `--on-duplicate skip` | If two source trees both contain `2025-05-01/foo.ndjson`, the first one wins. Without this, identical filenames are an error. |
| `--dedupe-trace-id skip` | Even within different filenames, skip a trace if its `traceId` already appeared in an earlier source. |
| `--sample-modulo 8 --sample-remainder 0` | Keep only one out of every eight traces. Same `traceId` always falls in the same bucket, so this is a stable sample. |
| `--dry-run` | Print what would be copied without writing anything. |
| `--json-out <file>` | Write a machine summary JSON. CI gates can read this. |

**Example 1 — combine two host directories.**

```bash
$ node packages/cli/dist/bin.js corpus-merge captures/host-a captures/host-b --out captures/merged
[corpus-merge] copied 312 file(s) from 2 source(s) to /var/lib/chrysalis/captures/merged

$ node packages/cli/dist/bin.js corpus captures/merged
traces: 312
  GET /                         128
  GET /posts/:id                 84
  POST /comments                100
```

If both source directories happen to contain a file with the same `YYYY-MM-DD/<filename>.ndjson`, the run aborts with an error. Use `--on-duplicate skip` to take the first source.

**Example 2 — drop duplicate trace ids across sources.**

```bash
$ node packages/cli/dist/bin.js corpus-merge captures/host-a captures/host-b \
      --out captures/merged --dedupe-trace-id skip
[corpus-merge] copied 287 file(s); skipped 25 (duplicate trace ids)
```

**Example 3 — keep a stable 1-in-8 sample for fast smoke runs.**

```bash
$ node packages/cli/dist/bin.js corpus-merge captures \
      --out captures/sampled --sample-modulo 8 --sample-remainder 0
[corpus-merge] copied 41 file(s); skipped 271 (sample filter)
```

The same trace id always lands in the same bucket, so the sample is repeatable across runs.

**Example 4 — preview without writing anything.**

```bash
$ node packages/cli/dist/bin.js corpus-merge captures/host-a captures/host-b \
      --out captures/merged --dry-run
[corpus-merge] would copy 312 file(s)
[corpus-merge] dry-run: no files written
```

**Example 5 — capture a machine summary CI gates can read.**

```bash
$ node packages/cli/dist/bin.js corpus-merge captures/host-a captures/host-b \
      --out captures/merged --dedupe-trace-id skip \
      --json-out reports/corpus-merge.json
[corpus-merge] copied 287 file(s); skipped 25 (duplicate trace ids)
[corpus-merge] summary: /var/.../reports/corpus-merge.json

$ jq . reports/corpus-merge.json
{
  "kind": "chrysalis.corpus-merge.summary",
  "schemaVersion": 1,
  "toolVersion": "2.0.1",
  "options": { "outDir": "...", "onDuplicate": "error", "dedupeTraceId": "skip", ... },
  "sources": [{ "path": "...", "fileCount": 162 }, { "path": "...", "fileCount": 150 }],
  "counts": { "copied": 287, "skippedDuplicateName": 0, "skippedDuplicateTraceId": 25, "skippedSample": 0 }
}
```

`pnpm run ci:corpus-merge-summary -- reports/corpus-merge.json` validates the shape.

**Common errors.**

| Stderr | Fix |
| --- | --- |
| `error: --on-duplicate must be error or skip` | Pass one of those values. |
| `error: --sample-modulo requires an integer >= 1` | Use a positive integer. |
| `error: --sample-remainder must satisfy 0 <= r < sample-modulo` | Lower the remainder. |
| `[corpus-merge] duplicate file …` | Rerun with `--on-duplicate skip` or move the conflicting file. |

---

### `verify`

**What it does.** This is the heart of Chrysalis. It reads a trace corpus and replays every captured request against your running emitted app, in the order they were recorded. For each replay it compares the actual response against the captured response — status, headers, body — applying a small allowed list of normalizations (timestamps, session cookie values, UUIDs). It writes a per-route report and a `summary.json` to `--report`, and prints an overall correctness score.

When the capture recorded SELECT row payloads, verify can replay reads from a "tape" header so you do not need a live database. When you also pass `--project`, divergence reports include candidate IR node ids so you can navigate from a failure to the lowering decision that caused it.

**Usage.**

```bash
chrysalis verify <traces-dir> --base-url <url>
  [--report <dir>] [--threshold 0.9]
  [--json-summary]
  [--no-recorded-sql]
  [--only-route "METHOD /path"] [--only-trace-id <id>]
  [--shard-index I --shard-count K]
  [--project <php-root>]
  [--replay-concurrency N] [--disable-cookie-chain]
  [--replay-timeout-ms MS] [--replay-worker-threads]
```

**Important flags.**

| Flag | Use it when |
| --- | --- |
| `--threshold 0.95` | Set the bar for "passes". Default leaves the threshold open; CI usually sets `0.95` or `1.0`. |
| `--report <dir>` | Where to write `summary.json` and per-route files. Default is `reports/verify/`. |
| `--json-summary` | Print one machine-readable JSON object on stdout (with `kind: chrysalis.verify.summary`, `schemaVersion: 1`, `pass: bool`, etc.). Progress moves to stderr. |
| `--only-route "GET /posts/:id"` | Replay only one route. Speeds up debugging. |
| `--only-trace-id <id>` | Replay one specific captured trace. |
| `--no-recorded-sql` | Do not use the SQL tape replay even if traces include row payloads. Forces hits against your real database. |
| `--shard-index I --shard-count K` | Split a large corpus across processes. Each shard writes its own report; combine with `verify-merge`. |
| `--project <php-root>` | Re-run ingest before replay so divergence reports can attribute failures to IR nodes. |
| `--replay-concurrency 8` | Run several replays in parallel. Requires `--disable-cookie-chain` because each parallel worker has an isolated cookie jar. |
| `--replay-timeout-ms 5000` | Per-request timeout. |
| `--replay-worker-threads` | Push replay into Node worker threads. Useful when the bottleneck is decoding payloads. Requires concurrency > 1. |

**Example 1 — happy path.**

```bash
$ node packages/cli/dist/bin.js verify traces \
      --base-url http://127.0.0.1:3000 \
      --threshold 0.95 \
      --report reports/verify
[verify] loaded 42 traces from traces
[verify] replaying against http://127.0.0.1:3000 ...
[verify] wrote 4 report file(s) under reports/verify
[verify] summary: /var/www/legacy-blog/reports/verify/summary.json

aggregate correctness: 100.0%
frames passed:         126 / 126

per-endpoint:
  GET /                     100.0%   body≈1.00   (18/18)
  GET /posts/:id            100.0%   body≈1.00   (10/10)
  POST /comments            100.0%   body≈1.00   (14/14)
```

Exit `0`. The reports directory now has `summary.json` plus one file per route.

**Example 2 — a failure with attribution.**

```bash
$ node packages/cli/dist/bin.js verify traces \
      --base-url http://127.0.0.1:3000 --threshold 0.95 \
      --project /opt/legacy-app
[verify] loaded 42 traces from traces
[verify] IR divergence attribution enabled (--project /opt/legacy-app)
[verify] replaying against http://127.0.0.1:3000 ...
[verify] wrote 4 report file(s) under reports/verify
[verify] summary: /var/www/legacy-blog/reports/verify/summary.json

aggregate correctness: 95.2%
frames passed:         120 / 126

per-endpoint:
  GET /                     100.0%   body≈1.00   (18/18)
  GET /posts/:id            100.0%   body≈1.00   (10/10)
  POST /comments             85.7%   body≈0.92   (12/14)

[verify] stderr: failure diagnostics
[verify]   failed frames: 6
[verify]   divergence kinds (failed traces):
[verify]     body                   2
[verify]     header                 2
[verify]     status                 2
[verify]   next steps:
[verify]     · open summary: /var/.../reports/verify/summary.json
[verify]     · repair (example): chrysalis repair /var/.../traces --base-url http://127.0.0.1:3000 --project /opt/legacy-app

[verify] stderr: per-trace divergences
[verify]   POST /comments  trace=01-…  kinds=body
[verify]     IR nodes: web/Route/POST_comments, effect/INSERT_comments
[verify]     · body: expected "<a href=...>" — got "&lt;a href=...&gt;"
```

The `IR nodes:` line is the fastest signal: open the named handler (`generated/legacy-app/src/handlers/comments_create_post.ts`), look for the highlighted node id in a `// @chrysalis-provenance` comment, and inspect what was lowered.

**Example 3 — narrow run for a single failing trace.**

```bash
$ node packages/cli/dist/bin.js verify traces \
      --base-url http://127.0.0.1:3000 --threshold 0 \
      --only-trace-id 0193b3a4-1f60-7a4b-8d92-a5d8c7e9b401 \
      --project /opt/legacy-app
```

Useful while iterating — re-run after each fix without waiting for the whole corpus.

**Example 4 — sharded across machines.**

Worker 0 and worker 1 in parallel:

```bash
$ node packages/cli/dist/bin.js verify traces --base-url http://staging:3000 \
      --shard-index 0 --shard-count 2 --report reports/verify-0
$ node packages/cli/dist/bin.js verify traces --base-url http://staging:3000 \
      --shard-index 1 --shard-count 2 --report reports/verify-1
```

Then on the coordinator:

```bash
$ node packages/cli/dist/bin.js verify-merge \
      reports/verify-0/summary.json reports/verify-1/summary.json --json-out > merged.json
```

**Example 5 — concurrent replay for speed.**

```bash
$ node packages/cli/dist/bin.js verify traces --base-url http://127.0.0.1:3000 \
      --replay-concurrency 8 --disable-cookie-chain --replay-timeout-ms 5000
[verify] replay options: concurrency=8 cookieChain=off timeoutMs=5000
```

Cookie chains are disabled because each parallel worker has an isolated cookie jar.

**Example 6 — JSON summary for CI.**

```bash
$ node packages/cli/dist/bin.js verify traces --base-url http://127.0.0.1:3000 \
      --threshold 0.95 --json-summary
{"kind":"chrysalis.verify.summary","schemaVersion":1,"toolVersion":"2.0.1",...,"pass":true}
```

The progress lines move to stderr; stdout has exactly one JSON object.

**Files written.**

- `<report-dir>/summary.json` — aggregate and per-route correctness
- `<report-dir>/<route>.json` — per-route detail with each trace's outcome

**Exit codes.**

| Code | Meaning |
| --- | --- |
| `0` | Aggregate correctness met `--threshold`. |
| `1` | Replay completed but the score is below the threshold. |
| `2` | Usage error (bad flag, no traces matched the filter, missing file). |

**Common errors.**

| Stderr | Fix |
| --- | --- |
| `[verify] replayCorpus: no traces matched filter` | Loosen `--only-route` / `--only-trace-id`; check the trace dir. |
| `error: --replay-concurrency requires --disable-cookie-chain` | Add `--disable-cookie-chain`. |
| `error: --replay-worker-threads requires --replay-concurrency >= 2` | Bump concurrency. |

**Reading divergences.** When something fails, `verify` prints a per-trace breakdown on stderr: trace id, divergence kinds (`status`, `header`, `body`, `redirect`, …), and (with `--project`) candidate IR node ids. Take that information into either `chrysalis repair` or a hand-investigation of the lowering pass that produced those nodes.

---

### `verify-merge`

**What it does.** Combines per-shard `summary.json` files into one merged correctness report. Use it after running multiple `verify --shard-index … --shard-count …` jobs in parallel.

**Usage.**

```bash
chrysalis verify-merge <summary.json>... [--shard-count K] [--json-out]
```

Without `--json-out`, prints the merged correctness report as pretty JSON. With `--json-out`, prints one envelope object (`kind: chrysalis.verify.summary.merged`) for CI.

`--shard-count` only matters when the actual number of input files differs from the original fan-out (for example, an empty shard wrote no report).

**Example 1 — pretty merged report.**

```bash
$ node packages/cli/dist/bin.js verify-merge \
      reports/verify-0/summary.json reports/verify-1/summary.json
{
  "aggregate": { "framesPassed": 248, "framesTotal": 250, "correctness": 0.992 },
  "endpoints": [
    { "route": "GET /",            "framesPassed": 36, "framesTotal": 36, ... },
    { "route": "POST /comments",   "framesPassed": 26, "framesTotal": 28, ... }
  ]
}
```

**Example 2 — CI-friendly envelope.**

```bash
$ node packages/cli/dist/bin.js verify-merge \
      reports/verify-0/summary.json reports/verify-1/summary.json --json-out \
      > reports/verify/merged.json
$ pnpm run ci:verify-merged -- reports/verify/merged.json
[ci:verify-merged] aggregate correctness 0.992 ≥ floor 0.95 — pass
```

**Example 3 — one shard wrote no report.**

```bash
$ node packages/cli/dist/bin.js verify-merge reports/verify-0/summary.json \
      reports/verify-2/summary.json --shard-count 3
```

The explicit `--shard-count 3` tells the merger that the original fan-out was three even though only two summaries are present.

**Common errors.**

| Stderr | Fix |
| --- | --- |
| `[verify-merge] missing file: …` | Path is wrong or the shard never finished. |
| `[verify-merge] invalid summary shape (expected CorrectnessReport)` | One of the inputs is not a verify summary. |
| `[verify-merge] error: --shard-count must be a finite integer >= 1` | Pass a positive integer. |

---

### `status`

**What it does.** Prints a one-page migration dashboard built from files on disk:

- Trace corpus size and route count (from `--traces`)
- Verify correctness (from `--report`)
- Shadow-mode diff stats (from `--shadow`)
- Domain coverage (from `--schema`)
- Residual-legacy / hole counts (from `--project`, which re-runs ingest in-process)

Nothing is sent over the network. With `--project`, `status` also writes `reports/oracle-footprint.json`: a per-route summary of the side effects a replay would care about (DB reads/writes, sessions, time, randomness, outbound HTTP).

**Usage.**

```bash
chrysalis status
  [--traces <dir>] [--report <dir>] [--shadow <dir>]
  [--schema <schema.sql>]
  [--project <php-root>] [--migration-reports <dir>]
  [--json]
  [--parser-provider glayzzle|nikic]
  [--ingest-cache <dir>]
  [--shard-index I --shard-count K] [--merge-all-shards --shard-count K]
  [--ingest-progress-file <path>]
  [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint]
  [--ingest-dedupe-structural-subgraphs]
```

**Defaults when flags are omitted.**

| Flag | Default |
| --- | --- |
| `--traces` | `traces` |
| `--report` | `reports/verify` |
| `--shadow` | `reports/shadow` |
| `--migration-reports` | `reports/migration` |

**Example 1 — first migration dashboard.**

```bash
$ node packages/cli/dist/bin.js status \
      --project /opt/legacy-app \
      --traces traces --report reports/verify --schema /opt/legacy-app/db/schema.sql

== Chrysalis status ==

corpus
  traces:       312
  routes:       148
  side effects: http.outbound=14 mail.send=2

correctness
  aggregate:    99.2%   (248/250 frames)
  worst route:  POST /comments   85.7%

residual legacy
  holes:        21      (3 auth-tagged)
  top reasons:  legacy:include-cycle (8), legacy:eval (5), legacy:dynamic-property-write (3)

oracle footprint
  routes:                 148
  with wall-clock:        12
  with entropy:           4
  with session writes:    36
  with outbound HTTP:     7
  with mail send:         2
  with cache writes:      18
  hydration index:        0.62
```

**Example 2 — JSON for CI.**

```bash
$ node packages/cli/dist/bin.js status --project /opt/legacy-app \
      --traces traces --report reports/verify --schema /opt/legacy-app/db/schema.sql \
      --json > reports/migration/status.json

$ jq '.migration.correctness, .residualLegacy.holeCount' reports/migration/status.json
0.992
21
```

Useful keys in the JSON:

- `corpus.traces`, `corpus.routes`
- `correctness.aggregate`, `correctness.byRoute[]`
- `shadow.requests`, `shadow.diverged`
- `residualLegacy.holeCount`, `residualLegacy.topHoleReasons`
- `migration.coverage`, `migration.idiomaticity`, `migration.residualLegacyRequestPct`
- `oracleFootprint.routes[]` (with `--project`)
- `ingestSharding` — `monolithic`, `routeShard`, or `mergedShards`

**Example 3 — sharded status that still produces a single report.**

Run a single-shard pass for a quick check:

```bash
$ node packages/cli/dist/bin.js status --project /opt/legacy-app --shard-index 0 --shard-count 4
[status] shard 0/4 (partial route set for migration metrics)
```

Or merge all shards for the full picture:

```bash
$ node packages/cli/dist/bin.js status --project /opt/legacy-app \
      --merge-all-shards --shard-count 4 --json > reports/migration/status.json
[status] merge-all-shards: 4 shard ingests -> mergeWebIrModules
```

**Common errors.**

| Stderr | Fix |
| --- | --- |
| `error: --ingest-progress-file requires --project for status` | Add `--project`. |
| `error: --shard-count must be a finite integer >= 2` | Pass a positive integer. |
| Empty corpus / correctness fields | The relevant directory does not exist yet — run `observe` or `verify` first. |

---

### `insight`

**What it does.** Static analyzer over the IR. Flags known legacy patterns:

- `raw-sql-concat` — SQL built from non-literal expressions (a structural SQL-injection risk).
- `unescaped-output` — `echo` of user input through no recognized sanitizer.
- `n-plus-one-queries` — A loop body that issues one DB read per iteration.
- `scattered-validation` — One request field touched by several distinct guards (`isset`, `empty`, `intval`, `preg_match`, …).
- `string-dispatch` — An `if/elseif` ladder comparing a single field against literal strings.

Each finding has a `confidence` score. A pure IR check is capped at `0.8`; the runner raises that toward `1.0` when traces confirm the pattern (the loop actually fired N times per request, the input actually contained an attack-shaped value, etc.). `severity` groups findings into `info`, `suggestion`, and `strong`.

**Usage.**

```bash
chrysalis insight <php-project-dir>
  [--traces <dir>]
  [--out <report.json>]
  [--only raw-sql-concat,unescaped-output,n-plus-one-queries,scattered-validation,string-dispatch]
  [--json] [--strict]
  [--ingest-cache <dir>] [--ingest-progress-file <path>]
  [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint]
  [--ingest-dedupe-structural-subgraphs]
  [--parser-provider glayzzle|nikic]
```

`--strict` makes any opportunity a non-zero exit. Useful as a CI gate on a clean repo.

**Example 1 — list everything found in a small project.**

```bash
$ node packages/cli/dist/bin.js insight fixtures/tiny-blog --traces traces
[insight] analyzing fixtures/tiny-blog
[insight] opportunities: 4

  [strong]   raw-sql-concat        confidence=0.93   POST /comments
    └─ comments_create_post.php:42  query("…WHERE id=" . $id)

  [strong]   unescaped-output      confidence=0.91   GET /posts/:id
    └─ posts_show.php:18  echo $post["body"]

  [suggest]  n-plus-one-queries    confidence=0.78   GET /
    └─ posts_index.php:8  foreach($posts as $p) { … }

  [info]     scattered-validation  confidence=0.66   POST /comments
    └─ field 'body' tested by isset, !empty, strlen
```

**Example 2 — JSON for a CI gate.**

```bash
$ node packages/cli/dist/bin.js insight /opt/legacy-app \
      --traces traces --out reports/insight/main.json --json
{"kind":"chrysalis.insight.report","schemaVersion":1,"opportunityCount":42,...}

$ pnpm run ci:insight
[ci:insight] strong=4 suggestion=18 info=20
```

**Example 3 — only check one recognizer.**

```bash
$ node packages/cli/dist/bin.js insight /opt/legacy-app --traces traces \
      --only raw-sql-concat --strict
[insight] strict mode: 2 opportunities -> exit 1
```

Exit code is `1`, perfect for a pre-push hook.

**Common errors.**

| Stderr | Fix |
| --- | --- |
| `error: --only requires a comma-separated list of recognizer ids` | Pass at least one valid id. |
| `error: --strict cannot be combined with --json` | Pick one. |

`insight` only detects. It does not change your code. The matching rewrites live in `chrysalis rewrite`.

---

### `rewrite`

**What it does.** Applies graph transforms tied to insight findings. Each pass is gated by a confidence threshold (default `0.75`) and by a per-pass invariant check that rolls back any edit that touched a node the pass did not declare it would touch. Optionally re-emits TypeScript and re-runs verify against the new code.

Available passes (by id):

| Pass | Fixes finding | What it does |
| --- | --- | --- |
| `sanitize-output` | `unescaped-output` | Wraps tainted echo leaves in `htmlspecialchars`; for templated HTML, flips `escape: false` to `true`. Requires corpus confirmation. |
| `parameterize-sql` | `raw-sql-concat` | Rewrites `db.query` to use `?`-placeholders and bound parameters. Requires corpus confirmation. |
| `boundary-zod` | `scattered-validation` | Prepends a single normalized parse at the top of the handler and rewires every read of that field. Emits a small Zod-style helper (no npm `zod` dependency). |
| `dispatch-union-zod` | `string-dispatch` | Same idea for an `if/elseif` discriminator: one normalized parse, one canonical value flowing through the chain. |
| `batch-n1-read` | `n-plus-one-queries` | Replaces `foreach ($rows as $r) { … query(…where id=$r->id…) }` with a single `WHERE id IN (…)` plus a lookup map. Requires corpus confirmation. |

**Usage.**

```bash
chrysalis rewrite <php-project-dir>
  [--out <ts-out>] [--target=hono|fastify]
  [--traces <dir>]
  [--min-confidence 0.75]
  [--passes sanitize-output,parameterize-sql,boundary-zod,dispatch-union-zod,batch-n1-read]
  [--report <rewrite.json>]
  [--no-post-verify] [--verify-behavior]
  [--http-replay <traces-dir>] [--http-replay-backends=hono,fastify] [--http-replay-skip-install]
  [--ingest-cache <dir>]
  [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint]
  [--ingest-dedupe-structural-subgraphs]
  [--parser-provider glayzzle|nikic]
  [--json]
```

**Important flags.**

| Flag | Effect |
| --- | --- |
| `--passes a,b,c` | Restrict to named passes. |
| `--min-confidence 0.9` | Only apply opportunities at or above this confidence. |
| `--no-post-verify` | Skip the per-pass post-verify gate (useful for inspecting why something was rolled back). |
| `--verify-behavior` | Run the in-process IR simulator before and after each pass and roll back if response shape changes in a way no pass declared. |
| `--http-replay <traces-dir>` | After all passes, emit and replay an HTTP corpus against the rewritten module. Requires `--out`. |
| `--http-replay-backends=hono,fastify` | Replay against both backends; both must pass. |

**Example 1 — apply all matched passes, re-emit, post-verify.**

```bash
$ node packages/cli/dist/bin.js rewrite fixtures/tiny-blog \
      --out generated/tiny-blog \
      --traces traces \
      --report reports/rewrite/tiny-blog.json
[rewrite] insight opportunities: 4
[rewrite] applying pass: parameterize-sql      (confidence floor 0.75)
[rewrite]   ✓ POST /comments  (1 edit)
[rewrite] applying pass: sanitize-output
[rewrite]   ✓ GET /posts/:id  (1 edit)
[rewrite] applying pass: boundary-zod
[rewrite]   ✓ POST /comments  (1 edit)
[rewrite] applying pass: batch-n1-read
[rewrite]   ✓ GET /            (1 edit)
[rewrite] post-verify: 4/4 passes survive invariants
[rewrite] re-emit -> generated/tiny-blog
[rewrite] report  -> reports/rewrite/tiny-blog.json
```

**Example 2 — preview without writing TypeScript.**

```bash
$ node packages/cli/dist/bin.js rewrite fixtures/tiny-blog --report reports/rewrite/dry.json
[rewrite] applying pass: parameterize-sql ...
[rewrite] no --out given; module changes are not persisted
```

You still get the JSON report so you can review what would have changed.

**Example 3 — only one pass, higher confidence floor.**

```bash
$ node packages/cli/dist/bin.js rewrite /opt/legacy-app \
      --out generated/legacy-app --traces traces \
      --passes parameterize-sql --min-confidence 0.9 \
      --report reports/rewrite/sql.json
```

Useful for landing one safe change at a time.

**Example 4 — replay against both backends after rewriting.**

```bash
$ node packages/cli/dist/bin.js rewrite /opt/legacy-app \
      --out generated/legacy-app --traces traces \
      --http-replay traces --http-replay-backends=hono,fastify \
      --report reports/rewrite/legacy-app.json
[rewrite] http-replay: hono     correctness 1.000 (250/250)
[rewrite] http-replay: fastify  correctness 1.000 (250/250)
```

If either backend disagrees with the captured corpus, the run fails and the JSON report explains which pass to revert.

**Common errors.**

| Stderr | Fix |
| --- | --- |
| `error: --http-replay requires --out` | Add `--out`. |
| `[rewrite] post-verify rolled back pass: …` | A pass touched a node it did not declare; rerun with `--no-post-verify` to inspect. |

---

### `repair`

**What it does.** A loop: replay the corpus against the running emitted app; if anything fails, ask a *proposer* for a small list of IR edits; apply them; replay the entire corpus again; keep them only if everything passes; stop after `--max-iter`. The default proposer is a stub that abstains. With `--llm` and `CHRYSALIS_REPAIR_LLM_API_KEY`, repair uses an OpenAI-compatible chat endpoint to suggest validated `replaceOperand` edits. With `--hole-patch <file.json>` you supply a hand-crafted hole closure (a typed replacement subgraph and a sign-off block) and the loop verifies it.

Repair always replays the **entire** corpus. It does not accept `--shard-*` or `--only-*` filters.

**Usage.**

```bash
chrysalis repair <traces-dir> --base-url <url> --project <php-root>
  [--llm] [--repair-verbose]
  [--hole-patch <file.json>]
  [--write-module <webir.json>]
  [--max-iter 5]
  [--endpoint "METHOD /path"]
  [--no-recorded-sql]
  [--ingest-cache <dir>]
  [--ingest-progress-file <path>]
  [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint]
  [--ingest-dedupe-structural-subgraphs]
  [--parser-provider glayzzle|nikic]
  [--replay-concurrency N] [--disable-cookie-chain]
  [--replay-timeout-ms MS] [--replay-worker-threads]
```

**Example 1 — dry-run without an LLM (the stub proposer abstains).**

```bash
$ node packages/cli/dist/bin.js repair traces \
      --base-url http://127.0.0.1:3000 --project /opt/legacy-app
[repair] iteration 1: 6 failed frames
[repair] proposer: stub (no candidates)
[repair] no proposed edits; stopping
```

Use this to confirm the verify problem reproduces deterministically before turning anything else on.

**Example 2 — LLM-assisted repair loop.**

```bash
$ export CHRYSALIS_REPAIR_LLM_API_KEY=sk-...
$ export CHRYSALIS_REPAIR_LLM_BASE_URL=https://api.openai.com
$ export CHRYSALIS_REPAIR_LLM_MODEL=gpt-4o-mini

$ node packages/cli/dist/bin.js repair traces \
      --base-url http://127.0.0.1:3000 \
      --project /opt/legacy-app \
      --llm --repair-verbose --max-iter 3 \
      --write-module reports/repair/last-good.webir.json
[repair] iteration 1: 6 failed frames
[repair] proposer: llm (gpt-4o-mini)
[repair]   candidate 1: replaceOperand(node:effect/INSERT_comments.body, htmlspecialchars($body))
[repair]   candidate 2: replaceOperand(node:web/Route.POST_comments.csrf, parseSignedToken(...))
[repair] applying 2 edit(s)
[repair] iteration 2: 0 failed frames
[repair] success after 2 iteration(s)
[repair] wrote reports/repair/last-good.webir.json
```

**Example 3 — apply a hand-crafted hole closure.**

```bash
$ cat patches/legacy_include_cycle.json
{
  "kind": "chrysalis.hole-patch",
  "schemaVersion": 1,
  "holeId": "hole/legacy-include-cycle/8b1f",
  "replacement": { ... typed subgraph ... },
  "signoff": { "author": "alice", "rationale": "include cycle is a config-only branch" }
}

$ node packages/cli/dist/bin.js repair traces \
      --base-url http://127.0.0.1:3000 --project /opt/legacy-app \
      --hole-patch patches/legacy_include_cycle.json
[repair] applied hole patch hole/legacy-include-cycle/8b1f
[repair] iteration 1: 0 failed frames
[repair] success after 0 iteration(s)
```

**Example 4 — narrow scope to one route.**

```bash
$ node packages/cli/dist/bin.js repair traces \
      --base-url http://127.0.0.1:3000 --project /opt/legacy-app \
      --endpoint "POST /comments" --llm --max-iter 5
```

The replay still runs across the whole corpus, but proposed edits must not regress any other route.

**Common errors.**

| Stderr | Fix |
| --- | --- |
| `[repair] error: --llm requires CHRYSALIS_REPAIR_LLM_API_KEY` | Set the env var. |
| `[repair] proposer threw: 401` | Bad API key or wrong `--base-url`. |
| `[repair] candidate rejected (post-verify regression on GET /)` | The model proposed something that breaks another route; loop continues. |

---

### `deploy`

**What it does.** Starts the dual-stack HTTP router (Chimera). One process listens on a port and forwards each request to either your legacy PHP base URL or your modern Node base URL.

Modes:

| Mode | Behavior |
| --- | --- |
| `legacy` | Every request goes to PHP. Baseline. |
| `cutover` | Requests matching a rule with `target: "modern"` go to Node. Everything else to PHP. |
| `shadow` | Every request goes to PHP and the response is returned to the client. The same request is mirrored to Node in the background; the two responses are diffed and divergences appended to `<shadow-log-dir>/shadow.ndjson`. The client never sees the modern response. |
| `canary` | Like `cutover`, but among requests that *would* go to Node, only a configured percentage actually do. The decision is sticky per user (cookie / header / IP) so the same user always lands on the same stack. |

Routing rules are described in JSON:

```json
{
  "kind": "chrysalis.chimera.config",
  "schemaVersion": 1,
  "mode": "cutover",
  "legacy": "http://127.0.0.1:18080",
  "modern": "http://127.0.0.1:3000",
  "rules": [
    { "match": "GET /api/*", "target": "modern" },
    { "match": "/health",   "target": "modern" }
  ],
  "canary": { "percentModern": 10, "salt": "prod-cluster-a", "stickinessCookie": "chrysalis_sid" }
}
```

The CLI accepts that file via `--config`, or fetches the same JSON from `--config-url`. Optional HMAC signing is described in [Operations](./OPERATIONS.md). On Linux you can reload the config without restarting by sending `SIGHUP` or `SIGUSR2`.

**Usage.**

```bash
chrysalis deploy --mode=<legacy|cutover|shadow|canary>
  --legacy <url> --modern <url>
  [--port 8080] [--host 127.0.0.1]
  [--config chimera.json] [--config-url <url>]
  [--config-hmac-secret <str>] [--config-hmac-keys-json <json>]
  [--operator-metrics-json <path>] [--operator-metrics-ndjson <path>]
  [--operator-metrics-interval-ms <n>]
  [--shadow-log-dir reports/shadow]
  [--canary-percent 0-100] [--canary-salt <str>]
  [--canary-cookie <name>] [--canary-header <name>]
```

**Example 1 — pure legacy passthrough (sanity check).**

```bash
$ node packages/cli/dist/bin.js deploy --mode=legacy \
      --legacy http://127.0.0.1:18080 --port 8080
[deploy] mode=legacy
[deploy] legacy:  http://127.0.0.1:18080
[deploy] listen:  http://127.0.0.1:8080

$ curl -s -i http://127.0.0.1:8080/posts/1 | grep -i x-chrysalis
x-chrysalis-target: legacy
```

Useful as a smoke test that the proxy itself is up before you change modes.

**Example 2 — shadow mode (clients still see PHP).**

```bash
$ node packages/cli/dist/bin.js deploy --mode=shadow \
      --legacy http://127.0.0.1:18080 \
      --modern http://127.0.0.1:3000 \
      --port 8080 --shadow-log-dir reports/shadow
[deploy] mode=shadow
[deploy] legacy:  http://127.0.0.1:18080
[deploy] modern:  http://127.0.0.1:3000
[deploy] shadow log dir: /var/.../reports/shadow

$ curl -s http://127.0.0.1:8080/posts/1 > /dev/null
$ tail -1 reports/shadow/shadow.ndjson
{"requestId":"…","method":"GET","path":"/posts/1","divergences":[]}
```

A non-empty `divergences` array means the modern stack disagreed with PHP — drive enough traffic before you trust the comparison.

**Example 3 — cutover from a config file with hot reload.**

```bash
$ cat chimera.json
{
  "kind": "chrysalis.chimera.config",
  "schemaVersion": 1,
  "mode": "cutover",
  "legacy": "http://127.0.0.1:18080",
  "modern": "http://127.0.0.1:3000",
  "rules": [
    { "match": "GET /api/*", "target": "modern" },
    { "match": "/health",     "target": "modern" }
  ]
}

$ node packages/cli/dist/bin.js deploy --config chimera.json --port 8080
[deploy] mode=cutover (from /var/.../chimera.json)
[deploy] rules: 2

$ curl -s -i http://127.0.0.1:8080/api/users | grep -i x-chrysalis
x-chrysalis-target: modern

# Edit chimera.json, then:
$ kill -HUP $(pidof node)
[deploy] reload: applied chimera.json (3 rules)
```

`SIGUSR2` works the same way and is friendlier inside containers.

**Example 4 — canary with stickiness.**

```bash
$ node packages/cli/dist/bin.js deploy --mode=canary \
      --legacy http://127.0.0.1:18080 \
      --modern http://127.0.0.1:3000 \
      --port 8080 --canary-percent 5 \
      --canary-cookie chrysalis_sid --canary-salt prod-east

$ for i in 1 2 3; do
    curl -s -i -b 'chrysalis_sid=user-42' http://127.0.0.1:8080/posts/1 | grep -i x-chrysalis
  done
x-chrysalis-target: modern
x-chrysalis-canary: in
x-chrysalis-target: modern
x-chrysalis-canary: in
x-chrysalis-target: modern
x-chrysalis-canary: in
```

Same user → same stack on every request.

**Example 5 — operator metrics for ops dashboards.**

```bash
$ node packages/cli/dist/bin.js deploy --mode=cutover --config chimera.json \
      --operator-metrics-json /var/lib/chrysalis/metrics.json \
      --operator-metrics-ndjson /var/lib/chrysalis/metrics.ndjson \
      --operator-metrics-interval-ms 5000
$ jq . /var/lib/chrysalis/metrics.json
{
  "kind": "chrysalis.deploy.operator-metrics",
  "schemaVersion": 1,
  "uptimeSeconds": 132,
  "byTarget": { "legacy": 412, "modern": 1188 },
  "byStatusClass": { "2xx": 1573, "4xx": 18, "5xx": 9 }
}
```

The router responds with a small set of debug headers on every request:

- `x-chrysalis-target: legacy | modern | legacy-shadow`
- `x-chrysalis-canary: in | out | n/a` (in canary mode)

**Common errors.**

| Stderr | Fix |
| --- | --- |
| `[deploy] error: --canary-percent must be between 0 and 100` | Use `0..100`. |
| `[deploy] config-url fetch failed: 401` | Add `--config-hmac-secret` or fix the URL. |
| `[deploy] reload rejected: bad signature` | The HMAC over the new config does not match. |
| `EADDRINUSE` | The port is already taken. |

---

### `license`

**What it does.** Some vendor distributions of Chrysalis enforce a commercial license. When `CHRYSALIS_REQUIRE_LICENSE=1`, every command except `init` and `license` requires a valid local Ed25519-signed license envelope and matching public key. There is no network call: verification reads `CHRYSALIS_LICENSE` (or `CHRYSALIS_LICENSE_PATH`) and `CHRYSALIS_LICENSE_PUBLIC_KEY` (or `CHRYSALIS_LICENSE_PUBLIC_KEY_PATH`).

**Usage.**

```bash
chrysalis license check     # validate; print "license ok."
chrysalis license print     # validate, then print claims (sub, tier, exp, iss, features)
```

**Example 1 — quick check.**

```bash
$ export CHRYSALIS_LICENSE_PATH=/etc/chrysalis/license.txt
$ export CHRYSALIS_LICENSE_PUBLIC_KEY_PATH=/etc/chrysalis/issuer.pub
$ node packages/cli/dist/bin.js license check
license ok.
```

Exit `0`. Drop these two env vars into the systemd unit or container env so subsequent commands inherit them.

**Example 2 — print the claims.**

```bash
$ node packages/cli/dist/bin.js license print
{
  "sub":      "acme-corp",
  "tier":     "team",
  "iss":      "chrysalis-issuer",
  "exp":      "2027-01-01T00:00:00.000Z",
  "features": ["repair-llm", "operator-metrics"]
}
license ok.
```

**Example 3 — gate is required but not satisfied.**

```bash
$ CHRYSALIS_REQUIRE_LICENSE=1 node packages/cli/dist/bin.js verify traces ...
[chrysalis] license required (CHRYSALIS_REQUIRE_LICENSE=1) but no envelope found
[chrysalis] set CHRYSALIS_LICENSE / CHRYSALIS_LICENSE_PATH and the matching public key
```

Exit `2`. Set the two env vars and rerun.

In the open-source workspace the gate is off by default. See [`docs/COMMERCIAL.md`](./COMMERCIAL.md) for tier semantics.

---

## Recipes

### Translate one specific PHP file

`emit` works on whole projects, not single files. To prototype on a slice, write a small `chrysalis.routes.json` listing only the route(s) you care about and point `emit` at that directory.

### Replay only one route while debugging

```bash
node packages/cli/dist/bin.js verify traces \
    --base-url http://127.0.0.1:3000 \
    --only-route "POST /comments" --report /tmp/single
```

### Get a machine summary you can pipe to jq

```bash
node packages/cli/dist/bin.js verify traces \
    --base-url http://127.0.0.1:3000 \
    --json-summary | jq '{pass, aggregate: .aggregate.correctness, fails: .failedFrameCount}'
```

### Capture once, replay across both backends

```bash
node packages/cli/dist/bin.js emit /path/to/app --out generated/app-hono   --target=hono
node packages/cli/dist/bin.js emit /path/to/app --out generated/app-fastify --target=fastify

# In two terminals: cd into each, npm install, npm start (different ports).

node packages/cli/dist/bin.js verify traces --base-url http://127.0.0.1:3000 --report reports/verify/hono
node packages/cli/dist/bin.js verify traces --base-url http://127.0.0.1:3001 --report reports/verify/fastify
```

The two reports should be identical. A divergence between backends always means an emit bug, not a behavior change.

### Run the new app and the old app behind one URL

```bash
# Old app on 18080, new app on 3000.
node packages/cli/dist/bin.js deploy \
    --mode=canary --canary-percent 10 \
    --legacy http://127.0.0.1:18080 \
    --modern http://127.0.0.1:3000 \
    --port 80
```

### Share sessions between PHP and Node during cutover

Set `CHRYSALIS_SESSION_REDIS_URL=redis://...` on **both** the PHP host (with the phpredis extension) and the emitted Node app, and use the same cookie name (`CHRYSALIS_SESSION_COOKIE`, default `chrysalis_sid`). PHP code calls `Chrysalis\Oracle\Session\RedisChrysalisSessionHandler::registerFromEnv()` once before `session_start()`. Both stacks then read and write the same session object.

### Resume a crashed huge-project ingest

```bash
node packages/cli/dist/bin.js ingest /path/to/huge-app \
    --ingest-cache .chrysalis/ast-cache \
    --ingest-checkpoint-file .chrysalis/ingest.ckpt \
    --ingest-resume-checkpoint
```

The first run builds the cache and the checkpoint. After a crash, re-running the same command picks up where it stopped.

### Run ingest in parallel across machines

On machine 0:

```bash
node packages/cli/dist/bin.js ingest /path/to/huge-app --shard-index 0 --shard-count 4
```

On machine 1, 2, 3: replace `--shard-index 0` with `1`, `2`, `3`. Then on a coordinating box:

```bash
node packages/cli/dist/bin.js ingest /path/to/huge-app --merge-all-shards --shard-count 4
```

`emit` and `status` accept the same flags.

### Sample a 1/8 corpus for quick smoke tests

```bash
node packages/cli/dist/bin.js corpus-merge captures \
    --out captures/sampled --sample-modulo 8 --sample-remainder 0
```

---

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| `error: --merge-all-shards requires --shard-count <int>` | You passed `--merge-all-shards` without telling Chrysalis how many shards. | Add `--shard-count K`. |
| `error: --emit-shared-runtime-imports cannot be combined with --emit-handler-import-barrel` | Both flags want to own the runtime import surface. | Pick one; barrel and SRI module are not combinable. |
| `error: --ingest-progress-file cannot be used with --merge-all-shards` | All shards would write to the same path. | Pass distinct paths to each shard's run, then merge. |
| `[chrysalis] CHRYSALIS_REQUIRE_LICENSE` errors | The vendor build requires a license but none is configured. | Set `CHRYSALIS_LICENSE` and `CHRYSALIS_LICENSE_PUBLIC_KEY` (or the `_PATH` variants). |
| `verify` says aggregate `0` but each route shows `1.0` | Cookie chain is dropping responses because the test ID system in your traces does not match emit. | Re-run `verify --disable-cookie-chain` to confirm. |
| `verify` aggregate is `1.0` but you suspect drift | The replay normalization may be masking a real change. Inspect the per-route file under `<report-dir>` — every applied normalization is recorded on each outcome. |
| Emitted app reports `__hole(...)` at run time | A request hit a feature Chrysalis did not lower. | Search `chrysalis.holes.json` for the reason; either close the hole with `repair --hole-patch`, register a constructor with `registerPhpFqnCtor` (in `src/index.ts`), or run the legacy stack via the dual-stack router. |
| `nikic` parser tests fail or skip | `php` is not on `PATH`, or the parser-bridge `vendor/` is not installed. | Install PHP 8.x; run `pnpm run vendor:parser-bridge`. |

For environment-variable level configuration of the emitted app and CI gates, continue with [Administration](./ADMINISTRATION.md). For long-lived production posture (load balancers, multi-host sessions, signed routing config), continue with [Operations](./OPERATIONS.md).
