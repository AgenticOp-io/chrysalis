> **Archive notice:** Closed **program** — regression and history only. Active stack: [MIGRATION-OS.md](./MIGRATION-OS.md). Index: [rchive/INDEX.md](./archive/INDEX.md).

# CWL universal web language program (Phases 19–23)

> **Status:** **Program closed** (2026-06-24, **G7390**) — was **active** (**G7300**, 2026-06-16)  
> **Authority:** **DESIGN D6260**; [`CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md); [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §7; [`CWL-LANGUAGE-PROGRAM.md`](./CWL-LANGUAGE-PROGRAM.md) (Phases 15–18 closed **G7150**)  
> **Supersedes:** maintenance-only default queue between **G7150** and this program (**D6259** WISP decoupled remains)

## Thesis

**CWL replaces web application language as source** — PHP route handlers, Express/Fastify handlers, SvelteKit server surfaces, Next.js App Router server modules, and OpenAPI operation shells — while lowering through **WebIR** to emit targets and **oracle verify**.

This program closes the gap between **“complete language on flagship charter”** (**G7150**) and **“credible replacement for any serious migration’s in-scope web code.”**

**CWL is authoritative.** WISP is an **optional showcase POC** (**D6259**) — wins here must **generalize**; WISP-specific paths stay catalogued.

## Scope boundary (non-negotiable)

CWL **does not** replace (see [`CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md)):

| Layer | Role |
| --- | --- |
| Databases, queues, legacy backend binaries | Infra — proxied or hole-catalogued |
| Firebase Auth / Hosting / Cloud Functions | Vendor deploy + explicit bridges |
| Browser runtimes (V8), ArcGIS SDK, chart libraries | Client vendor — holes or documented sidecars |
| GenieACS / WISPTools legacy ACS | **Out of scope** (**D6205**) |

**“Universal web language”** means **authoring source for routes, pages, loaders, effects, and UI composition** — not replatforming operator backends.

## Starting point (post G7150)

| Surface | G7150 state | Universal program closes |
| --- | --- | --- |
| **CWL API** | Shipped RFC-0001–0008 | Framework ingest at scale (Phase 22) |
| **CWL Pages** | Shipped RFC-0010/0011/0014 | — (maintenance) |
| **CWL Data** | Shipped on charter (G7120) | Full load shapes + Next/Svelte ingest (Phase 20) |
| **CWL Effects** | Executable session (G7130) | Middleware-equivalent chains (Phase 21) |
| **CWL UI** | v0 server tree (G7110) | v1: islands, hydration policy, client behavior (Phase 19) |
| **Cutover** | Ladder step 5 evidence (G7140) | Greenfield-only template (Phase 23) |

## Replacement ladder (this program)

```text
19. CWL UI v1       — components + hydration + verify (close hub-*:page-component on charter)
20. CWL Data v2     — parallel loads, redirects, errors; SvelteKit/Next server ingest
21. Effects middleware — authz, CSRF, CORS chains; executable + replay
22. Universal ingest   — PHP + JS frameworks → CWL default; pilot ≥99% native routes
23. Greenfield cutover   — chimera-out template; CWL-only new apps
```

Program close **G7390** composes Phases **19–23** + **G7150** regression + **G7200** IR Helper maintenance subordinate.

## Phases

### Phase 19 — CWL UI v1 (**closed**, **G7310**)

**Win:** Native UI beyond RFC-0017 v0 — props, server/client islands, hydration policy, event bindings — with **verify-backed** HTML + serialized load replay. **No silent Svelte/React lowering.**

| Deliverable | Criterion |
| --- | --- |
| **RFC-0019** (draft) | UI v1 syntax, island boundaries, hydration non-goals |
| **WebIR** | Component tree nodes with `id`, `type`, `effects`, `provenance`, `origin` |
| **Emit / runtime** | `runtime-cwl` server HTML + optional client bundle contract |
| **Verify** | Oracle replay for rendered output; no hydration claims without replay proof |
| **Hole budget** | Zero `hub-svelte:page-component` on **flagship CWL-native routes**; vendor bridges documented (login, ArcGIS, etc.) |

**Refuse:** silent component lowering; IR helper B-tier as UI substitute; hydration without RFC.

**Close gate G7310:** `pnpm run hub:cwl-phase19-close-smoke`  
**Entry G7304:** `pnpm run hub:cwl-phase19-entry-smoke`

### Phase 20 — CWL Data v2

