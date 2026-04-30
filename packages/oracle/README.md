# @chrysalis/oracle

## Purpose

Records the real-world behavior of the legacy PHP app into a `TraceCorpus` that
`@chrysalis/verify` can replay against translated code. This is how Chrysalis
turns modernization into a specification problem — the oracle *is* the spec.

## Public API

- `observe(config: ObserveConfig): Promise<ObserveSession>` — starts the sidecar
- `ObserveSession.stop()` — finalize and flush the corpus
- `TraceFrame`, `TraceCorpus` — the recorded data model
- `readCorpus` / `parseTraceFile` — load validated trace corpora from disk
- `mergeCorpusDirectories({ sources, outDir, onDuplicate? })` — copy multiple **`readCorpus`**-shaped trace roots into one **`YYYY-MM-DD/*.ndjson`** tree (**V2-M3**; CLI: **`chrysalis corpus-merge`**)

## Invariants

- **Redaction is a launch blocker.** Configurable redaction rules (headers,
  cookies, query/post fields, outbound URLs, mail, session keys) run before
  persistence via the PHP prelude (`Redactor.php`). **`DEFAULT_REDACTION`** in
  `src/redaction.ts` is authoritative; PHP rules must stay in lockstep. Defaults
  cover common leaks: `authorization` / `cookie` / API key headers, session
  cookies (`PHPSESSID`, `laravel_session`, …), passwords and CSRF/token-shaped
  POST fields (`_token`, `authenticity_token`, OAuth secrets), sensitive query
  params (`access_token`, `code`, `state`), `response.headers.set-cookie`, and
  **`sql.row.<column>`** rules for captured SELECT **`rows`** (column-name match).
  Optional **`sql.params[<driver>:<sqlPrefix>].<index>`** rules (PHP prelude only) redact
  **bind** values by driver + SQL prefix + index; **`drop`** is coerced to **mask** so arity stays stable.
  **`sql.params` rules apply only to mutation-shaped `sql.query` events** (empty `rowShape` in the prelude)
  so SELECT binds used in recorded-SQL tape matching are never altered at capture time.
  **`loadObserveConfig(dir)`** reads **`chrysalis.observe.json`** when present and **merges** those rules
  onto **`DEFAULT_REDACTION`** (same `path` overrides `kind`; novel paths append). With no file, defaults
  apply unchanged. Invalid JSON or bad shapes throw **`Error`** (absolute path in the message); unknown rule
  **`kind`** values are skipped; **`drop` / `hash` / `mask`** require a non-empty string **`path`**.
  Local PHP smoke: **`pnpm run test:oracle-php-redactor`** from the repo root (see **`packages/oracle-php/README.md`**).
- **Determinism capture.** Time reads and RNG outputs are captured per frame
  so replay can inject identical values.
- **Append-only corpus.** Frames are content-addressed and deduplicated; new
  observations extend, never overwrite.

## Non-goals

- Translating anything. Oracle only observes.
- Replay — that's `@chrysalis/verify`.
- Long-term storage backends (we start with on-disk; cloud storage is later).
