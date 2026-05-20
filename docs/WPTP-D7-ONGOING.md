# WPTP D7 — Continuous expansion (ongoing)

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Entry:** D5 exit met.  
**Exit:** None (continuous).

## Quarterly matrix audit (checklist)

Run at least once per quarter (or before any public **Gold** claim change):

1. **`wptp-matrix`** — `npm run validate` and `npm run verify:harness` with `CHRYSALIS_ROOT` set.  
2. **Chrysalis CI** — confirm green: `webir-bundle-to-wptp-ir`, `wptp-d3-harness`, `wptp-d4-harness`, `wptp-silver-nextjs-harness`, `wptp-harness-smoke`. Local helper: **`pnpm run wptp:d7-audit`** (`scripts/wptp-d7-audit.mjs`).  
3. **Matrix site** — `npm run site:validate` / Pages deploy matches `data/matrix.v0.json`.  
4. **Grades** — no **Gold** row without `evidence.harness` + `evidence.corpus` or `evidence.ci`.  
5. **Composer paths** — `data/composer-paths.v0.json` matches implemented harness ids.  
6. **Chrysalis `ROADMAP.md`** — post-2.0 / multi-lane items still honest vs matrix.  
7. **Record** — note in program Project or this file’s revision table.

## Revision log

| Date | Auditor | Notes |
| --- | --- | --- |
| 2026-05-19 | Engineering | Initial D7 playbook; D0–D6 technical exits recorded. |
| 2026-05-20 | Engineering | `pnpm run wptp:d7-audit`; parser-parity `??=` + string interpolation; CI green post flagship/emit fixes. |
| 2026-05-19 | Engineering | **v2.0.2** tagged; echo-api silver Next.js + Hono matrix edges (24); `wptp:d3-silver-harness` petstore+echo+HAR OK locally. |

## When to add a Decision Log entry

Changes that wire **neutral IR** into Chrysalis **ingest/emit** on `main` still require **`DESIGN.md`** Decision Log approval — D7 does not relax that rule.
