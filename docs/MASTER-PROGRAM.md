# Web Platform Translation Program — Master charter and execution plan

> **This document defines a program *above* a single repository.** The **Chrysalis** codebase (`theorem6/chrysalis`) is the **first engineering deliverable** and remains the **reference leg** for **PHP → WebIR → verified TypeScript** until the program explicitly promotes a broader neutral IR or additional adapters.  
> **Governance:** Expanding the *Chrysalis product charter* (see root **`DESIGN.md`**) still requires that document’s Decision Log. This **master program** may spawn **forks and sibling repos** whose *own* `DESIGN.md` states wider scope. Do not silently conflate “Chrysalis the PHP migration framework” with “universal web translator” on `main` without a decision.

---

## 1. Executive summary

**Program name (working):** **Web Platform Translation Program (WPTP)**  
**North-star outcome:** A **family of tools and contracts** that maximize **automated, evidence-backed migration** between **web-relevant stacks** (frameworks, runtimes, and deployment profiles customers actually run), organized as a **hub-and-spoke** system around a **versioned intermediate representation (IR)** and **graded verification**.

**What this is not (explicit non-goals):**

- **Not** a promise of **bit-identical** or **pixel-identical** translation for arbitrary third-party sites without legal capture rights.
- **Not** a single monolith that “understands all languages” by string transpilation; **verification and holes** remain central.
- **Not** a replacement for **Chrysalis’** existing **oracle-first PHP** story; Chrysalis remains **in scope** as **Deliverable 1 (D1)** until the program archives it as “reference complete” and continues on sibling repos.

**Chrysalis’ role:** **D1 — Reference implementation** for one **high-value vertical**: **legacy PHP** applications with **HTTP + SQL + session** oracle capture, **WebIR**, **emit** (Hono / Fastify today), **verify**, **dual-stack (Chimera)**. When Chrysalis milestones in **`ROADMAP.md`** are met for the chartered product, WPTP records **“Chrysalis baseline complete”** and **continues engineering on D2+** (neutral IR and additional legs).

**Execution policy (normative):** **Technical exit criteria** gate phase transitions. **Program sponsor / funding sign-off** is tracked as a **future** lane (§10) and does **not** block repository work, sibling repos, or the GitHub Project board. Use funding only for **external** claims (paid programs, marketing “fully funded” language) — not for day-to-day merges.

---

## 2. Stakeholders and decision rights

| Role | Responsibility |
| --- | --- |
| **Program sponsor** | **Future:** funds phases, accepts matrix grades, owns legal posture for capture/scrape products. Does not gate engineering merges. |
| **Architecture board** | Approves IR schema major versions, verification grades, and public “supported edge” claims. |
| **Chrysalis maintainers** | Own **`theorem6/chrysalis`** until fork/split; merge per **`AGENTS.md`**. |
| **WPTP workstream leads** | Own sibling repos (IR hub, adapters, emitters, verify harnesses). |

**Escalation:** Any change that **weakens** “no unverified ship” or “holes not silent hacks” must be a **written decision** in the relevant repo’s **Decision Log**.

---

## 3. Vision (bounded universality)

**Bounded universality** means:

1. **Many sources** (eventually): not only PHP AST; also **OpenAPI**, **browser traces**, **export packs** from SaaS platforms where contractually allowed, etc.
2. **Many targets** (eventually): not only Hono/Fastify; e.g. **Next.js route handlers**, **static workers**, **other typed runtimes** — each with an **emit package** and **verify harness**.
3. **One IR hub** (eventually): **Neutral IR** or **IR interchange** that can **import** Chrysalis **WebIR** (or fragments) and **export** to other emitters — **versioned**, **provenance-carrying**, **uncertainty-explicit**.

**Combinatorics rule:** The product is **not** “every pair out of the box.” It is a **curated compatibility matrix** plus **composer-planned paths** (e.g. A → IR → B, or A → IR → C → B) with **documented grades** (see §8).

---

## 4. Architectural reference model

```
                    ┌─────────────────────────────────────────┐
  Source platforms  │  Adapters (per family: capture + lift)   │
  (PHP, APIs,      │  — legal boundary: customer-owned or    │
   browser, …)     │    licensed inputs only by default       │
                    └──────────────────┬──────────────────────┘
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  IR hub (versioned schema + effects + │
                    │  provenance + confidence + holes)      │
                    │  ← import path from Chrysalis WebIR     │
                    └──────────────────┬──────────────────────┘
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  Emitters (per target stack)            │
                    └──────────────────┬──────────────────────┘
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  Verify harness (per target + profile) │
                    │  — replay, contract, fuzz, manual gates   │
                    └─────────────────────────────────────────┘
```

