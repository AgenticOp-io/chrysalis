# WPTP D7 — Continuous expansion (ongoing)

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Convert orbit:** [`WPTP-CONVERT-ORBIT.md`](./WPTP-CONVERT-ORBIT.md) (siblings resolver + Hub entrypoints)  
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
| 2026-05-19 | Engineering | **v2.0.2** tagged; echo-api silver Next.js + Hono matrix edges (24); `wptp:d3-silver-harness` petstore+echo+HAR OK locally. |
| 2026-05-20 | Engineering | Wave 6: parser nullsafe parity, PDO oracle route (**D309**), ingest `db_connect` / `pdo_item_count_row`; Dependabot major PRs closed; **`docs/IR-HELPER-LIFTING.md`** (**D311**); Project issues **#38** / **#39** for sibling repos. |
| 2026-05-20 | Engineering | **CI recovery:** Laravel **`chrysalis.stub.php`** registers **`/chrysalis-pdo-count`** (oracle 404 → verify **119/119**); **`ci-gates confidence-trend`** uses trailing pass streak; **`main`** green [run 26138669322](https://github.com/AgenticOp-io/chrysalis/actions/runs/26138669322). `pnpm run wptp:d7-audit` **5/5 OK**. |

## When to add a Decision Log entry

Changes that wire **neutral IR** into Chrysalis **ingest/emit** on `main` still require **`DESIGN.md`** Decision Log approval — D7 does not relax that rule.
