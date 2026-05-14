# Grafana examples (Chrysalis)

These files are **reference dashboards** for teams that already run Grafana and want to chart JSON produced by Chrysalis (`chrysalis deploy` operator snapshots, verify summaries, fleet uplinks). Chrysalis does not ship a hosted metrics product; you own storage, queries, and access control.

## Contents

| File | Purpose |
| --- | --- |
| [`dashboards/chrysalis-operator-overview.json`](./dashboards/chrysalis-operator-overview.json) | Starter dashboard JSON (import via Grafana **Import**). Panels use placeholder queries; point them at your Loki/Prometheus/Mimir datasource UID. |

## Wiring

1. Export operator NDJSON or batch JSON as documented in [`docs/OPERATIONS.md`](../../docs/OPERATIONS.md) (operator snapshots, verify summary batch).
2. Ingest those documents into your log/metrics stack (for example Loki `json` parser, or a small ETL job that writes numeric gauges).
3. Open the starter dashboard in Grafana, replace datasource UIDs, and adjust label selectors to match your environment.

## Privacy

Fleet and verify JSON can include route labels and project names. Apply the same redaction and retention rules as your trace corpora ([`docs/ADMINISTRATION.md`](../../docs/ADMINISTRATION.md)).
