# WISP full site CWL program (Phase 27)

> **Status:** **active** (2026-06-24, **G7700**)  
> **Authority:** **DESIGN D6268**; [`CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md) ladder step 5; [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) (POC superseded for close bar)  
> **Requires:** **G7690** universal translator program **closed**

## Thesis

**CWL must replace any website’s web application tier** — routes, pages, data, UI, effects, and **API handler logic** — with oracle verify. **WISP Module_Manager** is the **first full-site proof**, not a chimera showcase with permanent proxies and sidecars.

Prior WISP phases (**G6410**, **G6690**) closed **surface waves** and **operator deploy** with:

- `backendConversion: deferred`
- `hub-svelte:firebase-auth` login hole
- `hub-cwl:upstream-proxy` API stubs
- SvelteKit fallback for interactive widgets

Phase **27** supersedes that close bar: **zero app-logic holes**, **native CWL API handlers**, **no chimera Svelte fallback** for chartered routes.

**Charter:** `fixtures/hub-wisp-full-site-slice/chrysalis.wisp-full-site.v1.json`

**Infra that stays infra:** MongoDB, Firebase as vendor auth provider, ArcGIS SDK in browser — but **web application code** is CWL-authored and verify-backed.

## Phases

### Phase 27a — Full-site charter (**G7701**)

Signed charter, docs aligned, WISP fixture inventory baselined.

**Close:** `pnpm run hub:wisp-phase27a-close-smoke`

### Phase 27b — CWL API native (**G7702**)

Lift `backend-services` route classes to native CWL handlers; retire `hub-cwl:upstream-proxy` on chartered APIs.

**Close:** `pnpm run hub:wisp-phase27b-close-smoke`

### Phase 27c — CWL UI module depth (**G7703**)

Replace `hub-svelte:page-component` stubs with native `@component` / islands on module waves M0–M5.

**Close:** `pnpm run hub:wisp-phase27c-close-smoke`

### Phase 27d — Auth + session (**G7704**)

Close `/login` hole; JWT + `X-Tenant-ID` effects parity with WISP `apiService`.

**Close:** `pnpm run hub:wisp-phase27d-close-smoke`

### Phase 27e — Integrations (**G7705**)

ArcGIS, Stripe, charts: native CWL UI bindings or chartered vendor surfaces with verify.

**Close:** `pnpm run hub:wisp-phase27e-close-smoke`

### Phase 27f — Cutover (**G7706**)

Chimera out for WISP app logic; `runtime-cwl` serves 100% of chartered routes; `WISP_SVELTE_FALLBACK` off.

**Close:** `pnpm run hub:wisp-phase27f-close-smoke`

### Program close (**G7790**)

Phases **27a–27f** + **G7690** regression composite green.

**Smoke:** `pnpm run hub:wisp-full-site-close-smoke`

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| **G7700** | Program entry | `hub:wisp-full-site-program-entry-smoke` |
| **G7701** | Phase 27a charter close | `hub:wisp-phase27a-close-smoke` |
| **G7702** | Phase 27b API native close | `hub:wisp-phase27b-close-smoke` |
| **G7703** | Phase 27c UI depth close | `hub:wisp-phase27c-close-smoke` |
| **G7704** | Phase 27d auth close | `hub:wisp-phase27d-close-smoke` |
| **G7705** | Phase 27e integrations close | `hub:wisp-phase27e-close-smoke` |
| **G7706** | Phase 27f cutover close | `hub:wisp-phase27f-close-smoke` |
| **G7790** | **WISP full site program close** | `hub:wisp-full-site-close-smoke` |

## Default build queue (while active)

1. **Phase 27a → 27f** in order (**close before build**)
2. **G7690** regression subordinate after each phase close
3. **G6731** optional

## Related

- [`CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md`](./CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md) — **G7690**
- [`CWL-UI-LOGIN-BRIDGE.md`](./CWL-UI-LOGIN-BRIDGE.md) — superseded at **G7704** close
- [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) — POC history
