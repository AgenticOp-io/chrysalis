# Svelte → CWL conversion lessons (WISP Module_Manager)

> **Status:** active operator amendment (**D6405**, **G9840**) — 2026-07-12  
> **Authority:** `DESIGN.md` D6405; `STRATEGIC-PLAN.md` §12; this doc  
> **Source of truth for UI:** reuploaded `Module_Manager` (GenieACS permanently OOS — **D6205** / **D6370**)  
> **North star:** the **conversion experience** is CWL in the build — not a Svelte sidecar that hides holes

This document records what we learned while trying to make the live demo look and behave like [wisptools.io](https://wisptools.io) management, and the locked correction: **Svelte must lift into CWL in the actual build**.

---

## 1. What “done” means (operator amendment)

| Claim | Honest meaning |
| --- | --- |
| **Conversion experience** | Operator opens chimera and sees **CWL-served** pages (`x-chrysalis-wisp-proxy: cwl`), built from Module_Manager Svelte via WebIR → CWL |
| **Not done** | Shipping a SvelteKit SPA on `:3000` and calling that “converted” |
| **Acceptable interim holes** | Declared holes / shells (nav, modal, map, empty `/add`) — never silent invent |
| **Out of scope** | GenieACS / ACS CPE stack — deleted from source; do not reintroduce |

---

## 2. Timeline of failed / misleading shortcuts

### 2.1 CWL demo shells and force-module demos

**Symptom:** Buttons painted; Refresh/Add worked only where we forced `wisp-module-demo` JS; look was not wisptools.io.

**Lesson:** Interactive stubs prove plumbing, not visual or behavioral parity. Forcing demos over real markup **hides** lift debt and trains operators on the wrong product.

**Rule:** Never re-enable broad `shouldForceModuleDemo` for operator showcase.

### 2.2 Hybrid Svelte sidecar (chimera → `:3000`)

**Symptom:** Look matched Module_Manager; operator said “this still doesn’t look the same” earlier when CWL-only, then accepted look once sidecar worked — but then required **actual build**.

**What broke / misled:**

1. **Phase 27f cutover** (`svelteSidecar: false`, `cwlNativePrefixes: *`) fought hybrid deploy — deploy read fixture flags and skipped sidecar.
2. **`chimera-serve` hard-coded `svelteFallback: ""`** — `??` does not treat `""` as missing, so env `WISP_SVELTE_FALLBACK` never applied.
3. **Shared VM port 3000** owned by another OS user → `EADDRINUSE`; bootstrap failed before chimera hybrid restart.
4. **Svelte-first routing on all methods** proxied `POST /login` to the SPA → no CWL session cookie → `/api/me` auth probes failed until GET/HEAD-only fallback.
5. **Green smokes ≠ usable app** — HTTP 200 + stub JSON ≠ login, hydrate, or interactivity.

**Lesson:** Sidecar is a **debug/parity reference**, not the conversion product. It can compare “source truth” vs CWL, but must not be the default operator demo.

### 2.3 Integrity bugs that looked like “bad conversion”

| Failure | Root cause | Fix class |
| --- | --- | --- |
| 501 / truncated handlers | Brace counting inside `html "…"` strings | String-aware block replace (**G9830**) |
| Dead `/` spinner | Client redirects wiped by later lifts | Redirects **last** in full-build + deploy |
| Package UI lift “skipped” | Skip paths reported but not applied | Apply skip + re-apply redirects |

**Lesson:** Pipeline integrity is part of conversion quality. Broken CWL publish reads as “Svelte didn’t convert.”

### 2.4 Auth and API

| Failure | Root cause | Fix class |
| --- | --- | --- |
| Login hung on Firebase-first | Client waited on Firebase before CWL | CWL-first login path |
| `/api/me` 404 | Catch-all `api-proxy.cwl` swallowed me | Chimera special-case + routes |
| Stub goldens | Showcase JSON unused | Sync hydrate-samples → goldens |

**Lesson:** Native CWL `/api` + session cookie is the showcase contract; backend Mongo remains proxied where not yet native.

---

## 3. What actually works in the Svelte → CWL pipeline

Pipeline (generalizable — not WISP-only):

```text
Module_Manager (+page.svelte, components, CSS)
  → lift-to-webir (--language svelte)
  → emit-cwl-from-hub
  → convertSiteProjectUi (structural-shell + force-settle)
  → bindSiteProjectLoadFromTraces (+ hydrate-samples / enriched traces)
  → package UI lift / phase parity / client redirects (last)
  → api-proxy.cwl goldens
  → runtime-cwl / chimera with cwlNativePrefixes=*
  → optional: LLM hole propose → verify-gated apply → IS export
```

**Proven package gates:** G9300–G9309, G9400–G9450, G9460–G9500, G9780–G9830.

**Honest bound today:** large interactive Svelte pages become **structural shells + CSS + bound load data + declared holes**. That *is* conversion. Matching every client island pixel-for-pixel without holes requires more island/event lift + verify — not a sidecar.

---

## 4. Generalizable rules (any origin language)

1. **CWL is the deliverable** — origin UI (Svelte/Vue/React/PHP templates) is evidence for lift, not the runtime of record.
2. **Holes over invention** — unsupported constructs → named holes; empty chrome OK; fake widgets forbidden (`DESIGN.md` §3).
3. **Structural-shell default** for interactive frameworks — skip ≠ convert; shell + hole ≠ silent omit.
4. **Document shell + CSS lift** must ship with markup or pages look “wrong” even when HTML is present.
5. **Load-bind from traces/samples** before claiming data parity.
6. **Chimera fallback origins are debug only** — default prefixes `*` for cutover demos.
7. **Integrity gates** (brace/string awareness, redirect order) are language-agnostic publish requirements.
8. **Verify disposes** — LLM/Shorthand may propose; never skip oracle/verify.
9. **Green HTTP ≠ product** — probes must include auth, JSON shape, and proxy headers for the *intended* stack.
10. **Showcase ≠ product name** — WISP proves CWL; rules live in packages.

---

## 5. LLM / Intelligence Shorthand acceleration

| Layer | Role in Svelte→CWL |
| --- | --- |
| **IS-T5 / T4** | Store oracle refs + CWL modules as the converted “memory” |
| **IS-T3 capsules** | Skip repeat LLM on exact digest hits (`skipLlm` after verify green) |
| **Near-miss transfer** | Replay donor + hole-delta LLM only (**G9510**) |
| **LLM convert full (G8940)** | Enrich holes → verify-gated apply → repair bridge |
| **Convert governor (G9540)** | GREEN/YELLOW/RED before applying LLM patches |
| **Live analytics** | hit / near-miss / miss + `verifyCostMs` — product metrics |

**Operator loop:**

```bash
# 1) Convert Module_Manager into CWL (actual build)
pnpm run wisp:svelte-native-convert

# 2) Optional LLM enrichment (verify still disposes)
pnpm run hub:llm-convert-full-close-smoke   # regression
# live propose/apply via hub / web-llm convert tools when operator confirms

# 3) Export shorthand for this domain
pnpm run web-llm:export-shorthand

# 4) Deploy CWL-native (no sidecar)
CHRYSALIS_WISP_SKIP_SVELTE_SIDECAR=1 pnpm run wisp:deploy:gce
# default deploy after D6405 is CWL-native

# 5) Prove
pnpm run wisp:operator-verify -- --require
```

---

## 6. Anti-patterns (do not repeat)

- Sidecar as default “fix” for look mismatches
- Force-demo JS over lifted markup
- Inventing `/add` form fields from empty traces
- Claiming GenieACS conversion
- LLM apply without verify / governor
- Measuring success only by hole count zero without visual/CSS/document shell

---

## 7. Related docs

| Doc | Role |
| --- | --- |
| [`WHOLE-SITE-CWL-CONVERSION.md`](./WHOLE-SITE-CWL-CONVERSION.md) | Closed package pipeline (G9450) |
| [`MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) | Plan to expand lessons to all languages |
| [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md) | Phase 27 native cutover |
| [`LLM-CONVERT-FULL-PROGRAM.md`](./LLM-CONVERT-FULL-PROGRAM.md) | Verify-gated LLM |
| [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md) | IS tiers |
| [`MIGRATION-OS.md`](./MIGRATION-OS.md) | Operator stack index |
