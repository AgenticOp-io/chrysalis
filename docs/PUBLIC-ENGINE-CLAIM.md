# Public engine claim (trust fix)

> agenticop.io promises an **Apache-2.0** Chrysalis engine. Until the GitHub remote is public, that claim is incomplete.  
> This checklist closes the **trust gap** without inventing a second product.

**Not legal advice.** Coordinate with counsel before flipping visibility.

## Why it matters

The Cursor Pilot Kit only works for buyers if they can **clone and run** without a private invite. Private + “open source” on the marketing site is a brand integrity failure.

## Checklist (before `gh repo edit --visibility public`)

Use [`../commercial/chrysalis-private-pack/07-oss-scrub-checklist.md`](../../commercial/chrysalis-private-pack/07-oss-scrub-checklist.md) (AgenticOps layout) plus:

- [ ] `LICENSE` is Apache-2.0; `package.json` / `COMMERCIAL.md` / README agree  
- [ ] No SA keys, `.env`, customer corpora, filled private pack in history  
- [ ] Pilot Kit docs link from README (`docs/CURSOR-PILOT-KIT.md`)  
- [x] `pnpm run hub:cursor-pilot-kit-smoke` green  
- [x] `pnpm run pilot:laravel-min` green on clean Linux/GCE (`chrysalis-test-vm`, 2026-07-24) with PHP `mysqli` + `pdo_sqlite` — still verify on buyer machines  
- [x] `pnpm run hub:complete-conversion-prove:laravel-min` → `stGreen`+`stClosed` (2026-07-24) — hole-free CWL projection (session boot + ternary lit-branch guards); Hono verify gold 20/20  
- [x] `pnpm run hub:complete-conversion-prove:python` → `stGreen`+`stClosed` (2026-07-24) — first Python cwl-api D6448-ST (`hub-flagship-python` Flask 20/20 hole-free; status tuples + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:go` → `stGreen`+`stClosed` (2026-07-24) — first Go cwl-api D6448-ST (`hub-flagship-go` Gin 20/20 hole-free; brace-bounded gin.H + string/status/scalar; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:csharp` → `stGreen`+`stClosed` (2026-07-24) — first C# cwl-api D6448-ST (`hub-flagship-csharp` ASP.NET Minimal API 20/20 hole-free; bounded Map lambdas + Results.Json statusCode + string/scalar/path-ref; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:java` → `stGreen`+`stClosed` (2026-07-24) — first Java cwl-api D6448-ST (`hub-flagship-java` Spring `@RestController` 20/20 hole-free; brace-bounded methods + ResponseEntity status+body + Map.of/string/scalar/path-ref; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:ruby` → `stGreen`+`stClosed` (2026-07-24) — first Ruby cwl-api D6448-ST (`hub-flagship-ruby` Sinatra 20/20 hole-free; string/status/json depth + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:kotlin` → `stGreen`+`stClosed` (2026-07-24) — first Kotlin cwl-api D6448-ST (`hub-flagship-kotlin` Spring `@RestController` 20/20 hole-free; brace/expression `fun` + mapOf/ResponseEntity + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:scala` → `stGreen`+`stClosed` (2026-07-24) — first Scala cwl-api D6448-ST (`hub-flagship-scala` Akka HTTP 20/20 hole-free; `complete`/`Map`/`StatusCodes` + path/query; no invented UI); Http4s secondary dialect hole-free (`pnpm run hub:scala-http4s-smoke` / `hub-gold-scala-http4s` 20/20 `Ok`/`Created`/`Accepted`)  
- [x] `pnpm run hub:complete-conversion-prove:swift` → `stGreen`+`stClosed` (2026-07-24) — first Swift cwl-api D6448-ST (`hub-flagship-swift` Vapor 20/20 hole-free; multi-segment PathComponents `app.get("items", ":id")` + dict/`encodeResponse` status + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:rust` → `stGreen`+`stClosed` (2026-07-24) — first Rust cwl-api D6448-ST (`hub-flagship-rust` Actix Web 20/20 hole-free; scalar/`serde_json::json!`/`HttpResponse` status + path/query; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:typescript` → `stGreen`+`stClosed` (2026-07-24) — first TypeScript cwl-api D6448-ST (`hub-flagship-typescript` Express 20/20 hole-free; typed Request/Response `.ts` origin via shared JS/TS AST lift; not a JS rename; no invented UI)  
- [x] `pnpm run hub:complete-conversion-prove:wisp` → `stGreen`+`stClosed` (2026-07-24) — first filled `wisp-ui` D6448-ST (evidence-only hole zero + signed-in origin-compare; no deepen injectors / D6447)  
- [ ] Trademark notice for AgenticOp / Chrysalis  
- [ ] CONTRIBUTING: private adapters/corpora not accepted into `main`  
- [ ] Site copy: “Start a Pilot” → this kit’s 15-minute path  

## After public

1. Pin release tag that includes Pilot Kit.  
2. Update agenticop.io hub / Start a Pilot CTA.  
3. Keep **trade secrets** in `AgenticOps/commercial/chrysalis-private-pack/` only.

## Explicit non-goal

Do **not** weaken verify gates, force-settle holes, or ship demo façades to make a public demo look green (**D6447**).