**Win:** Full RFC-0013 load semantics on chartered apps; SvelteKit `+page.server.ts` and Next App Router server modules ingest to `load { }` or explicit holes.

| Deliverable | Criterion |
| --- | --- |
| **RFC-0013 v2** | Parallel loads, redirects, errors, cookies/headers in load, load dependencies |
| **Ingest** | wptp-matrix / wptp-emit-nextjs gold routes → CWL Data surface |
| **Verify** | Load replay twins for every new shape |

**Close gate G7320:** `pnpm run hub:cwl-phase20-close-smoke`

### Phase 21 — CWL Effects middleware

**Win:** Middleware-equivalent behavior — authz, rate limits, CSRF, CORS — as **executable** CWL Effects chains with verify replay (extends G7130).

| Deliverable | Criterion |
| --- | --- |
| **RFC-0020** (draft) | Effect chain composition, ordering, failure semantics |
| **Lowering** | `wrapCwlExecutableEffects` extended beyond session.read/write |
| **Verify** | Protected routes replay with effects enforced in sandbox |

**Close gate G7330:** `pnpm run hub:cwl-phase21-close-smoke`

### Phase 22 — Universal ingest

**Win:** Multi-origin ingest produces CWL as **default migration output** for PHP + JS framework server surfaces at pilot scale.

| Deliverable | Criterion |
| --- | --- |
| **PHP depth** | IR Helper body shapes H1/H2 where B-tier insufficient; verify-gaps on real apps |
| **SvelteKit / Next** | Structural gold → CWL surfaces with per-app hole budgets |
| **OpenAPI / HAR** | Contract-first `@route` generation (WISP API proxy pattern generalized) |
| **Pilot metric** | One non-WISP pilot app: **≥99%** in-scope routes native CWL, verify **≥99%** |

**Close gate G7340:** `pnpm run hub:cwl-phase22-close-smoke`

### Phase 23 — Greenfield cutover template

**Win:** Documented, gated path to author **new apps only in CWL** with **no chimera sidecars** for app logic (ladder step 5 for greenfield).

| Deliverable | Criterion |
| --- | --- |
| **Template module** | Flagship-scale fixture authored 100% CWL |
| **Deploy** | `runtime-cwl` default; explicit vendor holes only |
| **Verify** | Full trace replay; hole manifest signed |

**Close gate G7350:** `pnpm run hub:cwl-phase23-close-smoke`

### Program close — universal web language (**G7390**)

**Win:** Phases **19–23** closed; **G7150** + **G7200** regression green; external claim allowed: *CWL replaces web application language as verified source* within scope boundary above.

**Smoke:** `pnpm run hub:cwl-universal-language-close-smoke`

## Gates

| ID | Gate | Smoke / function |
| --- | --- | --- |
| **G7300** | Program entry | `pnpm run hub:cwl-universal-language-program-entry-smoke` |
| G7304 | Phase 19 entry | `hub:cwl-phase19-entry-smoke` |
| **G7310** | Phase 19 UI v1 close | `hub:cwl-phase19-close-smoke` |
| **G7320** | Phase 20 Data v2 close | `hub:cwl-phase20-close-smoke` |
| **G7330** | Phase 21 Effects middleware close | `hub:cwl-phase21-close-smoke` |
| **G7340** | Phase 22 Universal ingest close | `hub:cwl-phase22-close-smoke` |
| **G7350** | Phase 23 Greenfield cutover close | `hub:cwl-phase23-close-smoke` |
| **G7390** | **Universal web language program close** | `hub:cwl-universal-language-close-smoke` |

## Default build queue (program closed — maintenance)

Per [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12:

1. **G7390 regression** — `pnpm run hub:cwl-universal-language-close-smoke`
2. **G7150 / G7200** — subordinate regression (included in G7390 composite)
3. **G6731** IR helper tier regression — optional
4. **WISP POC** — optional only (**D6259**)

## Explicit non-goals

- Replacing MongoDB, Express backends, Firebase Hosting, GenieACS
- LLM repair bypassing verify
- Function-level PHP↔TS FFI
- Marketing “575×26 production” without oracle on customer routes
- Re-opening WISP as default CI gate (**D6259**)

## Related

- [`CWL-LANGUAGE-PROGRAM.md`](./CWL-LANGUAGE-PROGRAM.md) — Phases 15–18 (**G7150**)
- [`IR-HELPER-PROGRAM.md`](./IR-HELPER-PROGRAM.md) — ingest depth (**G7200**)
- [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) — default queue index
