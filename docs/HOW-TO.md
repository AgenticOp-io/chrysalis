# How-To: end-to-end scenarios

This is the cookbook. Every section here is a complete, copy-pasteable scenario. Pick the one closest to what you are trying to do and follow it from top to bottom. Each scenario lists:

- **Goal** — what you walk away with.
- **You need** — the prerequisites.
- **Steps** — the commands to run, in order, with the output you should see.
- **What to do if it does not work** — short triage.
- **Where to go next.** (Scenario 24 is the GCE smoke VM.)

If the command reference is what you want instead, see [USER-GUIDE.md](./USER-GUIDE.md). If you are running Chrysalis in production, [OPERATIONS.md](./OPERATIONS.md) has the runbooks.

In every example below, replace `chrysalis` with `node packages/cli/dist/bin.js` if you are running from a source checkout (the docs use the short form for readability). The same commands work through the **Python** and **Go** shims described in [scenario 23](#23-run-chrysalis-from-python-or-go-same-node-cli) and [Installation](./INSTALLATION.md#optional-python-and-go-entrypoints-same-cli) (**DESIGN D295**).

---

## Contents

1. [First-time setup on a developer laptop](#1-first-time-setup-on-a-developer-laptop)
2. [Translate a small PHP project for the first time](#2-translate-a-small-php-project-for-the-first-time)
3. [Capture local traffic safely](#3-capture-local-traffic-safely)
4. [Capture production traffic without changing the user experience](#4-capture-production-traffic-without-changing-the-user-experience)
5. [Combine traces from many hosts into one corpus](#5-combine-traces-from-many-hosts-into-one-corpus)
6. [Verify that the new app behaves like the old one](#6-verify-that-the-new-app-behaves-like-the-old-one)
7. [Triage a verify failure](#7-triage-a-verify-failure)
8. [Use repair to close a behavior gap](#8-use-repair-to-close-a-behavior-gap)
9. [Close a hole by hand](#9-close-a-hole-by-hand)
10. [Find and fix N+1 queries](#10-find-and-fix-n1-queries)
11. [Find and fix raw SQL concatenation](#11-find-and-fix-raw-sql-concatenation)
12. [Add CI gates to your repository](#12-add-ci-gates-to-your-repository)
13. [Run shadow mode in staging or production](#13-run-shadow-mode-in-staging-or-production)
14. [Roll out a 5% canary, then 25%, then 100%](#14-roll-out-a-5-canary-then-25-then-100)
15. [Cut over a single endpoint](#15-cut-over-a-single-endpoint)
16. [Roll back the canary](#16-roll-back-the-canary)
17. [Share sessions between PHP and Node during the transition](#17-share-sessions-between-php-and-node-during-the-transition)
18. [Ingest a million-line monorepo across machines](#18-ingest-a-million-line-monorepo-across-machines)
19. [Resume a crashed long-running run](#19-resume-a-crashed-long-running-run)
20. [Keep the trace corpus from growing forever](#20-keep-the-trace-corpus-from-growing-forever)
21. [Upgrade Chrysalis](#21-upgrade-chrysalis)
22. [Operate behind a strict commercial license](#22-operate-behind-a-strict-commercial-license)
23. [Run Chrysalis from Python or Go (same Node CLI)](#23-run-chrysalis-from-python-or-go-same-node-cli)
24. [Provision a cheap GCE VM and smoke-test the repo](#24-provision-a-cheap-gce-vm-and-smoke-test-the-repo)

---

## 1. First-time setup on a developer laptop

**Goal.** A working `chrysalis` binary, ready to translate a project.

**You need.** Node.js 20+, pnpm 9+, git. If you want to capture or verify against PHP, also: PHP 8.x with `pdo_sqlite` or your real DB driver, and Composer (or let the parser bridge bootstrap one).

**Steps.**

```bash
$ git clone https://github.com/your-org/chrysalis.git
$ cd chrysalis
$ pnpm install
... (a few hundred MB of node_modules)
$ pnpm -r build
... (TypeScript build for every package)
$ node packages/cli/dist/bin.js --help
chrysalis — grow a modern framework inside a legacy PHP app

Usage: chrysalis <command> [...args]

Commands:
  init         create a chrysalis.project.json marker
  ingest       parse a PHP project into the WebIR
  emit         translate a PHP project into TypeScript
  ...
```

Confirm a tiny end-to-end flow works:

```bash
$ node packages/cli/dist/bin.js emit fixtures/tiny-blog --out /tmp/tiny-blog --target=hono
handlers:     5
files:        14
emit holes:   0
$ cd /tmp/tiny-blog && npm install && npm start
listening on http://0.0.0.0:3000
```

**What to do if it does not work.**

- `pnpm: command not found` → `npm install -g pnpm@9`.
- TypeScript errors during build → check Node version (`node -v` should be `20.x` or higher).
- `php: command not found` warnings during `pretest` → fine; only matters when you actually capture or verify against PHP.

**Where to go next.** [Translate a small PHP project for the first time](#2-translate-a-small-php-project-for-the-first-time).

---

## 2. Translate a small PHP project for the first time

**Goal.** A working TypeScript copy of your PHP app you can run side-by-side with the original and verify against it.

**You need.** A PHP project (anything with at least one route), Chrysalis built locally, PHP on `PATH`.

**Steps.**

1. Mark the project as Chrysalis-managed:

   ```bash
   $ cd /opt/legacy-blog
   $ chrysalis init
   [chrysalis] initialized project: /opt/legacy-blog/chrysalis.project.json
   ```

2. Capture some real traffic. In one terminal:

   ```bash
   $ chrysalis observe . --traces ./captures --port 8080
   [observe] php root:   /opt/legacy-blog
   [observe] trace dir:  /opt/legacy-blog/captures
   [observe] prelude:    /opt/chrysalis/packages/oracle-php/src/bootstrap.php
   [observe] listening:  http://127.0.0.1:8080
   [observe] redaction:  12 rule(s) (built-in defaults only)
   ```

   In a second terminal, drive your usual smoke tests:

   ```bash
   $ curl -s http://127.0.0.1:8080/ > /dev/null
   $ curl -s http://127.0.0.1:8080/posts/1 > /dev/null
   $ curl -s -X POST -d 'body=hi' http://127.0.0.1:8080/comments > /dev/null
   ```

   Stop the capture (`Ctrl+C` in the first terminal). Confirm you have traces:

   ```bash
   $ chrysalis corpus ./captures
   traces: 14
     GET /                         8
     GET /posts/:id                4
     POST /comments                2
   ```

3. Emit TypeScript:

   ```bash
   $ chrysalis emit . --out generated/blog --target=hono \
         --schema db/schema.sql
   handlers:     5
   files:        14
   emit holes:   0
   ```

4. Run the new app on a different port:

   ```bash
   $ cd generated/blog && npm install && PORT=3000 npm start
   listening on http://0.0.0.0:3000
   ```

5. Verify:

   ```bash
   $ cd /opt/legacy-blog
   $ chrysalis verify ./captures --base-url http://127.0.0.1:3000 --threshold 0.95
   aggregate correctness: 100.0%
   frames passed:         14 / 14
   per-endpoint:
     GET /                     100.0%   body≈1.00   (8/8)
     GET /posts/:id            100.0%   body≈1.00   (4/4)
     POST /comments            100.0%   body≈1.00   (2/2)
   ```

**What to do if it does not work.**

- `emit holes: N` is non-zero → see [Close a hole by hand](#9-close-a-hole-by-hand).
- Verify under threshold → [Triage a verify failure](#7-triage-a-verify-failure).
- The new app crashes on startup → check `npm install` actually finished, then `node dist/index.js` for the real error.

**Where to go next.** [Run shadow mode in staging or production](#13-run-shadow-mode-in-staging-or-production).

---

## 3. Capture local traffic safely

**Goal.** A trace corpus that contains no secrets, no credit cards, no session tokens.

**You need.** Your PHP project, a clear list of fields you consider sensitive.

**Steps.**

1. Look at the redaction defaults (Authorization headers, common cookie names, CSRF tokens, password fields). They cover the obvious cases. List your remaining sensitive fields — request inputs, SQL columns, response fragments.

2. Drop a `chrysalis.observe.json` at your PHP root:

   ```json
   {
     "rules": [
       { "path": "request.post.password",   "kind": "drop" },
       { "path": "request.post.api_token",  "kind": "mask" },
       { "path": "request.cookies.session", "kind": "drop" },
       { "path": "sql.row.email",           "kind": "mask" },
       { "path": "sql.row.ssn",             "kind": "drop" },
       { "path": "response.headers.set-cookie", "kind": "mask" }
     ]
   }
   ```

   `drop` removes the value entirely. `mask` replaces it with a stable hash so you can still tell two requests used the same value without seeing the value.

3. Restart `observe` and check the banner:

   ```bash
   $ chrysalis observe . --traces ./captures
   [observe] redaction:  18 rule(s) (built-in defaults + 6 from chrysalis.observe.json)
   ```

4. Drive a request through and inspect a single trace file:

   ```bash
   $ ls captures/2026-05-12 | head -1
   0193b3a4-1f60-7a4b-8d92-a5d8c7e9b401.ndjson
   $ jq 'select(.type=="http.request") | .post' captures/2026-05-12/0193b3a4-1f60-7a4b-8d92-a5d8c7e9b401.ndjson
   {"username":"alice","password":"<redacted>","api_token":"sha256:7c9..."}
   ```

5. Establish a habit: every project tracked by Chrysalis must check in `chrysalis.observe.json`. CI can grep for known sensitive fields in trace samples and fail the build if they appear unredacted.

**What to do if it does not work.**

- New rules ignored → make sure the file is at the **PHP project root**, not the Chrysalis root.
- Can't tell whether a value is masked → `mask` outputs `sha256:<hex>`; `drop` removes the key entirely.

**Where to go next.** [Capture production traffic without changing the user experience](#4-capture-production-traffic-without-changing-the-user-experience).

---

## 4. Capture production traffic without changing the user experience

**Goal.** Capture real user traffic from a live production server with zero behavior change.

**You need.** Root or root-equivalent on the PHP host, write access to a trace directory, agreement that traces never leave the host before redaction.

**Steps.**

1. Copy `packages/oracle-php/src/` (and its `vendor/` if any) to the production host, somewhere readable by the PHP process.

2. Pick a writable trace directory and put it on a fast local disk:

   ```bash
   $ mkdir -p /var/lib/chrysalis/traces
   $ chown www-data:www-data /var/lib/chrysalis/traces
   ```

3. Set two environment variables on the PHP service. With PHP-FPM, edit your pool config:

   ```ini
   env[CHRYSALIS_TRACE_DIR] = /var/lib/chrysalis/traces
   php_value[auto_prepend_file] = /opt/chrysalis/oracle-php/src/bootstrap.php
   ```

   With Apache + mod_php:

   ```apache
   SetEnv CHRYSALIS_TRACE_DIR /var/lib/chrysalis/traces
   php_value auto_prepend_file /opt/chrysalis/oracle-php/src/bootstrap.php
   ```

4. Drop your redaction file (same `chrysalis.observe.json` shape) at the PHP root.

5. Reload the PHP service. Verify traces appear:

   ```bash
   $ ls /var/lib/chrysalis/traces/$(date +%Y-%m-%d) | head
   ```

6. Watch for failure modes for a few minutes:

   - Disk fills up → set up rotation (see [Keep the trace corpus from growing forever](#20-keep-the-trace-corpus-from-growing-forever)).
   - Latency rises → unlikely, but check if your trace directory is on slow network storage.
   - PHP errors mention `bootstrap.php` → permissions or `open_basedir`; add the bootstrap path to `open_basedir`.

7. When you have enough traffic (a day, a week — whatever covers your routes), copy traces off the host to a workstation:

   ```bash
   $ rsync -av prod-host:/var/lib/chrysalis/traces/2026-05-12 ./captures/host-1/
   ```

**What to do if it does not work.**

- `auto_prepend_file` ignored → your hosting environment may forbid it. Use a wrapper script in front of `index.php` instead, or load `bootstrap.php` from your existing front controller.
- Traces missing fields → confirm `CHRYSALIS_TRACE_DIR` is set in the **PHP process** environment, not your shell.

**Where to go next.** [Combine traces from many hosts into one corpus](#5-combine-traces-from-many-hosts-into-one-corpus).

---

## 5. Combine traces from many hosts into one corpus

**Goal.** One trace directory verify can replay against, built from many capture sources.

**You need.** Trace directories from each host, all under one parent dir.

**Steps.**

```bash
$ ls captures
host-1/  host-2/  host-3/
$ chrysalis corpus-merge captures/host-1 captures/host-2 captures/host-3 \
      --out captures/merged \
      --on-duplicate skip --dedupe-trace-id skip \
      --json-out reports/corpus-merge.json
[corpus-merge] copied 4128 file(s); skipped 17 (duplicate trace ids)
[corpus-merge] summary: /var/.../reports/corpus-merge.json
$ chrysalis corpus captures/merged
traces: 4128
  GET /                       1820
  GET /posts/:id               912
  ...
```

For repeatable smoke runs, take a stable 1-in-N sample:

```bash
$ chrysalis corpus-merge captures/merged --out captures/sample \
      --sample-modulo 16 --sample-remainder 0
```

**What to do if it does not work.**

- `[corpus-merge] duplicate file …` → add `--on-duplicate skip`.
- The merged corpus is much smaller than expected → likely two hosts captured the same request through a load balancer; `--dedupe-trace-id skip` is the right answer.

**Where to go next.** [Verify that the new app behaves like the old one](#6-verify-that-the-new-app-behaves-like-the-old-one).

---

## 6. Verify that the new app behaves like the old one

**Goal.** Aggregate correctness ≥ your chosen threshold (`0.95`, `0.99`, or `1.0`) on a representative corpus.

**You need.** Emitted TypeScript (from `chrysalis emit`), a trace corpus, the emitted app running on a known port.

**Steps.**

1. Start the emitted app:

   ```bash
   $ cd generated/legacy-app && npm install && PORT=3000 CHRYSALIS_DB_PATH=/tmp/legacy.sqlite npm start
   ```

2. Run verify with attribution turned on:

   ```bash
   $ chrysalis verify ./captures/merged \
         --base-url http://127.0.0.1:3000 \
         --threshold 0.99 \
         --project /opt/legacy-app \
         --report reports/verify
   [verify] loaded 4128 traces from ./captures/merged
   [verify] IR divergence attribution enabled (--project /opt/legacy-app)
   [verify] replaying against http://127.0.0.1:3000 ...
   [verify] wrote 22 report file(s) under reports/verify
   [verify] summary: /var/.../reports/verify/summary.json
   aggregate correctness: 99.7%
   ```

3. If you want it faster, parallelize replay:

   ```bash
   $ chrysalis verify ./captures/merged --base-url http://127.0.0.1:3000 \
         --threshold 0.99 --replay-concurrency 8 --disable-cookie-chain \
         --replay-timeout-ms 5000
   ```

4. Or split across CI workers:

   ```bash
   # Worker 0 of 4
   $ chrysalis verify ./captures/merged --base-url http://127.0.0.1:3000 \
         --shard-index 0 --shard-count 4 --report reports/verify-0
   ```

   On the coordinator after all four are done:

   ```bash
   $ chrysalis verify-merge \
         reports/verify-0/summary.json reports/verify-1/summary.json \
         reports/verify-2/summary.json reports/verify-3/summary.json \
         --json-out > reports/verify/merged.json
   ```

**What to do if it does not work.**

- Score below threshold → [Triage a verify failure](#7-triage-a-verify-failure).
- Workers all fail with `ECONNREFUSED` → start the emitted app first.
- Captures contain unredacted secrets → re-redact with [`packages/oracle/README.md`](../packages/oracle/README.md) before sharing.

**Where to go next.** [Run shadow mode in staging or production](#13-run-shadow-mode-in-staging-or-production).

---

## 7. Triage a verify failure

**Goal.** Understand exactly why one or more traces diverged, in less than five minutes.

**You need.** A failed verify run, ideally with `--project` already passed (so the report has IR node attribution).

**Steps.**

1. Read the stderr summary of the failed run:

   ```text
   [verify] stderr: failure diagnostics
   [verify]   failed frames: 6
   [verify]   divergence kinds (failed traces):
   [verify]     body                   2
   [verify]     header                 2
   [verify]     status                 2
   [verify] stderr: per-trace divergences
   [verify]   POST /comments  trace=01-…  kinds=body
   [verify]     IR nodes: web/Route/POST_comments, effect/INSERT_comments
   [verify]     · body: expected "<a href=...>" — got "&lt;a href=...&gt;"
   ```

2. Open the per-route report:

   ```bash
   $ jq '.divergences[0]' reports/verify/POST__comments.json
   {
     "traceId": "01-…",
     "kinds": ["body"],
     "details": ["body: expected '<a href=...>' — got '&lt;a href=...&gt;'"],
     "attributedNodeIds": ["web/Route/POST_comments", "effect/INSERT_comments"]
   }
   ```

3. Re-run verify on just that one trace while you iterate:

   ```bash
   $ chrysalis verify ./captures --base-url http://127.0.0.1:3000 \
         --only-trace-id 01-... --threshold 0 --project /opt/legacy-app
   ```

4. Open the emitted handler that owns the attributed node:

   ```bash
   $ rg "POST_comments" generated/legacy-app/src/handlers
   src/handlers/comments_create_post.ts:8: // @chrysalis-provenance web/Route/POST_comments
   ```

5. Decide:

   - **Generated code is wrong** → file an emit bug, or close the gap with [`chrysalis repair`](#8-use-repair-to-close-a-behavior-gap).
   - **Generated code is right but the legacy app was buggy** → mark the divergence as expected in your CI gate, or re-record the trace from a fresh capture.
   - **The capture is just stale** → re-run `observe`, re-capture, re-verify.

**What to do if it does not work.**

- Multiple unrelated divergences → fix one at a time; verify between each fix.
- `IR nodes:` empty → you forgot `--project`; rerun with it.

**Where to go next.** [Use repair to close a behavior gap](#8-use-repair-to-close-a-behavior-gap).

---

## 8. Use repair to close a behavior gap

**Goal.** Let Chrysalis (and optionally an LLM) suggest small IR edits that drive correctness back to your threshold.

**You need.** A failing verify, the original PHP project, an OpenAI-compatible API key (optional but much more useful).

**Steps.**

1. Confirm the failure reproduces:

   ```bash
   $ chrysalis verify ./captures --base-url http://127.0.0.1:3000 --threshold 1.0 --project /opt/legacy-app
   [verify] correctness 0.992 below threshold 1.0
   ```

2. Set up the LLM-based proposer:

   ```bash
   $ export CHRYSALIS_REPAIR_LLM_API_KEY=sk-...
   $ export CHRYSALIS_REPAIR_LLM_BASE_URL=https://api.openai.com
   $ export CHRYSALIS_REPAIR_LLM_MODEL=gpt-4o-mini
   ```

3. Run the loop with verbose output and write the resulting module:

   ```bash
   $ chrysalis repair ./captures --base-url http://127.0.0.1:3000 \
         --project /opt/legacy-app \
         --llm --repair-verbose --max-iter 3 \
         --write-module reports/repair/last-good.webir.json
   [repair] iteration 1: 6 failed frames
   [repair] proposer: llm (gpt-4o-mini)
   [repair]   candidate 1: replaceOperand(node:effect/INSERT_comments.body, htmlspecialchars($body))
   [repair] applying 1 edit(s)
   [repair] iteration 2: 0 failed frames
   [repair] success after 1 iteration(s)
   ```

4. Re-emit from the patched module by feeding it back through `emit` (next release will accept `--from-module`; until then, hand-merge or use `--write-module` for inspection only).

5. Always re-run verify against the freshly emitted code to confirm:

   ```bash
   $ chrysalis verify ./captures --base-url http://127.0.0.1:3000 --threshold 1.0
   aggregate correctness: 100.0%
   ```

**What to do if it does not work.**

- The proposer keeps suggesting edits that get rolled back → narrow scope: `--endpoint "POST /comments"`.
- The LLM returns garbage → switch model, or fall back to [Close a hole by hand](#9-close-a-hole-by-hand).

**Where to go next.** [Close a hole by hand](#9-close-a-hole-by-hand).

---

## 9. Close a hole by hand

**Goal.** Replace a `legacy:<reason>` hole with typed IR you control, then verify.

**You need.** The emit report (`chrysalis.holes.json` next to the emitted code) and a clear plan for what the closed code should do.

**Steps.**

1. Find the hole:

   ```bash
   $ jq '.[] | select(.kind=="legacy:include-cycle")' generated/legacy-app/chrysalis.holes.json
   {
     "id": "hole/legacy-include-cycle/8b1f",
     "route": "GET /admin/dashboard",
     "reason": "PHP include() that re-enters the requested file based on $_SESSION",
     "phpFile": "/opt/legacy-app/admin/dashboard.php:42"
   }
   ```

2. Open the source, decide what the hole should resolve to. Often the include cycle is dead code; sometimes it picks one of two pages based on a role.

3. Write a closure JSON. Each closure replaces a specific hole with a typed subgraph of WebIR nodes:

   ```json
   {
     "kind": "chrysalis.hole-patch",
     "schemaVersion": 1,
     "holeId": "hole/legacy-include-cycle/8b1f",
     "replacement": {
       "kind": "Branch",
       "guard": { "kind": "ReadSession", "key": "role" },
       "ifEqualsLiteral": "admin",
       "then": { "kind": "Render", "template": "admin/dashboard.html" },
       "else": { "kind": "Render", "template": "user/dashboard.html" }
     },
     "signoff": { "author": "alice", "rationale": "include cycle is a role-only branch" }
   }
   ```

4. Apply via repair, which always verifies against the corpus:

   ```bash
   $ chrysalis repair ./captures --base-url http://127.0.0.1:3000 \
         --project /opt/legacy-app \
         --hole-patch patches/legacy_include_cycle.json
   [repair] applied hole patch hole/legacy-include-cycle/8b1f
   [repair] iteration 1: 0 failed frames
   [repair] success after 0 iteration(s)
   ```

5. Commit `patches/legacy_include_cycle.json` so future ingests know how to close that same hole.

**What to do if it does not work.**

- Closure rejected with a type error → your replacement subgraph references a node that does not match the hole's expected output type. Read the error, adjust, rerun.
- Verify regresses on a different route → your closure is too aggressive. Narrow it (more guards) or split it.

**Where to go next.** [Find and fix N+1 queries](#10-find-and-fix-n1-queries).

---

## 10. Find and fix N+1 queries

**Goal.** Spot a `foreach { …query… }` pattern and replace it with one `WHERE id IN (…)` lookup.

**You need.** A trace corpus that actually exercises the suspect endpoint (Chrysalis raises confidence using observed iteration counts).

**Steps.**

1. Detect first:

   ```bash
   $ chrysalis insight /opt/legacy-app --traces ./captures --only n-plus-one-queries
   [insight] opportunities: 3
     [strong]   n-plus-one-queries  confidence=0.92  GET /
       └─ posts_index.php:8  foreach($posts as $p) { … }
   ```

2. Apply the matching rewrite, with re-emit and post-verify:

   ```bash
   $ chrysalis rewrite /opt/legacy-app \
         --out generated/legacy-app --traces ./captures \
         --passes batch-n1-read --report reports/rewrite/n1.json
   [rewrite] applying pass: batch-n1-read
   [rewrite]   ✓ GET /  (1 edit)
   [rewrite] post-verify: 1/1 passes survive invariants
   [rewrite] re-emit -> generated/legacy-app
   ```

3. Confirm the new handler runs one query, not N:

   ```bash
   $ rg "queryAll" generated/legacy-app/src/handlers/posts_index_show.ts
   const authors = await ctx.db.queryAll<Author>(
     "SELECT id, name FROM authors WHERE id IN (?)",
     posts.map(p => p.authorId),
   );
   ```

4. Verify against the same corpus:

   ```bash
   $ chrysalis verify ./captures --base-url http://127.0.0.1:3000 --threshold 1.0
   aggregate correctness: 100.0%
   ```

**What to do if it does not work.**

- The pass refuses to apply → confidence too low; capture more traffic for that endpoint and rerun insight.
- Verify regresses → roll back the file (`git checkout`), narrow with `--min-confidence 0.95`.

**Where to go next.** [Find and fix raw SQL concatenation](#11-find-and-fix-raw-sql-concatenation).

---

## 11. Find and fix raw SQL concatenation

**Goal.** Convert `query("SELECT … WHERE id=" . $id)` into bound parameters everywhere it appears.

**You need.** Traces (so taint analysis can confirm `$id` actually flows from user input).

**Steps.**

```bash
$ chrysalis insight /opt/legacy-app --traces ./captures --only raw-sql-concat
[insight] opportunities: 7

$ chrysalis rewrite /opt/legacy-app \
      --out generated/legacy-app --traces ./captures \
      --passes parameterize-sql --report reports/rewrite/sql.json
[rewrite] applying pass: parameterize-sql
[rewrite]   ✓ POST /comments  (1 edit)
[rewrite]   ✓ GET /search     (1 edit)
[rewrite]   ⊘ DELETE /admin/posts/:id  (skipped: raw expression contains a function call)
[rewrite] post-verify: 6/6 passes survive invariants

$ chrysalis verify ./captures --base-url http://127.0.0.1:3000 --threshold 1.0
aggregate correctness: 100.0%
```

The skipped opportunity needs a hand fix. Open the file, replace the concat by hand, rerun the loop.

**What to do if it does not work.**

- Verify regresses → taint analysis was wrong about that endpoint; check whether the original SQL was relying on a side effect of string conversion.

**Where to go next.** [Add CI gates to your repository](#12-add-ci-gates-to-your-repository).

---

## 12. Add CI gates to your repository

**Goal.** Every pull request automatically runs ingest, emit, verify, and the migration metrics, and fails if anything regresses.

**You need.** A CI environment with Node 20+, pnpm 9+, PHP on `PATH`. GitHub Actions, GitLab CI, Jenkins — any system can run the same `pnpm` scripts.

**Steps (GitHub Actions example).**

```yaml
# .github/workflows/chrysalis.yml
name: chrysalis
on: [pull_request, push]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: shivammathur/setup-php@v2
        with:
          php-version: "8.2"
      - run: corepack enable && corepack prepare pnpm@9 --activate
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r build
      - run: pnpm test
      - name: emit
        run: node packages/cli/dist/bin.js emit ./app --out generated/app --target=hono
      - name: serve and verify
        run: |
          (cd generated/app && npm install && PORT=3000 npm start &) ; sleep 5
          node packages/cli/dist/bin.js verify ./captures \
              --base-url http://127.0.0.1:3000 --threshold 0.99 \
              --json-summary > reports/verify/summary.json
      - name: gates
        env:
          CHRYSALIS_IDIOMATICITY_MIN: "0.85"
          CHRYSALIS_RESIDUAL_LEGACY_MAX: "0.05"
        run: |
          pnpm run ci:verify reports/verify/summary.json
          pnpm run ci:status reports/migration/status.json
          pnpm run ci:migration-sidecar-floors
```

A few notes on the gate scripts:

- `pnpm run ci:verify` — fails the build if `aggregate.correctness < threshold`.
- `pnpm run ci:status` — fails if any sidecar metric (idiomaticity, residual-legacy, hole counts) regressed.
- `pnpm run ci:corpus-merge-summary` — validates a `corpus-merge --json-out` report.
- `pnpm run ci:migration-sidecar-floors` — only enforces floors when the matching `CHRYSALIS_*_MIN` / `_MAX` env vars are set.
- `pnpm run ci:emit-layout-floors` — same idea for emitted file count budgets.

**Upstream reference.** This repository’s **`.github/workflows/ci.yml`** job **`typecheck-and-test`** runs **`pnpm run test:cli-shims`** after **`pnpm -r build`**: it checks that the **Python** and **Go** shims still forward argv to the built Node CLI (**DESIGN D295**). With **`GITHUB_ACTIONS=true`**, that script is **strict** (both Go and Python must succeed). Add **`actions/setup-go@v5`** and the same step to your workflow if you rely on those entrypoints.

**What to do if it does not work.**

- The runner has no PHP → either install it, or skip capture/verify in CI and run them in a self-hosted runner.
- Tests pass locally but fail in CI → your CI runner is missing `pnpm -r build` after a package API change. Always run `pnpm -r build` before CLI subprocess tests.

**Where to go next.** [Run shadow mode in staging or production](#13-run-shadow-mode-in-staging-or-production).

---

## 13. Run shadow mode in staging or production

**Goal.** Send every real request to PHP, return its response to the client, and **also** mirror the request to the new Node app so we can compare them. The customer experience never changes.

**You need.** PHP and Node both running, the Chimera router on a third port, write access to a shadow log directory.

**Steps.**

1. Start the legacy app on `:18080`, the new app on `:3000`, the router on `:8080`:

   ```bash
   $ chrysalis deploy --mode=shadow \
         --legacy http://127.0.0.1:18080 \
         --modern http://127.0.0.1:3000 \
         --port 8080 --shadow-log-dir reports/shadow \
         --operator-metrics-json /var/lib/chrysalis/metrics.json
   [deploy] mode=shadow
   [deploy] legacy:  http://127.0.0.1:18080
   [deploy] modern:  http://127.0.0.1:3000
   [deploy] shadow log dir: /var/.../reports/shadow
   ```

2. Cut over the load balancer to the router. The customer still sees PHP responses (verified by `x-chrysalis-target: legacy`).

3. Tail the shadow log:

   ```bash
   $ tail -f reports/shadow/shadow.ndjson | jq 'select(.divergences | length > 0)'
   {"requestId":"…","method":"POST","path":"/comments","divergences":[{"kind":"body","detail":"&lt; vs <"}]}
   ```

4. After a soak period (an hour, a day, a week), summarize:

   ```bash
   $ chrysalis status --shadow reports/shadow --report reports/verify
   shadow
     requests:   18,420
     agreed:     18,403
     diverged:        17
   ```

5. If `diverged > 0`, drive each one through [Triage a verify failure](#7-triage-a-verify-failure) and [Use repair to close a behavior gap](#8-use-repair-to-close-a-behavior-gap).

**What to do if it does not work.**

- Modern app slow under shadow load → it is now seeing every request even though customers don't. Add capacity or run shadow at a smaller percentage by switching to canary mode for the comparison.
- Shadow log empty → check `--modern` actually points at a running app (`curl http://127.0.0.1:3000/`).

**Where to go next.** [Roll out a 5% canary, then 25%, then 100%](#14-roll-out-a-5-canary-then-25-then-100).

---

## 14. Roll out a 5% canary, then 25%, then 100%

**Goal.** Move real customer traffic to the new app gradually. Same user always lands on the same stack.

**You need.** A canary identifier — a cookie, header, or IP. A cookie is best (sticky across reloads).

**Steps.**

1. Start the router with 5% canary:

   ```bash
   $ chrysalis deploy --mode=canary \
         --legacy http://127.0.0.1:18080 \
         --modern http://127.0.0.1:3000 \
         --port 8080 \
         --canary-percent 5 \
         --canary-cookie chrysalis_sid \
         --canary-salt prod-east-2026-05
   ```

2. Verify stickiness with a few user ids:

   ```bash
   $ for u in alice bob carol; do
       curl -s -i -b "chrysalis_sid=$u" http://127.0.0.1:8080/ | grep -i x-chrysalis
     done
   ```

   Each user always sees the same `x-chrysalis-target`.

3. Watch operator metrics and shadow logs (you can keep shadow on for the legacy slice — see Operations runbook). When you are happy, hot-reload the config:

   ```bash
   $ jq '.canary.percentModern = 25' chimera.json | sponge chimera.json
   $ kill -HUP $(pidof node)
   [deploy] reload: applied chimera.json (mode=canary, 25%)
   ```

4. Step up to 100% (or `mode: cutover`) the same way.

**What to do if it does not work.**

- Some users see flapping → check that your canary identifier is stable (cookies set on every page render, not regenerated).
- The salt changed → all users get rebucketed. Pick a salt and do not change it mid-rollout.

**Where to go next.** [Cut over a single endpoint](#15-cut-over-a-single-endpoint).

---

## 15. Cut over a single endpoint

**Goal.** Move just `/api/health` (or any safe single endpoint) to the new stack while everything else stays on PHP.

**You need.** The router running with a config file.

**Steps.**

```json
{
  "kind": "chrysalis.chimera.config",
  "schemaVersion": 1,
  "mode": "cutover",
  "legacy": "http://127.0.0.1:18080",
  "modern": "http://127.0.0.1:3000",
  "rules": [
    { "match": "/api/health", "target": "modern" }
  ]
}
```

```bash
$ chrysalis deploy --config chimera.json --port 8080
[deploy] mode=cutover (from /var/.../chimera.json)
[deploy] rules: 1
$ curl -s -i http://127.0.0.1:8080/api/health | grep -i x-chrysalis
x-chrysalis-target: modern
$ curl -s -i http://127.0.0.1:8080/posts/1 | grep -i x-chrysalis
x-chrysalis-target: legacy
```

When you are confident, add another rule and `kill -HUP $(pidof node)`.

**What to do if it does not work.**

- Rule matched the wrong path → match patterns support glob (`/api/*`) and exact paths. Test each rule with `curl -i`.

**Where to go next.** [Roll back the canary](#16-roll-back-the-canary).

---

## 16. Roll back the canary

**Goal.** Revert customer traffic to PHP within seconds without restarting the router.

**Steps.**

Edit the config to put `mode` back to `legacy` (or set `canary.percentModern` to `0`):

```bash
$ jq '.mode = "legacy"' chimera.json | sponge chimera.json
$ kill -HUP $(pidof node)
[deploy] reload: applied chimera.json (mode=legacy)
$ curl -s -i http://127.0.0.1:8080/api/health | grep -i x-chrysalis
x-chrysalis-target: legacy
```

Customer-visible result: every request now goes to PHP. The new app continues running so you can investigate; you have lost no state because session sharing is symmetric (see next scenario).

For the rare case where the router itself is the problem, point your load balancer back at PHP directly.

**Where to go next.** [Share sessions between PHP and Node during the transition](#17-share-sessions-between-php-and-node-during-the-transition).

---

## 17. Share sessions between PHP and Node during the transition

**Goal.** A user logged into PHP stays logged in if the next request lands on Node, and vice versa.

**You need.** Redis (single instance or cluster) reachable from both the PHP and Node hosts. The `phpredis` PHP extension on the PHP host.

**Steps.**

1. On every PHP host, set:

   ```ini
   env[CHRYSALIS_SESSION_REDIS_URL] = redis://10.0.0.5:6379
   env[CHRYSALIS_SESSION_COOKIE]    = chrysalis_sid
   ```

   And in your application bootstrap, before `session_start()`:

   ```php
   \Chrysalis\Oracle\Session\RedisChrysalisSessionHandler::registerFromEnv();
   session_start();
   ```

2. On every Node host, set the same environment:

   ```bash
   export CHRYSALIS_SESSION_REDIS_URL=redis://10.0.0.5:6379
   export CHRYSALIS_SESSION_COOKIE=chrysalis_sid
   ```

3. Restart both stacks.

4. Verify by logging in via PHP, then forcing the next request to the Node side:

   ```bash
   $ curl -s -c /tmp/jar -d 'user=alice&pass=…' http://router/login   # x-chrysalis-target: legacy
   $ curl -s -b /tmp/jar -i -H 'X-Chrysalis-Force: modern' http://router/dashboard
   x-chrysalis-target: modern
   HTTP/1.1 200 OK    # still logged in
   ```

5. Run `pnpm run test:oracle-php-session-redis` against your Redis to confirm the bridge stays in lockstep when you upgrade Chrysalis.

**What to do if it does not work.**

- PHP errors mention `phpredis` → install the extension (`apt install php-redis`, then restart PHP-FPM).
- Sessions silently expire on the Node side → both stacks must use the same cookie name **and** same TTL. Match `session.gc_maxlifetime` on the PHP side to `CHRYSALIS_SESSION_TTL_SECONDS` on the Node side.

**Where to go next.** [Ingest a million-line monorepo across machines](#18-ingest-a-million-line-monorepo-across-machines).

---

## 18. Ingest a million-line monorepo across machines

**Goal.** Translate a project too large for one box. Each shard is a normal `chrysalis` invocation; the merge step rebuilds the whole IR.

**You need.** Several machines (or CI workers) with enough disk for an AST cache each.

**Steps.**

1. Pick a shard count. A reasonable rule of thumb is one shard per 250k LOC.

2. On each worker `i` of `K` total:

   ```bash
   $ chrysalis ingest /opt/huge-app \
         --shard-index $i --shard-count $K \
         --ingest-cache /var/cache/chrysalis/ast \
         --ingest-checkpoint-file /var/lib/chrysalis/ingest-$i.ckpt \
         --ingest-progress-file  /var/lib/chrysalis/ingest-$i.progress.json
   [ingest] shard 2/4 (route file filter; call map uses full manifest)
   [ingest] AST cache: /var/cache/chrysalis/ast
   [ingest] checkpoint: /var/lib/chrysalis/ingest-2.ckpt
   [ingest] progress JSON: /var/lib/chrysalis/ingest-2.progress.json
   ```

3. After all shards finish, on a coordinator machine:

   ```bash
   $ chrysalis ingest /opt/huge-app --merge-all-shards --shard-count 4 \
         --ingest-cache /var/cache/chrysalis/ast
   [ingest] merge-all-shards: 4 shard ingests -> mergeWebIrModules
   routes:   2480
   nodes:    140250
   holes:    312
   ```

   The merged result is identical to a single-process ingest — try it on a small project to verify.

4. The same `--shard-*` and `--merge-all-shards` flags work on `emit` and `status`.

**What to do if it does not work.**

- Workers OOM → each shard is still loading the full call map; either reduce concurrency, or add memory.
- One shard is much slower than the others → routes are unevenly distributed across files; keep shard count reasonably high (8–16) to smooth this out.

**Where to go next.** [Resume a crashed long-running run](#19-resume-a-crashed-long-running-run).

---

## 19. Resume a crashed long-running run

**Goal.** Pick up exactly where the previous run stopped, after a worker died, a power outage, or a CI timeout.

**Steps.**

`ingest`, `emit`, `verify`, `repair`, and `status` accept:

```text
--ingest-checkpoint-file <path>   # write progress here
--ingest-resume-checkpoint        # also read from it on startup
```

Combine with `--ingest-progress-file <path>` for a JSON heartbeat you can tail with `jq` or feed to a dashboard.

```bash
$ chrysalis ingest /opt/huge-app \
      --ingest-cache /var/cache/chrysalis/ast \
      --ingest-checkpoint-file /var/lib/chrysalis/ingest.ckpt \
      --ingest-resume-checkpoint
[ingest] checkpoint: /var/lib/chrysalis/ingest.ckpt (resume)
[ingest] resume: 9842 of 14210 files already ingested
... (continues)
```

For `emit`, the analogous flag is `--emit-resume`:

```bash
$ chrysalis emit /opt/huge-app --out generated/huge-app --target=hono --emit-resume
[emit] resume: skipping 1240 handlers already written
```

**What to do if it does not work.**

- Resume reports zero progress → the checkpoint file is from a different project or version; delete it and start fresh.
- Different content hash → source files changed since the checkpoint was written. Drop the checkpoint and resume; you cannot resume across edits.

**Where to go next.** [Keep the trace corpus from growing forever](#20-keep-the-trace-corpus-from-growing-forever).

---

## 20. Keep the trace corpus from growing forever

**Goal.** Bound disk use without losing useful traces.

**You need.** `scripts/corpus-rotate-archive.mjs` (lives at the repo root).

**Steps.**

1. Decide a retention window (e.g. keep 14 days of NDJSON; archive everything older).

2. Run a dry run to confirm what would happen:

   ```bash
   $ node scripts/corpus-rotate-archive.mjs \
         --traces /var/lib/chrysalis/traces \
         --archive /var/lib/chrysalis/archive \
         --keep-days 14 --dry-run
   [corpus-rotate] would move 312 file(s) older than 2026-04-28 -> /var/lib/chrysalis/archive
   [corpus-rotate] dry-run: no files moved
   ```

3. Drop the dry-run flag for the real move:

   ```bash
   $ node scripts/corpus-rotate-archive.mjs \
         --traces /var/lib/chrysalis/traces \
         --archive /var/lib/chrysalis/archive \
         --keep-days 14
   [corpus-rotate] moved 312 file(s) older than 2026-04-28
   ```

4. Schedule it (cron, systemd timer, Kubernetes CronJob — your choice). Run `chrysalis corpus /var/lib/chrysalis/traces` weekly to make sure recent data is still landing.

For massive growth, periodically resample to a smaller representative corpus:

```bash
$ chrysalis corpus-merge /var/lib/chrysalis/traces \
      --out /var/lib/chrysalis/sample \
      --sample-modulo 32 --sample-remainder 0
```

**Where to go next.** [Upgrade Chrysalis](#21-upgrade-chrysalis).

---

## 21. Upgrade Chrysalis

**Goal.** Move to a newer version without breaking your verify floor.

**Steps.**

1. Read the changelog before upgrading. Any change to schema versions, hole reasons, or CI gates is called out there.

2. In a branch:

   ```bash
   $ git fetch && git checkout vX.Y.Z
   $ pnpm install --frozen-lockfile
   $ pnpm -r build
   $ pnpm test
   ```

3. Re-run your end-to-end pipeline against the existing trace corpus:

   ```bash
   $ chrysalis emit /opt/legacy-app --out generated/legacy-app --target=hono
   $ chrysalis verify ./captures --base-url http://127.0.0.1:3000 --threshold 0.99
   ```

4. If verify regresses, the changelog explains why. Common cases:

   - A new normalization is stricter (e.g., timestamps now compared with millisecond precision). Adjust `--threshold` or accept the divergence.
   - A pass got smarter (more rewrites apply). Re-run `chrysalis rewrite`.

5. If your CI uses sidecar floors, refresh `CHRYSALIS_IDIOMATICITY_MIN` and `CHRYSALIS_RESIDUAL_LEGACY_MAX` to the new measured values.

**Where to go next.** [Operate behind a strict commercial license](#22-operate-behind-a-strict-commercial-license).

---

## 22. Operate behind a strict commercial license

**Goal.** Run a vendor build of Chrysalis where every command (except `init` and `license`) verifies a local Ed25519-signed envelope first.

**You need.** A license envelope file and the matching public key.

**Steps.**

1. Place the artifacts somewhere the operator (and only the operator) can read:

   ```bash
   $ install -m 0640 license.txt /etc/chrysalis/license.txt
   $ install -m 0644 issuer.pub  /etc/chrysalis/issuer.pub
   ```

2. Set the environment globally for whichever process runs Chrysalis (systemd unit, container env, etc.):

   ```ini
   Environment=CHRYSALIS_REQUIRE_LICENSE=1
   Environment=CHRYSALIS_LICENSE_MIN_TIER=team
   Environment=CHRYSALIS_LICENSE_PATH=/etc/chrysalis/license.txt
   Environment=CHRYSALIS_LICENSE_PUBLIC_KEY_PATH=/etc/chrysalis/issuer.pub
   ```

3. Confirm:

   ```bash
   $ chrysalis license check
   license ok.
   $ chrysalis license print
   { "sub": "acme-corp", "tier": "team", "exp": "2027-01-01T00:00:00.000Z", ... }
   license ok.
   ```

4. If `CHRYSALIS_LICENSE_MIN_TIER` is set higher than the envelope's tier, every other command exits with a clear error before doing any work.

5. Renewal: replace the file, restart the service. There is no network call.

**What to do if it does not work.**

- `signature mismatch` → the public key on disk does not match the issuer that signed the envelope.
- `expired` → renew, then update `license.txt`. Until then, only `init` and `license` work.
- See [`docs/COMMERCIAL.md`](./COMMERCIAL.md) for tier and feature semantics.

**Where to go next.** [Run Chrysalis from Python or Go (same Node CLI)](#23-run-chrysalis-from-python-or-go-same-node-cli).

---

## 23. Run Chrysalis from Python or Go (same Node CLI)

**Goal.** Call `ingest`, `emit`, `verify`, and every other subcommand from a **Python** or **Go** wrapper so your playbooks, Makefiles, or internal tools do not hard-code `node …/bin.js` — while still running the **same** TypeScript implementation (**DESIGN D295**).

**You need.** A built CLI (`pnpm --filter @chrysalis/cli build` at minimum), **Node 20+** on `PATH` (or `CHRYSALIS_NODE`), and either **Python 3.10+** or **Go 1.22+**.

**Steps.**

1. Build the Node entrypoint once:

   ```bash
   pnpm --filter @chrysalis/cli build
   ```

2. **Python** — from the repository root, put the shim package on `PYTHONPATH` and run the module. Optionally pin the JS path so discovery does not depend on `cwd`:

   ```bash
   export PYTHONPATH=python/chrysalis_shim/src
   export CHRYSALIS_CLI_JS="$PWD/packages/cli/dist/bin.js"
   python3 -m chrysalis_shim ingest fixtures/tiny-blog
   ```

   PowerShell:

   ```powershell
   $env:PYTHONPATH = "python/chrysalis_shim/src"
   $env:CHRYSALIS_CLI_JS = "$(Resolve-Path packages/cli/dist/bin.js)"
   python -m chrysalis_shim ingest fixtures/tiny-blog
   ```

   Editable install (any `cwd` once paths are set):

   ```bash
   pip install -e ./python/chrysalis_shim
   export CHRYSALIS_CLI_JS="$PWD/packages/cli/dist/bin.js"
   chrysalis-py corpus traces
   ```

3. **Go** — build a small binary next to the module, or use `go run` during development:

   ```bash
   cd go/shim
   go build -o chrysalis-go .
   export CHRYSALIS_CLI_JS="$(cd ../.. && pwd)/packages/cli/dist/bin.js"
   ./chrysalis-go corpus traces
   ```

   One-liner from repo root without installing the binary:

   ```bash
   CHRYSALIS_CLI_JS="$PWD/packages/cli/dist/bin.js" go run ./go/shim -- ingest fixtures/tiny-blog
   ```

4. Optional smoke (expects `python3` or `python` on `PATH`; runs Go when `go` is on `PATH`). On **GitHub Actions** (`GITHUB_ACTIONS=true`) or when **`CHRYSALIS_STRICT_CLI_SHIMS=1`**, **both** shims must succeed or the script exits **1** (same behavior as **`pnpm run test:cli-shims`** in CI):

   ```bash
   pnpm run test:cli-shims
   ```

   Local strict check (install Go first):

   ```bash
   CHRYSALIS_STRICT_CLI_SHIMS=1 pnpm run test:cli-shims
   ```

**What to do if it does not work.**

| Symptom | Fix |
| --- | --- |
| `could not find packages/cli/dist/bin.js` | Run `pnpm --filter @chrysalis/cli build`, or set `CHRYSALIS_CLI_JS` to the absolute path of `bin.js`. |
| `node not found` / `[chrysalis-go] node not found` | Install Node 20+, or set `CHRYSALIS_NODE` to the full path of the `node` executable. |
| Python `ModuleNotFoundError: chrysalis_shim` | Export `PYTHONPATH=python/chrysalis_shim/src` from the repo root, or `pip install -e ./python/chrysalis_shim`. |

**Where to go next.** [Installation](./INSTALLATION.md#optional-python-and-go-entrypoints-same-cli) for prerequisites; [Add CI gates to your repository](#12-add-ci-gates-to-your-repository) if you want the same shims exercised in GitHub Actions (the main **`typecheck-and-test`** workflow runs **`pnpm run test:cli-shims`** after **`pnpm -r build`**).

---

## 24. Provision a cheap GCE VM and smoke-test the repo

**Goal.** A preemptible **`e2-micro`** VM in a **GCE-first** GCP project with this repository built and **`pnpm run test:cli-shims`** executed once (non-strict on the VM so Go is optional there).

**You need.** **`gcloud`** CLI, **`git`** (for **`git archive`** when using **`-DeployFromLocalGit`**), a GCP **project id** with **billing** attached and permission to enable **Compute Engine** and create instances. Run **`gcloud auth login`** in the same shell before the script.

**Steps.**

1. Pick a project (for example **`chrysalis-dev-f5x6qv`**) and ensure **`compute.googleapis.com`** is enabled, or let the script enable it (omit **`-SkipServicesEnable`** the first time). If billing is missing, pass **`-BillingAccountId`** from **`gcloud billing accounts list`**.
2. From the **repository root** on Windows:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\gce-test-vm.ps1 `
     -Project chrysalis-dev-f5x6qv `
     -DeployFromLocalGit `
     -Recreate `
     -SkipServicesEnable
   ```

   Use **`-SkipServicesEnable`** only when your role cannot call **`services.enable`** and Compute is already on. **`-Recreate`** replaces an existing instance with the same name.

3. Wait for the script to finish. Success ends with **`[gce-test-vm-bootstrap] OK`** in the remote log and local **`Done. SSH in with:`** instructions.

**What to do if it does not work.**

| Symptom | Fix |
| --- | --- |
| **`gcloud compute instances describe`** / describe noise aborts the script | Use an up-to-date **`scripts/gce-test-vm.ps1`** (it tolerates stderr from describe under **`$ErrorActionPreference = Stop`**). |
| **`pscp: unable to open ~/...`** | Remote **`gcloud compute scp`** targets must not use **`~/`** on Windows; the script uses a bare remote filename. |
| **`fatal: could not read Username for 'https://github.com'`** on the VM | Pass **`-DeployFromLocalGit`** so the tree is uploaded as a tarball instead of cloning. |
| **SSH never succeeds** | Add **`-TunnelThroughIap`**, or add a firewall rule / use a network path that allows **`tcp:22`** to the instance. |
| **`UREQ_PROJECT_BILLING_NOT_FOUND`** when enabling APIs | Link a billing account (Console or **`-BillingAccountId`**). |

**Where to go next.** [Deployment](./DEPLOYMENT.md#google-cloud-firebase-vs-compute-engine-projects) for project policy and inventory; **`scripts/gcp-migrate-gce-vm.ps1`** if you are moving an existing disk between projects.

---

## Where the rest of the documentation lives

- Per-command reference with every flag: [USER-GUIDE.md](./USER-GUIDE.md).
- Day-to-day operational runbooks (capture in production, multi-host, rollouts): [OPERATIONS.md](./OPERATIONS.md).
- Component architecture and deployment shapes: [DEPLOYMENT.md](./DEPLOYMENT.md), [WHITEPAPER.md](./WHITEPAPER.md).
- Environment variables, CI gates, retention, redaction: [ADMINISTRATION.md](./ADMINISTRATION.md).
- Installing Chrysalis and its prerequisites: [INSTALLATION.md](./INSTALLATION.md).
- **Python / Go CLI shims** (same Node binary): [How-to scenario 23](./HOW-TO.md#23-run-chrysalis-from-python-or-go-same-node-cli).
- **Cheap GCE dev VM** (bootstrap + shim smoke): [How-to scenario 24](./HOW-TO.md#24-provision-a-cheap-gce-vm-and-smoke-test-the-repo).
- Commercial tiers and license envelopes: [COMMERCIAL.md](./COMMERCIAL.md).
