# @chrysalis/oracle

## Purpose

Records the real-world behavior of the legacy PHP app into a `TraceCorpus` that
`@chrysalis/verify` can replay against translated code. This is how Chrysalis
turns modernization into a specification problem — the oracle *is* the spec.

## Public API

- `observe(config: ObserveConfig): Promise<ObserveSession>` — starts the sidecar
- `ObserveSession.stop()` — finalize and flush the corpus
- `TraceFrame`, `TraceCorpus` — the recorded data model
- `loadCorpus(path)` / `saveCorpus(path, corpus)` — persistence

## Invariants

- **Redaction is a launch blocker.** Configurable redaction rules (headers,
  cookies, body fields, SQL values) run before persistence. Default deny for
  known-sensitive headers (`authorization`, `cookie`, `set-cookie`).
- **Determinism capture.** Time reads and RNG outputs are captured per frame
  so replay can inject identical values.
- **Append-only corpus.** Frames are content-addressed and deduplicated; new
  observations extend, never overwrite.

## Non-goals

- Translating anything. Oracle only observes.
- Replay — that's `@chrysalis/verify`.
- Long-term storage backends (we start with on-disk; cloud storage is later).
