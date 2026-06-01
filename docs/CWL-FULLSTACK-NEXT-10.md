# Full-stack CWL — next 10 steps (locked queue)

> **Status:** locked queue (2026-06-01)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 7 / Phase 6 full-stack track; **`ROADMAP.md` G1159–G1168**  
> **Prerequisite:** G1141–G1158 complete (authoring bootstrap, SvelteKit lift v1, flagship pilot, hole budgets)

When the user says **“build”** without specifying after G1158, prefer this queue **in order**. Do not skip ahead without amending this doc + `DESIGN.md` Decision Log + user approval.

---

## Queue

| Step | ROADMAP | Focus | Done when |
| --- | --- | --- | --- |
| 1 | **G1159** | **RFC-0013 load-function lowering v1** | Simple `+page.server.ts` `load({ params }) { return { … } }` lowers to WebIR (literals + `params.*`); RFC doc + gold on deep fixture; complex loads remain catalogued holes |
| 2 | **G1160** | **Page + load CWL emit merge** | One `@page` surface carries param refs + HTML (or declared page data); `renderCwlRoutes` round-trip; smoke on `hub-gold-svelte-kit-deep` reduces load holes |
| 3 | **G1161** | **Full-stack flagship HTTP verify** | `fixtures/hub-flagship-cwl-fullstack` → emit hono/fastify → live server → `chrysalis verify --base-url`; CI smoke |
| 4 | **G1162** | **Flagship migration contract export** | `exportProjectMigrationCwl` + hole-budget sidecar for flagship; delivery bundle artifacts documented |
| 5 | **G1163** | **Svelte template partial lift** | RFC-0012 catalog extended; static `{@html "..."}` and trivial `{#each}` where safe; `hub:sveltekit-deep-smoke` budget updated |
| 6 | **G1164** | **CWL formatter v1** | `chrysalis cwl fmt` on top of `cwl-diagnose`; normalize indentation and route ordering; Vitest on flagship fixture |
| 7 | **G1165** | **Hub bootstrap → flagship template** | Portal **New CWL full-stack project** seeds flagship module (layout + API slice + hole budget), not minimal home-only starter |
| 8 | **G1166** | **Hole budget on delivery dashboard** | Delivery dashboard compares `chrysalis.fullstack-hole-budget.json` vs live hole count; pass/fail in Console |
| 9 | **G1167** | **Next.js App Router origin v0** | `app/**/page.tsx` + `route.ts` file-route lift; gold + deep fixtures with hole budgets (mirror SvelteKit pattern) |
| 10 | **G1168** | **runtime-cwl production readiness gates** | Checklist smoke: multi-route probe, POST, params, layout imports, parity spot-check vs hono on flagship; no SQL/session claims |

---

## Non-goals (this queue)

- Hydration, client stores, or component trees as production parity
- Matrix gold marketing for every origin×target pair
- WordPress / Laravel depth before this queue completes
- LLM repair bypassing verify

---

## Evidence pattern (each step)

1. Parser/ingest/emit change (if applicable)  
2. Fixture under `fixtures/`  
3. Smoke script + `package.json` script  
4. ROADMAP checkbox + `DESIGN.md` Decision Log on completion  
5. Holes-first: unsupported constructs stay explicit

---

*Related: `docs/CWL.md`, `docs/CWL-RFC-0012-full-stack-components.md`, `fixtures/hub-flagship-cwl-fullstack/`.*