**Chrysalis today** implements the **lower half** of the first **vertical slice** (PHP adapter + WebIR + TS emit + verify + chimera). WPTP **names** the missing **explicit hub** and **additional spokes** as **later deliverables**, often in **separate repositories**.

---

## 5. Repository and organization topology

**Recommended layout (evolve as needed):**

| Repository | Purpose | When |
| --- | --- | --- |
| **`theorem6/chrysalis`** (this repo) | **D1** — PHP oracle, WebIR, emit-hono/fastify, verify, chimera, docs | **Now**; remains source of truth for PHP leg until board agrees migration of responsibilities. |
| **[`theorem6/wptp-ir`](https://github.com/theorem6/wptp-ir)** | IR schema **v0.1.0**, validators, **10+** fixtures, WebIR bundle import + loss report | **D2 in progress** (tiny-blog flagship **zero losses**) |
| **[`theorem6/wptp-matrix`](https://github.com/theorem6/wptp-matrix)** | Public **compatibility matrix** JSON + validator (no false Gold) | **D5 exit met** — **20** edges, Pages, `verify:harness` (**2026-05-19**) |
| **[`theorem6/wptp-adapter-openapi`](https://github.com/theorem6/wptp-adapter-openapi)** | OpenAPI 3 → IR v0 routes (**bronze**) | **D3** — supported |
| **[`theorem6/wptp-adapter-browser`](https://github.com/theorem6/wptp-adapter-browser)** | HAR → IR v0 routes (**bronze**) | **D3** — supported |
| **[`theorem6/wptp-emit-nextjs`](https://github.com/theorem6/wptp-emit-nextjs)** | IR v0 → Next.js App Router stubs | **D4** — bronze starter |
| **`theorem6/wptp-adapter-*`** (other families) | Additional sources | **planned** |
| **`theorem6/wptp-emit-*`** (new, per target) | Emitters beyond current `emit-*` | **D4+** per target business case. |
| **`theorem6/wptp-verify-*`** (new, optional) | Shared replay libraries | When duplication across emitters hurts. |

**Fork policy:** Sibling repos **fork or depend on** Chrysalis **by license** (MIT); **do not** copy-paste core IR without submodule or package boundary. Prefer **`workspace:`-style** consumption only inside a monorepo if the org later merges repos — **default is multi-repo** for blast radius.

---

## 6. Phased program plan (deliverables)

Each phase has **entry criteria**, **exit criteria**, and **artifacts** (docs, repos, CI gates, public matrix row).

### D0 — Program charter and GitHub Project (governance)

- **Entry:** This charter published in-tree (or org wiki mirror when available).
- **Exit:** GitHub Project **“Web Platform Translation Program”** created (see §12), **Workstream** field in use, initial draft issues filed (§12).
- **Artifacts:** This file; **`docs/GITHUB_PROJECT.md`** updated; optional org-level README.
- **Status:** **Complete** for engineering execution (Project #1 + §12 items). Formal sponsor charter vote: **future** (§10).

### D1 — Chrysalis reference leg (first engineering deliverable)

- **Entry:** D0 complete.
- **Exit (technical):** **“Chrysalis baseline”** per §10 engineering checklist and **`ROADMAP.md`** closed milestones: **tagged release**, **CI green**, **operator docs**, **dual-stack** runbook accepted.
- **Artifacts:** Releases on **`theorem6/chrysalis`**; machine JSON artifacts documented in root **`README.md`**; **[`docs/WPTP-D1-EXIT-REPORT.md`](./WPTP-D1-EXIT-REPORT.md)**.
- **Status (2026-05-16):** **D1 exit met** for program execution. **D2+ proceeds** without waiting on funding (§10).

### D2 — IR hub specification v0

- **Entry:** D1 technical exit (not contingent on sponsor funding).
- **Exit:** **`wptp-ir`** public **schemaVersion 0** with: **loss report** from a **WebIR subset** (flagship: tiny-blog **zero losses**); **10+ golden fixtures**; **RFC-style** versioning policy.
- **Artifacts:** [theorem6/wptp-ir](https://github.com/theorem6/wptp-ir); conformance tests; **import** from **`chrysalis.webir.bundle@1.0.0`** (Chrysalis **`scripts/export-webir-bundle.mjs`**).
- **Status (2026-05-16):** **In progress** — skeleton, import, tiny-blog flagship, tests green; semver tag and export CLI polish remain.

### D3 — Second **source** profile (non-PHP)

- **Entry:** D2 exit.
- **Exit:** One **additional** source family (e.g. **OpenAPI + mock traces** or **Playwright trace import**) produces **IR v0** with **verify story** for **at least one** existing Chrysalis emit target (reuse Hono verify).
- **Artifacts:** `wptp-adapter-*` repo; legal review for capture mode.

### D4 — Second **emit** target family

- **Entry:** D3 exit.
- **Exit:** New emitter + **verify harness** + **one** golden app ported **IR → new target** with **graded** matrix entry (§8).
- **Artifacts:** `wptp-emit-*` repo; docs for operator.

### D5 — Compatibility matrix product

- **Entry:** D4 exit.
- **Exit:** Public **matrix** (site or repo) with **≥6** supported **edges** (source,target,grade); **composer** CLI or docs for multi-hop; **no false “green”** without harness proof.
- **Status (2026-05-19):** **Exit met** — [wptp-matrix](https://github.com/theorem6/wptp-matrix) **20** edges, **10** composer paths, GitHub Pages, `npm run verify:harness`; Chrysalis optional job **`wptp-harness-smoke.yml`** with `CHRYSALIS_ROOT`.
- **Artifacts:** Matrix JSON schema; CI that fails if docs claim unsupported green; [WPTP funding tracker](./WPTP-FUNDING-TRACKER.md) (non-blocking).

### D6 — Enterprise connectors and policy packs

- **Entry:** Sponsor demand.
- **Exit:** **Private** adapters policy (contracts, SSO, data residency); optional commercial packaging aligned with **`docs/COMMERCIAL.md`** patterns.

### D7 — Continuous expansion (ongoing)

- **Entry:** D5 exit.
- **Exit:** N/A (ongoing); **quarterly** board review of matrix claims vs harness coverage.

---

## 7. Verification and grading model (normative for WPTP claims)

| Grade | Meaning | Minimum evidence |
| --- | --- | --- |
| **Gold** | Automated **replay** (or equivalent contract suite) passes on **representative corpus**; holes **bounded** and **reported**. | CI job + public fixture pack or customer-attested private runbook. |
| **Silver** | **Partial** automation; manual sign-off for listed dimensions (e.g. auth, file uploads). | Documented checklist + sample size. |
| **Bronze** | **Structural** lift only; **explicit delegation** to legacy or human. | Hole report + migration dashboard metrics. |

**Rule:** Marketing may only claim **Gold** for edges that meet the table. **Chrysalis** edges today should be **classified honestly** when the matrix launches (likely **Gold** for scoped PHP+Hono/Fastify+tiny-blog/flagship paths where CI proves it).

---

## 8. Legal, ethics, and data handling

- **Default:** Inputs are **customer-owned** or **explicitly licensed** (contract, export API, scrape ToS).
- **Redaction:** Oracle/redaction lockstep rules (**`AGENTS.md`**) extend to **any** new capture adapter; **parity tests** per stack pair that handles PII.
- **Abuse resistance:** Public “translate any URL” features require **abuse review** (rate limits, blocklists, ToS).

---

## 9. Risk register (initial)

| Risk | Mitigation |
| --- | --- |
| **IR becomes lowest common denominator** | Version dialects; **loss reports** on import/export. |
| **N×N unmaintainable** | Matrix + **composer**; **deprecate** edges that lack CI. |
| **Chrysalis scope creep on `main`** | **Fork** or **sibling repo** for neutral IR; Decision Log in each repo. |
| **Verification cost explodes** | **Gold** only where CI proves; otherwise **Silver/Bronze**. |

---

## 10. Chrysalis “D1 complete” checklist (technical — gates engineering)

Use **`ROADMAP.md`** as the technical source of truth. These items **gate** D1 exit and **D2 entry**. They are **not** blocked on sponsor funding.

- [x] Latest **tagged release** (semver) published and linked from program Project (**v2.0.1** / **v2.0.0** on `main`; link from Project readme when the board exists).
- [x] **`pnpm test`** / **`typecheck`** / flagship verify jobs **documented** and **green** on `main` (see root **`README.md`**, **`.github/workflows/`**, **`docs/ADMINISTRATION.md`**).
- [x] **Operator docs** (`docs/*`, root **`README.md`**) reviewed for **matrix** wording (no over-claim) — deployment, user, operations, and how-to guides in **`docs/`**.

**D1 technical exit:** **recorded** — see **[`docs/WPTP-D1-EXIT-REPORT.md`](./WPTP-D1-EXIT-REPORT.md)**.

### 10.1 Future — program funding (non-blocking)

Tracked on the GitHub Project under **Legal and trust** / sponsor workstream. **Does not hold up** merges, sibling repos, or D2–D7 engineering.

- [ ] **Sponsor / funding sign-off** for paid programs and external “fully funded phase” messaging.
- [ ] **Budget** allocated for D3+ adapters and hosted matrix site (when prioritized).

*(Check when a sponsor meeting happens; until then, proceed on technical milestones.)*

---

## 11. GitHub Project (master program) — bootstrap

**Prerequisites:** GitHub CLI with **`project`** and **`read:project`** scopes:

```bash
gh auth refresh -s project,read:project
gh auth status
```

**Create (or reuse) the master program project** from this repo’s bootstrap script using the **`master`** preset:

```bash
# Unix / Git Bash
CHRYSALIS_GH_PROJECT_PRESET=master \
CHRYSALIS_GH_PROJECT_TITLE="Web Platform Translation Program" \
node scripts/bootstrap-github-project.mjs

# Windows PowerShell (or from repo root)
pnpm run github:project-bootstrap:master
# Equivalent:
# $env:CHRYSALIS_GH_PROJECT_PRESET = "master"
# node scripts/bootstrap-github-project.mjs --preset=master
```

**Optional:** set **`CHRYSALIS_GH_PROJECT_OWNER`** to your **org** user name if the project should live under an org.

The script **links** the project to **`repository.url`**’s repo (default **`theorem6/chrysalis`**) so Issues/PRs here can appear on the board. **Sibling repos** can be linked from the GitHub UI (**Project settings → Linked repositories**) when they exist.

**Custom fields (when preset=`master`):**

- **Lane** — program phases (see script for exact option text).
- **Board status** — Backlog / In progress / Blocked / Done.
- **Workstream** — Chrysalis (D1) | IR hub | Adapters | Emitters | Verify | Matrix & product | Legal & trust.

---

## 12. Initial draft issues (create in GitHub after Project exists)

**Automated (recommended):** after `gh auth refresh -s project,read:project`, run the bootstrap script with **`CHRYSALIS_GH_PROJECT_PRESET=master`** (section **11**). It creates **project draft items** for the list below when no item with the same title exists, and sets **Lane**, **Board status** (Backlog), and **Workstream**. To skip that step: **`CHRYSALIS_GH_PROJECT_SEED_ITEMS=0`**.

**Manual:** copy as draft issues; set **Lane** and **Workstream** on each.

1. **D0 — Approve `docs/MASTER-PROGRAM.md` v1** (Legal + Architecture board).
2. **D0 — Link sibling repos to Project** (placeholder until repos exist).
3. **D1 — Confirm Chrysalis D1 exit checklist** (§10) against **`ROADMAP.md`**.
4. **D2 — Publish IR hub repo skeleton** (`wptp-ir` or chosen name) with README: purpose, invariants, non-goals.
5. **D2 — Define WebIR → IR v0 import mapping** (technical design issue; link DESIGN D decisions).
6. **D3 — Select second source profile** (OpenAPI vs browser trace vs other) with legal review sub-issue.
7. **D4 — Select second emit target** (business-driven) with verify harness spike.
8. **D5 — Matrix schema + website** (public JSON + CI guard against false greens).
9. **Standing — Quarterly matrix audit** (recurring).

---

## 13. Communication

- **Public narrative:** “**Evidence-backed web migration platform**; **Chrysalis** is the **PHP reference stack**.”
- **Internal narrative:** “**WPTP** owns the **matrix**; **Chrysalis** owns **PHP depth** until D2 splits IR ownership.”

---

## 14. Document control

| Version | Date | Author | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-05-14 | Program draft | Initial charter + plan in Chrysalis `docs/` for discoverability; may move to org wiki. |

---

*For GitHub CLI mechanics and troubleshooting, see [GitHub Project](./GITHUB_PROJECT.md). For Chrysalis-only engineering milestones, see [`ROADMAP.md`](../ROADMAP.md). For non-negotiables inside this repo, see [`DESIGN.md`](../DESIGN.md) and [`AGENTS.md`](../AGENTS.md).*
