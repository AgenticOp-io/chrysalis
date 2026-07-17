# Chrysalis Universal Translator — Canon Plan (locked)

> **Status:** **CANON** — locked 2026-07-14 (**DESIGN D6438**); amended **D6442** (translate-only); **D6447** (no demo-only code); **D6448** (complete conversion)  
> **Authority:** This document + `DESIGN.md` §1–3 + Decision Log **D6438** / **D6442** / **D6447** / **D6448**. It **supersedes** ad-hoc WISP-first queues and soft guidance in older path notes.  
> **Supersedes for default build:** prior §12 “WISP depth / management.firebase” as product work; those remain **POC-only**.  
> **Knowledge base:** [`initiative-knowledge.v1.json`](./initiative-knowledge.v1.json)  
> **Operator stack (ship today):** [`MIGRATION-OS.md`](./MIGRATION-OS.md)  
> **For agents:** `AGENTS.md` — if a request conflicts with this canon, stop and amend formally.

---

## 0. One-sentence canon

**Chrysalis is the AI-assisted Universal Translator for the web:** lift any supported site into **WebIR → CWL**, emit to any supported target, with **LLM / Intelligence Shorthand proposing** and **oracle + verify disposing** — grown inside a live app via chimera, never trusted as a one-shot dump.

**Translate only (**D6442**).** Do not invent features, map engines, or helper dialects. Make the translation of the source work; otherwise emit a hole.

**Never demo-only code (**D6447**).** The process is **true conversion of origin code**. Hand-built showcase pages, simplified parity shells, and force-settled “looks green” holes are **process violations** — not acceptable shortcuts. This law is **language-agnostic**: every matrix edge (any supported origin → any supported emit) must convert origin or emit a hole — never ship a parallel demo of that app.

**WISP Module_Manager is POC evidence only.** It must not define package names, default queues, or “done.”

---

## 1. Product anatomy (four layers — do not skip)

| Layer | Package / surface | Role | Pays bills? |
| --- | --- | --- | --- |
| **Engine** | ingest, webir, oracle-*, emit-*, verify, repair, runtime-chimera, cli | Spec from behavior; holes; dual-stack | Yes |
| **CWL hub** | cwl, emit-runtime-cwl, runtime-cwl* | Authoritative text form of WebIR | Yes (moat) |
| **Intelligence** | web-llm, IS export, Migration Chat | Propose fills / plans — never dispose alone | Yes (differentiator) |
| **Hub ops** | Migration OS, VMF, path-knowledge, evidence | Programs at scale | Yes |

**Adoption vector:** PHP → TS (hono/fastify/next) remains the first proven wedge.  
**Not the product:** WISP chrome, GenieACS, LiteRT.js, vanity matrix pairs.

---

## 2. The only correctness loop

```text
Capture (oracle) → Lift (WebIR) → CWL ↔ emit → Verify (replay)
                         ↑                    │
              LLM / IS / chat propose         │
                         └────── dispose ─────┘
```

**Refuse forever:** string-only transpile, silent best-effort without holes, inventing backends (maps/GenieACS/FCAPS), treating smoke-green as production-idiomatic rewrite, **demo façades that are not a conversion of origin**.

### 2A. Translate-only fidelity law (**DESIGN D6442** — locked) + no demo-only code (**D6447**)

**Top rule:** Chrysalis **only translates** from one web language/stack to another and makes that translation work. It is **not** a product atelier for rewriting apps. It is **not** a license to ship parallel “demo” implementations.

| Allowed | Forbidden |
| --- | --- |
| Lift what the source does into WebIR / CWL / emit | Invent features, widgets, APIs, or UX the source does not have |
| Preserve third-party SDKs as source islands (same package + toolchain + behavior) | Replace ArcGIS with Bing, OSM-as-default, Google Maps, or “any map that works” |
| Emit holes when something cannot be lowered honestly | Silent substitutes, CDN dialect rewrites, hand-written “better” loaders |
| Fix translation bugs so **origin behavior** appears | Additive layout/chrome/helpers that exist only for agent convenience |
| POC **hosting** of the **converted** artifact | Hand-built login/dashboard/shells, parity HTML not lifted from origin, force-settle to fake completeness |
| POC work **only** when origin parity requires it (and still translate-only) | Expanding WISP POC with net-new Chrysalis ideas |

