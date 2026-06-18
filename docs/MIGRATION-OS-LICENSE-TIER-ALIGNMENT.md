# Migration OS — license tier alignment

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 2; **G5790**; **DESIGN D289** / **D453**  
> **North star:** Hub operator features map to **dev / pro / enterprise** without a license server

## Goal

Pin **commercial alignment** for Migration OS surfaces: tier ladder, feature map, OSS-default gate-off behavior, and delivery dashboard license slice — so vendor distributions can enforce SKUs locally.

## Phase A — Tier ladder + feature map (shipped)

| Tier | Example Hub features |
| --- | --- |
| **dev** | `hub-translate`, `hub-delivery-dashboard`, `hub-cwl-preview` |
| **pro** | `hub-batch`, `hub-pipeline`, `hub-verify-gate` |
| **enterprise** | `hub-chimera-cutover` |

Registry: `hub-license-status.mjs` (`HUB_LICENSE_FEATURES`, `hubTierMeetsMinimum`).

## Phase B — OSS default (shipped)

When `CHRYSALIS_REQUIRE_LICENSE` is unset, `buildHubLicenseStatusReport` returns `requireLicense: false`, `gatePass: true`, and all hub features **allowed**.

## Phase C — Operator surfaces (shipped)

| Surface | License slice |
| --- | --- |
| `buildDeliveryDashboard` | `report.license` from `buildHubLicenseStatusReport` |
| `chrysalis-operator-web.mjs` | `assertHubLicenseAllows` on batch/pipeline/verify/chimera APIs |

Policy doc: `docs/COMMERCIAL.md`.

## Phase D — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase2LicenseTierGate` | doc + tier map + OSS-default report |

```bash
pnpm run hub:strategic-plan-phase2-license-tier-smoke
```

## Operator entry points

```bash
node scripts/hub-ingest/hub-license-status.mjs
pnpm run hub:license-tier-smoke
```

Enforced mode (vendor only): `CHRYSALIS_REQUIRE_LICENSE=1` + valid envelope + optional `CHRYSALIS_LICENSE_MIN_TIER`.

## Invariants (DESIGN §3)

- License verification is **local Ed25519** — no network phone-home
- OSS default remains gate-off; enforcement is opt-in via env
