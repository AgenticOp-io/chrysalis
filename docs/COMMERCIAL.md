# Commercial offerings (revenue order)

**Outbound practice:** **[AgenticOp](https://agenticop.io)** — human-facing services and programs that combine professional delivery with **Chrysalis** oracle replay and **`chrysalis verify`**. Naming: **AgenticOp** is the **official** spelling; use **`https://agenticop.io`**; avoid **AgenticOps** / **`agenticops.*`** in new materials. See **[`AGENTICOP.md`](./AGENTICOP.md)** and **`branding/agenticop/`** for logos.

**Publication status:** This page is a **maintainer playbook** and describes **future** revenue levers. The **commercial program is not publicly launched**: there is no published SKU catalog, public pricing page, or **standalone npm** release of **`@chrysalis/license`** tied to a paid product yet. The monorepo may still ship **in-tree** license verification so vendor builds can opt in later; default OSS use stays **unchanged** (license gate off).

Chrysalis is **open source (MIT)** in this repository. Revenue scales with **services and contracts**, then **distribution / SLA**, then **optional technical enforcement** for vendor builds. This page lists offerings **largest gain first**; implement billing and contracts **outside** the repo (Stripe, order forms, MSAs).

## 1. Professional services and migration programs (highest LTV)

**What:** Fixed-scope or time-and-materials work: corpus design, ingest/emit on customer trees, chimera cutover, five-nines verify hardening, auth/vendor edge cases, operator runbooks.

**Why it monetizes:** Ties directly to production risk reduction; priced on outcomes and senior time, not on lines of OSS.

**Deliverables:** SOW, weekly milestones, handoff docs referencing **`docs/DEPLOYMENT.md`**, **`docs/USER-GUIDE.md`**, **`docs/OPERATIONS.md`**, and **`docs/ADMINISTRATION.md`**.

## 2. Enterprise support and SLA (recurring)

**What:** Named support channel, response-time SLA, security advisory handling for oracle/redaction touchpoints, release alignment, optional private issue intake.

**Why it monetizes:** Recurring revenue; pairs with teams running **`verify`**, **`chimera deploy`**, and flagship gates in CI.

**Technical tie-in:** Same codebase; no special build required. Reference **`SECURITY.md`** for vulnerability reporting.

## 3. Licensed distribution (CLI enforcement)

**What:** A **vendor** or **enterprise** build that sets **`CHRYSALIS_REQUIRE_LICENSE=1`** in customer CI/production environments, plus a **signed license envelope** (Ed25519) and your **public key**. Optional SKU split via **`CHRYSALIS_LICENSE_MIN_TIER=dev|pro|enterprise`** (ordering: **dev < pro < enterprise**).

**Why it monetizes:** Creates a **contractual** and **technical** pairing: customers who paid receive keys; you rotate keys on renewal.

**In-repo tooling:**

- Package **`@chrysalis/license`** — verify/sign envelopes (**no network**).
- CLI **`chrysalis license check|print`** — validate materials.
- **`scripts/sign-license.mjs`** — issue envelopes (**`pnpm run license:sign`** after **`pnpm --filter @chrysalis/license build`**).

**Non-goals in-tree:** Stripe, activation servers, or **usage tracking** that phones home. Your billing system emits **`claims.json`**; you sign with **`CHRYSALIS_LICENSE_PRIVATE_KEY_PATH`**.

### Suggested tier mapping (example)

| Tier | Typical SKU | `CHRYSALIS_LICENSE_MIN_TIER` |
| --- | --- | --- |
| **dev** | Eval / pilot | `dev` |
| **pro** | Team production | `pro` |
| **enterprise** | Org-wide + priority support | `enterprise` |

## 4. Training and enablement (mid)

**What:** Workshops on WebIR, oracle capture, verify interpretation, **`chrysalis status --json`**, migration sidecars.

**Why it monetizes:** Accelerates adoption; low marginal cost after first curriculum.

## 5. Reference dashboards and examples (low direct revenue, high credibility)

**What:** Grafana/Loki panels or a small example repo consuming **`chrysalis.chimera.*`** / verify summary JSON (**operator-owned**; **no built-in data collection to third parties** per **`ROADMAP.md`**).

**Why it monetizes:** Supports upsell to services and support; rarely a standalone SKU.

## Legal and positioning

- **MIT** allows broad use; **exclusivity** comes from **contracts**, **support**, **trademark**, and **distribution keys**, not from hiding the core source unless you pursue a **separate** dual-license strategy with counsel.
- For commercial terms, privacy, and liability, use your own **MSA** / **order form**; keep **`SECURITY.md`** as the vulnerability intake path.

## Next steps (operator checklist)

1. Stand up **contracts + invoicing** for (1) and (2).  
2. Define **tier → `claims.tier`** and optional **`claims.features`** for (3).  
3. Run **`pnpm run license:sign`** from a **secure** machine holding the **private** key.  
4. Document customer env vars: **`CHRYSALIS_REQUIRE_LICENSE`**, **`CHRYSALIS_LICENSE`**, **`CHRYSALIS_LICENSE_PUBLIC_KEY_PATH`**, optional **`CHRYSALIS_LICENSE_MIN_TIER`**.
