# WPTP D6 — Enterprise connectors and policy packs

**Program:** [Web Platform Translation Program](./MASTER-PROGRAM.md)  
**Status:** In-tree policy pack (technical); sponsor-funded deployments use [COMMERCIAL.md](./COMMERCIAL.md).

## Purpose

Define how **private**, **contract-bound**, and **regulated** migrations use Chrysalis and WPTP siblings without claiming public-matrix **Gold** without proof.

## 1. Private adapters

| Rule | Requirement |
| --- | --- |
| **Scope** | Customer-owned inputs only (export packs, licensed APIs, on-prem captures). |
| **Repository** | Private adapters live in **customer** or **vendor** repos (`wptp-adapter-*` pattern), not Chrysalis `main`. |
| **Matrix** | No **Gold** row for a private edge unless `evidence` cites a **named private harness** or attested CI runbook. |
| **Secrets** | Oracle redaction defaults apply; extend via `chrysalis.observe.json` — never weaken lockstep paths in `AGENTS.md`. |

## 2. Identity and SSO connectors

| Area | Chrysalis posture |
| --- | --- |
| **Session / cookie** | Supported where oracle captures; Redis bridge documented in `docs/OPERATIONS.md`. |
| **SAML / OIDC / MFA** | **Holes-first** until reproducible corpora exist (Milestone 6A policy). |
| **Enterprise IdP** | Map to **`auth:`** holes + residual sidecars; no silent vendor emulation. |

Deliverable for a paid program: **corpus + verify slice** per IdP profile, not source-only stubs.

## 3. Data residency and retention

| Topic | Guidance |
| --- | --- |
| **Corpus storage** | NDJSON on customer-controlled storage; optional `corpus-merge`, rotation (`docs/ADMINISTRATION.md`). |
| **Region** | No Chrysalis phone-home; operators pin capture/verify hosts and object-store region. |
| **PII** | `DEFAULT_REDACTION` lockstep (Node + PHP); legal review for new capture modes. |
| **Air-gap** | Offline verify + fleet JSON artifacts (`docs/OPERATIONS.md` V2-M6); no third-party telemetry in generated handlers. |

## 4. Commercial packaging alignment

See [COMMERCIAL.md](./COMMERCIAL.md) revenue order:

1. Professional services / migration programs  
2. Enterprise support / SLA  
3. Licensed CLI (`CHRYSALIS_REQUIRE_LICENSE`, `@chrysalis/license`)  
4. Training  
5. Reference dashboards (operator-owned)

**WPTP program** does not change MIT license on OSS artifacts; exclusivity is **contractual**.

## 5. Policy pack checklist (operator)

- [ ] MSA / DPA covers corpus content and subprocessors  
- [ ] Private adapter repo has README: purpose, invariants, non-goals  
- [ ] Matrix row grade matches harness (no false Gold)  
- [ ] IdP / SSO scope documented as Silver or Bronze until corpora exist  
- [ ] Residency and retention runbook signed by customer security  

## Related

- [WPTP-D6-EXIT-REPORT.md](./WPTP-D6-EXIT-REPORT.md)  
- [WPTP funding tracker](./WPTP-FUNDING-TRACKER.md) (sponsor sign-off, non-blocking)  
- [WPTP global scope](./WPTP-GLOBAL-SCOPE.md)
