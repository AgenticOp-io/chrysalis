# hub-gold-cwl-diff

Gold fixture for **CWL semantic diff** (PR review; **G141**).

## Files

- `base.cwl` — baseline migration contract (3 routes).
- `head.cwl` — PR head contract: one route added, one removed, one body changed, one unchanged.

## Expected diff

| Summary | Count |
| --- | --- |
| added | 1 (`POST /items`) |
| removed | 1 (`GET /gone`) |
| changed | 1 (`GET /items` body `count: 0` → `count: 1`) |
| unchanged | 1 (`GET /health`) |

## Usage

```bash
node scripts/hub-ingest/hub-cwl-diff.mjs \
  --base fixtures/hub-gold-cwl-diff/base.cwl \
  --head fixtures/hub-gold-cwl-diff/head.cwl \
  --json-out .chrysalis/cwl-diff.json \
  --markdown-out .chrysalis/cwl-diff.md
```

In a real project, commit `migration.cwl.baseline` (or pass `--base`), run `hub-translate` /
`hub-migration-contract`, and attach `.chrysalis/cwl-diff.md` to the PR.

Asserted by **G141** in `packages/cli/tests/hub-strategic.test.ts`.
