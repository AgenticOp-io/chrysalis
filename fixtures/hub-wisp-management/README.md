# fixtures/hub-wisp-management

WISP Module_Manager CWL showcase fixture (Phase 12–14).

## Purpose

Pinned **contract artifacts** for the WISP → CWL **showcase POC** — not a full copy of the WISP repo. **CWL is authoritative**; this fixture demonstrates the language on a real app (**D6205**).

**GenieACS is WISPTools legacy — not Chrysalis POC scope.** Do not plan, gate, or deepen ACS/GenieACS here.

## Contents

| File | Role |
| --- | --- |
| `wisp-api-paths.json` | Canonical `/api/*` paths from `api.ts` |
| `wisp-scenarios.v1.json` | Scenario inventory snapshot (regenerate via `pnpm run wisp:scenario-inventory`) |
| `wisp-pipeline.config.json` | Pipeline defaults (GCE project, backend URL, report path) |
| `wisp-hole-manifest.v1.json` | UI hole counts + API contract (`pnpm run wisp:hole-manifest`) |
| `cwl-preview.json` | Lift preview snapshot (copied from WISP `.chrysalis/` on full build) |
| `api-proxy.cwl` | CWL upstream proxy routes (`pnpm run wisp:generate-api-proxy-cwl`) |
| `wisp-m0-surface-manifest.v1.json` | M0 surface contract (`pnpm run hub:wisp-cwl-phase13-m0-smoke`) |

## Live WISP tree

Point ingest/lift at the operator clone:

`C:\Users\david\Downloads\WISPTools\Module_Manager`

Or set `CHRYSALIS_WISP_ROOT`.

## Invariants

- Hole reasons must be catalogued in `scripts/hub-ingest/cwl-fullstack-holes.mjs`.
- No silent best-effort UI lowering — use `hub-svelte:page-component` until Phase 2.

## Non-goals

- Committing full WISP source into Chrysalis.
- Claiming oracle parity for Svelte origins.
- Converting `backend-services` to CWL (proxy-only).
- GenieACS / ACS / TR-069 — **WISPTools legacy; not POC scope** (**D6205**).
