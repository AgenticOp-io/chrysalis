# WISP CWL UI parity program (Phase 31)

> **Status:** **Program closed** (2026-06-16, **G8100**) — was **active**  
> **Authority:** **DESIGN D6274**; requires **G7990** WISP production completion **closed**  
> **Predecessor:** [`WISP-PRODUCTION-COMPLETION-PROGRAM.md`](./WISP-PRODUCTION-COMPLETION-PROGRAM.md)

## Thesis

Phase **29** closed API oracle, static export, and operator deploy contract (**G7990**). That bar does **not** require full Svelte POC UI parity on every route. Phase **31** closes the **automated UI parity** gap for pure CWL deploy (chimera + `runtime-cwl`, no Svelte sidecar): bulk lift from Module_Manager POC, anchor-route HTTP probes, and a forbidden-stub crawler so operators never hand-check route-by-route.

## Phases

### Phase 31a — Bulk Svelte lift

Replace Phase **27c** / **28g** UI stubs and `@route` holes with `@page` `return html` blocks — lifted Svelte markup when `+page.svelte` exists, otherwise `wisp-app-surface` shell.

**Command:** `pnpm run wisp:apply-phase31-bulk-lift`

### Phase 31b — Anchor parity (login, dashboard, plan, deploy, coverage-map)

Dedicated POC layout for anchor routes (Phase **30** / **30b** apply scripts run after bulk lift).

**Commands:** `wisp:apply-phase30-ui-parity`, `wisp:apply-phase30b-module-parity` (wired in pipeline apply chain)

### Phase 31c — Automated close gate (**G8100**)

Forbidden-stub scan on response bodies, parity manifest, CWL HTML hyphen guard (**D6274**), chimera anchor HTTP probes.

**Close:** `pnpm run hub:wisp-cwl-ui-parity-close-smoke`

## Apply chain (fixture refresh)

After post-G7790 chain, client redirects, and Phase 28g:

1. `wisp:apply-phase31-bulk-lift`
2. Phase 30 login/dashboard parity
3. Phase 30b plan/deploy/coverage-map parity

Pipeline: `prepareWispCwlDeployBundle` / `wisp:full-build` when `isWispFullSiteProgramClosed()`.

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| **G8100** | **UI parity close** | `hub:wisp-cwl-ui-parity-close-smoke` |
| **G8101** | CWL HTML hyphen guard | `hub:cwl-html-template-hyphen-smoke` |

## Forbidden stub phrases (response body)

Phase 27c/28g copy, `hub-svelte:` holes, `cwl-native-ui`, integration shells, vendor charter placeholders — see `WISP_FORBIDDEN_STUB_PATTERNS` in `scripts/wisp-cwl-ui-parity-lib.mjs`.

## Default queue

When the user says **build** without scope after Phase 31 closes: **`hub:wisp-cwl-ui-parity-close-smoke`** (**G8100**) supersedes **G7990** as the WISP regression bar. Until close, run **G8100** for UI parity work and keep **G7990** green.

**Index:** [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md)
