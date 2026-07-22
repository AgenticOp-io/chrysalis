# Matrix depth program (thin gold → multi-suite)

> **Status:** **closed through Wave 9** (2026-07-21) + **COBOL origin** (2026-07-22) — **full gold 627/627**; all nextjs gold-verify; program-close composite  
> **Authority:** extends closed Phase 41/44–46 census (**directed-pair** oracle-product; count = `hubDirectedPairCount()`)  
> **North star:** promote pairs from **1 literal suite** to **literal + structured + middleware** (python/js pattern) without inventing customer façades.

## Thesis

Hub census **627/627** means every directed pair has ≥1 trace-replay suite. Most are **thin gold**. Depth is extra fixtures + `HUB_GOLD_SUITES` rows — catalog growth (e.g. **COBOL** origin-only silver file-lift) raises the pair count when WebIR outbound already covers all emit targets.

| Depth tier | Suites per popular web output | Bar |
| --- | --- | --- |
| **Thin** | 1 (`*-literal-*`) | Scalar routes |
| **Structured** | +`*-structured-*` | JSON object responses (`/health`, `/meta`) |
| **Middleware** | +`*-middleware-*` | Ready + POST `/echo` |
| **Flagship** | + flagship corpus | Real-app oracle (PHP/Express today) |

## Wave 1 (closed) — JVM/Go/.NET/Ruby web depth

Origins: `java`, `go`, `csharp`, `ruby`  
Outputs: `hono`, `fastify` (+ `cwl` structured)  

Fixtures:

| Origin | Structured | Middleware |
| --- | --- | --- |
| java | `fixtures/hub-gold-java-structured` | `fixtures/hub-gold-java-middleware` |
| go | `fixtures/hub-gold-go-structured` | `fixtures/hub-gold-go-middleware` |
| csharp | `fixtures/hub-gold-csharp-structured` | `fixtures/hub-gold-csharp-middleware` |
| ruby | `fixtures/hub-gold-ruby-structured` | `fixtures/hub-gold-ruby-middleware` |

Smoke: `pnpm run hub:matrix-depth-wave1-smoke`

## Wave 2 (closed) — TypeScript middleware + UI site dashboards

- `typescript` middleware family: `fixtures/hub-gold-ts-middleware` (`ts-middleware-hono` / `fastify`) — hole-free (no optional chaining in gold)
- UI site depth: dashboard routes on Vue/Next/Angular fixtures — `hub:ui-site-depth-smoke`

## Wave 3 (closed) — Kotlin / Rust / Scala / Swift web depth

Origins: `kotlin`, `rust`, `scala`, `swift`  
Outputs: `hono`, `fastify` (+ `cwl` structured; typescript aliases hono suites)

Lift widenings (pattern-route-lift):

- Kotlin: multi-pair `mapOf("k" to …)` with bool / string / number values
- Rust: `serde_json::json!({ … })` flat object literals
- Scala: multi-pair `complete(Map("k" -> …))` with bool / string / number
- Swift: `return ["k": …]` dictionary literals

| Origin | Structured | Middleware |
| --- | --- | --- |
| kotlin | `fixtures/hub-gold-kotlin-structured` | `fixtures/hub-gold-kotlin-middleware` |
| rust | `fixtures/hub-gold-rust-structured` | `fixtures/hub-gold-rust-middleware` |
| scala | `fixtures/hub-gold-scala-structured` | `fixtures/hub-gold-scala-middleware` |
| swift | `fixtures/hub-gold-swift-structured` | `fixtures/hub-gold-swift-middleware` |

Smoke: `pnpm run hub:matrix-depth-wave3-smoke`

## Wave 4 (closed) — cross-native depth + PHP web structured/middleware

Registers existing structured/middleware fixtures against native emit targets (`php` / `java` / `go` / `csharp` / `python` / `ruby`) plus middleware→`cwl` gap fill.

Generator: `scripts/hub-ingest/hub-gold-wave4-depth-suites.mjs` (~135 suites)

| Track | Notes |
| --- | --- |
| Cross-native structured | All Wave 1–3 origins with structured fixtures |
| Cross-native middleware | Same, except **js/ts** (native emit holes on `req.body.key`) |
| middleware→cwl | Gap fill for java/go/csharp/ruby/ts/kotlin/rust/scala/swift/php |
| PHP web | New `fixtures/hub-gold-php-{structured,middleware}` → hono/fastify/cwl |

Smoke: `pnpm run hub:matrix-depth-wave4-smoke`

## Wave 5 (closed) — thin pairs → 0

Generator: `scripts/hub-ingest/hub-gold-thin-close-suites.mjs`

Ensures every directed origin×emitTarget that appears in the 601-pair catalog has **≥2** `traceReplay` suites (structured fixture when available, else literal/pattern).

Smoke: `pnpm run hub:matrix-depth-thin-zero-smoke`

**Honest limit:** thin=0 is a **suite-count** bar, not flagship/customer parity. nextjs emit may still fail verify until sibling `@wptp/ir` is installed; those pairs still carry ≥2 registered suites.

## Wave 6 (closed) — full gold on all 601 pairs

Generator: `scripts/hub-ingest/hub-gold-full-gold-suites.mjs`