**Maps (explicit):** WISP Module_Manager coverage maps are **ArcGIS** (`@arcgis/core`, basemap `topo-vector` / source list, `PUBLIC_ARCGIS_API_KEY`, source fallback `gray-vector`). Deprecation noise inside ArcGIS internals is not a license to change map engines. **Do not** introduce Bing basemaps or invent OSM defaults.

**Agent expectation reset:** Prefer **holes + fidelity to source** over cleverness. Prefer **stop and amend the plan** over shipping another dialect. Prefer **delete invented helpers** over nesting more of them. Prefer **signed-in test against origin** over deploy/smoke green.

When the operator says **“do not add new code”** / **“no demo code”** / **“true conversion only”**, that means: no inventiveness — only mechanical translation / plan amendments / honest holes. **Never** ship demo-only façades (**D6447**).

### 2B. Source-authoritative UI conversion (**DESIGN D6443** — locked)

**Top rule:** Origin markup class names + origin stylesheets + origin vendor islands are the **only** look/behavior authority. Chrysalis converts them; it does not redesign them.

| Step | Requirement |
| --- | --- |
| 1. Read all | Convert must index the full origin UI tree (pages, components, `<style>`, client islands) — not a stub subset |
| 2. Lift CSS | Per-route `original-css` from origin build / SFC styles (**D6365**) |
| 3. Lift markup | Preserve origin classes (`floating-controls`, `control-btn`, `filters-modal`, `coverage-map-container`, …) |
| 4. Vendor islands | Same package + toolchain (**D6441**); ArcGIS stays ArcGIS (**D6442**) |
| 5. No overlay redefine | CWL additive CSS must **not** redefine selectors already in that route’s lifted original CSS |
| 6. Behavior | Wire origin interactions or emit a hole — never replace working origin chrome with empty shells and call it done |

**Done means:** origin colors/layout appear because origin CSS is linked and unopposed; origin controls exist in the DOM; vendor islands load. Smoke-green without those properties is incomplete.

### 2C. Origin source corpus + piecemeal convert (**DESIGN D6444** — locked)

**Top rule:** Features are spread across many files. Convert does not guess from UI alone — it **indexes the whole origin tree first**.

| Step | Requirement |
| --- | --- |
| 1. Ingest all files | Walk every origin source file (POC: Module_Manager + `backend-services`) into a corpus DB |
| 2. Code database | Persist file metadata, imports, symbols, HTTP path inference (SQLite + planning JSON) |
| 3. Convert queue | Group into pieces: UI routes, module support, API clusters, shared libs — ordered by dependency |
| 4. One piece at a time | Convert / bind / verify the next queue item; mark status; do not claim site-done from one page shell |
| 5. Background truth | API + services pieces are first-class; empty `/api/*` or unbound clients are holes |

**Artifacts:** `reports/origin-corpus/chrysalis.source-corpus.v1.{json,sqlite}` + `chrysalis.convert-queue.v1.json`. Gate: `hub:origin-source-corpus-smoke` (**G9993**).

### 2D. Complete conversion — fix holes during convert (**DESIGN D6448** — locked)

**Top rule:** Convert is not complete after one lift pass. The convert process **must** run an honest hole-close loop until **zero** `data-cwl-hole` markers (without force-settle), or **fail incomplete** with a residual ledger.

Normative protocol: [`COMPLETE-CONVERSION-PROTOCOL.md`](./COMPLETE-CONVERSION-PROTOCOL.md).

| Requirement | Detail |
| --- | --- |
| During convert | Re-lift → bind (`forceSettle: false`) → golden hydrate → UI-toggle stamp → census |
| Complete | `data-cwl-hole` total === 0 (vendor islands may remain as islands) |
| Incomplete | 3× no improvement → residuals + gate fail (unless `--allow-incomplete`) |
| Forbidden | Force-settle / `hub:wisp-deep-lift-all-holes` as a completeness claim |
| Cross-language | Same law for every origin→emit pair |

