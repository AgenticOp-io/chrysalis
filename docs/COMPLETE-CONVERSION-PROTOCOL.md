# Complete conversion protocol (**DESIGN D6448**)

> **Status:** locked 2026-07-17  
> **Authority:** This document + `DESIGN.md` **D6448** + canon §2D + `AGENTS.md` absolute law  
> **Scope:** Every origin → WebIR/CWL → emit pair (not WISP-only). WISP is the POC proof.  
> **Companion laws:** **D6442** translate-only · **D6443** source UI · **D6444** corpus queue · **D6447** no demo-only / no force-settle façades

---

## 0. Definition of complete

A conversion is **complete** only when:

1. Every origin piece in the convert queue has been **structurally lifted or bound** (not skipped), and
2. The authoritative CWL surface (`routes.cwl` / emitted markup) has **zero** `data-cwl-hole` markers, **or** every remaining marker is an explicit **vendor island** contract (`data-cwl-island` / island-bound piece) that preserves the origin SDK — not a stripped hole, and
3. Closing used **origin evidence** only: structural lift from source, const/array expansion from origin scripts, API/trace/golden hydrate with `forceSettle: false`, UI-toggle overlays stamped **closed** (`hidden`) with DOM retained.

**Not complete:** deploy green, smoke green, hole-count zero via force-settle / `stripRemainingMarkupHoles`, parity façades, or “good enough for demo.”

**Success template (D6448-ST):** Hole zero is necessary but not sufficient. See [`COMPLETE-CONVERSION-SUCCESS-TEMPLATE.md`](./COMPLETE-CONVERSION-SUCCESS-TEMPLATE.md). Prove gate: `pnpm run hub:complete-conversion-prove`. Terminal settle alone **fails** ST.

---

## 1. Convert-time phases (mandatory order)

| Phase | Name | Action | Forbidden |
| --- | --- | --- | --- |
| **0** | **Complete site inventory** | Origin + live inventory via **language adapter** (**first** — [`UNIVERSAL-CONVERSION-METHOD.md`](./UNIVERSAL-CONVERSION-METHOD.md) §2; `scripts/lib/site-inventory/`); then corpus queue (**D6444**) | Starting lift from vibes; stub page convert; Svelte detectors on non-Svelte trees |
| **1** | Structural lift | Convert every queue piece from origin | Invented parity HTML |
| **2** | Honest hole-close loop | Repeat until complete or plateau (see §2) | `forceSettle: true`, deep-lift-all-holes as done |
| **3** | Census | Honest hole report + residual ledger | Claiming zero without evidence |
| **4** | Export / CSS / islands | Original CSS + vendor islands (**D6443**/**D6441**) | Overlay redesign |
| **5** | API deepen + shell/nest fidelity | External-deps + selected-entity nests (**D6445** + universal method §3) | Inventing vendors/keys; `*[0]` entity fallbacks |
| **6** | Prove + dual deploy | Sign in vs **origin**; chimera + production host | Deploy OK as fidelity |

**Default agent entry:** [`docs/UNIVERSAL-CONVERSION-METHOD.md`](./UNIVERSAL-CONVERSION-METHOD.md) (inventory first).  
CLI inventory: `node scripts/chrysalis-site-inventory.mjs --origin <path> [--live <url>] [--framework <adapter>]` · `pnpm run chrysalis:site-inventory-adapters-smoke`.  
Gap catalog: `pnpm run chrysalis:gap-catalog -- --inventory reports/chrysalis/site-inventory.json [--policy …]`.  
POC convert (WISP): `pnpm run hub:wisp-convert-restart` runs 0–6 with Phase 2 wired.  
Standalone Phase 2: `pnpm run hub:complete-conversion` (`scripts/wisp/wisp-complete-conversion-protocol.mjs`).

---

## 2. Honest hole-close loop (Phase 2)

Each **round** (order matters — evidence last so it sticks):

1. **Re-lift** — structural convert-all from origin (engine improvements apply)
2. **Bind traces** — `bindSiteProjectLoadFromTraces({ forceSettleResidualHoles: false })`
3. **Golden hydrate** — for each `@page` with holes, hydrate from matching API golden/trace body with `forceSettle: false`; write **only** when hole count drops
4. **UI-toggle stamp** — `{#if showX}` / overlay toggles → `stampClosedUiChrome` (DOM kept, `hidden`) — initial paint matches origin closed state
5. **Census** — count `data-cwl-hole` on routes CWL

**Stop when:**

- `total === 0` → **complete**, or
- **3 consecutive rounds** with no hole reduction → run **terminal static-shell settle** (empty/stamp/omit unresolved bindings for static first paint — not inventing widgets). If still non-zero → **incomplete** residual ledger.

**Evidence rounds never** call force-settle. Terminal settle is only after evidence plateau, and only to finish static CWL paint for D6448 complete.

---

## 3. Residual ledger (when incomplete)

Write `reports/wisp/complete-conversion-residuals.json` (+ markdown summary) with:

- `total`, `buckets`, `topPages`, `detailSamples`
- `engineDebt` — hole classes the lift/bind engine must grow to close (interp/if/each/component)
- `nextActions` — concrete ingest/bind improvements (language-agnostic wording)

Agents **must** treat incomplete convert as unfinished work: improve the engine, re-run Phase 2 — do not ship façades.

---

## 4. Cross-language rule

The same phases apply to PHP, SvelteKit, Kotlin, Next, Express, etc.:

- Lift → honest close loop → zero holes or classified islands → prove against origin  
- Matrix gold / structural smoke ≠ complete conversion  
- Package APIs stay origin-agnostic; POC scripts may be WISP-named but the protocol is Universal Translator law

---

## 5. Agent refusal list (D6448 + D6447)

Refuse:

1. Marking convert `ok`/`complete` while `data-cwl-hole` remains (unless `--allow-incomplete` and residual ledger present)
2. Force-settling holes to claim complete
3. Hand-built pages that bypass the queue
4. Stopping after one convert-all pass when holes remain without running Phase 2
