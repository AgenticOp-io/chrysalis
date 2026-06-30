> **Archive notice:** Closed **program** — regression and history only. Active stack: [`MIGRATION-OS.md`](./MIGRATION-OS.md). Index: [`archive/INDEX.md`](./archive/INDEX.md).

# WISP full site CWL program (Phase 27)

> **Status:** **Program closed** (2026-06-25, **G7790**) — was **active** (**G7700**, 2026-06-24)  
> **Authority:** **DESIGN D6268**; [`CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md) ladder step 5; [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) (POC superseded for close bar)  
> **Requires:** **G7690** universal translator program **closed**

## Thesis

**CWL must replace any website’s web application tier** — routes, pages, data, UI, effects, and **API handler logic** — with oracle verify. **WISP Module_Manager** is the **first full-site proof**, not a chimera showcase with permanent proxies and sidecars.

Phase **27** closed with **zero app-logic holes**, **native CWL API handlers**, **native CWL UI islands**, **native session auth**, and **runtime-cwl cutover** (no chimera Svelte sidecar for app logic).

**Charter:** `fixtures/hub-wisp-full-site-slice/chrysalis.wisp-full-site.v1.json`

**Infra that stays infra:** MongoDB, Firebase as vendor auth provider, ArcGIS SDK in browser — but **web application code** is CWL-authored and verify-backed.

## Phases (closed)

### Phase 27a — Full-site charter (**G7701** — closed)

**Close:** `pnpm run hub:wisp-phase27a-close-smoke`

### Phase 27b — CWL API native (**G7702** — closed)

**Apply:** `pnpm run wisp:apply-phase27b-native-api`  
**Close:** `pnpm run hub:wisp-phase27b-close-smoke`

### Phase 27c — CWL UI module depth (**G7703** — closed)

**Apply:** `pnpm run wisp:apply-phase27c-native-ui`  
**Close:** `pnpm run hub:wisp-phase27c-close-smoke`

### Phase 27d — Auth + session (**G7704** — closed)

**Apply:** `pnpm run wisp:apply-phase27d-native-auth`  
**Close:** `pnpm run hub:wisp-phase27d-close-smoke`

### Phase 27e — Integrations (**G7705** — closed)

ArcGIS, charts, MongoDB scenarios chartered with verify backlog indexed.

**Close:** `pnpm run hub:wisp-phase27e-close-smoke`

### Phase 27f — Cutover (**G7706** — closed)

**Apply:** `pnpm run wisp:apply-phase27f-cutover`  
**Close:** `pnpm run hub:wisp-phase27f-close-smoke`

### Program close (**G7790** — closed)

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

## Default queue (post close)

**G7790 regression:** `pnpm run hub:wisp-full-site-close-smoke` (includes **G7690**).

## Related

- [`CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md`](./CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md) — **G7690**
- [`CWL-UI-LOGIN-BRIDGE.md`](./CWL-UI-LOGIN-BRIDGE.md) — superseded at **G7704** close
- [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) — POC history