POC CLI: `pnpm run hub:complete-conversion` · wired into `hub:wisp-convert-restart`.

---

## 3. Honest capability language

| Say | Mean |
| --- | --- |
| **Oracle product** | Capture + ingest + emit + verify on real traces for that pair |
| **Structural gold** | Hole-free on chartered fixtures — not customer idiomatic |
| **UT edge green** | Chartered `A → CWL → B` under hole budget + route parity |
| **POC closed** | Showcase gate green — transferable pattern only |
| **Production cutover** | Operator chimera + verify evidence on *their* app — never implied by census |

601/601 matrix = **oracle-product census**, not “every stack rewritten.”

---

## 4. Program phases (close before build)

Program ID: **Universal Translator Canon** · Entry gate **G9960** · Program close **G9990**

### Wave A — Quarantine & genericize (**G9960–G9965**) — *closed*

| Gate | Deliverable | Close |
| --- | --- | --- |
| **G9960** | Canon docs + STRATEGY §12 lock (this file, D6438) | Doc + smoke: `hub:ut-canon-lock-smoke` |
| **G9961** | All **engine-generic** WISP libs live under `scripts/lib/*` (neutral names); `scripts/wisp-*` = shims or POC-only | `hub:ut-lib-extract-smoke` |
| **G9962** | No new engine feature under a `wisp-*` filename; package.json exposes neutral aliases for convert CLIs | same smoke |
| **G9963** | POC fixtures remain under `fixtures/hub-wisp-management/`; documented quarantine | Doc integrity in G9960 |
| **G9964** | Initiative knowledge DB regenerates; extractMap lists all moved libs | `node scripts/build-initiative-knowledge.mjs` |
| **G9965** | Wave A composite | `hub:ut-wave-a-close-smoke` |

### Wave B — UT composer strength (**G9970–G9975**) — *closed*

| Gate | Deliverable | Close |
| --- | --- | --- |
| **G9970** | G7690 regression green (mandatory); nextjs = honest WPTP skip | `hub:ut-wave-b-g7690-smoke` |
| **G9971** | Chartered composer charter audited; weak edges listed with hole budgets | `hub:ut-wave-b-charter-audit-smoke` |
| **G9972** | Chartered php→python green **or** honest refuse (nextjs without WPTP) | `hub:ut-wave-b-cross-edge-smoke` |
| **G9973** | Inbound roundtrip skip/fail codes → named adapter work items | `hub:ut-wave-b-roundtrip-work-items-smoke` |
| **G9974** | CWL outbound gold fixture hole-free on charter targets | `hub:ut-wave-b-outbound-smoke` (G7602) |
| **G9975** | Wave B composite | `hub:ut-wave-b-close-smoke` |

### Wave C — AI-assisted convert (**G9980–G9985**) — *closed*

| Gate | Deliverable | Close |
| --- | --- | --- |
| **G9980** | Migration Chat / AI Assist regression | `hub:migration-chat-smoke` |
| **G9981** | web-llm propose → verify dispose on conversion holes (no bypass) | `hub:llm-convert-verify-apply-smoke` |
| **G9982** | Intelligence Shorthand export/protocol regression | `hub:intelligence-shorthand-close-smoke` |
| **G9983** | Live hit-rate honesty (seed ≠ live) preserved | `hub:product-hit-rate-live-smoke` |
| **G9984** | Governor GREEN/YELLOW/RED on convert jobs | `hub:convert-governor-smoke` |
| **G9985** | Wave C composite | `hub:ut-wave-c-close-smoke` |

### Wave D — Engine depth that UT needs (**G9986–G9989**) — *closed*

| Gate | Deliverable | Close |
| --- | --- | --- |
| **G9986** | PHP wedge / UT close still green (adoption vector) | `hub:cwl-universal-translator-close-smoke` |
| **G9987** | Multi-origin lift close regression | `hub:multi-origin-lift-close-smoke` |
| **G9988** | Named origin gold deepening **only where UT edges fail** (no vanity pairs) | per-edge (none open this close) |
| **G9989** | Wave D composite | `hub:ut-wave-d-close-smoke` |

