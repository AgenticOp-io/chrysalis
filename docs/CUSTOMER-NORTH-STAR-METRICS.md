# Customer north-star metrics playbook

> **Status:** scaffolded (2026-06-19) — **G6263**  
> **Gate:** `runCustomerNorthStarMetricsScaffoldingGate`  
> **Authority:** [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §0 (customer outcomes, not repo vanity)

## North-star metrics (measure on a live customer slice)

| Metric | Definition | Source |
| --- | --- | --- |
| Time to first green verify | Wall clock from slice onboarding to first **correctness 1** replay on in-scope routes | Hub program timeline + verify JSON |
| Route correctness at cutover | Fraction of in-scope routes at **correctness 1** at chimera cutover | `chrysalis verify` summary |
| Hole density trend | Holes per route over time (explicit budget) | ingest hole report + insight |
| Dual-stack / session / SQL parity | Production session + SQL replay vs oracle on live profile | verify + oracle corpus |
| Migration cost per route | Operator hours per route (declining via Hub automation) | program accounting |

## Not north-star metrics

Do **not** use these as customer success claims:

- New matrix pairs for marketing without oracle
- CWL RFCs without oracle/replay linkage
- Hub UI depth without verify/evidence tie-in

## Operator workflow (outside repo)

1. Pick a **live customer slice** with signed capture rights.
2. Baseline hole density and route count from **`chrysalis status --json`** / insight.
3. Run verify replay after each ingest/emit iteration; record correctness trend.
4. At cutover, archive verify summary + oracle corpus hash in the evidence pack.

## In-repo honesty gate

`runNorthStarMetricsHonestyGate` (**G6142**) verifies STRATEGIC-PLAN §0 lists north-star vs non-north-star metrics. This playbook is the **operator extension** for measuring them on a live slice.

## Related

- [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §4 — honest gap indexed