Every directed pair now has **structured + middleware** suites (≥3 total), including:

- Asset/file-lift origins (`sql`/`html`/`css`/`json`/…) with multi-file structured+middleware fixtures
- `vue` / `svelte` / `cwl` structured (+ middleware) fixtures
- `js`/`ts` **plain** middleware (`hub-gold-*-middleware-plain`) for native/asset emits (avoids `req.body.key` holes)

Smoke: `pnpm run hub:matrix-depth-full-gold-smoke`

**Honest limit:** full gold here is the **fixture depth bar** (structured+middleware suite registration + hole-free lift/emit on sampled suites). It is **not** flagship/customer-repo parity. nextjs emit may still fail verify until sibling `@wptp/ir` is installed.

## Wave 7 (closed) — nextjs verify-green + flagship outbound + verify sweep

1. **nextjs deps:** `pnpm run hub:install-wptp` clones/builds sibling `wptp-emit-nextjs` (+ `@wptp/ir`)
2. **nextjs smoke:** `hub:matrix-depth-wave7-nextjs-smoke` — gold-verify sample across origins + flagship nextjs
3. **Verify sweep:** `hub:matrix-depth-verify-sweep-smoke` — sampled non-nextjs depth suites
4. **Flagship outbound:** `hub-gold-flagship-outbound-suites.mjs` expands express / plain-php / symfony → rust/kotlin/scala/swift + asset outputs  
   Smoke: `hub:matrix-depth-flagship-outbound-smoke`

## Wave 8 (closed) — structured emit lowering + nextjs replay

1. **Swift structured bodies:** `renderSwiftBody` lowers path/query structured refs (flagship holeCount 5 → 0)
2. **Asset probe structured bodies:** `manifestProbeResponse` lowers structured → JSON probe (flagship→html/json/css hole-free)
3. **Nextjs trace-replay:** `hub:matrix-depth-wave8-nextjs-replay-smoke`

**Honest limit:** Flagship outbound is still gold-fixture evidence on flagship corpora — not arbitrary customer repos. Prove/WISP UI remains a separate track.

## Wave 9 (closed) — all nextjs gold-verify + program close

1. **wptp-matrix sibling:** `pnpm run hub:install-wptp` now also clones/builds `wptp-matrix` (needed for `contract-first-nextjs` OpenAPI→Next compose)
2. **All nextjs suites:** `hub:matrix-depth-wave9-nextjs-all-smoke` — gold-verify every `emitTarget: nextjs` + `traceReplay` suite (~93)
3. **Composite:** `hub:matrix-depth-program-close-smoke` — Waves 1–9 + thin-zero + full-gold + UI depth + verify/flagship/replay gates

**Honest limit:** Wave 9 proves hub gold emit/verify green for registered nextjs suites when WPTP siblings are installed — not customer-repo Next.js parity. Prove track is **stGreen** + **signedInOriginCompare=passed** (2026-07-22): evidence-only hole zero, live management markers vs Module_Manager source, demo sign-in verified.

## WISP multi-target prove (closed 2026-07-22)

Gate: `pnpm run hub:wisp-multi-target-prove-smoke`

| Bar | Result |
| --- | --- |
| Svelte gold structured+middleware | **48/48** suites → **24/24** emit targets |
| Real WISP `routes.cwl` outbound emit | **24/24** targets (**~106** routes each; nextjs **105**) |

Emit targets: c, cpp, csharp, css, cwl, fastify, go, hono, html, java, json, kotlin, markdown, nextjs, php, python, ruby, rust, scala, scss, sql, swift, vue, yaml.

**Honest limit:** Gold + outbound emit prove lift→WebIR→emit works for WISP’s origin language cells and the live CWL corpus. It is **not** a claim that each target is a production-parity rewrite of the full SvelteKit app (ArcGIS islands, auth, etc. remain CWL/static-host proven).

## WISP deep emit prove (closed 2026-07-22; expanded all-24)

Selective high-value path first; then **all 24** emit targets. Gate: `pnpm run hub:wisp-deep-emit-prove-smoke`

| Bar | Result |
| --- | --- |
| Svelte gold trace-replay (structured+middleware × all emit targets) | **48** suites (toolchain skips allowed) |
| Real WISP `routes.cwl` emit → **24/24** | structural + route counts |
| In-process WISP→hono / fastify / nextjs | **correctness=1** (nextjs may skip without WPTP) |
| Asset manifest replay on WISP (10 targets) | correctness=1 |
| Native | gold probe + WISP emit/structural (HTML corpus not native-oracle) |
| CWL round-trip replay on WISP | correctness=1 |

**Honest limit:** Deep prove is emit+replay evidence. Product ST remains **CWL static**. Native WISP pages are emit-depth; native behavioral depth is gold fixtures. Do not treat every emit as D6448-ST.

## Refuse

- Marketing “627 production-ready” / “601 production-ready”
- Demo-only handlers that do not lift from origin idioms
- Auto-apply LLM patches without verify

## Related

- [`CAPABILITY-MATRIX.md`](./CAPABILITY-MATRIX.md)
- [`PHASE-46-PROGRAM.md`](./PHASE-46-PROGRAM.md) (post-close directed-pair census)
- `scripts/hub-ingest/hub-gold-manifest.mjs`