### Program close (**G9990**) — *closed*

Waves A–D composites green; DESIGN pitch + README point at this canon; WISP absent from default “build” queue.

Smoke: `hub:ut-canon-program-close-smoke`

---

## 5. Default build queue (when user says “build”)

1. **Maintain canon** — `hub:ut-canon-program-close-smoke` (**G9990**) + `hub:ut-maintain-packaging-smoke` (**G9991**, **D6440**)  
2. **G8550** Migration OS composite (ship stack)  
3. **G7690** UT regression  
4. **Origin gold only where a customer/chartered UT edge fails**  
5. **POC** (WISP / management.wisptools.io) — **only on explicit ask** → `hub:wisp-poc-from-scratch` (**G9992**); [`WISP-POC-FROM-SCRATCH.md`](./WISP-POC-FROM-SCRATCH.md)  

UT Canon Waves A–D are **closed**. Do not invent Wave E without amending this file.

---

## 6. Extract / naming rules (canon)

| Do | Don't |
| --- | --- |
| Put reusable convert code in `scripts/lib/` or `@chrysalis/*` | Put new engine code under `wisp-*` |
| Neutral names: `cwl-*`, `convert-*`, `scrub-*`, `spa-*` | Productize `Wisp*` in package public API |
| Keep POC apply/smoke/deploy under `scripts/wisp-*` or `scripts/poc/` until deleted | Expand Module_Manager as product definition |
| Temporary re-export shims from old paths | Forever dual-maintain two implementations |

**Target extract (Wave A remainder):**

| From (legacy) | To (`scripts/lib/`) |
| --- | --- |
| `wisp-cwl-apply-client-redirects.mjs` | `cwl-apply-client-redirects.mjs` |
| `wisp-cwl-css-lift.mjs` | `cwl-css-lift.mjs` |
| `wisp-cwl-package-ui-lift.mjs` | `cwl-package-ui-lift.mjs` |
| `wisp-cwl-svelte-native-convert.mjs` | `cwl-svelte-native-convert.mjs` |
| `wisp-cwl-generate-api-proxy-cwl.mjs` | `cwl-generate-api-proxy.mjs` |
| `wisp-cwl-hole-manifest.mjs` | `cwl-hole-manifest.mjs` |
| `wisp-cwl-chimera-serve.mjs` | `cwl-chimera-serve.mjs` |
| `wisp-svelte-static-server.mjs` | `spa-static-server.mjs` |

Already extracted (Wave A partial): hole-metrics, apply-surfaces, route-lift, bulk-svelte-lift, api-oracle-contract, static-export, chimera-gateway, gateway-config, scrub-markup.

---

## 7. Non-goals (locked)

1. Big-bang rewrite without chimera / holes  
2. Unchartered 575×26 CI matrix as a success claim  
3. GenieACS / invented map-FCAPS widgets (**D6205**)  
4. LiteRT.js as convert runtime  
5. Commercial launch drama blocking UT depth  
6. Treating WISP Firebase look polish as the product roadmap  
7. **Inventing** basemap engines (Bing / OSM-as-default / “any map”), CDN loader dialects, or helpful UI not in the source (**D6442**)  
8. Shipping net-new code when the order was translate-only / plan amendment only  
9. **Demo-only façades** — hand-built showcase pages, non-lifted parity shells, force-settled holes as “complete” (**D6447**)
9. Treating POC showcase polish as engine product work  

---

## 8. Success metrics (canon)

| Metric | Direction |
| --- | --- |
| Time to first green verify on a customer/charter slice | ↓ |
| Chartered UT edges green under hole budget | ↑ |
| Hole density on in-scope routes | ↓ (honest, not force-settled fake) |
| LLM/IS proposals that survive verify | ↑ (live jobs, not seed-only) |
| New `scripts/wisp-*` engine files | → 0 |
| Agent time on Module_Manager chrome vs UT/engine | shift to UT/engine |

---

## 9. Amendment rule

Changing this canon requires:

1. User explicit amendment  
2. New `DESIGN.md` Decision Log entry  
3. Edit this file + `STRATEGIC-PLAN.md` §12  

Silent drift is forbidden.
