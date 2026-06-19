# Paused backlog and maintenance (single index)

> **Status:** authoritative (2026-06-18)  
> **Purpose:** One place for everything that is **not** the default build queue. Strategic plan phases **0–9** are **closed** (**G5680–G6153**). Default build → **maintenance** unless [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §13 is amended.

**Do not treat closed program tables in `ROADMAP.md` or the ship log in [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**

---

## 1. Default queue today

| When the user says "build" without scope | Do this |
| --- | --- |
| Bug fix / regression / CI red | Fix it; keep gates green |
| Mapper gap / new PHP syntax | Maintenance §2 (parser probe) |
| New hole from real customer route | Maintenance §2 (hole economics) + verify |
| Anything else | **Stop** — is it §3 policy-paused, §4 honest gap, or §5 out of scope? If yes, require plan amendment before a new program |

---

## 2. Maintenance (reactive — not a feature backlog)

Work here is **triggered by evidence**, not scheduled slices.

| Trigger | Action | Pointer |
| --- | --- | --- |
| Parser mapper gap | Add contested-syntax page to `fixtures/parser-parity-probe` + parity test | `ROADMAP.md` multi-lane lane A |
| Widen `->query` lowering | Add tracked receiver via `mysqli-probe` routes; keep `db-query-unknown-receiver-probe` at **1** intentional hole | Hole economics lane D |
| IR helper pattern (in B5 rules) | Hub-gated fixture + `docs/IR-HELPER-LIFTING.md` | Option B baseline |
| Package README drift | Update README (purpose, API, invariants, non-goals) | `ROADMAP.md` cross-cutting |
| Redaction / verify regression | Lockstep Node + PHP redactor; run oracle smoke tests | `AGENTS.md` |
| Refresh strict product proof | GCE only: `pnpm run test:gce:phase8-strict` | `docs/PRODUCT-PROOF-PHASE-8.md` |
| Full CI-scale test run | `pnpm run test:gce` on Linux VM | `docs/GCE-LOCAL-VERIFY.md` |

**Cross-cutting hygiene** (security redaction, verify concurrency, docs accuracy) stays ongoing — see trimmed `ROADMAP.md` § Maintenance hygiene.

---

## 3. Policy-paused (do not open without plan amendment)

From [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §11 and `ROADMAP.md`:

| Item | Why paused |
| --- | --- |
| Matrix gold for marketing | Not north-star; structural depth ≠ oracle product |
| WordPress vertical | After Laravel/plain PHP path is boringly reliable |
| "Any language production-ready" claims | No second oracle flagship evidence |
| CWL RFC without oracle/replay linkage | Not north-star |
| Hub UI without verify/evidence tie-in | Not north-star |
| LLM repair bypassing verify | Violates DESIGN §3 |
| 575×26 production parity marketing | Explicit non-goal |
| Rust/Kotlin oracle before Node/Python flagship | P2 pause in workstream table |

---

## 4. Honest gaps (real product work — needs new phase, not silent build)

These are **documented and intentional**; gates record honesty rather than pretending they are done.

| Gap | Current state | To promote to build queue |
| --- | --- | --- |
| **Production SQL/session parity** | [`RUNTIME-CWL-PARITY-PLAN.md`](./RUNTIME-CWL-PARITY-PLAN.md) **Phase C paused**; stub session only | Amend plan → new phase with Redis/DB parity gates |
| **Customer north-star metrics** | Time-to-first-green-verify, cutover correctness, hole-density trend on a **customer slice** | Operator/pilot runbook outside repo; optional in-repo pilot fixture after plan amendment |
| **Commercial launch** | Scaffolding only (`docs/COMMERCIAL.md`, `@chrysalis/license`); no SKUs/pricing/activation in-tree | Business decision + plan amendment |
| **Broader IR helper lifting (non-B5)** | B0–B5.5 v16 baseline closed; bodies beyond equivalence rules | Hub program item only when verify-gated pattern appears |
| **Oracle strict body-proven widening** | Deferred from multi-lane lane B | Hub program when flagship demands it |
| **WPTP D2+ sibling repos** | Out of scope for this monorepo | `docs/MASTER-PROGRAM.md` |

---

## 5. Out of scope (even if requested casually)

Without plan amendment, refuse and point here:

- Chasing full **575×26** matrix for marketing  
- Production-ready CWL runtime claims without verify + contract coverage  
- Promising **any web app, any language** without a second oracle flagship  
- Rebranding structural matrix depth as full-stack oracle parity  

---

## 6. Closed programs (archive — not backlog)

| Program | Closed at | Detail |
| --- | --- | --- |
| Strategic plan phases 0–9 | **G6153** (2026-06-18) | [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §7 |
| Next 90 days + phase ship log | **G6153** | [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) |
| Post-2.0 options A–E | 2026-06-17 | [`ROADMAP-ARCHIVE.md`](../ROADMAP-ARCHIVE.md) |
| Multi-lane Waves 0–6 | **G2399** | `ROADMAP.md` (maintenance note only) |
| CWL full-stack queues 111–437 | schema **510** | [`archive/CWL-FULLSTACK-BUILD-LOG.md`](./archive/CWL-FULLSTACK-BUILD-LOG.md) |
| Hub verify-gaps months 26–30 | schema **74** | Ship log § Hub verify-gaps |
| Hub post–queue 110 Phases A+B | 2026-06 | `ROADMAP-ARCHIVE.md` |

---

## 7. Amending the plan (how paused items become build again)

1. User explicitly requests a strategy change.  
2. Add **`DESIGN.md` Decision Log** entry.  
3. Edit **`docs/STRATEGIC-PLAN.md`** + **`ROADMAP.md`**.  
4. Add a **new phased queue** (e.g. Phase 10) — do not silently reopen closed G-series slices.

---

*Related: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md), [`ROADMAP.md`](../ROADMAP.md), [`ROADMAP-ARCHIVE.md`](../ROADMAP-ARCHIVE.md), [`AGENTS.md`](../AGENTS.md).*
