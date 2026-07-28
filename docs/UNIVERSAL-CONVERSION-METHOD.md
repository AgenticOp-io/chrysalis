# Universal conversion method (locked from WISP POC — all languages)

> **Status:** CANON — 2026-07-20 (multi-language inventory adapters 2026-07-21)  
> **Authority:** This document + [`COMPLETE-CONVERSION-PROTOCOL.md`](./COMPLETE-CONVERSION-PROTOCOL.md) (**D6448**) + [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) (**D6442**/**D6447**) + multi-origin plan [`MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) + WISP proof in [`WISP-CWL-CONSOLIDATED-PIPELINE.md`](./WISP-CWL-CONSOLIDATED-PIPELINE.md)  
> **Scope:** Any supported origin site → WebIR/CWL → emit. WISP Module_Manager is the filled **SvelteKit** proof instance, not the product identity.

---

## 0. One sentence

**Before converting or wiring, produce a complete inventory of the site** (origin via a **language adapter** + live converted surface). Then convert only what the inventory proves exists, close gaps in priority order, prove against origin, and deploy without inventing chrome.

---

## 1. Mandatory order (do not skip)

| Step | Name | Output | Forbidden |
| --- | --- | --- | --- |
| **1** | **Complete site inventory** | Machine + human inventory (see §2) | Starting lift/wire from vibes or census alone |
| **2** | Corpus queue | Convert queue from inventory (**D6444**) | Stub page convert |
| **3** | Structural lift | Origin → CWL via **markup adapter** for that language | Invented parity HTML |
| **4** | Honest hole-close | Protocol Phase 2 until zero or plateau | Force-settle façades |
| **5** | Shell / nest fidelity | Stamp keys, open nests, hydrate selected entity | `dataCache.*[0]`, deepen injectors |
| **6** | Gap catalog | P0→Pn backlog from inventory deltas | Claiming done while nests orphan |
| **7** | Prove | Sign in vs **origin**; success template (**D6448-ST**) | Deploy-green as fidelity |
| **8** | Dual deploy | Chimera (verify) + production host (Firebase/etc.) | Shipping only one target blindly |

Laws (**D6442** / **D6447** / **D6448**) are **language-agnostic**. Only detectors, lift adapters, and oracle packages differ by origin.

---

## 2. Step 1 — Complete site inventory (required first)

Run (or regenerate) a **full inventory** before any new convert/wire pass.

### 2A. Origin inventory (source of truth — language adapters)

Index the origin tree with the matching **site-inventory adapter** (auto-detect or `--framework`):

| Bucket | Capture (language-neutral) |
| --- | --- |
| Routes | Every page / layout / dynamic segment |
| Components | Modals, wizards, menus, maps, charts, editors |
| Gates | Overlay/dialog open flags (see §2D per language) |
| Nests | Parent → child overlays |
| Map / vendor | SDK imports, basemap, islands |
| APIs | `fetch` / service methods / route handlers |
| Dead / unwired | Functions never bound to UI — **do not invent** entry points |
| Slots / portals | Named slots, teleports, `ng-content`, Blade `@yield` |

**Adapters** (`scripts/lib/site-inventory/`):

| Adapter | Detect | Gate patterns | Route patterns | Slot / portal |
| --- | --- | --- | --- | --- |
| `sveltekit` | `svelte.config.*` / `+page.svelte` | `showX`, `isOpen`, `{#if show…}`, `bind:show` | `src/routes/**/+page.svelte` | `slot="content\|footer"` |
| `vite-vue` | Vue/Nuxt deps or `src/views\|pages` | `ref(showX)`, `v-if` / `v-show`, `:visible` | `views\|pages\|layouts/*.vue` | `<slot name>`, `<Teleport>` |
| `next-app` | `next.config.*` / `app/**/page.tsx` | `useState` open flags, `{showX &&`, `open={` | `app/**/page.tsx` | `createPortal` |
| `angular` | `angular.json` / `.component.html` | `*ngIf="showX"`, signals, MatDialog | `*.component.html`, `*.routes.ts` | `ng-content`, `ng-template` |
| `php-blade` | `artisan` / `resources/views` | `@if($showX)`, `x-show`, Livewire | `*.blade.php`, `routes/*.php` | `@yield` / `@slot` / `@section` |
| `php` | `composer.json` | `$showX=` | `index.php` / routers | includes |
| `cobol` | `PROGRAM-ID` / `.cbl`+`copybook/` | unresolved ops (`exec-cics`, …) | `cobol:PROGRAM-ID`, chrysalis-route | BMS maps / COPY components |
| `generic` | fallback | best-effort `show*` / `isOpen*` | path heuristics | `slot=` |

**Markup lift** (convert Step 3) uses the parallel ingest adapters — same language families:

| Inventory adapter | Markup lift (`@chrysalis/ingest`) |
| --- | --- |
| `sveltekit` | `svelteKitMarkupAdapter` |
| `vite-vue` | `viteVueMarkupAdapter` |
| `next-app` | `nextAppMarkupAdapter` |
| `angular` | `angularMarkupAdapter` |
| `php-blade` / `php` | `phpBladeMarkupAdapter` (basic structural) + PHP handler ingest / oracle. Alpine/Livewire stay honesty holes. |

### 2B. Converted / live inventory (always CWL attrs)

Against the live chimera or static export — **language-neutral**:

| Bucket | Capture |
| --- | --- |
| Lifts | `data-cwl-lifted-component` |
| Shell keys | `data-cwl-shell-key` |
| Toggles | `data-cwl-toggle="showX:true"` |
| Orphans | Toggle with no matching shell key |
| Nested shells | `cwl-self-gated-shell` depth |
| Slot siblings | Raw `slot=` (and outside-hidden risk) |
| Asset bust | Client/modules/map CSS/JS versions |

Live page list: prefer **derived from origin routes**; optional `--live-pages`, `--live-pages-file`, or `--wisp-poc-pages` (WISP Module_Manager only).

### 2C. Gap catalog

Diff origin vs converted into prioritized gaps (P0 nests that block demo → Pn polish). Mark:

- `fixed` + bust / ship id when closed  
- `honest-skip` when origin has no chrome (policy file)  
- `origin-dead` when source never wires the control  

**CLI (any site):**

```text
node scripts/chrysalis-site-inventory.mjs --origin <path> [--live <baseUrl>] [--framework <adapter>]
node scripts/chrysalis-site-inventory.mjs --list-adapters
node scripts/chrysalis-site-inventory-diff.mjs [--a inv.json] [--b inv2.json] [--policy policy.json]
node scripts/chrysalis-gap-catalog.mjs --inventory reports/chrysalis/site-inventory.json
pnpm run chrysalis:site-inventory-adapters-smoke
pnpm run hub:serve   # http://127.0.0.1:19090/convert — settings, meters, method coach
```

| Artifact | Kind |
| --- | --- |
| `reports/chrysalis/site-inventory.json` | `chrysalis.site-inventory.v1` (schemaVersion **2**) |
| `reports/chrysalis/site-inventory-diff.json` | `chrysalis.site-inventory-diff.v1` |
| `reports/chrysalis/gap-catalog.json` | `chrysalis.gap-catalog.v1` |
| `reports/chrysalis/inventory-policy.example.json` | honest-skip / origin-dead policy template |

WISP POC live nest census remains `node scripts/wisp-cwl-sub-modal-census.mjs` → `reports/wisp/sub-modal-gap-catalog.json` (filled instance of the same method).

### 2D. Gate idiom cheat-sheet (do not invent cross-language synonyms)

| Language | Typical open flag | Typical template gate |
| --- | --- | --- |
| Svelte | `let showFilters = false` | `{#if showFilters}` |
| Vue | `const showFilters = ref(false)` | `v-if="showFilters"` |
| React/Next | `const [open, setOpen] = useState(false)` | `{open && <Dialog…>}` / `open={open}` |
| Angular | `showFilters = false` / `signal(false)` | `*ngIf="showFilters"` |
| Blade / Alpine | `$showModal` / Alpine state | `@if` / `x-show` |
| Livewire | public `$showModal` | `wire:click` + conditional |

After lift, **all** of these should stamp to `data-cwl-shell-key` + toggles — live inventory does not care which idiom produced them.

---

## 3. Fidelity laws (from POC — universal)

1. **Translate only (**D6442**)** — no invented map engines, toolbars, or APIs.  
2. **No demo-only (**D6447**)** — lift origin or honest hole.  
3. **Complete conversion (**D6448**)** — hole-close loop; ST prove.  
4. **Shell open** — reveal host **and** nested `.cwl-self-gated-shell` / overlay (outer host alone is a no-op).  
5. **Selected entity** — never first-row (`*[0]`) fallbacks for edit/delete/deploy.  
6. **Nested modals** — parent open path + child open under host.  
7. **Embed / viewport** — modals fit the real pane (iframe embed ≠ fullscreen `100vw`).  
8. **Slots / portals** — boot-hide escaped named slots while gate closed; full lift folds them.  
9. **Deploy** — bump asset bust; structural-only redeploys must not wipe `routes.cwl`.  
10. **Discover before convert** — if it “looks fake,” re-run §2 inventory + live probes before more engine work.  
11. **Use the right adapter** — inventory + markup + oracle must match the origin language; do not run Svelte detectors on Vue and call it done.

Detail recipes that proved out on WISP remain in [`WISP-CWL-CONSOLIDATED-PIPELINE.md`](./WISP-CWL-CONSOLIDATED-PIPELINE.md) as the filled SvelteKit instance. Cross-origin lift plan: [`MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md). Honest depth table: [`HUB-CROSS-LANGUAGE-SYNTHESIS.md`](./HUB-CROSS-LANGUAGE-SYNTHESIS.md).

---

## 4. Operator loop (any site, any language)

```text
Detect language adapter
    → Inventory (origin + live)
    → Queue (D6444 corpus)
    → Lift / stamp shells (markup adapter)
    → Wire nests + hydrate (selected entity)
    → Gap catalog P0→Pn
    → Prove vs origin
    → Deploy chimera + production host
    → Re-inventory (bust + slot/orphan deltas)
```

Stop inventing when inventory / policy says **origin-dead** or **honest-skip**.

**Filled instance (WISP Module_Manager, SvelteKit):**

| Artifact | Path |
| --- | --- |
| Combined inventory | `reports/chrysalis/site-inventory.json` |
| Diff | `reports/chrysalis/site-inventory-diff.json` |
| Gap catalog (universal writer) | `reports/chrysalis/gap-catalog.json` |
| Gap catalog (WISP POC fill) | `reports/wisp/sub-modal-gap-catalog.json` |
| Method run | `reports/chrysalis/method-run-wisp.json` |
| GCE | `http://34.61.255.147:19100` (`20260720e`) |
| Firebase | `https://wisptools-management.web.app` (`20260720e`) |

---

## 5. Relationship to older docs

| Doc | Role after this method |
| --- | --- |
| This file | **Default agent method** for any site / language |
| `MULTI-ORIGIN-LIFT-EXPANSION.md` | Markup/CSS adapter tiers + convert orch |
| `COMPLETE-CONVERSION-PROTOCOL.md` | Engine phases 0–6 (Phase 0 = inventory §2) |
| `COMPLETE-CONVERSION-SUCCESS-TEMPLATE.md` | Prove bar (**D6448-ST**) |
| `WISP-CWL-CONSOLIDATED-PIPELINE.md` | WISP-filled SvelteKit proof + empirical recipes |
| `SVELTE-CWL-CONVERSION-LESSONS.md` | Lessons → universal rules (do not Svelte-lock the product) |
| `HUB-CROSS-LANGUAGE-SYNTHESIS.md` | Honest PHP vs AST vs pattern depth |
| Hub 23×26 language catalog | Matrix labels — **not** site-fidelity support |
