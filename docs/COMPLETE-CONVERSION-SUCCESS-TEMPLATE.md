# Complete conversion success template (**D6448-ST**)

> **Status:** locked 2026-07-17  
> **Authority:** DESIGN **D6448** + this template + canon §2D  
> **Scope:** Every origin → WebIR/CWL → emit pair. WISP is the first filled instance — not the schema identity.

Companion: [`COMPLETE-CONVERSION-PROTOCOL.md`](./COMPLETE-CONVERSION-PROTOCOL.md)

---

## 0. Why this exists

Hole-count **zero** alone is not success. Terminal static-shell settle can empty markers without origin-faithful islands, labels, or closed overlays. The **success template** is the reusable bar across pages and languages.

**Green (`D6448-ST`)** only when all checklist rows pass.

---

## 1. Checklist artifact

Kind: `chrysalis.complete-conversion.checklist.v1`  
POC instance: `fixtures/hub-wisp-management/chrysalis.complete-conversion.checklist.v1.json`  
Prove CLI: `pnpm run hub:complete-conversion-prove`

| Field | Required | Meaning |
| --- | --- | --- |
| `projectId` | yes | Stable id (e.g. `wisp-management`) |
| `originPair` | yes | `{ originLanguage, emitTarget }` |
| `routesCwl` | yes | Path to authoritative CWL |
| `holeCensus.total` | yes | Must be `0` |
| `holeCensus.forceSettleUsed` | yes | Must be `false` for ST green (evidence-only). Terminal settle → ST **fail** / `settleOnly` |
| `islands[]` | yes | Vendor contracts preserved (`shared-map`→ArcGIS, auth, charts…) |
| `pages[]` | yes | Per-route prove steps |
| `signedInOriginCompare` | yes | Operator/agent signed-in check vs origin host |
| `gate` | yes | `D6448-ST` |

---

## 2. Mandatory prove categories (every project)

1. **Corpus** — full origin tree indexed; convert queue drained  
2. **Structural lift** — no invented parity shells  
3. **Honest holes** — evidence close; `forceSettleUsed: false` for ST  
4. **Vendor islands** — same SDK + toolchain as origin (ArcGIS stays ArcGIS)  
5. **Page chrome** — `data-*-page` (or equivalent) so client islands boot  
6. **Closed overlays** — `hidden` + CSS that beats origin `display:flex`  
7. **Idle labels** — loading/signing if/else keeps CTA text when idle  
8. **Signed-in prove** — login + critical routes vs origin site  

---

## 3. Cross-language application

| Origin | What “island” means | Prove focus |
| --- | --- | --- |
| SvelteKit (WISP) | SharedMap iframe → coverage-map `@arcgis/core` | Plan/Deploy iframe + ArcGIS MapView |
| PHP | Legacy SDK includes / widgets (or **none** for API-only flagships) | Same vendor URL + behavior; API ST uses `proveProfile: cwl-api` + fixture verify gold (`hub:complete-conversion-prove:plain-php`, `hub:complete-conversion-prove:tiny-blog`) |
| JavaScript (Express) | **none** for API-only flagship | Hole-free JS→CWL + verify gold (`hub:complete-conversion-prove:express`) — first non-PHP `cwl-api` ST deepen |
| TypeScript (Express) | **none** for API-only flagship | Hole-free TypeScript→CWL + verify gold (`hub:complete-conversion-prove:typescript`) — first TypeScript `cwl-api` ST (`hub-flagship-typescript` 20/20; real `.ts` origin, shared JS/TS AST lift) |
| Python (Flask) | **none** for API-only flagship | Hole-free Python→CWL + verify gold (`hub:complete-conversion-prove:python`) — first Python `cwl-api` ST (`hub-flagship-python` 20/20) |
| Go (Gin) | **none** for API-only flagship | Hole-free Go→CWL + verify gold (`hub:complete-conversion-prove:go`) — first Go `cwl-api` ST (`hub-flagship-go` 20/20); named `func` handlers beyond anonymous lambdas (`hub-go-routes`) |
| C# (ASP.NET Minimal API) | **none** for API-only flagship | Hole-free C#→CWL + verify gold (`hub:complete-conversion-prove:csharp`) — first C# `cwl-api` ST (`hub-flagship-csharp` 20/20) |
| Java (Spring) | **none** for API-only flagship | Hole-free Java→CWL + verify gold (`hub:complete-conversion-prove:java`) — first Java `cwl-api` ST (`hub-flagship-java` 20/20) |
| Ruby (Sinatra) | **none** for API-only flagship | Hole-free Ruby→CWL + verify gold (`hub:complete-conversion-prove:ruby`) — first Ruby `cwl-api` ST (`hub-flagship-ruby` 20/20) |
| Kotlin (Spring) | **none** for API-only flagship | Hole-free Kotlin→CWL + verify gold (`hub:complete-conversion-prove:kotlin`) — first Kotlin `cwl-api` ST (`hub-flagship-kotlin` 20/20) |
| Scala (Akka HTTP) | **none** for API-only flagship | Hole-free Scala→CWL + verify gold (`hub:complete-conversion-prove:scala`) — first Scala `cwl-api` ST (`hub-flagship-scala` 20/20); Http4s dialect secondary (`hub:scala-http4s-smoke` / `hub-gold-scala-http4s` 20/20) |
| Swift (Vapor) | **none** for API-only flagship | Hole-free Swift→CWL + verify gold (`hub:complete-conversion-prove:swift`) — first Swift `cwl-api` ST (`hub-flagship-swift` 20/20); multi-segment `app.get("items", ":id")` PathComponents |
| Rust (Actix Web) | **none** for API-only flagship | Hole-free Rust→CWL + verify gold (`hub:complete-conversion-prove:rust`) — first Rust `cwl-api` ST (`hub-flagship-rust` 20/20) |
| SvelteKit (WISP POC) | ArcGIS MapView + origin client islands | `proveProfile: wisp-ui` — evidence-only hole zero + signed-in origin compare (`hub:complete-conversion-prove:wisp`); no Bing/OSM substitutes / deepen injectors |
| Next / React | Client components marked island | No rewrite to alternate map stack |
| Kotlin / Compose web | Platform views | Preserve bindings |

Phases 0–6 of the protocol stay identical. Only project config changes (`routesPath`, `originRoot`, `goldensDir`, `pageProve[]`).

---

## 4. Agent refusal

Refuse claiming **D6448-ST** success when:

- `forceSettleUsed: true` / `stopReason: complete-terminal-settle` only  
- Map shell placeholder instead of origin iframe/SDK  
- Invented Bing/OSM map engines  
- Open modals on first paint that origin keeps closed  
- Missing signed-in origin compare  

Terminal settle may still produce a **static emit** for hosting, but it is **not** the success template.
