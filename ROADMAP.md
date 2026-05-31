# Chrysalis — Roadmap

> Read `DESIGN.md` first. This file is the execution plan for that design.

Milestones are intentionally thin vertical slices. Each milestone must produce a
runnable demo and measurable numbers, not a pile of abstractions.

**v2.0.0 (2026-04-30)** source release: workspace semver **2.0.0** tags the **Chrysalis 2.0** scale-out milestones (**V2-M1–V2-M6**) completed on **`main`**; **`CHANGELOG.md`**, **`DESIGN.md` D285**, and **`pnpm run release:artifacts`** on **`v2.0.0`** produce **`chrysalis-2.0.0-source.{tar.gz,zip}`**. **v2.0.1 (2026-05-08)** patch: **`chrysalis init`** + **`chrysalis.project.json`** (**DESIGN D290**), commercial/license stack (**D289**), dev **`pnpm audit`** hygiene (**Vitest** / **Vite**), docs/install cross-links — see **`CHANGELOG.md` [2.0.1]**. Optional **Remaining** / multi-lane **Next** backlog continues after the tags (see **[Post-2.0 depth backlog (options)](#post-20-depth-backlog-options)**, **Road to Chrysalis 2.0**, and **Multi-lane program**).

**v1.0.1 (2026-04-29)** patch release: **install-from-tarball** steps in **`docs/INSTALLATION.md`**, GitHub Project bootstrap (**`docs/GITHUB_PROJECT.md`**), and an **idempotent tag release workflow** (upload assets when the GitHub Release already exists). **v1.0.0** was the first tagged source release with the full **`docs/`** set, **`LICENSE`**, and **`pnpm run release:artifacts`**. **Program tracking:** **`docs/GITHUB_PROJECT.md`** + **`pnpm run github:project-bootstrap`**. Ongoing engineering continues on **`main`** per the lanes below.

**Chrysalis 2.0** is chartered in **[Road to Chrysalis 2.0](#road-to-chrysalis-20--scale-out--warehouse-sized-codebases)** below: multi-server / massive-site **operations and performance** without relaxing **DESIGN.md** non-negotiables (behavioral oracle, WebIR, verify gates, holes, provenance).

**Milestone 4 v1 pilot is complete.** Milestones 0–3 and **Milestone 4 v1** (see
Milestone 4 below) meet the scoped acceptance. **Milestone 5 is now complete**
(see section below). **Milestone 6 checklist is complete.** **Milestone 6A (auth boundary scoped track)**
scoped checklist (D183–D192) is **complete**; deeper auth/vendor parity stays
cross-cutting under the same hole policy. Milestone 2
follow-ups that remain intentionally open-ended (Composer vendor
effects, `mysqli` oracle shim, bare inner N+1 without assign, corpus-only batch
confidence) stay cross-cutting; repair-loop follow-ons (richer attribution,
composite proposers) are optional and must not weaken the verify gate.

## Post-2.0 depth backlog (options)

The **v2.0.0** thesis and scale-out milestones are complete; the rows below track **post-2.0 depth** work that landed after the tags. **A, C, D, E** are implemented in-tree; **B** ships the **origin-insensitive structural dedupe** slice (**`mergeDedupeStructuralKeyIgnoringOrigin`**, CLI **`--ingest-dedupe-structural-subgraphs-ignore-origin`**); broader **IR helper lifting** for non-structurally-identical bodies remains future work (see **V2-M4** *Remaining*).

| Option | What | Where it lives today | Tracking |
| --- | --- | --- | --- |
| **A — Full ingest checkpoint** | Persist **partial WebIR** so ingest can **resume** after crash beyond **AST parse cache** + **route shards** + merge. | **`@chrysalis/webir`** **`module-checkpoint.ts`**, **`moduleBuilderResumeFromModule`**; **`@chrysalis/ingest`** **`ingest-checkpoint.ts`** + **`ingestDirectory`** options; CLI **`--ingest-checkpoint-file`**, **`--ingest-resume-checkpoint`** (rejected with **`--merge-all-shards`**). | [#2](https://github.com/theorem6/chrysalis/issues/2) |
| **B — IR helper lifting** | **B1–B4 v0:** fixtures + **`liftSharedHelpers`** / **`liftSharedHelpersSemantic`** / **`embedSharedHelperBodiesInModule`** (CLI **`--ingest-lift-shared-helpers`**, **`--ingest-lift-shared-helpers-semantic`**, **`--ingest-embed-shared-helper-bodies`**; structural dedupe required). Call-effect canonicalization + helper roots merged into route module before dedupe. Design: **`docs/IR-HELPER-LIFTING.md`** (**D311**, **D323–D325**). | **`lift-shared-helpers.ts`**, **`library-effects.ts`**, **`merge-dedupe-key.ts`**, fixtures **`lift-helper-*`**. | [#3](https://github.com/theorem6/chrysalis/issues/3) |
| **C — Corpus rotation + multi-host ops** | **Day-bucket** archive mover for trace roots; multi-host merge discipline unchanged (**`corpus-merge`**). | **`scripts/corpus-rotate-archive.mjs`**, **`pnpm run corpus:rotate-archive`**; **`docs/ADMINISTRATION.md`** (Corpus volume and retention). Vitest **`packages/cli/tests/corpus-rotate-archive-script.test.ts`**. | [#4](https://github.com/theorem6/chrysalis/issues/4) |
| **D — `rediss://` (PHP sessions)** | TLS Redis URL support in the **PHP** session bridge. | **`RedisChrysalisSessionHandler`** **`doConnectRedis`**; smoke **`packages/oracle-php/tests/redis_session_bridge_smoke.php`**. | [#5](https://github.com/theorem6/chrysalis/issues/5) |
| **E — Fleet / chimera dashboards** | **Reference** Grafana starter dashboard (**operator-owned** datasource). | **`examples/grafana/README.md`**, **`examples/grafana/dashboards/chrysalis-operator-overview.json`**. | [#6](https://github.com/theorem6/chrysalis/issues/6) |

**Multi-runtime CLI (DESIGN D295):** **`go/shim/`** (Go **`exec`**) and **`python/chrysalis_shim/`** (**`subprocess`**) invoke the same built Node CLI (**`packages/cli/dist/bin.js`**). **`CHRYSALIS_CLI_JS`** / **`CHRYSALIS_NODE`** override discovery. Optional **`pnpm run test:cli-shims`** after **`pnpm --filter @chrysalis/cli build`**.

### Checkbox backlog (optional tracking)

- [x] **A** — Full ingest checkpoint (resume beyond cache + shards) — [#2](https://github.com/theorem6/chrysalis/issues/2)
- [x] **B** — D283 **ignore-origin** structural dedupe slice (CLI **`--ingest-dedupe-structural-subgraphs-ignore-origin`**) — broader IR helper lifting remains future — [#3](https://github.com/theorem6/chrysalis/issues/3)
- [x] **C** — Corpus day-bucket rotation script + docs — [#4](https://github.com/theorem6/chrysalis/issues/4)
- [x] **D** — **`rediss://`** for **`packages/oracle-php`** Redis session handler — [#5](https://github.com/theorem6/chrysalis/issues/5)
- [x] **E** — Third-party dashboard **examples** (Grafana starter) — [#6](https://github.com/theorem6/chrysalis/issues/6)
- [x] **F** — Python + Go CLI shims forwarding to Node (**DESIGN D295**); **`pnpm run test:cli-shims`**
- [x] **G — Translation Hub v1 matrix + routing** — Full **`TARGET_MATRIX`** for every **`EXT_TO_LANGUAGE`** id (honest **`supported: false`** / WPTP CI references); hub ingest routes **PHP → typescript-chrysalis** only; structured **422** + **`hub.report.json`** holes for planned pairs; operator UI target hints; Vitest **`packages/cli/tests/chrysalis-hub-store.test.ts`**. (**DESIGN D312**, **D313**)
- [x] **G2 — Translation Hub universal open matrix + pipeline** — **`language-catalog.mjs`**, **`hub-ingest/*`** (lift, emit, **`emit-target-project`**), connectivity agents, **`HUB_MISSION_OPEN`** / grade **open** for all origin×output pairs; VM bootstrap **`pnpm -r build`** + parser vendor when **php** on PATH; Vitest hub store grid. (**DESIGN D314**)
- [x] **G3 — Translation Hub SSH origin prep** — **`chrysalis-hub-prep-origin.mjs`**, **`chrysalis-origin-bootstrap.sh`**, **`originPrep`** on sites, **`POST …/prep-all-sites`**, default prepare-on-add; docs **`HUB-CONNECTIVITY.md`**. (**DESIGN D316**)
- [x] **G4 — Translation Hub portal-first ops** — Multi-site **`sites[]`** on create; **`chrysalis-hub-setup.mjs`** background prep/pull; **`POST …/setup-all-sites`**, **`POST …/run-pipeline`**; SSE **`setup`** / **`siteSetup`**; Console **Run full pipeline**, per-site Prepare/Setup/Translate. (**DESIGN D317**)

### Translation Hub — remaining (product backlog)

- [x] **G5 — Portal verify leg** — Console **Verify** + **`chrysalis-hub-verify.mjs`**; traces under **`site/.chrysalis/traces`**, **`POST …/verify`**, SSE **`verify`** / **`siteVerify`**. (**D318**)
- [x] **G6 — Portal observe assist** — **`GET …/observe-assist`**, staging steps + CLI commands in Console. (**D318**)
- [x] **G7 — Site lifecycle in UI** — Remove, re-pull, **Save site SSH edits** (`PATCH`), per-site actions. (**D318**)
- [x] **G8 — WPTP hub smoke (partial)** — **`POST …/wptp-smoke`** when **`wptp-matrix`** sibling exists; full per-site WPTP compose remains WPTP CI / future depth.
- [x] **G9 — Hub auth (partial)** — Portal Bearer token when **`CHRYSALIS_OPERATOR_TOKEN`** set; multi-tenant ACLs still future.

- [x] **G10 — Trace upload in browser** — **`POST …/traces/upload`** multipart or zip → **`site/.chrysalis/traces`**. (**D319**)
- [x] **G11 — Emitted app launcher** — **`POST …/runtime/start|stop`**, auto-fills verify base URL. (**D319**)
- [x] **G12 — Multi-tenant hub** — Project **`owner`** + Bearer token tenancy (**admin** vs **tenant**). (**D319**)
- [x] **G13 — Per-site WPTP compose** — **`POST …/wptp-compose`**, **`wptp-compose-site.mjs`** (OpenAPI/HAR/WebIR on site tree). (**D319**)

**Translation Hub v1 is feature-complete** for the portal product slice (G1–G13). Further work is Chrysalis core depth (oracle, ingest, WPTP emitters), not hub UI plumbing.

### Translation Hub — post-v1 (portal depth)

- [x] **G14 — Org registry UI** — **`chrysalis-hub-org.mjs`**, **`orgs.json`**, project **`orgId`**, **`GET/POST /api/hub/orgs`**, join, portal org list + create + new-project org picker. (**DESIGN D320**)
- [x] **G15 — Resumable trace upload** — **`start` / `chunk` / `finish`** under **`~/.chrysalis-hub/uploads/`**; portal chunked upload for large files. (**D320**)
- [x] **G16 — Emitted-app health probes** — **`probeRuntimeHealth`**, **`GET …/runtime/health`**, SSE **`runtimeHealth`**, Console health badges. (**D320**)
- [x] **G17 — Hub WPTP emit pipeline (default on)** — **`wptp-emit-pipeline.mjs`**, **`CHRYSALIS_HUB_PREFER_WPTP=1`** in hub jobs; scaffold fallback hole **`hub:emit-scaffold-fallback`**. Core **`wptp-emit-*`** quality remains Chrysalis/WPTP CI depth.

### Translation Hub — portal product complete (web-only ops)

- [x] **G18 — Portal product completeness** — Local workspace create; site form binding; formatted observe guide; org join; per-site route plan; batch concurrency; project PATCH/DELETE; status job + health refresh; **`pnpm run hub:serve`**; **`docker-compose.hub.yml`**. (**DESIGN D321**)

**The Translation Hub is the web product surface** for operators (`http://host:19090/`). Remaining depth is Chrysalis core (emit/oracle/WPTP), not portal plumbing.

- [x] **G19 — Language readiness + work queue** — **`buildLanguageReadinessReport`**, **`buildLanguageWorkQueue`** (popularity-ordered origins/outputs, scoped backlog tasks); portal **Languages** tab; **`GET /api/hub/language-readiness`**, **`GET /api/hub/language-work-queue`**. (**DESIGN D322**)
- [x] **G20 — Contract-first + JS route lift** — Recursive **`discoverContractArtifacts`**; WPTP compose for any origin when OpenAPI/HAR present; heuristic Express-style routes for **javascript**/**typescript** lift; Vitest **`hub-ingest-g20.test.ts`**. (**DESIGN D326**)
- [x] **G21 — JavaScript/TypeScript AST hub ingest v0** — **`javascript-ast-ingest.mjs`** (acorn + TS strip); literal returns lowered; **`lift-to-webir`** prefers AST over heuristic; readiness **silver-ast-lift**. (**DESIGN D327**)
- [x] **G22 — Python AST hub ingest v0** — **`python-ast-ingest.mjs`** (CPython **ast** when **python3** on PATH); Flask/FastAPI decorators; fixture **`hub-python-routes`**. (**DESIGN D328**)
- [x] **G23–G24 — Java + Go hub route lift v0** — **`java-ast-ingest.mjs`** (Spring/JAX-RS annotations), **`go-ast-ingest.mjs`** (gin/net/http patterns); shared **`hub-lift-webir-route.mjs`**. (**DESIGN D329**)
- [x] **G25 — Open-matrix pattern + file lift** — **`pattern-route-parsers.mjs`** / **`pattern-route-lift.mjs`** / **`hub-lift-dispatch.mjs`** for ruby/csharp/kotlin/rust/scala/swift/vue; per-file asset lift for sql/html/css/json/yaml/markdown/c/cpp; fixtures **`hub-pattern-lift`**; **`hub:matrix-smoke`**. (**DESIGN D330**)
- [x] **G26 — Hub native Python emit + second gold pair** — **`emit-python-from-hub.mjs`** (Flask from WebIR); **javascript/typescript → hono/fastify** promoted to **gold** when literal-only (**`hub-gold-verify`**, fixture **`hub-gold-js-literal`**); **`hub:wptp-gold-smoke`** for contract-first WPTP when **`wptp-matrix`** sibling present. (**DESIGN D331**)
- [x] **G27 — Hub completion CI + Java/Go native emit** — **`emit-java-from-hub.mjs`**, **`emit-go-from-hub.mjs`**, **`hub-completion.mjs`**, **`ci:hub-completion`** gate in **`typecheck-and-test`**; **`hub-load-routes.mjs`**. (**DESIGN D332**)
- [x] **G28 — Hub completion finish** — **`res.json`** / object literal JS lowering; **`hub-gold-trace-replay`** in-process verify oracle; native emit **ruby/csharp/rust**; **wptp-matrix** checkout + **`hub:wptp-gold-smoke`** in CI. (**DESIGN D333**)
- [x] **G29 — Translation path matrix** — **`hub-translation-paths.mjs`** (ingest/IR/emit/verify lanes per origin×output); **`hub:path-matrix`**; **`GET /api/hub/translation-path-matrix`**; **`docs/HUB-TRANSLATION-PATHS.md`**. (**DESIGN D334**)
- [x] **G30 — Hub comprehensive paths program** — Native emit **kotlin/scala/swift**; **python** literal→hono **gold** + dict lowering; **`hub-gold-manifest`** multi-suite verify/replay; **`oracle-python`** + **`oracle-node`** recorders; **`hub-oracle-record`**, **`hub-native-emit-smoke`**; **`hub-completion`** schema v2. (**DESIGN D335**)
- [x] **G31 — Path knowledge base** — **`hub-path-knowledge.mjs`**: all **575** pairs with **similarities**, **differences**, **best practices**, language profiles, lane comparisons; **`pnpm run hub:path-knowledge`**; **`GET /api/hub/path-knowledge`**; **`docs/HUB-PATH-KNOWLEDGE.md`**. (**DESIGN D336**)
- [x] **G32 — Chrysalis Web Language (CWL)** — WebIR-native **`.cwl`** syntax; direct ingest **`hub-cwl-direct`**; emit **`emit-cwl-from-hub.mjs`**; gold **`cwl-gold-hono`**; matrix **23×26** pairs; **`docs/CWL.md`**, **`docs/HUB-CROSS-LANGUAGE-SYNTHESIS.md`**, **`hub:cross-language-synthesis`**. (**DESIGN D337**)
- [x] **G33 — Synthesis API + completion v3** — **`GET /api/hub/cross-language-synthesis`**; **`hub-completion`** schema **v3** gates synthesis (**575** pairs) + **CWL** native emit smoke; **`ci-gates`** accepts v3. (**DESIGN D338**)
- [x] **G34 — Gold depth + path explorer UI** — Expanded **hub-gold-manifest** (structured JSON, **CWL round-trip**, **JS/TS/PY→CWL**); **`lift-to-webir`** skips **`generated/`**; operator **Path explorer** (`#/paths`); **`resolveHubPython`**; middleware gold fixture; **17** matrix gold pairs; full trace replay on hono gold suites. (**DESIGN D339**)
- [x] **G35 — Fastify gold trace replay + lift metadata** — **Fastify** structural/trace suites mirror key **Hono** gold paths; **`hub-gold-trace-replay`** installs **fastify** or **hono** per target; lift reports **`middlewareUseCount`**; **`hub-completion`** schema **v4**. (**DESIGN D340**)
- [x] **G36 — Structured gold parity + path explorer depth** — **Python structured** and **JS structured → CWL** gold verify; **TS literal → Fastify** trace replay; **`hub-completion`** schema **v5** lists structural/trace suite ids; operator path explorer auto-loads synthesis, gold-pair links, and **`#/paths?origin=&output=`** deep links. Matrix gold count unchanged (**17**). (**DESIGN D341**)
- [x] **G37 — Gold suite coverage API + middleware/CWL Fastify** — **`js-middleware-fastify`**, **`cwl-gold-fastify`** structural/trace suites; **`GET /api/hub/gold-suites`** + **`hubGoldSuitesForPair`**; path explorer shows per-pair CI suite list; **`hub-post-deploy-verify`** probes gold-suites HTTP. (**DESIGN D342**)
- [x] **G38 — TS structured gold + middleware shell metadata** — **`hub-gold-ts-structured`** fixture; **ts-structured** hono/fastify/cwl + **js-middleware-cwl** suites; lift report **`middlewareShell`** (schema **v2**); **`hub-completion`** schema **v6** gates expected suite counts. (**DESIGN D343**)
- [x] **G39 — Deploy HTTP gold probe + CI v6 floors** — **`gce-hub-finish-deploy`** probes **`/api/hub/gold-suites`** after hub start; **`hub-post-deploy-verify --http-probe-only`**; **`ci-gates`** rejects v6 suite-count drift; demo doc path explorer section. (**DESIGN D344**)
- [x] **G40 — Gold coverage matrix** — **`hub-gold-coverage.mjs`** maps **575** pairs to hub CI suites vs Chrysalis ingest gold; **`GET /api/hub/gold-coverage`**; **`hub-completion`** schema **v7**; path explorer shows Chrysalis vs hub CI lanes; deploy verify checks **emit-fastify** + gold-coverage HTTP. (**DESIGN D345**)
- [x] **G41 — Middleware lowering + matrix verify tiers** — **`web.request.middleware`** IR; **`hub-express-middleware.mjs`** lowers **`express.json`** / **`express.urlencoded`** presets; **Hono**/**Fastify** emit via **`planHubMiddlewareEmit`**; all **575** matrix pairs **`grade: gold`** with **`verifyTier`** (**oracle** / **structural** / **scaffold-***); **`hub-completion`** schema **v8**. (**DESIGN D346**)
- [x] **G42 — Native structural gold + verify-tier API** — **`hub-gold-native-emit`** + **python/java/go/ruby** native gold suites; **gin `c.String`** + **Sinatra block** literal lift; **`GET /api/hub/verify-tiers`**; work-queue **`verifyTiers`** filter; path explorer shows **verifyTier**; **`hub-completion`** schema **v9**. (**DESIGN D347**)
- [x] **G43 — Middleware POST trace replay + native gold depth** — **`hub-gold-replay-probe`** JSON/urlencoded POST probes; **Hono `chrysalisUrlencodedBodyMiddleware`**; **csharp/rust** native structural gold + **MapGet** / **actix** literal lift; **`hub-completion`** schema **v10**. (**DESIGN D348**)
- [x] **G44 — Hub `res.json` response emit** — **`__return_json`** in **`emit-tree`** for **Hono/Fastify**; **`javascript-ast-ingest`** lowers **`res.json(...)`** handlers; **`js-middleware-fastify`** trace replay restored. (**DESIGN D349**)
- [x] **G45 — Kotlin / Scala / Swift native structural gold** — Literal fixtures; **Ktor** / **Akka** / **Vapor** pattern lift; **`kotlin-native-kotlin`**, **`scala-native-scala`**, **`swift-native-swift`** suites. (**DESIGN D350**)
- [x] **G46 — Python Flask middleware gold** — **`hub-flask-middleware.mjs`** synthetic **`express.json`** / **`urlencoded`** presets; **`jsonify`** → **`__return_json`**; **`python-middleware-hono`** / **`fastify`** + trace replay. (**DESIGN D351**)
- [x] **G47 — Ruby → Hono/Fastify structural gold** — **`ruby-literal-hono`** / **`ruby-literal-fastify`** on **`hub-gold-ruby-literal`** with trace replay. (**DESIGN D352**)
- [x] **G48 — Java → Hono/Fastify structural gold** — **`java-literal-hono`** / **`java-literal-fastify`** on **`hub-gold-java-literal`** with trace replay. (**DESIGN D353**)
- [x] **G49 — Go → Hono/Fastify structural gold** — **`go-literal-hono`** / **`go-literal-fastify`** on **`hub-gold-go-literal`** (gin **`c.String`** literals) with trace replay. (**DESIGN D354**)
- [x] **G50 — C# → Hono/Fastify structural gold** — **`csharp-literal-hono`** / **`csharp-literal-fastify`** on **`hub-gold-csharp-literal`** with trace replay. (**DESIGN D355**)
- [x] **G51 — Python Flask middleware → CWL gold** — **`python-middleware-cwl`** on **`hub-gold-python-middleware`**. (**DESIGN D356**)
- [x] **G52 — Hub / core lane boundary tests** — Vitest **`hub-framework-cross-gold`** (pattern-lift origins → hono/fastify) and **`hub-oracle-tier-boundary`** (exactly **4** Chrysalis oracle matrix pairs); **`hub-completion`** schema **v13**. (**DESIGN D357**)
- [x] **G53 — Cross-framework CWL gold** — **`java/go/csharp/ruby → cwl`** structural suites (**`*-literal-cwl`**) on existing fixtures; extends CWL surface beyond JS/TS/Python and middleware. (**DESIGN D358**)
- [x] **G54 — Kotlin/Scala/Swift → Hono/Fastify/CWL structural gold** — Add **`kotlin/scala/swift-literal-*`** suites on the native literal fixtures with trace replay for **Hono/Fastify**; `hub-completion` schema **v15**. (**DESIGN D359**)
- [x] **G55 — Rust → Hono/Fastify/CWL structural gold** — **`rust-literal-hono`**, **`rust-literal-fastify`**, **`rust-literal-cwl`** on **`hub-gold-rust-literal`**; completes pattern-lift origin framework coverage. **`hub-completion`** schema **v16**. (**DESIGN D360**)
- [x] **G56 — JS/TS → Next.js structural gold** — **`js-literal-nextjs`**, **`ts-literal-nextjs`** via **`emit-nextjs-from-hub`** / WPTP **`@wptp/emit-nextjs`**; CI checks out **`wptp-emit-nextjs`** before **`ci:hub-completion`**. **`hub-completion`** schema **v17**. (**DESIGN D361**)
- [x] **G57 — JS/TS structured → Next.js + Next.js trace replay** — **`js/ts-structured-nextjs`**; **`hub-gold-nextjs-fetch`** in-process App Router replay; literal + structured Next.js trace suites. (**DESIGN D362**)
- [x] **G58 — WPTP contract-first hub gold** — **`contract-first-hono`**, **`contract-first-nextjs`** on **`hub-contract-first`** via **`hub-wptp-contract-gold`**; **`wptp-matrix`** build in CI. (**DESIGN D363**)
- [x] **G59 — Hub multi-lane boundary smoke** — **`hub-multi-lane-smoke`** (oracle redactor + parser-bridge vendor); Vitest **`hub-multi-lane-boundary`**; **`hub-completion`** schema **v18**. (**DESIGN D364**)
- [x] **G60 — Middleware + CWL → Next.js gold** — **`js-middleware-nextjs`**, **`python-middleware-nextjs`**, **`cwl-gold-nextjs`** structural + trace replay. (**DESIGN D365**)
- [x] **G61 — Python → Next.js lift gold** — **`python-literal-nextjs`** on **`hub-gold-python-literal`**. (**DESIGN D366**)
- [x] **G62 — Contract-first trace replay** — OpenAPI route probes for **`contract-first-hono`** / **`contract-first-nextjs`**; **`listOpenApiFixtureRoutes`**. **`hub-completion`** schema **v19**. (**DESIGN D367**)
- [x] **G63 — Pattern-lift origins → Next.js gold** — **`ruby/java/go/csharp/kotlin/scala/swift/rust-literal-nextjs`** structural + trace replay (completes framework Next.js coverage for pattern-lift origins). (**DESIGN D368**)
- [x] **G64 — CWL ↔ Next.js parity** — Vitest **`hub-cwl-nextjs-parity`** (route-count parity vs hono/fastify; round-trip + nextjs on same fixture). (**DESIGN D369**)
- [x] **G65 — Hub multi-lane nikic parity** — **`hub-multi-lane-smoke`** runs **`packages/parser-bridge/tests/nikic.test.ts`** when **`php`** + **`vendor/`** present; schema **v1** artifact fields. **`hub-completion`** schema **v20**. (**DESIGN D370**)
- [x] **G66 — Asset + Vue → framework/Next.js gold** — **`sql/html/json/vue-literal-*`** suites (asset file-lift + **`hub-gold-vue-literal`**); **`hub-completion`** schema **v21**. (**DESIGN D371**)
- [x] **G67 — Vue `<script>` AST lift** — **`hub-lift-dispatch`** runs **`javascript-ast-ingest`** on extracted Vue SFC script (literal routes hole-free). (**DESIGN D372**)
- [x] **G68 — Hub migration-debt smoke** — **`hub-multi-lane-smoke`** schema **v2** runs **`migration-debt`** on **`fixtures/tiny-blog`** (hole economics lane boundary). (**DESIGN D373**)
- [x] **G69 — Extended asset origins → framework/Next.js gold** — **`css/scss/markdown/yaml/c/cpp-literal-*`** on **`fixtures/hub-pattern-lift/*`** (hole-free file-lift). (**DESIGN D374**)
- [x] **G70 — PHP oracle ingest smoke** — **`hub-php-oracle-smoke`** runs **`chrysalis ingest`** on **`fixtures/tiny-blog`** (core lane boundary, not hub lift); **`phpOracleSmoke`** in **`hub-completion`** schema **v22**. (**DESIGN D375**)
- [x] **G71 — Operator path explorer completion sections** — **`GET /api/hub/completion-sections`** + path explorer coverage hints for PHP oracle lane and extended asset suites. (**DESIGN D376**)
- [x] **G72 — Path knowledge v2 + language compare** — **`hub-path-traits.mjs`** (`pros`/`cons`/`riskLevel`/`canonicalWebIrPattern`); **`GET /api/hub/language-compare`**; path knowledge schema **v2**. (**DESIGN D377**)
- [x] **G73 — PHP oracle emit + verify smoke** — **`hub-php-oracle-smoke`** v2: ingest + **hono** emit + migration-debt verify on **`fixtures/tiny-blog`**; **`hub-completion`** schema **v23**. (**DESIGN D378**)
- [x] **G74 — CWL RFC-0001 module `use` middleware** — **`use json`/`use urlencoded`**; **`docs/CWL-RFC.md`** index. (**DESIGN D379**)
- [x] **G75 — Web database catalog** — **`hub-web-databases.mjs`** (22+ tier-1/2/3 stores); embedded in path knowledge **schema v3**; **`GET /api/hub/web-databases`**. (**DESIGN D380**)
- [x] **G76 — CWL middleware gold suites** — **`cwl-middleware-hono/fastify`** on **`hub-gold-cwl-middleware`** (RFC-0001 POST replay). (**DESIGN D381**)
- [x] **G77 — PHP oracle fastify emit** — **`hub-php-oracle-smoke`** v3 emits **hono + fastify**; **`hub-completion`** schema **v24**. (**DESIGN D382**)
- [x] **G78 — Migration planner API** — **`buildMigrationPlan`** + **`GET /api/hub/migration-plan`**; **`pnpm run hub:migration-plan`**. (**DESIGN D383**)
- [x] **G79 — CWL RFC-0002 path parameters** — **`param`** bindings + **`cwl-path-params-*`** gold; **`hub-cwl-path-params.mjs`**. (**DESIGN D384**)
- [x] **G80 — CWL RFC-0003 query parameters** — **`query`** bindings + **`cwl-query-params-*`** gold. (**DESIGN D385**)
- [x] **G81 — CWL path/query → Next.js gold** — **`cwl-path-params-nextjs`**, **`cwl-query-params-nextjs`**. (**DESIGN D386**)
- [x] **G82 — Origin database detection** — **`hub-detect-databases.mjs`** maps scan **`services`** to catalog ids; **`GET /api/hub/detect-databases`**. (**DESIGN D387**)
- [x] **G83 — Migration planner + scan integration** — migration plan accepts site **`services`**; operator auto-fills databases from last scan. (**DESIGN D388**)
- [x] **G84 — CWL RFC-0004 headers/cookies** — **`header`** / **`cookie`** bindings + **`cwl-request-context-*`** gold. (**DESIGN D389**)
- [x] **G85 — PHP oracle Next.js emit smoke** — **`hub-php-oracle-smoke`** v4 optional **`emitNextjsOk`** when **`wptp-emit-nextjs`** present. (**DESIGN D390**)
- [x] **G86 — Console migration plan panel** — per-project plan with aggregated site database detection. (**DESIGN D391**)
- [x] **G87 — CI knowledge exports** — **`ci:hub-knowledge`** gates **`hub-path-knowledge.json`** + **`hub-web-databases.json`**. (**DESIGN D392**)

### Strategic program (locked) — follow `docs/STRATEGIC-PLAN.md`

> **Authority:** `docs/STRATEGIC-PLAN.md` (2026-05-26). Hub G-track items above are **plumbing**; this section is **product direction**. Do not add off-plan work without amending that doc + Decision Log.

| Phase | Horizon | Focus | ROADMAP keys |
| --- | --- | --- | --- |
| **0** | Packaging | Capability matrix; honest tiers | **G88** |
| **1** | PHP wedge | Verify playbooks, emit parity notes, Hub verify gate | **G89–G94** |
| **2** | Migration OS | Evidence dashboard, programs, contract export | **G95–G98** |
| **3** | CWL interchange | RFC 0005–0006, project-to-CWL | **G99–G102** |
| **4** | Second oracle | Node spike | **G103** |
| **5** | CWL runtime | Optional; only after interchange wins | G106+ |

- [x] **G88 — Capability matrix** — `docs/CAPABILITY-MATRIX.md`, `hub-capability-matrix.mjs`, completion schema **v27**. (**DESIGN D394**)
- [x] **G89 — Verify playbooks** — `hub-verify-playbooks.mjs` + `/api/hub/verify-playbooks`. (**DESIGN D395**)
- [x] **G90 — Hub evidence MVP** — `hub-evidence.mjs`, Console panel, `/api/hub/projects/{id}/evidence`. (**DESIGN D396**)
- [x] **G91 — Migration programs** — `hub-migration-programs.mjs` (api-slice, auth-slice, public-readonly). (**DESIGN D397**)
- [x] **G92 — Project-to-CWL v0** — `hub-project-cwl-export.mjs` on PHP hub-translate → `.chrysalis/migration.cwl`. (**DESIGN D398**)
- [x] **G93 — CWL RFC-0005 request body** — `body` bindings + `cwl-request-body-*` gold. (**DESIGN D399**)
- [x] **G94 — CWL RFC-0006 response status** — `status N;` + `cwl-response-status-*` gold (contract metadata). (**DESIGN D400**)
- [x] **G95 — Completion tier packaging** — `capabilityMatrix` section in hub-completion. (**DESIGN D394**)
- [x] **G96 — Evidence API gate** — verify gate threshold 1.0 in evidence report. (**DESIGN D396**)
- [x] **G97 — Migration program API** — `/api/hub/migration-program`. (**DESIGN D397**)
- [x] **G98 — Migration contract path** — `migration.cwl` + `cwl-export.json` metadata. (**DESIGN D398**)
- [x] **G99 — CWL body gold** — `fixtures/hub-gold-cwl-request-body`. (**DESIGN D399**)
- [x] **G100 — CWL status gold** — `fixtures/hub-gold-cwl-response-status`. (**DESIGN D400**)
- [x] **G101 — Hub completion v27** — 125 structural / 99 trace suites; CI gates. (**DESIGN D401**)
- [x] **G102 — project-to-CWL on translate** — `hub-translate.mjs` PHP path. (**DESIGN D398**)
- [x] **G103 — Node oracle spike** — `hub-node-oracle-spike.mjs` + pilot README. (**DESIGN D402**)
- [x] **G104 — Laravel verify gaps backlog** — `hub-laravel-verify-gaps.mjs` + `/api/hub/laravel-verify-gaps`. (**DESIGN D404**)
- [x] **G105 — PHP Next.js verify** — `hub-php-nextjs-verify.mjs` trace replay; `phpOracleSmoke.verifyNextjsOk`. (**DESIGN D405**)
- [x] **G106 — CWL RFC-0007 auth/effects** — `use auth session|bearer`, handler effects; `cwl-auth-effects-*` gold. (**DESIGN D403**)
- [x] **G107 — Hub verify gate on ingest-emit** — `CHRYSALIS_HUB_VERIFY_GATE` + `hub-evidence.mjs` step. (**DESIGN D406**)
- [x] **G108 — Hub completion v28** — 128 structural / 102 trace suites. (**DESIGN D407**)
- [x] **G109 — Laravel flagship verify closure** — `sync:laravel-templates` re-syncs **`/chrysalis-pdo-count`** from templates; **`verify:laravel-full`** **119/119** Hono + Fastify; **`hub-laravel-verify-gaps`** reads **`reports/verify-flagship-laravel-full/hono/summary.json`**; **`hub-cwl-openapi-export.mjs`** → **`.chrysalis/migration.openapi.json`**. (**DESIGN D408**)
- [x] **G110 — Express 10-route flagship** — **`fixtures/hub-flagship-express`**; gold **`express-flagship-{hono,fastify,nextjs,cwl}`**; **`hub-express-flagship.mjs`**; hub-completion **v29** (**132** structural / **105** trace). (**DESIGN D409**)
- [x] **G111 — Node live oracle capture mode** — **`packages/oracle-node/record-live-http.mjs`** + **`hub-oracle-record --base-url --routes`** for live Node/Express host capture to NDJSON. (**DESIGN D410**)
- [x] **G112 — Node Express flagship oracle verify** — live capture on legacy Express + **`@chrysalis/verify`** replay on emitted Hono; **`hub-node-express-oracle-verify.mjs`**; hub-completion **v30**. (**DESIGN D411**)
- [x] **G113 — GCE cross-platform verify** — **`gce-cross-platform-verify.ps1`**, **`gce-test-vm-windows.ps1`**, **`gce-vm-verify-suite`**. (**DESIGN D412**)
- [x] **G114 — Hub evidence verify trend** — **`.chrysalis/evidence-history.jsonl`** snapshots; **`--record-snapshot`** on pipeline verify gate; evidence schema **v2** + operator trend line. (**DESIGN D413**)
- [x] **G115 — Capability matrix Node oracle pilot** — **javascript→hono** flagship in **`ORACLE_PRODUCT_PAIRS`**; matrix schema **v2**; completion gate **≥5** oracle pairs. (**DESIGN D414**)
- [x] **G116 — Plain PHP 10-route flagship** — **`fixtures/hub-flagship-plain-php`**; **`hub-php-hub-webir.mjs`** + PHP path in **`hub-gold-verify`** / **`hub-gold-trace-replay`**; gold **`plain-php-flagship-*`**; hub-completion **v31** (**135** / **107** suites). (**DESIGN D415**)
- [x] **G117 — CWL RFC-0008 response content-type** — **`content-type`** in parser/ingest; **`web.request.response`** emit in **`emit-shared`**; gold **`cwl-response-content-type-*`**; hub-completion **v32** (**138** / **110**). (**DESIGN D416**)
- [x] **G118 — Symfony 10-route flagship** — **`fixtures/hub-flagship-symfony`** (`__invoke` controllers + **`config/routes.yaml`** mirror); gold **`symfony-flagship-*`**; **`hub-symfony-flagship.mjs`**; hub-completion **v33** (**141** / **112**); capability matrix **7** oracle pairs. (**DESIGN D417**)
- [x] **G119 — Flagship +10 route slice (20-route pilots)** — CRUD/search routes on **`hub-flagship-{plain-php,symfony,express}`**; **`EXPRESS_FLAGSHIP_ROUTES`** → 20; oracle live app extended; strategic smokes expect **20** routes/traces. (**DESIGN D418**)
- [x] **G120 — Symfony `routes.yaml` ingest + parity** — **`hub-symfony-routes.mjs`** derives the route manifest from **`config/routes.yaml`** (path `{id}`→`:id`, controller FQCN→file, param types); **`symfonyRouteManifestParity`** gates YAML↔`chrysalis.routes.json`; wired into **`hub-symfony-flagship`** `ok` + hub-completion **v34** (`symfonyFlagshipGold.routesYamlParity`). (**DESIGN D419**)
- [x] **G121 — Symfony `#[Route]` attribute parity** — **`parseSymfonyAttributeRoute`** + **`symfonyAttributeRouteSpecs`** read `#[Route('/p/{id}', methods: [...])]` from `src/Controller/*.php`; folded into **`symfonyRouteManifestParity`** so attributes↔yaml↔manifest must all agree; hub-completion **v35** (`symfonyFlagshipGold.routesAttributeParity`); ingest stays hole-free with attributes present. (**DESIGN D420**)
- [x] **G122 — Symfony class-prefix attribute combination** — **`parseSymfonyAttributeRoute`** now combines a class-level `#[Route('/api', name: 'api_')]` prefix with the method-level attribute (`/api/items/{id}`, `api_items_show`); focused **`fixtures/hub-symfony-attr-prefix`** probe (2 routes) gates the resolved surface across attributes↔yaml↔manifest; wired into **`hub-symfony-flagship`** `ok` + hub-completion **v36** (`symfonyFlagshipGold.attributePrefixParity`). (**DESIGN D421**)
- [x] **G123 — Symfony `#[Route]` method-list robustness** — `extractRouteAttr` now parses both the scalar string form (`methods: 'POST'`, previously silently coerced to `GET`) and the multi-method array (`methods: ['GET','POST']`), expanding one declaration to one route per method; YAML method tokens strip quotes too; focused **`fixtures/hub-symfony-attr-methods`** probe (2 declarations → 3 routes) gates attributes↔yaml↔manifest; hub-completion **v37** (`symfonyFlagshipGold.attributeMethodsParity`). (**DESIGN D422**)
- [x] **G124 — PHP→CWL effect-block lowering (hole-free flagship CWL)** — new `listCwlRoutes` / `walkCwlHandlerBody` / `cwlValueOf` in `hub-webir-routes.mjs` lower handler blocks (`header` no-op + `echo json_encode(...)` + object/array literals + path/query `request.field` + casts + `??` + `http_response_code` status + BOM/empty echoes) into CWL `status`/`param`/`query`/`return`; `emit-cwl-from-hub.mjs` rewritten to render them; CWL grammar extended for bare param-ref return (`return userId;`) + array literals (parser + `cwl-ingest`). `plain-php-flagship-cwl` + `symfony-flagship-cwl` now **hole-free** (and `express-flagship-cwl` via `__return_json`); all **141** structural gold suites green; emitted CWL re-parses with 0 holes. (**DESIGN D423**)
- [x] **G125 — Fastify no-content response fidelity** — generated Fastify server `fetch` shim (`@chrysalis/emit-fastify` `runtime-files.ts`) now passes a `null` body for 204/304/1xx statuses, fixing `new Response(...)` "Invalid response status code 204" on the 20-route flagship's `DELETE /items/:id`; all **112** trace-replay suites green (correctness 1). (**DESIGN D424**)
- [x] **G126 — CWL content-type fidelity from body shape** — `walkCwlHandlerBody` infers the response MIME (the `header()` literal is dropped at ingest by design) — `json_encode`/`__return_json`/object/array → `application/json`, other bodies → `text/plain; charset=utf-8`, 204/304 → none — and `emit-cwl-from-hub.mjs` emits the `content-type` statement; flagship CWL stays hole-free and re-parses with the correct content-type. (**DESIGN D425**)
- [x] **G127 — Class-prefix attributes live in the Symfony flagship** — the four `/items/{id}` controllers (show/update/patch/delete) now declare a class-level `#[Route('/items')]` + method `#[Route('/{id}', ...)]`, exercising G122 prefix combination through the real flagship: three-way parity (attributes↔yaml↔manifest) holds at 20 routes, ingest stays hole-free, and `symfony-flagship-{hono,fastify,cwl}` gold + trace replay (correctness 1) all pass — zero path/route-count change. (**DESIGN D426**)
- [x] **G128 — CWL preserves `??` query/param defaults** — the last lossy CWL edge: `$_GET["q"] ?? ""` now carries the default literal onto the param declaration (`query q = "";`) instead of dropping it. The walker (`cwlValueOf`/`collect`) attaches the default to the ref's param entry, `emit-cwl-from-hub.mjs` renders `query/param NAME = <literal>;`, the CWL parser re-reads the default and threads it onto path/query return values, and `cwl-ingest` rebuilds the `?? default` binop so the round-trip reconstructs the original WebIR (1 `??` binop, 20 routes, hole-free). All 141 gold suites stay green. (**DESIGN D427**)
- [x] **G129 — Symfony route-name parity (class-level `name:` prefix)** — extends Symfony parity from the route surface to route *names*: `symfonyYamlToRouteSpecs`/`symfonyAttributeRouteSpecs` now carry `name`, and `symfonyRouteManifestParity` adds a `names` block comparing yaml top-level keys to the names resolved from `#[Route]` attributes (the manifest stays name-less, by design, as the runtime projection). The four live `/items/{id}` controllers now declare a class-level `#[Route('/items', name: 'items_')]` + method `#[Route('/{id}', name: 'show', ...)]`, resolving to the same `items_show`/`items_update`/`items_patch`/`items_delete` names the yaml declares — proving class-level name-prefix combination end-to-end. Surfaced as `symfonyFlagshipGold.routesNameParity` (schema **v38**) and gated. (**DESIGN D428**)
- [x] **G130 — Class-prefix on collection routes (empty method path)** — the bare-collection idiom: `extractRouteAttr` now accepts an empty method path (`#[Route('', name: 'list', ...)]`) so the live `ItemsListController`/`ItemsCreateController` declare a class-level `#[Route('/items', name: 'items_')]` + method `#[Route('', ...)]`, which `joinSymfonyPaths` resolves to the bare `/items` (no path param) with combined names `items_list`/`items_create`. Completes the class-prefix matrix (path-param routes G127, collection routes G130; names G129) — full surface + name parity holds at 20 routes, ingest hole-free, symfony gold + trace replay (correctness 1) green. (**DESIGN D429**)
- [x] **G131 — CWL projection coverage as counted evidence** — turns the G124–G128 projection depth into a measurable signal: `summarizeCwlProjection(module)` (in `hub-webir-routes.mjs`) counts, per flagship, `total`/`holeFree` routes plus how many carry each fidelity feature (`withStatus`/`withParams`/`withParamDefaults`/`withContentType`/`objectBodies`) and the distinct `holeReasons`. Computed in `exportPhpHubWebir` and surfaced as `{plainPhp,symfony}FlagshipGold.cwlProjection` (schema **v39**), gated by ci-gates (`holeFree === total` when present — a real regression guard against a future projection hole). Plain-php projects richly (10 object bodies, 5 param routes, 1 `??` default); the metric also makes visible that the **Symfony flagship currently projects route shells** (`objectBodies: 0`) because `__invoke()` method bodies are not yet lifted like plain-php top-level pages — a future fidelity target now backed by evidence rather than assumption. (**DESIGN D430**)

- [x] **G132 — Symfony `__invoke()` body lift (invokable controllers)** — closes the gap G131 surfaced. Two coordinated, framework-agnostic changes: (1) the parser bridge (`glayzzle` + `nikic-json` providers) now hoists a non-static `__invoke` method to a `Class::__invoke` `FunctionDecl` (alongside the existing static-method hoist); (2) ingest gains `selectRouteHandlerStatements` (`convert.ts`), which lifts the `__invoke` body as the handler when a route file has no executable top-level statements — keying off the PHP *invokable* convention, not Symfony specifically, so the engine stays generic and manifest-driven. The Symfony flagship CWL projection jumps from route shells to full parity with plain-php (`objectBodies` 0→10, `withParams` 0→5, `withStatus` 0→2, `withParamDefaults` 0→1), still hole-free; all **141** gold + **112** trace-replay suites green (symfony correctness 1). (**DESIGN D431**)
- [x] **G133 — `nikic` parser-provider parity for the `__invoke` lift** — locks the no-single-backend invariant for invokable controllers: new `fixtures/parser-parity-probe/pages/invokable_controller.php` (class with `__invoke` + a static helper + an unused instance method) drives AST parity (`glayzzle` == `nikic`, positions stripped) and an explicit assertion that **both** providers hoist exactly `ProbeController::__invoke` + `ProbeController::helper` (not `notInvoked`). Ingest-level parity test ingests the Symfony flagship under both providers and asserts byte-identical WebIR summary (20 routes, equal echo-effect count, 0 holes). Proves G132's lift is provider-independent. (**DESIGN D432**)
- [x] **G134 — Project-to-CWL rich projection (migration contract)** — upgrades `hub-project-cwl-export.mjs` from the original literal-only projection (`listHubWebRoutes` + bespoke render, holed everything except bare literals) to the shared rich projection: a new `renderCwlRoutes` in `hub-webir-routes.mjs` (extracted from `emit-cwl-from-hub`, single source of truth) renders `listCwlRoutes` output with status / params / `??` defaults / content-type / object bodies. Both PHP flagships now export a **hole-free** `.chrysalis/migration.cwl` (20 routes, 0 holes; was nearly all holes), flowing through `hub-translate` and `hub-migration-contract`. Export meta schema **v2**. (**DESIGN D433**)
- [x] **G135 — Node oracle spike drives the express flagship** — extends `hub-node-oracle-spike.mjs` (schema **v2**) from the tiny `hub-gold-js-literal` smoke to the real 20-route `hub-flagship-express`: it lifts the flagship (hole-free) and computes `summarizeCwlProjection` (the G131 evidence metric) on the JavaScript-origin WebIR, asserting hole-free projection with object bodies. Confirms the rich CWL projection and its coverage metric are origin-agnostic (PHP and JavaScript), not PHP-specific. (**DESIGN D434**)
- [x] **G136 — Enforce hole-free express CWL projection in CI** — surfaces `cwlProjection` on the express flagship: `hub-express-flagship.mjs` (schema **v2**) loads the lifted WebIR and runs `summarizeCwlProjection`; `hub-completion.mjs` (schema **40**) carries it under `expressFlagshipGold.cwlProjection`; `ci-gates.mjs` adds a v40 gate requiring `holeFree === total` for the express projection (matching the v39 PHP-flagship gates). Closes the gap where only PHP flagships were CI-gated for hole-free projection — the JavaScript origin is now enforced too. Tests: accept/reject v40 in `ci-gates-hub-completion.test.ts`, express smoke asserts the projection. (**DESIGN D435**)
- [x] **G137 — JavaScript lift extracts request params + response status** — closes the projection-fidelity gap where the JS lift (`javascript-ast-ingest.mjs`) surfaced neither status nor params (`withStatus: 0`, `withParams: 0`) while the PHP lift did. The lift now lowers `req.params.<name>` → `data.request.field` (path), `req.query.<name>` → `request.field` (query), `<field> ?? <literal>` → `data.binop` `??` (CWL default), and `res.status(n).json(...)` → `effect.http.error` status; concise-arrow `MemberExpression`/`LogicalExpression` bodies are accepted (no longer holed). New gold fixture `fixtures/hub-gold-js-rich` projects hole-free with `withStatus: 2`, `withParams: 5`, `withParamDefaults: 1` and round-trips through CWL emit. The express flagship's param routes (`/items/:id` GET/PUT/PATCH, `/users/:userId`, `/search`) were enriched to use these constructs: its projection now reports `withParams: 5` / `withParamDefaults: 1` / `objectBodies: 7` (was 0/0/3), still hole-free, with gold + trace replay green (the runtime hono/fastify emit still discards non-`res.json` returns, so behavior — and the live oracle — is unchanged; **withStatus on the flagship + faithful runtime bodies remain a follow-on requiring emit-layer fidelity and an oracle re-record**). (**DESIGN D436**)
- [x] **G139 — OpenAPI → CWL import (Stage-B "Sink")** — the reverse of `hub-cwl-openapi-export`: `hub-openapi-to-cwl.mjs` brings an *external* OpenAPI 3.x contract INTO CWL/WebIR so a migration can start from a published spec, not only lifted source (STRATEGIC-PLAN Phase 3, CWL Stage B). It maps `{id}`→`:id` paths, path/query parameters (+ `schema.default`), the success status (lowest 2xx), the response media type, and a flat response `example` into a CWL `return`; when the body is unspecified it emits an **honest hole** (`openapi:no-response-body`) — never an invented value (DESIGN non-negotiable #6) — while preserving the known route surface. Renders through the shared `renderCwlRoutes` (new backward-compatible `surfaceOnHole`) and round-trips back through `cwl-ingest`. Two latent CWL round-trip fixes fell out: `renderCwlRoutes` now emits parser-compatible bare `hole foo:bar;` reasons (the quoted form never re-parsed), and `walkCwlHandlerBody` reads the response status off the `web.request.response` node (CWL-ingested status now projects as `withStatus`). New gold fixture `fixtures/hub-gold-openapi-cwl` (7 ops): import is `6/7` hole-free, `withStatus: 2`, `objectBodies: 5`; all 141 gold suites stay green. (**DESIGN D438**)
- [x] **G140 — Contract import wired into hub-translate + HAR → CWL** — `hub-contract-cwl-import.mjs` chooses the migration CWL source: **OpenAPI import > HAR import > WebIR projection** (`discoverContractArtifacts`). Wired into `hub-translate.mjs` (PHP, WPTP, and hub-lift-emit paths) and `hub-migration-contract.mjs` so `.chrysalis/migration.cwl` is produced from an external contract when present. New `hub-har-to-cwl.mjs` converts observed HAR traffic (deduped `(method, pathname)` pairs) into CWL with status/content-type/query params and flat JSON/text bodies; honest holes when bodies are missing or non-flat. Shared helpers in `hub-contract-cwl-shared.mjs`. Gold fixture `fixtures/hub-gold-har-cwl` (6 routes, hole-free); orchestrator proven on `hub-gold-openapi-cwl` (`source: openapi-import`) and temp HAR dirs (`source: har-import`). Strategic tests G140; all 141 gold suites stay green. (**DESIGN D439**)
- [x] **G141 — CWL semantic diff for PR review** — `hub-cwl-diff.mjs` diffs two CWL modules at the **route/handler** level (added/removed/changed + field deltas for status, params, content-type, body/holes) and renders reviewable Markdown (not opaque line noise). Writes `.chrysalis/cwl-diff.{json,md}` when a baseline exists (`migration.cwl.baseline`, `.chrysalis/migration.cwl.baseline`, or `--base`). Wired into `hub-migration-contract.mjs` (schema **v2**, `cwlDiff` section) and auto-run from `hub-translate` after migration CWL export. Gold fixture `fixtures/hub-gold-cwl-diff`; strategic test G141. (**DESIGN D440**)
- [x] **G142 — Site intelligence scan** — `hub-site-intelligence.mjs` scans a project tree (local walk via `scanLocalDirectory`) and emits `chrysalis.hub.site-intelligence`: languages + primary origin, framework hints (Laravel/Symfony/plain-php/express), DB detection from `.env` / docker-compose hints, contract artifact discovery, route estimate (`chrysalis.routes.json` > `migration.cwl` > WebIR > handler-file heuristic), and a scored risk profile. Writes `.chrysalis/site-intelligence.json` with `--write-artifacts`. Operator API `GET /api/hub/site-intelligence?projectDir=…`. Strategic test G142 on `fixtures/hub-flagship-plain-php`. (**DESIGN D441**)
- [x] **G143 — Chimera cutover runbooks + operator metrics** — `hub-chimera-cutover.mjs` builds phased runbooks (prep gates → shadow → canary ramp → cutover) from per-project evidence (`verify` gate 1.0, holes 0, migration contract), migration program route patterns, optional `chimera.json`, and latest `chrysalis.chimera.operator-snapshot` NDJSON line. Renders Markdown + JSON artifacts (`.chrysalis/chimera-cutover.{json,md}`). Operator API `GET /api/hub/chimera-cutover?projectDir=…`. Strategic test G143. (**DESIGN D442**)
- [x] **G144 — Migration assessment report** — `hub-migration-assessment.mjs` composes site intelligence, language compare, path knowledge, migration program recommendation, optional evidence + chimera readiness into `chrysalis.hub.migration-assessment` with readiness tiers (`scan-only` → `cutover-ready`). Writes `.chrysalis/migration-assessment.{json,md}`. Operator API `GET /api/hub/migration-assessment?projectDir=…`. Strategic test G144. (**DESIGN D443**)
- [x] **G145 — Path explorer apply to project** — `hub-apply-path-advice.mjs` materializes path-knowledge + gold coverage + migration plan/program into `.chrysalis/path-advice.json` for a project workspace. Operator APIs `GET /api/hub/apply-path-advice` and `POST /api/hub/projects/{id}/apply-path-advice`; Path explorer **Apply pair to project** button (requires Console project). Strategic test G145. (**DESIGN D444**)
- [x] **G146 — Post-translate delivery artifacts** — `hub-post-translate-artifacts.mjs` writes site intelligence, path advice, migration assessment, and chimera cutover runbook after every successful `hub-translate.mjs` run (STRATEGIC-PLAN Phase 2 pipeline gate / delivery metrics). Returns `chrysalis.hub.post-translate-artifacts` on translate stdout as `deliveryArtifacts`. Strategic test G146. (**DESIGN D445**)
- [x] **G147 — Per-project verify gaps → ingest backlog** — `hub-verify-gaps-shared.mjs` + `hub-verify-gaps-ingest.mjs` read `reports/verify/**` on a project workspace, rank divergence kinds into prioritized ingest backlog with playbook hints, write `.chrysalis/verify-gaps-ingest.json`, and surface `ingestNext` in migration assessment. Refactors `hub-laravel-verify-gaps.mjs` onto shared loaders. Operator API `GET /api/hub/verify-gaps-ingest?projectDir=…`. Strategic test G147. (**DESIGN D446**)
- [x] **G148 — Post-ingest-emit delivery on hub runner** — `hub-post-ingest-emit.mjs` runs contract export (CWL/OpenAPI/diff) + post-translate delivery + verify-gaps for the `chrysalis-ingest-emit` path (which bypasses `hub-translate`). Wired into `chrysalis-hub-runners.mjs` after emit (disable with `CHRYSALIS_HUB_POST_INGEST_EMIT=0`). Strategic tests G148. (**DESIGN D447**)
- [x] **G154 — CWL runtime (`@chrysalis/runtime-cwl`)** — in-process HTTP server for CWL via WebIR simulation (`createCwlRuntime`, `loadModuleFromCwlFile`, `chrysalis-cwl-serve` CLI). Hub bridge `export-cwl-webir.mjs`. Simulator echoes literal handler returns when no `effect.echo` (D19 extension for CWL `return` bodies). Strategic test G154 on gold fixture. Plan amendment: CWL runtime accelerated from Phase 5 pause. (**DESIGN D448**)
- [x] **G149 — Verify gaps → ingest remediation action** — `hub-verify-gaps-ingest-action.mjs` surfaces `ingestRemediation` + optional re-ingest (`CHRYSALIS_HUB_GAP_REINGEST=1`); writes `.chrysalis/verify-gaps-ingest-action.json`; wired into post-ingest-emit. Strategic test G149. (**DESIGN D449**)
- [x] **G150 — Hub-translate verify + evidence gate** — `hub-post-translate-verify.mjs` runs `chrysalis verify` when `.chrysalis/traces` + `CHRYSALIS_HUB_VERIFY_BASE_URL` exist; `chrysalis-hub-runners.mjs` hub-translate path adds verify + evidence gate (mirrors ingest-emit). Strategic test G150. (**DESIGN D450**)
- [x] **G151 — PHP flagship hono=fastify emit parity** — plain-php and symfony flagships run gold + trace replay on hono and fastify; `emitParity` surfaced in hub-completion. Strategic test G151. (**DESIGN D451**)
- [x] **G152 — Console delivery dashboard** — `hub-delivery-dashboard.mjs` aggregates evidence, assessment, verify-gaps, chimera, artifact checklist; operator API `GET /api/hub/projects/{id}/delivery-dashboard`; Console **Delivery dashboard** button. Strategic test G152. (**DESIGN D452**)
- [x] **G153 — Hub license tier alignment (D289)** — `hub-license-status.mjs` surfaces `CHRYSALIS_REQUIRE_LICENSE` / `CHRYSALIS_LICENSE_MIN_TIER` + per-feature tier map (`hub-translate` dev, `hub-batch`/`hub-pipeline` pro, `hub-chimera-cutover` enterprise). Operator API `GET /api/hub/license-status`; batch/pipeline gated when enforcement on; delivery dashboard + completion report carry license status. Strategic test G153. (**DESIGN D453**)
- [x] **G155 — CWL multi-file modules (RFC-0009)** — `import "relative.cwl";` at module level; `cwl-module-graph.mjs` resolves the graph (cycle detection, duplicate-route holes). Wired into `cwl-ingest`, `lift-to-webir` (entry `routes.cwl` only), site intelligence route counts, and CWL diff. Gold fixture `fixtures/hub-gold-cwl-multi` + suite `cwl-multi-gold-hono`. Strategic test G155. (**DESIGN D454**)
- [x] **G156 — Hub CWL runtime preview** — `hub-cwl-preview.mjs` lists merged routes and probes the first GET via `@chrysalis/runtime-cwl`. Operator API `GET /api/hub/cwl-preview?projectDir=…`. Strategic test G156. (**DESIGN D455**)
- [x] **G157 — PHP flagship nextjs emit parity** — extends G151 hono=fastify to **hono=fastify=nextjs** on plain-php and symfony flagships; gold suites `plain-php-flagship-nextjs` and `symfony-flagship-nextjs` with trace replay (correctness 1). Strategic tests G157. (**DESIGN D456**)
- [x] **G158 — Chimera cutover license gate** — operator `GET /api/hub/chimera-cutover` calls `assertHubLicenseAllows("hub-chimera-cutover")` (enterprise tier when `CHRYSALIS_REQUIRE_LICENSE` is on). Strategic test G158. (**DESIGN D457**)
- [x] **G159 — Laravel verify-gaps merge + global backlog** — `loadMergedVerifyReports` merges failures across report dirs; fixture `fixtures/hub-laravel-verify-gaps`; `ingestNext` on laravel report; wired into migration assessment + delivery dashboard for Laravel sites. Strategic test G159. (**DESIGN D458**)
- [x] **G160 — CWL preview in delivery dashboard** — delivery dashboard v3 surfaces `cwlPreview` from `hub-cwl-preview`; Console summaries. Strategic test G160. (**DESIGN D459**)
- [x] **G161 — Express flagship emit parity + oracle hook** — `hub-express-flagship.mjs` v3: hono=fastify=nextjs emit parity; optional live oracle via `CHRYSALIS_HUB_EXPRESS_ORACLE=1`. Strategic test G161. (**DESIGN D460**)
- [x] **G162 — Hub verify license gate** — operator site verify + verify-all gated on `hub-verify-gate` (pro tier); `hub-cwl-preview` on dev tier. Strategic test G162. (**DESIGN D461**)
- [x] **G163 — Laravel verify-gaps global ingest action** — `hub-laravel-verify-gaps-action.mjs` surfaces repo-level `ingestRemediation` from merged flagship verify reports; operator API `GET /api/hub/laravel-verify-gaps-action`. Strategic test G163. (**DESIGN D462**)
- [x] **G164 — Persist CWL preview artifact** — `writeCwlPreviewArtifacts` writes `.chrysalis/cwl-preview.json`; wired into post-translate and post-ingest-emit delivery bundles. Strategic test G164. (**DESIGN D463**)
- [x] **G165 — Hub completion schema 41 + emit parity gates** — CI requires `emitParity.ok` on PHP/Express flagships, `laravelVerifyGaps.ingestNext` when backlog non-empty, and `laravelMinSmoke.ok`. Strategic test G165. (**DESIGN D464**)
- [x] **G166 — Verify license gate depth** — `startProjectVerifyJob` and `GET …/evidence` call `assertHubLicenseAllows("hub-verify-gate")` (defense in depth with G162 POST gates). Strategic test G166. (**DESIGN D465**)
- [x] **G167 — Laravel-min hub smoke** — `hub-laravel-min-smoke.mjs` on `flagship/laravel-min` route manifest + global verify-gaps linkage; surfaced in hub-completion. Strategic test G167. (**DESIGN D466**)
- [x] **G168 — Delivery dashboard v4 + Laravel global action** — dashboard schema v4 surfaces `laravelGlobalAction`; prefers persisted `.chrysalis/cwl-preview.json`. Strategic test G168. (**DESIGN D467**)
- [x] **G169 — Migration assessment Laravel global action** — assessment carries `laravelGlobalAction.ingestRemediation`; Console delivery panel shows suggested command. Strategic test G169. (**DESIGN D468**)
- [x] **G170 — Hub evidence verify-gaps pipeline gate** — evidence schema v3 adds `verifyGaps` blockers; optional strict gate via `CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS=1`. Strategic test G170. (**DESIGN D469**)
- [x] **G171 — Hub completion schema 42** — carries `laravelVerifyGapsAction` + `hubEvidence` v3; CI gates v42. Strategic test G171. (**DESIGN D470**)
- [x] **G172 — Laravel auth probe ingest closure** — committed fixture `fixtures/laravel-auth-probe` proves M6A Sanctum/OAuth/Socialite/Fortify static probe lowering (D190); hub verify-gaps fixture updated to resolved correctness 1; synthetic backlog retained in `fixtures/hub-laravel-verify-gaps-backlog` for hub pipeline tests. Ingest test + strategic test G172. (**DESIGN D471**)
- [x] **G173 — Live Laravel verify export for hub** — `verify:laravel-full` writes `reports/ci/hub-laravel-verify-live.json` via `hub-laravel-verify-export.mjs`; feeds merged laravel verify-gaps. Strategic test G173. (**DESIGN D472**)
- [x] **G174 — Hub evidence v4 plan → pipeline gate** — evidence schema v4 adds `migrationPlan` + `pipelineGate`; hub-translate jobs append evidence gate; Console shows program/tier/next step. Strategic test G174. (**DESIGN D473**)
- [x] **G175 — Hub completion schema 43** — carries `hubEvidence` v4 + `laravelVerifyLive`; CI gates v43. (**DESIGN D474**)
- [x] **G176 — PHP oracle micro-fixture** — `hub-php-oracle-micro-fixture.mjs` formalizes `fixtures/tiny-blog` as the canonical oracle micro surface; wired into `phpOracleSmoke` schema v6 + capability matrix. Strategic test G176. (**DESIGN D475**)
- [x] **G177 — CWL RFC-0006 runtime status smoke** — `hub-cwl-response-status-smoke.mjs` closes D400 deferral: non-200 `status N;` routes replay on hono/fastify/nextjs gold. Strategic test G177. (**DESIGN D476**)
- [x] **G178 — PHP Next.js verify on plain-php flagship** — `hub-php-nextjs-verify.mjs` `--flagship` runs WPTP emit + trace replay on `fixtures/hub-flagship-plain-php`; completion `phpNextjsFlagshipVerify`. Strategic test G178. (**DESIGN D477**)
- [x] **G179 — Project-to-CWL oracle fixture gates** — `hub-project-to-cwl-gates.mjs` exports hole-free migration.cwl on plain-php + symfony flagships; export meta schema v3 carries `cwlProjection`. Strategic test G179. (**DESIGN D478**)
- [x] **G180 — Hub completion schema 44** — live `laravelVerifyLive.ok`, `cwlResponseStatusRuntime`, `projectToCwlExport`, `phpOracleMicro`, `phpNextjsFlagshipVerify`; CI gates v44. Strategic test G180. (**DESIGN D479**)
- [x] **G181 — PHP Next.js verify on symfony flagship** — `hub-php-nextjs-verify.mjs --symfony`; completion `phpNextjsSymfonyVerify`. Strategic test G181. (**DESIGN D480**)
- [x] **G182 — CWL RFC-0005 request body runtime smoke** — `hub-cwl-request-body-smoke.mjs` gold replay on hono/fastify/nextjs. Strategic test G182. (**DESIGN D481**)
- [x] **G183 — Express JS project-to-CWL gate** — `hub-project-to-cwl-gates` schema v2 adds javascript-origin express flagship export. Strategic test G179 (extended). (**DESIGN D482**)
- [x] **G184 — Hub evidence smoke fixture** — `hub-evidence-smoke.mjs` on plain-php with assessment + verify + migration contract. Strategic test G184. (**DESIGN D483**)
- [x] **G185 — Node oracle spike in completion** — `nodeOracleSpike` section runs `hub-node-oracle-spike.mjs`. (**DESIGN D484**)
- [x] **G186 — Contract CWL smoke (OpenAPI + WebIR)** — `hub-contract-cwl-smoke.mjs` proves import orchestrator paths. Strategic test G186. (**DESIGN D485**)
- [x] **G187 — Delivery dashboard v5** — `month3Program` surfaces Month 3 smoke scripts + oracle micro. Strategic test G187. (**DESIGN D486**)
- [x] **G188 — Capability matrix v3** — oracle micro fixture + nextjs flagship list + JS project-to-CWL origins. Strategic test G188. (**DESIGN D487**)
- [x] **G189 — Strict Laravel live completion gate** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_LIVE=1` in ci-gates v45. (**DESIGN D488**)
- [x] **G190 — Hub completion schema 45** — CWL body runtime, evidence/contract smokes, symfony nextjs, node spike, matrix v3; CI gates v45. Strategic test G190. (**DESIGN D489**)
- [x] **G191 — CWL body projection lowering** — `cwlValueOf` + `renderCwlRoutes` project `request.field` body bindings hole-free; `summarizeCwlProjection.withBodyParams`. Strategic test G191. (**DESIGN D490**)
- [x] **G192 — Hub-translate E2E smoke** — `hub-translate-e2e-smoke.mjs` on plain-php flagship (ingest + emit + hole-free migration.cwl). Strategic test G192. (**DESIGN D491**)
- [x] **G193 — CWL body smoke projection gate** — G182 body smoke requires hole-free projection + `withBodyParams >= 2`. (**DESIGN D492**)
- [x] **G194 — Hub evidence live in completion** — `hub-evidence-live.mjs` runs full `buildHubEvidenceReport` with pipeline gate pass. Strategic test G194. (**DESIGN D493**)
- [x] **G195 — Evidence pipeline strict CI** — `CHRYSALIS_HUB_PIPELINE_GATE_STRICT=1` in ci-gates v46. (**DESIGN D494**)
- [x] **G196 — WPTP Next.js mandatory completion gate** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1` in ci-gates v46. (**DESIGN D495**)
- [x] **G197 — CWL body round-trip smoke** — `hub-cwl-body-roundtrip-smoke.mjs` ingest → project → render → re-ingest. Strategic test G197. (**DESIGN D496**)
- [x] **G198 — Delivery dashboard v6** — `month3Program` adds evidence live, translate E2E, body roundtrip, strict env keys. Strategic test G198. (**DESIGN D497**)
- [x] **G199 — Node oracle product depth** — `hub-node-oracle-spike` schema v3 + express verify cross-check. (**DESIGN D498**)
- [x] **G200 — Hub completion schema 46** — body roundtrip, translate E2E, evidence live, node spike v3, matrix v4; CI gates v46. Strategic test G200. (**DESIGN D499**)
- [x] **G201 — CWL header/cookie projection lowering** — `cwlValueOf`/`renderCwlRoutes` project RFC-0004 request context; `withHeaderParams`/`withCookieParams`. (**DESIGN D500**)
- [x] **G202 — CWL request-context runtime smoke** — `hub-cwl-request-context-smoke.mjs` gold replay + hole-free projection. Strategic test G202. (**DESIGN D501**)
- [x] **G203 — CWL request-context roundtrip smoke** — ingest → project → render → re-ingest for RFC-0004. (**DESIGN D502**)
- [x] **G204 — CWL response-content-type runtime smoke** — `hub-cwl-response-content-type-smoke.mjs` (RFC-0008). Strategic test G204. (**DESIGN D503**)
- [x] **G205 — CWL response-content-type roundtrip smoke** — RFC-0008 round-trip via `hub-cwl-rfc-roundtrip-smoke.mjs`. (**DESIGN D504**)
- [x] **G206 — CWL auth-effects runtime smoke** — `hub-cwl-auth-effects-smoke.mjs` (RFC-0007). Strategic test G206. (**DESIGN D505**)
- [x] **G207 — CWL auth-effects roundtrip smoke** — RFC-0007 round-trip. (**DESIGN D506**)
- [x] **G208 — Hub-translate E2E symfony flagship** — `hub-translate-e2e-smoke.mjs --symfony`. Strategic test G208. (**DESIGN D507**)
- [x] **G209 — Hub-translate E2E express flagship** — javascript lift-emit path with hole-free CWL. Strategic test G209. (**DESIGN D508**)
- [x] **G210 — Hub-translate E2E tiny-blog oracle** — honest hole manifest allowed (`requireHoleFree: false`). Strategic test G210. (**DESIGN D509**)
- [x] **G211 — OpenAPI contract roundtrip smoke** — `hub-contract-roundtrip-smoke.mjs` OpenAPI import projection. (**DESIGN D510**)
- [x] **G212 — HAR contract roundtrip smoke** — HAR import hole-free roundtrip. (**DESIGN D511**)
- [x] **G213 — Hub evidence live symfony** — `hub-evidence-live.mjs --symfony` batch profile. (**DESIGN D512**)
- [x] **G214 — Hub evidence live tiny-blog** — evidence live batch on oracle micro fixture. (**DESIGN D513**)
- [x] **G215 — Site intelligence smoke** — `hub-delivery-pipeline-smoke.mjs` site scan gate. (**DESIGN D514**)
- [x] **G216 — Migration assessment smoke** — delivery pipeline assessment tier. (**DESIGN D515**)
- [x] **G217 — Chimera cutover smoke** — delivery pipeline phased runbook gate. (**DESIGN D516**)
- [x] **G218 — Post-translate delivery bundle smoke** — G146 artifact bundle via delivery pipeline smoke. (**DESIGN D517**)
- [x] **G219 — Post-translate verify smoke** — honest skip without traces/base URL. (**DESIGN D518**)
- [x] **G220 — Verify playbooks smoke** — `hub-verify-playbooks-smoke.mjs` in completion. (**DESIGN D519**)
- [x] **G221 — Project-to-CWL laravel-min + tiny-blog gates** — export gates with honest hole manifest (`requireHoleFree: false`). (**DESIGN D520**)
- [x] **G222 — Hub runner smoke** — `hub-runner-smoke.mjs` translate + evidence gate steps. (**DESIGN D521**)
- [x] **G223 — CWL gold runtime smoke shared helper** — `hub-cwl-gold-runtime-smoke.mjs` for RFC replay smokes. (**DESIGN D522**)
- [x] **G224 — CWL generic roundtrip helper** — `hub-cwl-roundtrip-smoke.mjs` shared ingest/project/render path. (**DESIGN D523**)
- [x] **G225 — WPTP Next.js CI env documentation** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS` in completion + ci-gates v47. (**DESIGN D524**)
- [x] **G226 — Capability matrix v5** — CWL RFC smokes, delivery pipeline, verify playbooks, hub runner. (**DESIGN D525**)
- [x] **G227 — Delivery dashboard v7** — extended `month3Program` RFC + delivery smokes. Strategic test G227. (**DESIGN D526**)
- [x] **G228 — Hub evidence live batch** — `hub-evidence-live.mjs` schema v2 multi-profile batch. (**DESIGN D527**)
- [x] **G229 — Hub translate E2E batch** — `hub-translate-e2e-smoke.mjs` schema v2 `--all` variants. (**DESIGN D528**)
- [x] **G230 — Hub completion schema 47** — RFC 0004/7/8 runtime + roundtrip + delivery pipeline + project-to-CWL v3; CI gates v47. Strategic test G230. (**DESIGN D529**)
- [x] **G231 — Migration contract smoke** — `hub-migration-os-smoke.mjs` contract bundle on plain-php flagship. (**DESIGN D530**)
- [x] **G232 — Migration planner smoke** — planner steps + recommended output in migration OS smoke. (**DESIGN D531**)
- [x] **G233 — Migration programs smoke** — program templates in migration OS smoke. (**DESIGN D532**)
- [x] **G234 — CWL preview smoke** — `hub-cwl-preview-smoke.mjs` route list + runtime probe. (**DESIGN D533**)
- [x] **G235 — CWL OpenAPI export smoke** — `hub-cwl-openapi-smoke.mjs` on plain-php flagship. (**DESIGN D534**)
- [x] **G236 — Path advice smoke** — `hub-path-advice-smoke.mjs` pair grade + pipeline steps. (**DESIGN D535**)
- [x] **G237 — Database detect smoke** — tier-1 catalog + origin-services detect. (**DESIGN D536**)
- [x] **G238 — Delivery pipeline symfony** — `hub-delivery-pipeline-smoke.mjs --symfony` batch profile. (**DESIGN D537**)
- [x] **G239 — Delivery pipeline express** — javascript-origin delivery pipeline batch profile. (**DESIGN D538**)
- [x] **G240 — Post-translate artifacts smoke** — standalone G146 artifact bundle smoke. (**DESIGN D539**)
- [x] **G241 — CWL middleware runtime smoke** — RFC-0001 module presets gold replay. (**DESIGN D540**)
- [x] **G242 — CWL diff smoke** — semantic diff on `fixtures/hub-gold-cwl-diff`. (**DESIGN D541**)
- [x] **G243 — CWL all-RFC roundtrip batch** — `hub-cwl-all-rfc-roundtrip-smoke.mjs` 0004/5/6/7/8. (**DESIGN D542**)
- [x] **G244 — CWL status roundtrip dedicated** — RFC-0006 in all-RFC batch. (**DESIGN D543**)
- [x] **G245 — HAR contract roundtrip gate** — completion `contractRoundtrip.har` (G212 depth). (**DESIGN D544**)
- [x] **G246 — WPTP gold smoke in completion** — `runWptpGoldSmoke` with honest skip. (**DESIGN D545**)
- [x] **G247 — Multi-lane smoke export** — `runMultiLaneSmoke` in-process completion. (**DESIGN D546**)
- [x] **G248 — Hub evidence live express** — express profile in evidence live batch. (**DESIGN D547**)
- [x] **G249 — Hub evidence trend smoke** — snapshot history + trend delta. (**DESIGN D548**)
- [x] **G250 — Delivery pipeline batch** — plain-php + symfony + express profiles schema v2. (**DESIGN D549**)
- [x] **G251 — ensureProjectWebir shared helper** — javascript lift path for evidence live + delivery. (**DESIGN D550**)
- [x] **G252 — Verify gaps ingest smoke** — project verify-gaps ingest report on plain-php. (**DESIGN D551**)
- [x] **G253 — Site intelligence standalone** — exported via delivery pipeline batch siteIntelligence gate. (**DESIGN D552**)
- [x] **G254 — Migration assessment standalone** — delivery pipeline assessment gate. (**DESIGN D553**)
- [x] **G255 — Chimera cutover standalone** — delivery pipeline chimera gate. (**DESIGN D554**)
- [x] **G256 — Capability matrix v6** — migration OS + CWL interchange smokes. (**DESIGN D555**)
- [x] **G257 — Delivery dashboard v8** — `month4Program` migration OS + CWL interchange scripts. (**DESIGN D556**)
- [x] **G258 — Hub evidence schema v5 metadata** — completion `hubEvidence.schemaVersion: 5`. (**DESIGN D557**)
- [x] **G259 — Migration OS strict CI env** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS` in ci-gates v48. (**DESIGN D558**)
- [x] **G260 — Hub completion schema 48** — migration OS + CWL interchange smokes + delivery batch v2; CI gates v48. Strategic test G260. (**DESIGN D559**)
- [x] **G261 — Flagship in-process emit parity** — `hub-flagship-emit-parity.mjs` + exported `runPlainPhpFlagshipSmoke` / `runSymfonyFlagshipSmoke`; completion in-process wiring. (**DESIGN D560**)
- [x] **G262 — CWL path params runtime smoke** — RFC-0002 gold replay on `fixtures/hub-gold-cwl-path-params`. (**DESIGN D561**)
- [x] **G263 — CWL query params runtime smoke** — RFC-0003 gold replay on `fixtures/hub-gold-cwl-query-params`. (**DESIGN D562**)
- [x] **G264 — CWL multi-file gold runtime smoke** — RFC-0009 module graph on `fixtures/hub-gold-cwl-multi`. (**DESIGN D563**)
- [x] **G265 — CWL multi-file roundtrip smoke** — RFC-0009 ingest/project/render roundtrip. (**DESIGN D564**)
- [x] **G266 — Site intelligence standalone smoke** — `hub-site-intelligence-smoke.mjs` on plain-php flagship. (**DESIGN D565**)
- [x] **G267 — Migration assessment standalone smoke** — `hub-migration-assessment-smoke.mjs`. (**DESIGN D566**)
- [x] **G268 — Chimera cutover standalone smoke** — `hub-chimera-cutover-smoke.mjs`. (**DESIGN D567**)
- [x] **G269 — Path knowledge smoke** — pair count + php→hono grade gate. (**DESIGN D568**)
- [x] **G270 — Language compare smoke** — recommended output hono with 3+ targets. (**DESIGN D569**)
- [x] **G271 — Migration OS symfony smoke** — contract/planner/programs on symfony flagship. (**DESIGN D570**)
- [x] **G272 — Migration OS standalone batch** — site intel + assessment + chimera + path knowledge + language compare. (**DESIGN D571**)
- [x] **G273 — CWL path params roundtrip** — RFC-0002 dedicated roundtrip smoke. (**DESIGN D572**)
- [x] **G274 — CWL query params roundtrip** — RFC-0003 dedicated roundtrip smoke. (**DESIGN D573**)
- [x] **G275 — CWL params batch smoke** — path + query runtime batch gate. (**DESIGN D574**)
- [x] **G276 — CWL all-RFC roundtrip v2** — adds path/query/multi to all-RFC batch schema v2. (**DESIGN D575**)
- [x] **G277 — Migration OS standalone batch in completion** — wired into hub completion schema 49. (**DESIGN D576**)
- [x] **G278 — Flagship completion in-process** — `plainPhpFlagshipGold.inProcess` / `symfonyFlagshipGold.inProcess`. (**DESIGN D577**)
- [x] **G279 — Verify gaps symfony smoke** — ingest gaps report on symfony flagship. (**DESIGN D578**)
- [x] **G280 — Hub runner batch smoke** — plain-php + symfony translate step shapes. (**DESIGN D579**)
- [x] **G281 — Capability matrix v7** — CWL params/multi + migration OS standalone + symfony delivery smokes. (**DESIGN D580**)
- [x] **G282 — Delivery dashboard v9** — `month5Program` CWL params + migration OS standalone scripts. (**DESIGN D581**)
- [x] **G283 — Hub evidence schema v6 metadata** — `requireCwlParamsEnv` in completion hubEvidence block. (**DESIGN D582**)
- [x] **G284 — CWL params strict CI env** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS` in ci-gates v49. (**DESIGN D583**)
- [x] **G285 — Site intelligence symfony smoke** — standalone symfony profile. (**DESIGN D584**)
- [x] **G286 — Delivery pipeline runner smoke** — delivery batch v2 + hub runner batch combined gate. (**DESIGN D585**)
- [x] **G287 — Path advice symfony smoke** — pair grade on symfony flagship. (**DESIGN D586**)
- [x] **G288 — Post-translate artifacts symfony smoke** — G146 bundle on symfony flagship. (**DESIGN D587**)
- [x] **G289 — Evidence trend standalone markers** — month5Program includes evidence trend reference. (**DESIGN D588**)
- [x] **G290 — Hub completion schema 49** — CWL params/multi + migration OS standalone + symfony smokes; CI gates v49. Strategic test G290. (**DESIGN D589**)
- [x] **G291 — Express flagship in-process emit parity** — `runExpressFlagshipSmoke` + shared `runFlagshipEmitParity`. (**DESIGN D590**)
- [x] **G292 — Express completion in-process** — `expressFlagshipGold.inProcess` in completion schema 50. (**DESIGN D591**)
- [x] **G293 — Express strategic test in-process** — direct import; sequential with PHP flagships. (**DESIGN D592**)
- [x] **G294 — Site intelligence express smoke** — javascript-origin site scan on express flagship. (**DESIGN D593**)
- [x] **G295 — Path advice express smoke** — pair grade on express flagship. (**DESIGN D594**)
- [x] **G296 — Verify gaps express smoke** — honest skip when no verify report. (**DESIGN D595**)
- [x] **G297 — Post-translate artifacts express smoke** — G146 bundle with javascript lift. (**DESIGN D596**)
- [x] **G298 — Migration assessment symfony standalone** — readiness tier on symfony flagship. (**DESIGN D597**)
- [x] **G299 — Chimera cutover symfony standalone** — phased runbook on symfony flagship. (**DESIGN D598**)
- [x] **G300 — Hub runner batch v2** — adds express profile; schema v2. (**DESIGN D599**)
- [x] **G301 — CWL params roundtrip batch** — path + query roundtrip combined gate. (**DESIGN D600**)
- [x] **G302 — CWL multi batch smoke** — multi gold + multi roundtrip batch. (**DESIGN D601**)
- [x] **G303 — CWL interchange batch** — preview + openapi + diff + middleware batch. (**DESIGN D602**)
- [x] **G304 — Evidence live standalone batch** — four-profile evidence live batch gate. (**DESIGN D603**)
- [x] **G305 — Translate E2E standalone batch** — four-variant translate batch gate. (**DESIGN D604**)
- [x] **G306 — Express delivery batch** — site + path + assessment + chimera express profiles. (**DESIGN D605**)
- [x] **G307 — Symfony migration OS batch** — migration OS + assessment + chimera symfony. (**DESIGN D606**)
- [x] **G308 — Migration assessment express** — javascript-origin assessment smoke. (**DESIGN D607**)
- [x] **G309 — Chimera cutover express** — javascript-origin cutover smoke. (**DESIGN D608**)
- [x] **G310 — Project-to-CWL express dedicated** — hole-free CWL export on express flagship. (**DESIGN D609**)
- [x] **G311 — Express delivery smokes in completion** — express standalone smokes wired schema 50. (**DESIGN D610**)
- [x] **G312 — Symfony migration delivery depth** — symfony assessment/chimera standalone in completion. (**DESIGN D611**)
- [x] **G313 — Capability matrix v8** — express delivery + CWL batch + standalone batch metadata. (**DESIGN D612**)
- [x] **G314 — Delivery dashboard v10** — `month6Program` express + symfony batch scripts. (**DESIGN D613**)
- [x] **G315 — Hub evidence schema v7** — `requireStandaloneDeliveryEnv` metadata. (**DESIGN D614**)
- [x] **G316 — Standalone delivery strict CI env** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY` in ci-gates v50. (**DESIGN D615**)
- [x] **G317 — CWL batch smokes in completion** — params roundtrip + multi + interchange batches. (**DESIGN D616**)
- [x] **G318 — Standalone translate/evidence batches** — completion wiring for E2E + evidence live batches. (**DESIGN D617**)
- [x] **G319 — Three-flagship in-process parity** — plain-php + symfony + express all `inProcess`. (**DESIGN D618**)
- [x] **G320 — Hub completion schema 50** — express/symfony standalone delivery + CWL batches; CI gates v50. Strategic test G320. (**DESIGN D619**)
- [x] **G321 — Site intelligence Laravel-min** — standalone site intel on `flagship/laravel-min`. (**DESIGN D620**)
- [x] **G322 — Path advice Laravel-min** — path advice smoke on Laravel-min scaffold. (**DESIGN D621**)
- [x] **G323 — Migration assessment Laravel-min** — assessment smoke on Laravel-min. (**DESIGN D622**)
- [x] **G324 — Chimera cutover Laravel-min** — cutover runbook smoke on Laravel-min. (**DESIGN D623**)
- [x] **G325 — Post-translate artifacts Laravel-min** — artifact bundle smoke on Laravel-min. (**DESIGN D624**)
- [x] **G326 — Project-to-CWL Laravel-min** — dedicated CWL export smoke on Laravel-min. (**DESIGN D625**)
- [x] **G327 — Laravel-min delivery batch** — site intel + path advice + assessment + chimera batch. (**DESIGN D626**)
- [x] **G328 — Plain-php delivery batch** — plain-php standalone delivery mega smoke. (**DESIGN D627**)
- [x] **G329 — Tiny-blog delivery batch** — evidence + translate + assessment on tiny-blog. (**DESIGN D628**)
- [x] **G330 — Three-origin delivery batch** — plain-php + express + symfony delivery batches. (**DESIGN D629**)
- [x] **G331 — Laravel verify gaps standalone** — gaps report standalone smoke wrapper. (**DESIGN D630**)
- [x] **G332 — Laravel verify gaps action standalone** — action standalone smoke wrapper. (**DESIGN D631**)
- [x] **G333 — Laravel verify live standalone** — live export standalone smoke wrapper. (**DESIGN D632**)
- [x] **G334 — Node express oracle standalone** — honest-skip oracle verify standalone wrapper. (**DESIGN D633**)
- [x] **G335 — WPTP gold standalone** — WPTP gold smoke with honest skip wrapper. (**DESIGN D634**)
- [x] **G336 — Contract roundtrip standalone** — OpenAPI/HAR roundtrip standalone wrapper. (**DESIGN D635**)
- [x] **G337 — Verify playbooks standalone** — playbooks standalone wrapper. (**DESIGN D636**)
- [x] **G338 — Post-translate verify standalone** — post-translate verify standalone wrapper. (**DESIGN D637**)
- [x] **G339 — CWL full batch** — params + roundtrip + multi + interchange mega batch. (**DESIGN D638**)
- [x] **G340 — Plain-php migration OS batch** — migration OS + assessment + chimera plain-php batch. (**DESIGN D639**)
- [x] **G341 — Verify gaps Laravel-min** — verify gaps ingest on Laravel-min scaffold. (**DESIGN D640**)
- [x] **G342 — Tiny-blog oracle batch** — evidence live + translate E2E on tiny-blog. (**DESIGN D641**)
- [x] **G343 — Laravel depth batch** — gaps + action + live + min smoke batch. (**DESIGN D642**)
- [x] **G344 — Capability matrix v9** — Laravel-min delivery + three-origin + oracle standalone metadata. (**DESIGN D643**)
- [x] **G345 — Delivery dashboard v11** — `month7Program` Laravel-min + delivery batch scripts. (**DESIGN D644**)
- [x] **G346 — Hub evidence schema v8** — `requireLaravelMinEnv` metadata. (**DESIGN D645**)
- [x] **G347 — Laravel-min strict CI env** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN` in ci-gates v51. (**DESIGN D646**)
- [x] **G348 — Laravel-min delivery in completion** — Laravel-min standalone smokes wired schema 51. (**DESIGN D647**)
- [x] **G349 — month7Program completion** — three-origin + CWL full + Laravel depth batches in completion. (**DESIGN D648**)
- [x] **G350 — Hub completion schema 51** — Laravel-min delivery + oracle standalone batches; CI gates v51. Strategic test G350. (**DESIGN D649**)
- [x] **G351 — Four-origin delivery batch** — three-origin + Laravel-min delivery batches. (**DESIGN D650**)
- [x] **G352 — Symfony delivery batch** — symfony standalone delivery mega smoke. (**DESIGN D651**)
- [x] **G353 — Laravel-min migration OS batch** — migration OS + assessment + chimera on Laravel-min. (**DESIGN D652**)
- [x] **G354 — Oracle standalone mega batch** — node express + WPTP + contract + playbooks + post-translate verify. (**DESIGN D653**)
- [x] **G355 — Migration OS Laravel-min** — dedicated migration OS smoke on Laravel-min scaffold. (**DESIGN D654**)
- [x] **G356 — Plain-php migration OS in completion** — plain-php migration OS batch wired schema 52. (**DESIGN D655**)
- [x] **G357 — Tiny-blog delivery in completion** — tiny-blog delivery batch wired schema 52. (**DESIGN D656**)
- [x] **G358 — Evidence trend standalone** — evidence trend standalone wrapper smoke. (**DESIGN D657**)
- [x] **G359 — Detect databases standalone** — detect databases standalone wrapper smoke. (**DESIGN D658**)
- [x] **G360 — Path knowledge standalone batch** — path knowledge + language compare batch. (**DESIGN D659**)
- [x] **G361 — Verify gaps ingest action standalone** — gaps ingest action standalone smoke. (**DESIGN D660**)
- [x] **G362 — Hub runner batch v3** — Laravel-min profile in runner batch smoke. (**DESIGN D661**)
- [x] **G363 — Delivery pipeline Laravel-min profile** — four-profile delivery pipeline fixtures. (**DESIGN D662**)
- [x] **G364 — Full delivery mega batch** — four-origin + symfony delivery batches. (**DESIGN D663**)
- [x] **G365 — CWL mega batch** — all RFC roundtrip + CWL full batch. (**DESIGN D664**)
- [x] **G366 — Post-translate verify Laravel-min** — post-translate verify on Laravel-min scaffold. (**DESIGN D665**)
- [x] **G367 — Contract CWL standalone** — contract CWL standalone wrapper smoke. (**DESIGN D666**)
- [x] **G368 — Evidence standalone** — hub evidence standalone wrapper smoke. (**DESIGN D667**)
- [x] **G369 — Delivery pipeline runner v2** — four-profile pipeline + runner batch. (**DESIGN D668**)
- [x] **G370 — Delivery pipeline standalone batch** — four-profile delivery pipeline batch smoke. (**DESIGN D669**)
- [x] **G371 — Laravel-min oracle batch** — project-to-CWL + verify gaps + post-translate verify. (**DESIGN D670**)
- [x] **G372 — Oracle standalone in completion** — oracle standalone mega batch wired schema 52. (**DESIGN D671**)
- [x] **G373 — Four-origin in completion** — four-origin + full delivery mega batches wired. (**DESIGN D672**)
- [x] **G374 — Capability matrix v10** — four-origin + symfony delivery + CWL mega metadata. (**DESIGN D673**)
- [x] **G375 — Delivery dashboard v12** — `month8Program` four-origin + mega batch scripts. (**DESIGN D674**)
- [x] **G376 — Hub evidence schema v9** — `requireFourOriginEnv` metadata. (**DESIGN D675**)
- [x] **G377 — Four-origin strict CI env** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN` in ci-gates v52. (**DESIGN D676**)
- [x] **G378 — month8 completion wiring** — symfony delivery + CWL mega + pipeline standalone in completion. (**DESIGN D677**)
- [x] **G379 — Laravel-min migration OS depth** — Laravel-min migration OS + oracle batches in completion. (**DESIGN D678**)
- [x] **G380 — Hub completion schema 52** — four-origin delivery + oracle mega batches; CI gates v52. Strategic test G380. (**DESIGN D679**)
- [x] **G381 — Advisory standalone mega batch** — evidence trend + detect databases + path knowledge. (**DESIGN D680**)
- [x] **G382 — Express Laravel-min delivery pair** — express + Laravel-min delivery batches. (**DESIGN D681**)
- [x] **G383 — Symfony Laravel-min delivery pair** — symfony + Laravel-min delivery batches. (**DESIGN D682**)
- [x] **G384 — All delivery ultra mega batch** — full delivery + plain-php + express + tiny-blog. (**DESIGN D683**)
- [x] **G385 — Migration OS mega batch** — plain-php + symfony + Laravel-min migration OS. (**DESIGN D684**)
- [x] **G386 — Oracle product ultra batch** — oracle standalone + Laravel-min + tiny-blog + evidence. (**DESIGN D685**)
- [x] **G387 — Advisory mega in completion** — advisory standalone mega batch wired schema 53. (**DESIGN D686**)
- [x] **G388 — Ultra delivery in completion** — all delivery ultra mega batch wired. (**DESIGN D687**)
- [x] **G389 — Migration OS mega in completion** — migration OS mega batch wired. (**DESIGN D688**)
- [x] **G390 — Oracle ultra in completion** — oracle product ultra batch wired. (**DESIGN D689**)
- [x] **G391 — Post-translate verify symfony** — post-translate verify on symfony flagship. (**DESIGN D690**)
- [x] **G392 — Post-translate verify express** — post-translate verify on express flagship. (**DESIGN D691**)
- [x] **G393 — Post-translate verify origin batch** — symfony + express + Laravel-min verify batch. (**DESIGN D692**)
- [x] **G394 — Project-to-CWL tiny-blog** — dedicated CWL export on tiny-blog. (**DESIGN D693**)
- [x] **G395 — Site intelligence tiny-blog** — site intel smoke on tiny-blog. (**DESIGN D694**)
- [x] **G396 — Path advice tiny-blog** — path advice smoke on tiny-blog. (**DESIGN D695**)
- [x] **G397 — Tiny-blog depth batch** — site intel + path advice + project-to-CWL. (**DESIGN D696**)
- [x] **G398 — Contract verify standalone batch** — contract CWL + verify gaps action. (**DESIGN D697**)
- [x] **G399 — Delivery pipeline runner v3** — four-profile pipeline + runner; schema v3. (**DESIGN D698**)
- [x] **G400 — Express/symfony Laravel-min pairs in completion** — pair delivery batches wired. (**DESIGN D699**)
- [x] **G401 — Capability matrix v11** — ultra mega batches + tiny-blog depth metadata. (**DESIGN D700**)
- [x] **G402 — Delivery dashboard v13** — `month9Program` ultra batch scripts. (**DESIGN D701**)
- [x] **G403 — Hub evidence schema v10** — `requireOracleUltraEnv` metadata. (**DESIGN D702**)
- [x] **G404 — Oracle ultra strict CI env** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA` in ci-gates v53. (**DESIGN D703**)
- [x] **G405 — Contract verify in completion** — contract verify standalone batch wired. (**DESIGN D704**)
- [x] **G406 — Post-translate verify origins in completion** — origin verify batch wired schema 53. (**DESIGN D705**)
- [x] **G407 — Tiny-blog depth in completion** — tiny-blog depth batch wired. (**DESIGN D706**)
- [x] **G408 — month9Program completion** — ultra mega + advisory batches in completion. (**DESIGN D707**)
- [x] **G409 — Delivery pipeline runner schema v3** — completion + ci-gates enforce runner v3. (**DESIGN D708**)
- [x] **G410 — Hub completion schema 53** — ultra mega delivery + oracle batches; CI gates v53. Strategic test G410. (**DESIGN D709**)
- [x] **G411 — Chimera cutover origin batch** — plain-php + symfony + express + Laravel-min chimera. (**DESIGN D710**)
- [x] **G412 — Migration assessment origin batch** — all four origin assessments. (**DESIGN D711**)
- [x] **G413 — Verify gaps origin batch** — symfony + express + Laravel-min verify gaps. (**DESIGN D712**)
- [x] **G414 — Post-translate artifacts origin batch** — symfony + express + Laravel-min artifacts. (**DESIGN D713**)
- [x] **G415 — Verify standalone mega batch** — playbooks + post-translate verify + node express oracle. (**DESIGN D714**)
- [x] **G416 — Contract standalone mega batch** — contract CWL + contract roundtrip. (**DESIGN D715**)
- [x] **G417 — Evidence standalone mega batch** — evidence + WPTP gold standalone. (**DESIGN D716**)
- [x] **G418 — Plain-php depth batch** — site intel + path advice + project-to-CWL plain-php. (**DESIGN D717**)
- [x] **G419 — Symfony depth batch** — site intel + path advice + project-to-CWL symfony. (**DESIGN D718**)
- [x] **G420 — Express depth batch** — site intel + path advice + project-to-CWL express. (**DESIGN D719**)
- [x] **G421 — Laravel-min depth batch** — site intel + path advice + CWL + assessment + chimera. (**DESIGN D720**)
- [x] **G422 — Origin depth ultra batch** — plain-php + symfony + express + tiny-blog depth. (**DESIGN D721**)
- [x] **G423 — Chimera assessment mega batch** — chimera + assessment origin batches. (**DESIGN D722**)
- [x] **G424 — Verify product ultra batch** — verify gaps origin + verify standalone mega + laravel depth. (**DESIGN D723**)
- [x] **G425 — Chimera origin in completion** — chimera cutover origin batch wired schema 54. (**DESIGN D724**)
- [x] **G426 — Assessment origin in completion** — migration assessment origin batch wired. (**DESIGN D725**)
- [x] **G427 — Verify gaps origin in completion** — verify gaps origin batch wired. (**DESIGN D726**)
- [x] **G428 — Artifacts origin in completion** — post-translate artifacts origin batch wired. (**DESIGN D729**)
- [x] **G429 — Verify standalone mega in completion** — verify standalone mega batch wired. (**DESIGN D730**)
- [x] **G430 — Capability matrix v12** — origin depth + chimera/verify ultra metadata. (**DESIGN D727**)
- [x] **G431 — Delivery dashboard v14** — `month10Program` origin depth scripts. (**DESIGN D728**)
- [x] **G432 — Hub evidence schema v11** — `requireOriginDepthEnv` metadata. (**DESIGN D731**)
- [x] **G433 — Origin depth strict CI env** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH` in ci-gates v54. (**DESIGN D732**)
- [x] **G434 — Contract standalone mega in completion** — contract standalone mega batch wired. (**DESIGN D733**)
- [x] **G435 — Evidence standalone mega in completion** — evidence standalone mega batch wired. (**DESIGN D734**)
- [x] **G436 — Per-origin depth in completion** — plain/symfony/express/Laravel-min depth batches wired. (**DESIGN D735**)
- [x] **G437 — Origin depth ultra in completion** — origin depth ultra batch wired. (**DESIGN D736**)
- [x] **G438 — Chimera assessment mega in completion** — chimera assessment mega batch wired. (**DESIGN D737**)
- [x] **G439 — Verify product ultra in completion** — verify product ultra batch wired. (**DESIGN D738**)
- [x] **G440 — Hub completion schema 54** — origin depth + chimera/verify ultra batches; CI gates v54. Strategic test G440. (**DESIGN D739**)
- [x] **G441 — CWL origin fixtures registry** — canonical probe map for all 23 hub origins. (**DESIGN D740**)
- [x] **G442 — ensureProjectWebir all origins** — generalized lift for every origin language. (**DESIGN D741**)
- [x] **G443 — Project-to-CWL all origins** — export migration.cwl for 23/23 hub origins. (**DESIGN D742**)
- [x] **G444 — CWL all-origins batch** — batch smoke over universal CWL export. (**DESIGN D743**)
- [x] **G445 — CWL universal mega batch** — all origins + CWL mega + oracle gates. (**DESIGN D744**)
- [x] **G446 — App-stack CWL origins batch** — php/js/ts/py/java/go + pattern-lift stacks. (**DESIGN D745**)
- [x] **G447 — Asset-format CWL origins batch** — sql/html/css/json/yaml/markdown/c/cpp/cwl. (**DESIGN D746**)
- [x] **G448 — Universal CWL in completion** — projectToCwlAllOrigins wired schema 55. (**DESIGN D747**)
- [x] **G449 — CWL batches in completion** — all-origins + universal mega batches wired. (**DESIGN D748**)
- [x] **G450 — Capability matrix v13** — cwlAllOrigins metadata (23 origins). (**DESIGN D749**)
- [x] **G451 — Delivery dashboard v15** — `month11Program` universal CWL scripts. (**DESIGN D750**)
- [x] **G452 — Hub evidence schema v12** — `requireUniversalCwlEnv` metadata. (**DESIGN D751**)
- [x] **G453 — Universal CWL strict CI env** — `CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL` in ci-gates v55. (**DESIGN D752**)
- [x] **G454 — App-stack batch in completion** — cwlAppStackOriginsBatch wired. (**DESIGN D753**)
- [x] **G455 — Asset batch in completion** — cwlAssetOriginsBatch wired. (**DESIGN D756**)
- [x] **G456 — CWL Stage-B sink for all origins** — lift → WebIR → CWL on every origin probe. (**DESIGN D754**)
- [x] **G457 — Pattern-lift CWL coverage** — ruby/csharp/kotlin/rust/scala/swift/vue export CWL. (**DESIGN D755**)
- [x] **G458 — Asset silver CWL coverage** — file-lift origins export route-shell CWL. (**DESIGN D757**)
- [x] **G459 — PHP tiny-blog CWL probe** — php origin in universal registry uses tiny-blog. (**DESIGN D758**)
- [x] **G460 — CWL origin count gate** — ci-gates v55 requires originCount >= 23. (**DESIGN D759**)
- [x] **G461 — Universal CWL mega in completion** — cwlUniversalMegaBatch wired schema 55. (**DESIGN D760**)
- [x] **G462 — CWL all-origins CLI** — `pnpm run hub:project-to-cwl-all-origins`. (**DESIGN D761**)
- [x] **G463 — CWL universal mega CLI** — `pnpm run hub:cwl-universal-mega-batch-smoke`. (**DESIGN D762**)
- [x] **G464 — ensureWebir routeCount check** — lift must produce routes before CWL export. (**DESIGN D763**)
- [x] **G465 — CWL projection on all origins** — summarizeCwlProjection per origin export. (**DESIGN D764**)
- [x] **G466 — Oracle gates + universal CWL** — mega batch includes oracle fixture gates. (**DESIGN D765**)
- [x] **G467 — month11Program completion** — universal CWL batches in completion report. (**DESIGN D766**)
- [x] **G468 — Strategic test G470** — schema 55 universal CWL smokes. (**DESIGN D767**)
- [x] **G469 — ci-gates v55 test** — accepts schema v55 with universal CWL payloads. (**DESIGN D768**)
- [x] **G470 — Hub completion schema 55** — all 23 origins export CWL; CI gates v55. (**DESIGN D769**)
- [x] **G471 — Silver file-lift literal CWL bodies** — asset origins hole-free on CWL emit. (**DESIGN D770**)
- [x] **G472 — ensureProjectWebir on translate CWL path** — contract import lifts before export. (**DESIGN D771**)
- [x] **G473 — vue-literal-cwl gold** — vue pattern-lift CWL structural suite. (**DESIGN D772**)
- [x] **G474 — sql-literal-cwl gold** — sql silver file-lift CWL suite. (**DESIGN D773**)
- [x] **G475 — html-literal-cwl gold** — html silver file-lift CWL suite. (**DESIGN D774**)
- [x] **G476 — json-literal-cwl gold** — json silver file-lift CWL suite. (**DESIGN D775**)
- [x] **G477 — css/scss/markdown/yaml literal-cwl gold** — asset CWL suites. (**DESIGN D776**)
- [x] **G478 — c/cpp literal-cwl gold** — native asset CWL suites. (**DESIGN D777**)
- [x] **G479 — Structural suite count 154** — +10 pattern-lift/asset CWL gold suites. (**DESIGN D778**)
- [x] **G480 — hub-cwl-pattern-literal-cwl-batch-smoke** — 18-suite CWL gold batch. (**DESIGN D779**)
- [x] **G481 — hub-translate-cwl-coverage-smoke** — translate path exports migration.cwl. (**DESIGN D780**)
- [x] **G482 — crossFrameworkCwlGold extended** — kotlin/scala/swift in completion metadata. (**DESIGN D781**)
- [x] **G483 — cwlPatternLiteralGold completion section** — vue + asset CWL suite ids. (**DESIGN D782**)
- [x] **G484 — Capability matrix v14** — patternLiteralCwl + translateCwl scripts. (**DESIGN D783**)
- [x] **G485 — Delivery dashboard v16** — month12Program pattern-literal CWL. (**DESIGN D784**)
- [x] **G486 — Hub evidence schema v13** — requirePatternLiteralCwlEnv + requireTranslateCwlEnv. (**DESIGN D785**)
- [x] **G487 — ci-gates v56** — pattern literal CWL + translate CWL gates. (**DESIGN D786**)
- [x] **G488 — Strategic test G500** — schema 56 pattern-literal CWL smokes. (**DESIGN D787**)
- [x] **G489 — ci-gates v56 test** — accepts schema v56 payloads. (**DESIGN D788**)
- [x] **G500 — Hub completion schema 56** — hole-free pattern-literal CWL gold + translate CWL coverage. (**DESIGN D789**)
- [x] **G501 — CWL roundtrip route parity** — compare exported CWL route count on re-lift. (**DESIGN D790**)
- [x] **G502 — roundTrip on 21 literal-cwl suites** — pattern-lift + asset CWL roundtrip gold. (**DESIGN D791**)
- [x] **G503 — hub-cwl-pattern-literal-roundtrip-batch-smoke** — 21-suite CWL roundtrip batch. (**DESIGN D792**)
- [x] **G504 — translate-cwl all 23 origins** — hub-translate exports migration.cwl per origin. (**DESIGN D793**)
- [x] **G505 — Capability matrix v15** — roundtrip + translate-all metadata. (**DESIGN D794**)
- [x] **G506 — Delivery dashboard v17** — month13Program roundtrip + translate-all. (**DESIGN D795**)
- [x] **G507 — Hub evidence schema v14** — requirePatternLiteralRoundtripEnv + requireTranslateCwlAllOriginsEnv. (**DESIGN D796**)
- [x] **G508 — ci-gates v57** — roundtrip batch + translate 23-origin gates. (**DESIGN D797**)
- [x] **G509 — Strategic test G530** — schema 57 roundtrip + translate-all smokes. (**DESIGN D798**)
- [x] **G510 — ci-gates v57 test** — accepts schema v57 payloads. (**DESIGN D799**)
- [x] **G530 — Hub completion schema 57** — CWL literal roundtrip gold + translate CWL all origins. (**DESIGN D800**)
- [x] **G531 — Flagship CWL roundTrip gold** — plain-php/symfony/express flagship CWL re-lift. (**DESIGN D801**)
- [x] **G532 — hub-cwl-flagship-roundtrip-batch-smoke** — 3-suite flagship CWL roundtrip batch. (**DESIGN D802**)
- [x] **G533 — hub-translate-cwl-roundtrip-smoke** — translate migration.cwl route-surface re-lift all 23 origins. (**DESIGN D803**)
- [x] **G534 — CWL universal mega batch v2** — includes roundtrip + translate coverage + translate roundtrip. (**DESIGN D804**)
- [x] **G535 — Capability matrix v16** — flagship + translate roundtrip metadata. (**DESIGN D805**)
- [x] **G536 — Delivery dashboard v18** — month14Program translate/flagship roundtrip. (**DESIGN D806**)
- [x] **G537 — Hub evidence schema v15** — requireTranslateCwlRoundtripEnv + requireFlagshipCwlRoundtripEnv. (**DESIGN D807**)
- [x] **G538 — ci-gates v58** — flagship + translate CWL roundtrip gates. (**DESIGN D808**)
- [x] **G539 — Strategic test G560** — schema 58 complete CWL universe smokes. (**DESIGN D809**)
- [x] **G540 — ci-gates v58 test** — accepts schema v58 payloads. (**DESIGN D810**)
- [x] **G560 — Hub completion schema 58** — translate CWL roundtrip all origins + flagship CWL roundtrip. (**DESIGN D820**)
- [x] **G561 — hub-project-to-cwl-roundtrip-smoke** — project export migration.cwl route-surface re-lift all 23 origins. (**DESIGN D821**)
- [x] **G562 — CWL universal mega batch v3** — includes project-to-CWL roundtrip. (**DESIGN D822**)
- [x] **G563 — Capability matrix v17** — project-to-CWL roundtrip metadata. (**DESIGN D823**)
- [x] **G564 — Delivery dashboard v19** — month15Program project roundtrip. (**DESIGN D824**)
- [x] **G565 — Hub evidence schema v16** — requireProjectToCwlRoundtripEnv. (**DESIGN D825**)
- [x] **G566 — ci-gates v59** — project-to-CWL roundtrip + universal mega v3 gates. (**DESIGN D826**)
- [x] **G567 — Strategic test G590** — schema 59 project roundtrip smokes. (**DESIGN D827**)
- [x] **G568 — ci-gates v59 test** — accepts schema v59 payloads. (**DESIGN D828**)
- [x] **G590 — Hub completion schema 59** — project-to-CWL roundtrip all origins. (**DESIGN D829**)
- [x] **G591 — hub-contract-import-cwl-roundtrip-smoke** — OpenAPI + HAR import migration.cwl route-surface re-lift. (**DESIGN D830**)
- [x] **G592 — CWL universal mega batch v4** — includes contract import CWL roundtrip. (**DESIGN D831**)
- [x] **G593 — Capability matrix v18** — contract import roundtrip metadata. (**DESIGN D832**)
- [x] **G594 — Delivery dashboard v20** — month16Program contract import roundtrip. (**DESIGN D833**)
- [x] **G595 — Hub evidence schema v17** — requireContractImportCwlRoundtripEnv. (**DESIGN D834**)
- [x] **G596 — ci-gates v60** — contract import CWL roundtrip + universal mega v4 gates. (**DESIGN D835**)
- [x] **G597 — Strategic test G620** — schema 60 contract import roundtrip smokes. (**DESIGN D836**)
- [x] **G598 — ci-gates v60 test** — accepts schema v60 payloads. (**DESIGN D837**)
- [x] **G620 — Hub completion schema 60** — contract import CWL roundtrip OpenAPI + HAR. (**DESIGN D839**)
- [x] **G621 — hub-php-oracle-micro-verify-batch-smoke** — tiny-blog oracle micro + Next.js trace verify. (**DESIGN D840**)
- [x] **G622 — Oracle product ultra batch v2** — includes PHP oracle micro verify. (**DESIGN D841**)
- [x] **G623 — Capability matrix v19** — oracle micro verify batch metadata. (**DESIGN D842**)
- [x] **G624 — Delivery dashboard v21** — month17Program PHP oracle micro verify. (**DESIGN D843**)
- [x] **G625 — Hub evidence schema v18** — requirePhpOracleMicroVerifyEnv. (**DESIGN D844**)
- [x] **G626 — ci-gates v61** — PHP oracle micro verify + oracle ultra v2 gates. (**DESIGN D845**)
- [x] **G627 — Strategic test G650** — schema 61 PHP oracle micro verify smokes. (**DESIGN D846**)
- [x] **G628 — ci-gates v61 test** — accepts schema v61 payloads. (**DESIGN D847**)
- [x] **G650 — Hub completion schema 61** — PHP oracle micro verify batch on tiny-blog. (**DESIGN D849**)
- [x] **G138 — JS runtime emit returns real bodies + applies response status** — the follow-on to G137. The hono `__return_json` emit ignored `__status`, so `res.status(n).json(...)` produced a `200` body; bare concise-arrow returns were discarded. The emit now, when a preceding `effect.http.error` set a non-200 `__status`, buffers the JSON body (`__html += JSON.stringify(...)`) and responds via `__respond` (which sniffs JSON → `application/json` and applies `__status`) — matching the proven PHP echo+json_encode path and avoiding a `ContentfulStatusCode` cast; default-200 routes keep the direct `c.json(...)` path (no regression). The express flagship `src/app.js` rich routes were rewritten to real Express (`res.json({...})`, `res.status(201|202).json({...})`) and `oracle/app-live.js` was re-recorded to mirror the emitted runtime exactly. Flagship projection now reports **`withStatus: 2`** (was 0), `withParams: 5`, `objectBodies: 8`, still hole-free; gold + hono/fastify/nextjs trace replay all green (0 divergences across 112 suites); strategic suite 26/26; `ci-gates hub-completion` green (schema 40). Trivial literal routes (`/items`, `/stats`, `DELETE /items/:id`) stay empty to match discarded bare returns. (**DESIGN D437**)

**Paused by policy (do not open without plan amendment):** matrix gold for marketing; WordPress before Laravel boring; “any language production-ready” claims.

---

## Milestone 0 — Foundations (days, not weeks)

**Goal:** repo exists, architecture is committed, nothing is hand-wavy.

- [x] `DESIGN.md`, `ROADMAP.md`, `AGENTS.md`, `README.md` land
- [x] pnpm monorepo scaffolded under **`packages/*`** (TypeScript packages plus **`packages/oracle-php`** prelude; workspace membership grows with the roadmap — see **`pnpm-workspace.yaml`**)
- [x] Each package has a `README.md` stating its single responsibility
- [x] `fixtures/tiny-blog/` exists with 5 PHP endpoints and a minimal schema
- [x] CI (GitHub Actions) typechecks every package
- [x] `chrysalis --help` prints subcommands (even as stubs)

**Done when:** a contributor can clone, install, and run `chrysalis --help`.
**Status: complete.**

---

## Milestone 1 — Vertical slice (2–3 weeks)

**Goal:** end-to-end on `fixtures/tiny-blog`. Prove the whole thesis once.

**Status: Milestone 1 is complete end-to-end. Translation axis (2, 3, 5, 8),
Oracle recording (1), Verify HTTP-replay + correctness scoring (6),
Archaeology DDL + corpus → typed domain models (4), runtime chimera with
legacy/cutover/shadow modes (7), and the `chrysalis status` dashboard are
all implemented against the tiny-blog fixture. Follow-ups once shipped as
vertical slice: recorded-SQL replay, heuristic IR divergence attribution,
Drizzle migration, and session bridging landed in Milestones 2–3 (see items
below).**
The unmodified tiny-blog PHP app is ingested into a 325-node WebIR module
with zero holes; emit-hono produces a compiling TypeScript project that
serves live HTTP requests against a seeded SQLite database. The Oracle PHP
prelude captures HTTP + SQL + session traces into a versioned NDJSON
corpus; `chrysalis observe` wires it up; `chrysalis corpus` summarizes it;
`chrysalis verify` replays the corpus against the emitted app and produces
a per-route correctness report.

Acceptance — every item must be demonstrable on the tiny-blog fixture:

1. **Oracle (record)**
   - [x] `chrysalis observe` runs the PHP built-in server with the Oracle
         prelude loaded via `auto_prepend_file` (D6)
   - [x] Captures request/response pairs for all 5 endpoints (incl. session
         state pre- and post-handler)
   - [x] Captures SQL queries + result sets via a PDO driver shim
         (`\Chrysalis\Oracle\Db\PDO`)
   - [x] Persists to a versioned `TraceCorpus` on disk (schema 1.0.0), one
         NDJSON file per request, redacted at capture time (D7)
   - [x] `chrysalis corpus <dir>` summarizes a captured corpus

2. **Parser bridge**
   - [x] Emits canonical PHP AST JSON via the glayzzle provider (D5) or the
         **`nikic/php-parser` subprocess** (**`provider: "nikic"`**, D195) with the
         same **`PhpAst`** shape; default CLI/ingest paths stay **glayzzle** unless
         configured.
   - [x] Handles the fixture's full syntax surface without unknown nodes.

3. **Ingest (PHP AST → WebIR)**
   - [x] Produces `web.request`, `effect`, and `data` dialect nodes
   - [x] Every node carries an `origin` locator back to PHP source
   - [x] Unhandled constructs become typed holes, not crashes
         (tiny-blog currently yields **zero** holes)

4. **Archaeology**
   - [x] Reads the DB schema from the fixture's SQLite/MySQL DDL
         (parser in `packages/archaeology/src/parse-schema.ts`)
   - [x] Intersects with observed JSON shapes from the trace corpus
         (groups SQL row shapes by FROM/JOIN-attributed table)
   - [x] Emits `Post`, `User`, `Comment` types with `@chrysalis-provenance`
         JSDoc. Nullable columns become `T | null`; `CHECK (col IN (...))`
         promotes a TEXT column to a string-literal union.
   - [x] `chrysalis archaeology <schema.sql> [--traces <dir>] [--out <file>]`
         CLI; `scripts/run-e2e.mjs` auto-generates
         `generated/tiny-blog/src/domain.ts` and the emitted project still
         typechecks.
   - [x] **(v2)** Heuristic form-field extraction from inline HTML/templates in
         PHP (`@chrysalis/archaeology` `php-form-scan`, `runArchaeology({ phpRoots })`,
         CLI `--php-root`, `chrysalis status` passes `--project` for scans). INSERT/UPDATE
         targets disambiguate shared column names (e.g. `body` on posts vs comments).
   - [x] emit-hono consumes archaeology interface names as `queryOne<T>` /
         `queryAll<T>` when `EmitInput.domainTypesByTable` is supplied and
         the `db.query` node tags a single table (D22). `run-e2e.mjs` and
         `chrysalis emit --schema` write `src/domain.ts` and pass the map.

5. **Emit (Hono + SQLite)**
   - [x] Produces a runnable project (Hono + `node:sqlite`)
   - [x] Routes mirror the PHP URL structure
   - [x] Handlers carry `@chrysalis-effects` annotations derived from WebIR
   - [x] Eligible **string-dispatch** if/elseif chains (one `request.field`
         vs distinct string literals, same matcher as `@chrysalis/insight`)
         emit as a TypeScript `switch` with a normalized discriminant (D21).
   - [x] At least one deliberately-unsupported node appears as a compiling
         hole (none needed for tiny-blog; the infrastructure exists and is
         exercised on synthetic inputs in tests).
   - [x] Drizzle schema + dependency in emitted app when `--schema` /
         `EmitInput.schemaReport` is used (`emitDrizzleSchema`, `src/schema.ts`);
         handler reads/writes still use sync `node:sqlite` prepares (SQL replay).
         Follow-up: optional native driver + Drizzle query builder for reads when
         we accept async or a sync-capable driver.

6. **Verify (replay oracle)**
   - [x] Runs every captured trace against the generated handlers over HTTP,
         with ordered cookie-chaining so a login cookie flows into the next
         request (single-user model for Milestone 1)
   - [x] Diffs status, strict headers (content-type, location), and body per
         trace with Jaccard similarity after normalization (timestamps,
         session-cookie values, UUIDs, whitespace)
   - [x] Produces `reports/verify/summary.json` + one file per route with a
         per-endpoint and aggregate correctness score
   - [x] `chrysalis verify <traces> --base-url <url> [--threshold]` CLI
   - [x] **Recorded SQL results** — traces capture SELECT `rows`; verify sends
         `x-chrysalis-sql-tape`; emit-hono serves `queryOne` / `queryAll` from
         the tape when the header is present (`recordedSqlReplay`, default on
         in `verify-tiny-blog` / CLI unless `--no-recorded-sql`). Mutations
         still hit SQLite. Deterministic time/RNG uses `src/ctx.ts` in emits;
         `verify` replay sends `x-chrysalis-now-iso` / `x-chrysalis-random-seed`
         from trace metadata by default.
   - [x] Heuristic divergence attribution: up to five WebIR `NodeId`s per failed
        trace when `replayCorpus` receives the ingest `module` (`chrysalis verify
        --project`, `chrysalis repair`). Precise bidirectional emit↔IR maps remain
        future work.

7. **Runtime chimera (dual-stack)**
   - [x] A Node-based proxy routes per-path to either PHP or the new stack
   - [x] Supports modes: `legacy`, `shadow`, `cutover`
   - [x] Shadow mode logs diffs in the same format as `verify` (reuses
         `@chrysalis/verify`'s `diffResponse`; NDJSON at `<shadowLogDir>/shadow.ndjson`)
   - [x] `chrysalis deploy --mode=<legacy|cutover|shadow> --legacy <url> --modern <url>`
         CLI (reads optional `--config chimera.json` for routing rules)
   - [x] **Session bridge (file JSON, demo-grade)** — emitted Hono stack
         persists sessions under `CHRYSALIS_SESSION_DIR` as `{sid}.json` with
         cookie name `CHRYSALIS_SESSION_COOKIE` (`chrysalis_sid` default). PHP
         can share the directory + cookie + JSON keys (documented in
         `packages/oracle-php/README.md`). Redis / shared infra remains a
         follow-up for production.

8. **CLI dashboard**
   - [x] `chrysalis ingest <dir>` prints route/node/hole counts and dialect totals
   - [x] `chrysalis emit <dir> --out <dir> [--target=hono]` generates the project
         and reports per-handler effects
   - [x] `chrysalis observe <dir>` starts the live recorder
   - [x] `chrysalis corpus <dir>` summarizes a traces directory
   - [x] `chrysalis verify <traces> --base-url <url>` replays and scores
   - [x] `chrysalis archaeology <schema.sql> --out <file>` emits typed
         domain models (optionally fused with `--traces <dir>`)
   - [x] `chrysalis status` prints (with `--json` for machines):
     - Corpus size (traces + distinct routes, from `--traces`; optional D32
       `http.outbound` / `mail.send` totals when present)
     - Correctness % (aggregate + per-endpoint, from `reports/verify/summary.json`
       or dual-backend `reports/verify/{hono,fastify}/summary.json`)
     - Archaeology coverage (entities, fields, unknown DDL, orphan shapes,
       field conflict count, trace-promoted literal unions; from `--schema`
       and optional `--traces`)
     - Shadow-mode results (mirrored / agreed / diverged from
       `reports/shadow/shadow.ndjson`)
     - Residual legacy: hole count + IR dialect totals (from `--project`)

**Definition of done:** a demo recording that walks from an unmodified PHP
tiny-blog, through `observe → ingest → emit → verify → cutover`, with live
metrics, in under 10 minutes.

**Closure:** Milestone 1 acceptance list is fully checked; this milestone is
**closed**.

---

## Milestone 2 — Expansion (4–6 weeks)

Deepen each layer without broadening too fast.

**Status: complete.** Delivered: second emitter, insight+rewrite stack (incl.
`dispatch-union-zod` for string-dispatch → enum-shaped boundary + param rewire),
`call_user_func*` effect widening in `effectsReachableWithCallOverlay`, nested
`FunctionDecl` bodies in `buildCallEffectMap`, `SELECT *` support in
`batch-n1-read`, dual verify, canary chimera, archaeology/trace enums, CI
goldens. **Explicitly not required for M2 closure:** Composer vendor callees,
effect narrowing, bare inner N+1 without `__assign`, corpus-only batch gating,
and a first-class `mysqli` oracle driver (PDO path remains the supported
default).

- [x] Second emit backend: `emit-fastify` (proves WebIR target-portability;
      shared `@chrysalis/emit-shared` handler lowering; CLI `--target=fastify`)
- [x] **Effect inference (widening v1 + v2):** cross-call effect sets for manifest
      routes + `lib/` + same-file helpers (see below). v2 adds nested function
      bodies in the call map and `call_user_func*` widening (full detail in the
      nested bullet). **Still future:** Composer vendor, arbitrary variable callees,
      effect **narrowing**, whole-program refinement.
  - [x] Handler `effects` union over the body subgraph (`effectsReachableFrom`);
        Hono/Fastify `@chrysalis-effects` and `effectsByHandler` prefer that IR
        list (`handlerEffectAnnotationTags` / `effectTagsSorted`), with emit-time
        collection as fallback for hand-built modules
  - [x] **Library cross-call widening (D30):** `lib/**/*.php` top-level functions
        → fixpoint effect map; `effectsReachableWithCallOverlay` on route bodies
        (`buildCallEffectMap`, `ingestDirectory`)
  - [x] **Same-file route helpers (D31):** top-level `FunctionDecl` in manifest
        route files are hoisted into `buildCallEffectMap` (after `lib/`, no
        override); stripped from handler lowering (`stripTopLevelFunctionDecls`)
  - [x] **Widening v2 (M2):** nested `FunctionDecl` bodies are walked inside
        `lib/**` and route files when building `buildCallEffectMap`. Dynamic
        `call_user_func`, `call_user_func_array`, `forward_static_call`, and
        `forward_static_call_array` union **all** known callee effects from the
        overlay map (sound over-approximation). **Still future:** vendor/Composer
        resolution, variable callee other than the above builtins, effect
        **narrowing**, whole-program refinement.
- [x] **Insight stage (`@chrysalis/insight`)** — pure recognizers over WebIR
      with corpus-backed confidence boost (D13). Five recognizers so far:
      N+1 queries, scattered input validation, string-based dispatch,
      unescaped-output (XSS), raw-sql-concat (SQLi). `chrysalis insight`
      CLI + dashboard integration. See `packages/insight/README.md`.
- [x] **Taint primitive (`@chrysalis/insight/taint`, D14)** — intra-handler
      source→sink reachability with explicit sanitizer allowlist; substrate
      for data-flow-driven security recognizers. Corpus boost flips
      `unescaped-output` to STRONG when an observed response contained the
      observed request-field verbatim.
- [x] **Rewrite engine (`@chrysalis/rewrite`, D15)** — confidence-gated IR
      rewrites driven by insight opportunities; `chrysalis rewrite` CLI
      applies patches, emits TypeScript, and writes a per-opportunity
      report. First pass `sanitize-output` wraps tainted concat leaves in
      `htmlspecialchars` (not the whole string — preserves literal HTML)
      and flips `html.template escape:false` to `true`. CI gate asserts
      the XSS recognizer's output is *actually fixed* in the emitted TS.
- [x] **Invariant verifier (`@chrysalis/rewrite/invariants`, D16)** —
      per-pass, per-opportunity structural-invariant checker between
      pre- and post-rewrite modules. Each pass declares the `dialect.op`
      shapes it is allowed to mutate (with optional `attrMatch` refinement
      for sub-shapes like `data.binop` with `operator: "."`); any
      out-of-allowlist mutation or effect-count change rolls the edit
      back and records a `verify-invariant-failed` entry in the report.
      Fast enough to run per-opportunity; complements full HTTP replay,
      which still runs post-rewrite for holistic behavior checks.
- [x] **Parameterize-sql pass (`@chrysalis/rewrite`, D17)** — second pass
      in the catalog. Ingest preserves the concat tree as a
      `sqlExpr` virtual-operand attr on `effect.db.query`; the pass
      walks it, inlines string literals as SQL text, and lifts every
      other leaf to a `?`-placeholder bound parameter. After rewrite
      `raw-sql-concat` no longer fires. Emitted TS for tiny-n1/lookup
      is now `queryAll("SELECT id, name FROM users WHERE id = ?", [id])`
      — structurally SQLi-proof. CI rewrite-gate asserts the fix via
      `scripts/ci-gates.mjs tiny-n1-rewrite` (TypeScript AST on emitted
      handlers + rewrite report JSON), not regex on source (D41).
- [x] Intent-preserving rewrites (v1, building on the D15 engine):
  - [x] `@chrysalis/rewrite` package scaffold — `RewritePass` interface,
        `applyRewrites` driver, `sanitize-output` first pass
  - [x] Raw SQL concat → parameterized literal (`parameterize-sql`;
        see D17)
  - [x] **Post-rewrite analysis gate (D18)** — re-runs each applied
        opportunity's recognizer after the batch lands and rolls back
        all-or-nothing if any applied rewrite failed to fix its
        finding. Covers "the pass lied" bugs that invariants can't
        catch. Default-on in the CLI.
  - [x] **Behavior-verify gate (D19)** — in-process IR simulator
        evaluates each route under both pre- and post-rewrite
        modules against synthesized benign + attack probe inputs,
        and rolls back all-or-nothing on any divergence the set of
        applied passes doesn't account for. Catches silent
        regressions that neither invariants nor recognizer re-runs
        can see (dropped echoes, swapped redirects, phantom session
        writes). Opt-in via `chrysalis rewrite --verify-behavior`;
        CI exercises it end-to-end on `fixtures/tiny-n1`.
  - [x] **HTTP-replay gate (D20)** — `replayCorpus` accepts injected
        `fetch` (in-process Hono / Fastify `inject`). `applyRewritesAsync` runs the
        corpus after a successful batch and rolls back on any
        `diffResponse` divergence. Emitted apps split into
        `src/server.ts` (`export const app`) + `src/index.ts`
        (listen only). **Caveat:** PHP-captured bodies diverge after
        `sanitize-output`; use D19 for that contract, or a TS-golden
        corpus for D20. **CLI:** `chrysalis rewrite --http-replay
        <traces> --out <dir>` (optional `--http-replay-skip-install`,
        `--target=hono|fastify`, `--http-replay-backends=hono,fastify` for D26).
        **CI:** `rewrite-gate` exercises D19 + emit checks; full D20 HTTP-replay
        against a checked-in golden corpus remains an optional tighten-up (large
        artifact).
  - [x] `foreach` accumulator → `.map`/`.reduce`/loop chooser — ingest lowers
        `+=` / `-=` / `.=` / `??=` on simple variables to binops; **emit** emits
        `Array.reduce` when a literal init + foreach + single `__assign` with
        `acc binop expr(loopVar)` matches (v1 subset).
  - [x] Inline `$_POST` validation → boundary normalize — **`boundary-zod`** pass
        (D44) consumes `scattered-validation` for `body` fields: prepends
        `parseZodBodyFieldRaw` (runtime helper, zod-shaped contract without npm
        `zod`) and rewires `request.field` uses to a shared `param`. Does not
        remove legacy guard IR (follow-up: dead-code cleanup / stricter schemas).
  - [x] N+1 detection → batched loader — **`batch-n1-read`** (D43) batches every
        **assign-wrapped** qualifying inner read in the loop (disambiguated vars
        when multiple). **`SELECT *`** inner selects batch using the FK column as
        the projected list. **Deferred post-M2:** bare inner reads without
        `__assign`, corpus-only confidence gating.
  - [x] **Emit (D21):** matching chains lower to a TS `switch` (shared
        `matchStringDispatchChain` with insight; see Milestone 1 emit).
  - [x] String dispatch → discriminated union + `z.enum`
        — **`dispatch-union-zod`** pass (`__chrysalis_zod_enum_body_field` →
        `parseZodEnumBodyFieldRaw` in emitted runtimes; D19 simulator parity).
        Consumes `string-dispatch` opportunities; post-verify clears the finding.
- [x] Archaeology v2: infer enum types from observed traces + DB CHECK constraints
      (`sql.query.rows` string literals, cardinality cap; CHECK/ENUM validated
      against literals; D28)
- [x] Oracle: outbound HTTP + mail recording (D32: `http.outbound` stream
      wrapper; `mail.send` via `Chrysalis\Oracle\Mail::send`; schema + corpus
      summary; `mysqli` / cURL-only apps still partial)
- [x] CI: fixture suite with golden WebIR snapshots and golden generated TS
      (`pnpm run update:golden`; `packages/ingest/tests/golden-webir.test.ts`,
      `packages/emit-hono/tests/golden-emit.test.ts`)
- [x] Verify: same oracle corpus replayed in-process against **Hono + Fastify**
      emits (`scripts/verify-tiny-blog.mjs`, D25; reports under `reports/verify/*`)
- [x] Chimera: canary mode with percentage routing + user-hash stickiness
      (`mode=canary`, `canary.percentModern`, cookie/header/IP stickiness + salt;
      `x-chrysalis-canary: in|out|n/a`; see `packages/runtime-chimera`)

---

## Milestone 3 — Repair loop (4–6 weeks)

Close the LLM-verified feedback loop.

**Status: complete (v1).** Verify-gated loop, optional HTTP chat proposer, hole
patches, diagnostics, and `--write-module` are shipped; default CLI proposer
remains a **stub** when `--llm` is not passed (by design).

- [x] Divergence attribution v1: heuristic ≤5 IR nodes per failure (with ingest
      `module` on replay); precise maps deferred
- [x] Repair pass interface: `@chrysalis/repair` (`RepairProposer`, edits via
      `applyModuleEdits`)
- [x] Patches are **always** full-corpus re-verified in `runVerifiedRepairLoop`
- [x] CLI: `chrysalis repair <traces-dir> --base-url <url> --project <php-root>`
      (bounded `--max-iter`; optional `--llm` + `CHRYSALIS_REPAIR_LLM_*` for HTTP chat proposer)
- [x] Opt-in **HTTP Chat Completions** repair proposer (`createHttpChatRepairProposer*`,
      `replaceOperand`-only JSON, neighbor catalog from attributed nodes; tooling-only
      network — not emitted handler code)
- [x] Operand edits from the loop record `provenance` with `source: "repair-pass"`
- [x] Hole auto-closure API: `applyHoleClosure` + `applyHoleClosureAndVerify`
      (`@chrysalis/repair`) — replacement subgraph, `hand-authored` sign-off on
      the new root, full-corpus replay gate; v1 supports a single operand parent
      per hole
- [x] **`--hole-patch`** on `chrysalis repair` — `parseHoleClosurePatchJson` +
      `applyHoleClosureAndVerify` (human-authored JSON, same verify gate as the loop)
- [x] **`--repair-verbose`** / `CHRYSALIS_REPAIR_VERBOSE` — stderr diagnostics for
      the HTTP chat repair proposer (HTTP errors, empty model output, invalid edits)
- [x] **`--write-module`** after successful repair or hole-patch — WebIR golden snapshot
      (`moduleToGoldenSnapshot` relative to `--project`)
- [x] **Hole-patch validation** — known `Effect.kind` / `WebIRType.kind` sets reject typos

---

## Milestone 4 — First real app

**Milestone 4 v1 pilot — status: COMPLETE (2026-04-25).** The **phased checklist**
below is fully checked: `laravel-min` ships a Laravel-shaped, Composer-autoloaded,
oracle-verified, dual-emit pilot with migration + footprint artifacts in CI;
`laravel-full` ships a **bounded** Composer adoption track (`chrysalis-templates/`,
scaffold, optional verify/status, dedicated CI). Ingest/emit parity for both
slices stays **zero-hole** on the committed manifests. This closes **M4 v1** as
the “first real app *pilot*” — not full Breeze production parity (see follow-ons).

**Goal (north star, unchanged):** one public flagship migration with the four
success metrics visible on every commit (see `DESIGN.md` and `chrysalis status`
→ `migration`). **v1 delivered:** coverage + correctness are **CI-gated and
machine-readable** for both pilots; idiomaticity + residual legacy remain
**optional sidecars** (documented under `flagship/laravel-min/migration-reports/`).

**Official first target (v1):** a **small Laravel** app (Breeze or similar
starter + a handful of routes we control). Tractable routing, Composer
autoload, and Blade/HTTP patterns without WordPress-style global hooks.

**Tracker:** `flagship/README.md` (vendor tree and CI wiring land there as the
app is adopted).

**Milestone 4+ follow-ons** — the working checklist lives under **Milestone 5 — Flagship depth** (section after the M4 v1 phased checklist). This heading stays for historical links and grep.

Candidates after the Laravel pilot (rough tractability order):
2. osTicket
3. phpBB (hard; good stress test)
4. WordPress — **not yet** (dedicated design spike: plugins, `wp_*`, hooks)

**Phased checklist (M4 v1 — all complete)**

- [x] Dashboard roll-up: `chrysalis status` exposes `migration` (IR coverage
      when `--project` is set; correctness from verify reports; optional
      `reports/migration/idiomaticity.json` and `residual-legacy.json`)
- [x] Flagship skeleton under `flagship/laravel-min` (Laravel-**shaped** tree +
      `chrysalis.routes.json`; full Composer Laravel documented in README, not
      vendored)
- [x] First ingest + emit slice (GET `/`, zero holes) gated in CI via ingest +
      emit-hono tests
- [x] Oracle corpus + verify gate for `laravel-min` (`scripts/verify-flagship-laravel-min.mjs`,
      CI job `verify-flagship-laravel-min`; PHP docroot `public/`)
- [x] Publish `migration` status JSON as a CI artifact (`flagship-laravel-min.json`)
- [x] Oracle footprint on `chrysalis status` (`computeOracleFootprint` in
      `@chrysalis/webir`; hydration index, read/write hints, full `routes[]` in
      `--json`, `reports/oracle-footprint.json` under `--project` — D39/D40)

**Pilot slice status:** `laravel-min` satisfies the phased checklist (dashboard,
ingest/emit, dual verify, migration artifact). **v1.1–v1.3:** `GET /health`,
`GET /items` (`query_all`), **`GET /count`** (`query_one` aggregate), **`GET /hello`**
(`$_GET['name']` + `trim`), **`GET /jump`** (`header('Location: /health')` redirect), **`GET /api/health`**
(JSON body, `application/json`), **`GET /robots.txt`** (plain crawl policy),
**`GET /humans.txt`** (plain `humans.txt` credits), **`GET /.well-known/security.txt`**
(RFC 9116-style plain text, fixture contact lines only), **`GET /sitemap.xml`**
(minimal sitemap index, **`application/xml`**, fixed fixture **`loc`** only),
**`GET /css/pilot.css`** (static stylesheet, **`text/css`**, fixture rules only),
**`GET /manifest.webmanifest`** (PWA manifest, **`application/manifest+json`**, fixed literal body),
**`POST /echo`**
(`$_POST['msg']`), **`GET /session/visit`** (PHP `session_start` +
`session_name('chrysalis_sid')`, `$_SESSION['visits']` counter; verify hits it
twice with cookie chaining so replay matches emitted session middleware),
**`GET /login`** + **`POST /login`** (static CSRF token + **`password_verify`** over
**`users`** via **`query_one`**), **`POST /logout`**, **`GET /session/me`** (session user id;
verify: `me` → login form+POST → `me` → logout → `me`) on SQLite
(`schema.sql` → `data/app.sqlite`, same seed into emitted `blog.sqlite` for SQL
replay); `composer.json` + CI `composer install` loads `vendor/autoload.php`;
verify script drives **thirty-one** HTTP requests (sixteen sequential `GET`s in the base path loop,
      two `GET /hello?name=…`, one `GET /jump` (302, `redirect: manual`), two `POST /echo` bodies,
      two `GET /session/visit`, two `GET /api/health`, then session/`login`/`logout` chain as in `verify-flagship-laravel-min.mjs`; base loop includes `/robots.txt`, `/humans.txt`, `/.well-known/security.txt`, `/sitemap.xml`, `/css/pilot.css`, and `/manifest.webmanifest`).
      Optional **idiomaticity** / **residual-legacy** JSON hooks for `chrysalis status`
      are documented under `flagship/laravel-min/migration-reports/README.md`.
      **Milestone 5** covers follow-on work (Composer/Breeze depth, production auth,
      larger corpora, optional sidecar metrics); `flagship/README.md` carries the dated **pilot snapshot** table for regression triage.

- [x] **Composer Laravel flagship wiring** — `flagship/laravel-full` adoption docs +
      **`pnpm run scaffold:laravel-full`** (gitignored **`flagship/chrysalis-laravel-work/`**);
      committed **`chrysalis-templates/`** + ingest test + scaffold wiring for
      **`GET /chrysalis-ping`** + **`GET /chrysalis-health.txt`** +
      **`GET /api/chrysalis-health`** + **`GET /chrysalis-jump`** +
      **`GET /chrysalis-count`** + **`GET /chrysalis-framework`** + **`GET /chrysalis-first-item`** +
      **`GET /chrysalis-last-item`** +
      **`GET /chrysalis-items`** + **`GET /chrysalis-lib-count`** +       **`GET /chrysalis-sum-ids`** +
      **`GET /chrysalis-min-id`** +
      **`GET /chrysalis-max-id`** +
      **`GET /chrysalis-avg-id`** +
      **`GET /chrysalis-id-span`** +
      **`GET /chrysalis-sum-squares`** +
      **`GET /chrysalis-even-count`** +
      **`GET /chrysalis-odd-count`** +
      **`GET /chrysalis-gt-two-count`** +
      **`GET /chrysalis-lt-three-count`** +
      **`GET /chrysalis-gte-two-count`** +
      **`GET /chrysalis-lte-three-count`** +
      **`GET /chrysalis-ne-two-count`** +
      **`GET /chrysalis-between-count`** +
      **`GET /chrysalis-eq-one-count`** +
      **`GET /chrysalis-eq-three-count`** +
      **`GET /chrysalis-eq-two-count`** +
      **`GET /chrysalis-ne-one-count`** +
      **`GET /chrysalis-ne-three-count`** +
      **`GET /chrysalis-lt-two-count`** +
      **`GET /chrysalis-session/visit`** + **`GET /chrysalis-session/me`** +
      **`POST /chrysalis-session/login`** + **`POST /chrysalis-session/logout`** +
      **`GET /chrysalis-hello`** + **`POST /chrysalis-echo`**;
      **`pnpm run verify:laravel-full`** +
      **`pnpm run status:laravel-full`** (both optional; skip when scaffold traces/reports are absent);
      CI now has a dedicated **`verify flagship (laravel-full scaffold)`** job with cache-backed
      scaffold reuse.

---

## Milestone 5 — Flagship depth

**Status: complete (D84–D160: canonical worktree, Breeze coexistence, template oracle growth + complexity ladder, laravel-min method-guard coverage expansion).** This milestone **does not reopen** the M4 v1
checklist. Acceptance patterns (zero-hole manifests where we claim parity, verify
when scripted, `chrysalis status` inputs documented) stay the same as M4 v1 unless
`DESIGN.md` Decision Log says otherwise.

**Goal:** deepen the **Composer-backed** flagship (**`chrysalis-laravel-work/`** as the canonical
full Laravel root today; **`laravel-min/`** as the parallel Laravel-shaped fast fixture until we
consolidate) toward starter-kit surfaces, richer oracle corpora, and optional release gates for
idiomaticity / residual-legacy JSON.

**Checklist:**

- [x] **Canonical Composer Laravel root:** **`flagship/chrysalis-laravel-work/`** (gitignored) is
      the default **full** Laravel tree for ingest/oracle/verify (`pnpm run scaffold:laravel-full`
      materializes or refreshes it from **`flagship/laravel-full/chrysalis-templates/`**). CI job
      **`verify flagship (laravel-full scaffold)`** runs scaffold → **`verify:laravel-full`** →
      **`status:laravel-full`** with cache-backed worktree reuse (D84).
- [x] **`laravel-min` decision (D122):** keep as the **shaped**, fast regression fixture and
      retain its dedicated oracle harness. Do **not** fold into `laravel-full`; its role is
      quick CI signal, deterministic triage, and migration sidecar continuity.
- [x] **Breeze coexistence:** **`pnpm run scaffold:laravel-full`** supports **`--with-breeze`** /
      **`CHRYSALIS_SCAFFOLD_BREEZE=1`** (alias **`pnpm run scaffold:laravel-full:breeze`**) — Composer
      requires **`laravel/breeze`**, **`php artisan breeze:install blade --no-interaction --pest`**, SQLite
      **`migrate --force`**, then **`npm ci`/`npm install`** + **`npm run build`** before Chrysalis
      template sync. CI sets the env var on **`verify flagship (laravel-full scaffold)`** so
      **`verify:laravel-full`** gates a tree where Breeze and Chrysalis routes coexist; ingest remains
      **`chrysalis.routes.json`-only** (D85). **Decision (D122):** keep Breeze first-party auth UI
      out of parity scope for now; do not onboard Breeze handler entrypoints until a dedicated milestone.
- [x] Production-shaped auth boundary (D122): rotating CSRF internals, gateways, MFA/OAuth
      remain explicitly **out of owned parity scope** for current milestones; represent via
      holes and residual-legacy reporting until a focused auth milestone is opened.
- [x] Larger oracle corpora than scripted drivers; pipeline-owned **idiomaticity** and
      **residual-legacy** JSON when those numbers should gate releases (**partial D132:** flagship
      verify emits **`flagship-laravel-full-emit-stats.json`**; **`status:laravel-full`** writes
      **`idiomaticity.json`** + **`residual-legacy.json`** from emitted-handler compat scan + hole
      density; **`laravel-min`** mirror (**`flagship-laravel-min-emit-stats.json`** +
      **`pnpm run status:laravel-min`**, D133); optional **`migration-sidecar-floors`**
      CI gate (D134, env **`CHRYSALIS_IDIOMATICITY_MIN`** / **`CHRYSALIS_RESIDUAL_LEGACY_MAX`**);
      chimera production `legacyRequestPct` remains a separate integration). **D135:** extra
      **`chrysalis-hello`** query shapes + semantic bodies in **`verify:laravel-full`** capture.
      **D136:** same idea on **`laravel-min`** for **`GET /hello`** + post-capture body assertions
      in **`verify:flagship`**. **D137/D138:** broadened `verify:flagship` post-capture semantics
      for core/session plus metadata/static contracts (`/robots.txt`, `/humans.txt`,
      `/.well-known/security.txt`, `/sitemap.xml`, `/css/pilot.css`, `/manifest.webmanifest`).
      **D139:** adds stable cross-backend verify-report parity checks (Hono/Fastify)
      in `verify:flagship` to catch emitter drift on the same corpus.
      **D140:** adds echo request-shape negatives and method guard checks in
      `verify:flagship` (`POST /echo` empty/json => 400 + body; `GET /echo` => 404).
      **D141:** pins **`GET /`**, **`/items`**, **`/count`**, **`/session/visit`**, **`/login`**
      semantics in `verify:flagship` post-capture checks (seeded DB + visit counter).
      **D142:** one extra oracle **`POST /login`** (bad CSRF) + mixed-status assertion helpers.
      **D143:** two more **`POST /login`** negatives (wrong password, empty creds) + corpus pins.
      **D144:** wrong-method **`GET /logout`** (**404**) in `verify:flagship` oracle + semantics.
      **D145:** wrong-method **`POST /session/me`** (**404**) in `verify:flagship` oracle + semantics.
      **D146:** wrong-method **`POST /session/visit`** (**404**) in `verify:flagship` oracle + semantics.
      **D147:** wrong-method **`POST /count`** (**404**) in `verify:flagship` oracle + semantics.
      **D148:** wrong-method **`POST /items`** (**404**) in `verify:flagship` oracle + semantics.
      **D149:** wrong-method **`POST /health`** (**404**) in `verify:flagship` oracle + semantics.
      **D150:** wrong-method **`POST /api/health`** (**404**) in `verify:flagship` oracle + semantics.
      **D151:** wrong-method **`POST /jump`** (**404**) in `verify:flagship` oracle + semantics.
      **D152:** wrong-method **`POST /hello`** (**404**) in `verify:flagship` oracle + semantics.
      **D153:** wrong-method **`POST /`** (**404**) in `verify:flagship` oracle + semantics.
      **D154:** wrong-method **`POST /robots.txt`** (**404**) in `verify:flagship` oracle + semantics.
      **D155:** wrong-method **`POST /humans.txt`** (**404**) in `verify:flagship` oracle + semantics.
      **D156:** wrong-method **`POST /.well-known/security.txt`** (**404**) in `verify:flagship` oracle + semantics.
      **D157:** wrong-method **`POST /sitemap.xml`** (**404**) in `verify:flagship` oracle + semantics.
      **D158:** wrong-method **`POST /css/pilot.css`** (**404**) in `verify:flagship` oracle + semantics.
      **D159:** wrong-method **`POST /manifest.webmanifest`** (**404**) in `verify:flagship` oracle + semantics.
      **D160:** wrong-method **`PUT /login`** (**404**) in `verify:flagship` oracle + semantics.
      **Incremental (D86–D115):**
      **`GET /chrysalis-min-id`** / **`GET /chrysalis-max-id`** / **`GET /chrysalis-avg-id`** / **`GET /chrysalis-id-span`**
      / **`GET /chrysalis-sum-squares`** / **`GET /chrysalis-even-count`** / **`GET /chrysalis-odd-count`**
      / **`GET /chrysalis-gt-two-count`** / **`GET /chrysalis-lt-three-count`** / **`GET /chrysalis-gte-two-count`**
      / **`GET /chrysalis-lte-three-count`** / **`GET /chrysalis-ne-two-count`** / **`GET /chrysalis-between-count`**
      / **`GET /chrysalis-eq-one-count`** / **`GET /chrysalis-eq-three-count`** / **`GET /chrysalis-eq-two-count`**
      / **`GET /chrysalis-ne-one-count`** / **`GET /chrysalis-ne-three-count`** / **`GET /chrysalis-lt-two-count`**
      / **`GET /chrysalis-gt-one-count`** / **`GET /chrysalis-gte-one-count`** / **`GET /chrysalis-lte-one-count`**
      / **`GET /chrysalis-between-one-two-count`** / **`GET /chrysalis-gt-three-count`**
      / **`GET /chrysalis-lt-one-count`** / **`GET /chrysalis-gte-three-count`**
      / **`GET /chrysalis-lte-two-count`** / **`GET /chrysalis-eq-zero-count`**
      / **`GET /chrysalis-ne-zero-count`** / **`GET /chrysalis-items-snapshot`**
      / **`GET /chrysalis-items-group-parity`** / **`GET /chrysalis-items-cte-rollup`**
      / **`GET /chrysalis-recursive-stress`**
      (`MIN`/`MAX`/`ROUND(AVG(id))`/`MAX(id)-MIN(id)`/`SUM(id*id)` + mixed
      `COUNT/MIN/MAX/SUM` snapshot aggregates, manifest + **`verify:laravel-full`**
      + deterministic count/snapshot/group/CTE/recursive routes x2 each, plus
      stress replay (`verify:laravel-full:stress`) and semantic body assertions
      on high-complexity routes in the verify harness; plus seed-variant replay
      matrix (`verify:laravel-full:seed-matrix`) for **`baseline`** / **`empty`** /
      **`ten`** seeded DB states with per-seed semantic assertions; plus
      five-nines confidence gate (`verify:laravel-full:5nines`) adding negative-path
      assertions (`GET /chrysalis-session/login` method guard + bad-login semantics),
      metamorphic cross-route invariants, and a pipeline confidence artifact
      at `reports/confidence/flagship-laravel-full.json` with per-cell numeric KPI
      thresholds enforced by `confidence-5nines`, plus rolling history gate
      (`confidence-trend`) over `reports/confidence/history/flagship-laravel-full.history.json`
      with a strict CI lane (`VERIFY_THRESHOLD=0.99999`) and auto-switch from
      warmup to strict mode once history reaches `CONFIDENCE_STREAK_REQUIRED`,
      plus request-shape robustness checks (JSON/form mismatch + method guard on
      form handlers) represented as a dedicated confidence risk cell, plus
      session idempotency checks (repeat logout stability) as another confidence
      risk cell, plus session transition monotonicity checks (`me` sequence
      `null -> flagship -> null -> flagship`) as another confidence risk cell,
      plus header contract strictness and redirect location invariants as
      dedicated confidence risk cells, plus cookie/session header invariants
      (`set-cookie` carries `chrysalis_sid=` on session transitions) as a
      dedicated confidence risk cell) plus `cross-backend-verify-parity` (Hono vs
      Fastify run-1 stable verify report match) plus trend-history parity carry-
      forward (`crossBackendParityOk` in streak entries), plus
      `matrixCrossBackendParityOk` on the parent JSON when the seed matrix runs, on
      **`chrysalis-templates/`** — **fifty-two** template routes, dual emit parity tests updated.

**Tracker:** `flagship/README.md` and `flagship/laravel-full/README.md`.

---

## Milestone 6 — Depth follow-ons

**Status: complete.** Milestone 5 is complete; this milestone captures explicit
follow-ons that were intentionally optional/deferred so they can be executed as
tracked checklist items.

**Goal:** convert deferred backlog into verify-safe, measurable deliverables
without weakening corpus replay gates.

**Checklist:**

- [x] **Composer/vendor effect depth:** extend call/effect overlay for Composer vendor
      callees (sound widening first), with fixtures + goldens + effect annotation parity.
      **D171:** `effectsReachableWithCallOverlay` matches FQN callees to short
      `FunctionDecl` overlay keys via unqualified-tail merge; ingest fixture + webir
      tests; Vitest aliases `@chrysalis/webir` to `src/` (stale `dist/` was masking
      ingest↔webir integration). Class methods / PSR-4 symbol maps remain follow-ons.
      **D172:** glayzzle provider flattens `namespace` blocks, qualifies top-level
      `FunctionDecl` names, maps `usegroup` to `Noop`, bumps parser `SCHEMA_VERSION`
      to `0.1.2`; narrows vendor overlay vs FQN calls when declarations live in a
      namespace. Braced-only / class / const declarations in namespaces remain partial.
      **D173:** ingest `convertCall` lowers `Class::method()` (parser `callee` as
      `StaticFetch`) to `data.call` for overlay hooks; class method bodies in the
      call-effect map are still not collected (parser `class` remains `Unknown`).
      **D174:** glayzzle now flattens top-level static class methods into synthetic
      `FunctionDecl` entries (`Ns\Class::method`), so vendor class helpers
      participate in call-overlay fixpointing.
      **D181:** `buildCallEffectMap` now reads vendor package `composer.json`
      autoload metadata (`autoload.files`, `autoload.psr-4`) in addition to
      recursive `vendor/**/*.php` fallback; adds regression fixture proving
      non-`.php` autoloaded helpers (e.g. `.inc`) participate in overlay effects.
- [x] **Effect narrowing follow-up:** add confidence-preserving narrowing where
      over-approximation is currently too coarse, without reducing safety; include
      regression fixtures proving no missed side effects.
      **D168:** deepens `call_user_func*` narrowing with callable-name normalization
      (leading `\`) plus safe fallback widening for unknown literal callees;
      regression tests cover narrowed + fallback paths.
      **D175:** narrows `call_user_func*` when callable is an array literal
      lowered as `__array_literal` + string literals (e.g. `["Ns\\Class","run"]`
      → `Ns\\Class::run`) before overlay match; unknown/dynamic arrays keep full
      widening fallback.
      **D182:** narrows `call_user_func*` for explicit callable choice nodes
      (`__ternary`, `??`) by unioning effects of resolved branches only; keeps
      full widening fallback when any branch is unresolved or unmapped.
- [x] **Oracle breadth (`mysqli` path):** add first-class `mysqli` capture/replay
      support to complement PDO, with schema/tests and corpus summary integration.
      **D165:** ships `Chrysalis\Oracle\Db\MySQLi` `query()`-path SQL capture
      (driver/sql/duration/rowCount/shape) + bootstrap/README wiring.
      **D169:** adds `MySQLiStatement` (`prepare` / `execute` / `get_result` /
      `store_result`), buffered `query()` rows for store-result selects, and
      consistent `driver: "mysqli"`; `MYSQLI_USE_RESULT` / non-mysqlnd gaps remain
      follow-ons if needed.
      **D170:** prepared-statement `sql.query.params` from `execute([...])` or
      `bind_param()` snapshot (indirect `bind_param` via `call_user_func_array`
      not captured).
      **D177:** `MySQLiStatement::get_result()` on mysqlnd-less runtimes keeps
      pending SELECT capture alive so `store_result()` can still emit `sql.query`
      instead of dropping the event.
      **D180:** `MySQLi::query()` `MYSQLI_USE_RESULT` path now treats row count as
      unknown-at-capture (`rowCount: 0`) without consulting `num_rows`, avoiding
      premature/unreliable row-count reads on unbuffered cursors.
- [x] **Session infra production track:** define and ship shared-store session
      bridge option (Redis or equivalent) for chimera/cutover readiness; keep
      deterministic verify behavior.
      **D176:** emitted Hono/Fastify runtimes add shared SQLite session backend
      (`CHRYSALIS_SESSION_SQLITE_PATH`, table `chrysalis_sessions`) with existing
      memory/file fallback, preserving deterministic verify defaults.
      **D178:** emitted Hono/Fastify runtimes add Redis backend
      (`CHRYSALIS_SESSION_REDIS_URL`, keys `chrysalis:sess:*`) with sqlite/file/memory
      fallback order preserved; deterministic verify defaults unchanged unless
      explicitly configured.
      **D179:** adds `ci-gates` command `session-bridge-release` and repo script
      `pnpm run release-gate:session-bridge`, formalizing release policy:
      strict mode requires explicit backend selection, multi-host deploys require
      Redis + URL, and memory mode is blocked unless explicitly overridden.
- [x] **Migration sidecar release policy:** formalize when idiomaticity/residual
      sidecars become required release gates (including threshold policy + CI lane).
      **D166:** adds `ci-gates` command `migration-sidecar-floors-release`
      (defaults: idiomaticity >= `0.01`, residual legacy <= `50`) and repo script
      `pnpm run release-gate:migration-sidecars`; flagship CI lanes now use the
      release-gate command instead of ad-hoc env wiring.
- [x] **Auth boundary milestone carve-out:** open dedicated scope for production auth
      internals currently out of owned parity scope (rotating CSRF internals,
      gateways, MFA/OAuth), with explicit hole policy and success metrics.
      **D167:** adds a dedicated scoped auth track definition below so this work
      no longer lives as an implicit deferred note.

**Tracker (planned):** `flagship/README.md`, `flagship/laravel-full/README.md`,
and this roadmap section.

---

## Milestone 6A — Auth boundary

**Status: widened charter (D189).** Flagship **laravel-min** + **laravel-full** pilots remain the
baseline oracle + dual-backend gates (D188). The milestone **now owns** the Laravel-first-party
auth/adoption slice end-to-end **subject to DESIGN §3 oracle validation** — not merely procedural
login stubs.

**Scope (owned — D189):**
- Session-bound identity flows plus **POST negatives** (CSRF/credentials/password), logout,
  session-bound **`me`/identity reads** — gated today via **`milestone-6a-auth-verify-gate.mjs`**
- **`Gate` / policies / `Authorization`** call sites — WebIR lowering where feasible;
  otherwise **`auth:`** holes / **`auth:` unresolved emits** until oracle-backed fixtures land
- **Sanctum / Passport / PAT / token guards** — explicit **`auth:`** tagging + residual metrics;
  parity claims require traces, not source-only stubs
- **Fortify / Breeze / Socialite / OAuth2-shaped surfaces** — inherit the same hole-first policy;
  widening commits Chrysalis to **tracking + fixtures + metrics**, not silent vendor emulation
- Rotating **CSRF/session token lifecycle** semantics where captured by oracle replay

**Scope (explicit exclusions — unchanged principles):**
- Handler output **without** oracle-backed verification for emitted TS (DESIGN §3)
- MFA/device cryptographic ceremonies **without** a reproducible corpus — emit **`auth:`** holes
- Proprietary stacks **until** the operator attaches an **`observe`-compatible NDJSON corpus**
  (same rule as other Chimera adoption tracks)

**Hole policy:** unsupported constructs remain **`auth:`-labeled holes** (ingest + emit) and appear in
residual sidecars; **no** silent best-effort translation that bypasses WebIR or weakens dual-stack honesty.

**Success metrics (owned slice — flagship pilots):**
- [x] representative oracle corpus includes auth boundary positive + negative traces
      (**laravel-min**: CSRF/password/credential negatives + login/logout/session/me;
      **laravel-full scaffold**: session login/me/logout Chrysalis routes — captured before ingest)
- [x] verify replay keeps correctness gate for auth routes at target threshold (aggregate gate plus
      explicit **auth-route subset gate** at `VERIFY_THRESHOLD` — D188)
- [x] residual-legacy report exposes paired emit + ingest auth-hole counts (`authEmitHoleMax`,
      `authIngestHoleMax`) for closure trending — D188
- [x] flagship README + DESIGN decision log state parity scope vs backlog (D188)

**Checklist (incremental):**
- [x] **Auth-tagged emit holes + migration sidecar (D183):** unresolved `data.call`
  sites whose callee matches auth-boundary heuristics (e.g. `Gate::…`, `auth`,
  CSRF/Sanctum/Passport tokens) emit `auth:unresolved call: …` reasons; flagship
  emit-stats add per-emitter `authHoles`; `residual-legacy.json` adds
  `authLegacyRequestPct` + `authEmitHoleMax` for trend tracking.
- [x] **Status dashboard auth metrics (D184):** `chrysalis status` (human + `--json`)
  reads optional 6A fields from `residual-legacy.json` into `migration`
  (`authResidualLegacyRequestPct`, `authEmitHoleMax`) and prints the auth line next
  to legacy-req density.
- [x] **Ingest IR `auth:` hole reasons (D185):** `isAuthBoundaryCallee` and
  `authTaggedHoleReason` live in `@chrysalis/webir`; every ingest `data.hole` reason
  passes through `authTaggedHoleReason` so static unknowns that mention
  auth-boundary symbols (e.g. `facades\Gate`, CSRF) are tagged consistently with
  emit-time auth holes; `@chrysalis/emit-shared` re-exports the helper from webir.
- [x] **Ingest `auth:` e2e + static detail (D186):** glayzzle static `Unknown` detail
  lists bound names; `fixtures/auth-tag-probe` + `auth-tagging-integration.test.ts`
  assert a `data.hole` with an `auth:`-prefixed reason for a `static $csrfToken` site.
- [x] **Ingest auth hole count in status/ingest (D187):** `countAuthTaggedHoles` in
  `@chrysalis/webir`; `chrysalis status --json` → `migration.coverage.authHoles`
  and human line; `chrysalis ingest` parenthetical when count is non-zero.
- [x] **Flagship auth-route verify gate + ingest residual snapshot (D188):**
  `scripts/milestone-6a-auth-verify-gate.mjs`; laravel-min + laravel-full verify scripts
  enforce threshold on auth oracle slice; emit-stats carries `ingest.{holes,authHoles}`;
  `residual-legacy.json` adds `authIngestHoleMax`; `chrysalis status` surfaces
  `migration.authIngestHoleMax`.
- [x] **Widened heuristic labeling (D189 foundation):** `@chrysalis/webir` `isAuthBoundaryCallee`
  includes Socialite/Fortify/OAuth-shaped callee token substrings (ingest + emit tagging).
- [x] **Gate/policy oracle probes (D190):** `GET /gate-probe` on **`flagship/laravel-min`**
  (stub `Illuminate\Support\Facades\Gate` in `lib/gate_facade_stub.php`); verify + M6A auth slice
  assert `allow:1` / `deny:1` bodies.
- [x] **OAuth/Sanctum scaffold probes (D190):** **`GET /chrysalis-auth-probe`** on
      **`chrysalis-templates`** (stubs `Laravel\Sanctum\NewAccessToken` + `League\OAuth2\Client\GenericProvider`);
      `verify-flagship-laravel-full` captures + pins JSON; M6A auth route list includes the path.
- [x] **`json_encode` + associative array lowering (D191):** single-arg `json_encode` lowers to
      `data.call` → emit `JSON.stringify`; PHP arrays whose items **all** use string literal keys lower to
      `__object_literal` (computed-key object TS); mixed keys → ingest hole. Auth-probe handler uses
      idiomatic `json_encode([...])` again.
- [x] **Socialite / Fortify oracle probe (D192):** **`GET /chrysalis-socialite-fortify-probe`** on
      **`chrysalis-templates`** with stubs **`Laravel\Socialite\Facades\Socialite::probe`** and
      **`Laravel\Fortify\Fortify::probe`**; ingest lowers both to string literals; verify pins JSON;
      M6A auth route list includes the path.

---

## Cross-cutting, never-done work

- **PHP surface vs glayzzle.** Parser coverage grows incrementally (D193 `throw` + `new`,
  D194 FQN `new`, D195 `provider: "nikic"` with **`nikic-json.ts`** parity, D196 ingest/CLI
  **`--parser-provider`** wiring across project-level workflows, D197 FQN ctor registry hook,
  D198 dynamic `new $x(...)` as `__new_dynamic` + runtime bridge, D199/D199b status visibility for
  dynamic constructor KPIs (`dynamicNewWebIrCount` + ingest hole reasons), D200 corpus-gated `parameterize-sql`,
  D201 corpus-gated `sanitize-output` + oracle footprint `dynamicNewCount` / `routesWithDynamicNew`).
- **Rewrite confidence.** `batch-n1-read` now handles assign-wrapped and bare inner reads and
  enforces corpus-backed gating (D197). Remaining rewrite depth should keep this confidence-first model.
- **Docs.** Every package `README.md` must stay current with its code.
  Drift is a bug.
- **Telemetry-free.** The tool does not phone home. Users can opt in to
  anonymous metrics later if we want a metrics story; opt-in only.
- **Security.** The oracle records production traffic. Secrets redaction in
  the trace corpus is a launch blocker, not a nice-to-have. **D202** widened
  `DEFAULT_REDACTION` (Node + PHP prelude lockstep); operators still customize
  via `chrysalis.observe.json`, merged onto defaults (**D208**) so partial files cannot drop baseline rules;
  **D209** validates file shape and surfaces parse errors in **`chrysalis observe`** (exit **2**).
  **D210:** strip UTF-8 BOM before parse; CI pins **`composer:v2`** for **`pretest`** vendor install.
  **D203:** `sql.row.*` rules redact sensitive
  **column values** inside captured SELECT **`rows`**. **D205:** targeted
  **`sql.params[<driver>:<sqlPrefix>].<index>`** bind redaction is implemented in
  **`oracle-php`** `Redactor.php` (grammar in `packages/oracle/src/redaction.ts`);
  DEFAULT stays conservative; operators add explicit bind rules where replay safety allows.
- **Performance.** Verification must be parallelizable across traces.
  **`replayCorpus`** now supports **`concurrency` > 1** when **`disableCookieChain: true`**
  (D202); cookie-chained corpora stay sequential by default. **D204:** **`chrysalis verify` /
  `repair`** expose the same knobs (flags + `CHRYSALIS_VERIFY_*` env); repo
  **`scripts/verify-tiny-blog.mjs`** and **`scripts/verify-flagship-laravel-*.mjs`** call
  **`resolveVerifyReplayExtras({})`** from **`@chrysalis/verify`** so harnesses honor the same env without duplicating parsing.
  **D206:** optional **`worker_threads`** replay when **`CHRYSALIS_VERIFY_WORKER_THREADS=1`** (and compatible knobs);
  **`sql.params`** defaults stay **mutation-only** so SELECT tape params stay stable. **D207:** worker entry
  **`replay-worker.js`** path fallback so **`src/replay.ts`** (Vitest) finds **`dist/replay-worker.js`**
  after a package build; regression tests for worker vs async pool and invalid combinations.

---

## Multi-lane program (parser, oracle, verify, holes)

**Status:** active (DESIGN **D211**, 2026-04). We are intentionally running **four tracks** in parallel —
not one mega-PR. Each wave ships a **thin vertical slice** (tests + docs + optional CLI/CI touch) so
`main` stays mergeable.

| Lane | North star | Depends on | First thin slices (examples) |
| ---- | ---------- | ---------- | ---------------------------- |
| **A — Parser contract** | Same repo, same CI: glayzzle default, **nikic** opt-in with **honest** skips when `vendor/` or `php` is missing; parity tests stay the oracle for shape drift. **`pretest`** installs **`vendor/`** via **`composer`** or **`scripts/parser-bridge-composer-install.mjs`** (**D270**) when **`php`** + network are available without global Composer. | `packages/parser-bridge`, Vitest, Composer pretest | **D213**–**D225:** CI nikic step; **nikic** strip-pos on **`fixtures/mysqli-probe`**, **`db-query-unknown-receiver-probe`**, **`fixtures/laravel-shaped-db-factory-probe`**, **`fixtures/parser-parity-probe`**. Next: widen contested-syntax pages as mapper gaps appear. |
| **B — Oracle depth** | Traces remain the spec: wider real stacks (**mysqli**, vendor autoload, edge drivers) **without** breaking redaction rules or SQL tape semantics. | oracle-php prelude, `Redactor.php` lockstep with `redaction.ts` | **D214**–**D225:** **`mysqli-probe`** + **`laravel-shaped-db-factory-probe`** (FQN **`Illuminate\...\DB::connection`**, **`App\...\Conn::make`**, **`Repo::db`**); **`D218`** negative (**`SQLite3`**). Next: optional body-proven widening (strict) or copy manifest lines into **`flagship/`** pilots when needed. |
| **C — Verify UX** | Operators can **act** on failure: which trace, which route, which divergence class, what to run next. | `replayCorpus`, report JSON, CLI | **D212**–**D223:** **`chrysalis verify --json-summary`** (machine **stdout**); **`schemaVersion`** + **`toolVersion`**; stderr failure diagnostics + per-trace divergences in human mode; **repair** pointers. **`migration-debt --json-out`** uses the same versioning pattern (**D226**, Lane **D**). **D228**–**D230:** dual-backend verify summary JSON in CI + **`ci-gates.mjs verify-dual-summary`** + **`pnpm run ci:verify-dual-summary`**. **D231:** **`readJsonGateArtifact`** for consistent JSON gate errors. |
| **D — Hole economics** | One place answers “where is debt?” — ingest vs emit vs auth vs dynamic **`new`**, trendable across commits. | `chrysalis status --json`, sidecars, `oracleFootprint` | **D213**–**D226:** **`migration-debt`** + **`--json-out`** (**`kind`**, **`schemaVersion`**, **`toolVersion`** — **D226**); CI **`migration-debt-json`** artifact; **`--max-holes`** / **`--min-correctness`** exit **4** gates. CI: **`typecheck-and-test`** enforces **`--max-holes`** on **tiny-blog**, **mysqli-probe**, **`db-query-unknown-receiver-probe`**, and **`laravel-shaped-db-factory-probe`**; **`verify-e2e`** enforces **`--max-holes 0`** + **`--min-correctness 1`** on **tiny-blog** after verify. Next: more fixtures if debt surfaces. |

**Sequencing rules**

1. **Oracle and redaction** win over convenience: no capture shortcut that breaks verify or leaks secrets.
2. **Parser parity** before widening ingest on contested syntax (nikic/glayzzle disagree → fix mapper or document hole).
3. **Verify UX** may land early; it mostly consumes existing reports.
4. **Hole economics** composes existing artifacts first; new fields need provenance in `DESIGN.md`.

**Wave 0 (done / in flight):** observe merge + validation (**D208–D210**), replay worker resolution (**D207**), parser-bridge nikic subprocess + pretest vendor, sql row/params redaction smoke in CI.

**Wave 1 (closed 2026-04-28):** **D213–D215** shipped verify narrowing, nikic CI honesty, **`migration-debt`** (+ **`--json-out`**), mysqli oracle CI smoke, **`fixtures/mysqli-probe`**, verify replay env consolidation, and parser parity on the mysqli route page.

**Wave 2 (closed 2026-04-28):** **D216** + **D217** ship **`db()->query`** and **`$db = db(); $db->query`** ingest lowering + mysqli-probe routes, **nikic** parity on route pages + **`lib/db.php`**, **`migration-debt`** JSON **CI artifact**, **`--max-holes` / `--min-correctness`** gates, **verify** stdout/stderr split for divergences, and **repair** stderr replay hints. Remaining “Next” bullets in the lane table above stay backlog (not Wave 2).

**Wave 3 (closed 2026-04-28):** **D221** adds **`new PDO`** **`->query`** tracking, **`fixtures/parser-parity-probe`** + expanded **nikic** surface, and **verify** stderr diagnostics (histogram + next steps off stdout).

**Wave 4 (closed 2026-04-28):** **D222**–**D226** — **`verify --json-summary`**; **`migration-debt --json-out`** versioned JSON (**D226**); ingest gates + **`dbFactoryReturnCallees`** (**D224**–**D225**). Next wave: deeper oracle stacks / contested-syntax parser pages as gaps appear / optional factory body proof (strict).

**Wave 5 (2026-04-29):** **D228**–**D231** — machine-readable **`chrysalis.verify.summary.dual`** artifacts for tiny-blog + flagship verify jobs; CI **`verify-dual-summary`** gate + profile env; flagship summary row parity with contract fields; **`readJsonGateArtifact`** extended to **`tiny-n1-rewrite`**, **`migration-sidecar-floors`**, and **`status-migration`** stdin (**`JSON.parse`** errors); root **`pnpm run ci:*`** shims for common **`ci-gates`** entrypoints; **`ci-gates-json-artifacts.test.ts`** covers migration sidecar missing/invalid/skip, **`confidence-trend`** warmup, **`tiny-n1-rewrite`** missing report, and invalid JSON across gates; **`README.md`**, **`AGENTS.md`**, **`packages/cli/README.md`** document **`ci:insight`** vs gate-only **`ci:tiny-n1-insight`**; committed **`.cursor/rules/chrysalis.mdc`** with local **`.cursor/*`** ignored elsewhere.

**Wave 6 (2026-05-20):** **Lane A** — parser parity probes + **`wptp:d7-audit`**; flagship PDO oracle route (**D309**, **53** template routes), empty-seed + Hono **`__respond`** + CLI stress status; ingest **psr-4** vendor effects test; WPTP **echo-api** silver Next.js + Hono edges (**24** matrix rows); semver **2.0.2** (**`CHANGELOG.md`**).

### Commercial program (documentation + optional CLI gate)

**Status:** In-tree scaffolding on **`main`** (**DESIGN D289**). **`chrysalis init`** is **not** license-gated so vendor trees can be marked before keys are distributed (**D290**). **Not yet published** as a public commercial launch (no announced SKUs, pricing, or standalone **`@chrysalis/license`** npm product). **Purpose:** capture **revenue ordering** (services → support → licensed distribution → training → reference examples) in **`docs/COMMERCIAL.md`**, and ship **`@chrysalis/license`** + **`chrysalis license`** + **`CHRYSALIS_REQUIRE_LICENSE`** / **`CHRYSALIS_LICENSE_MIN_TIER`** for **future vendor** distributions. **Non-goals in-tree:** payment processors, activation servers, or metering.

---

## Road to Chrysalis 2.0 — scale-out + warehouse-sized codebases

**North star:** Any team can run Chrysalis on **very large PHP estates** and **multi-node fleets**—capture, translate, verify, and operate dual-stack—without changing the thesis: **the running app remains the spec**, **WebIR stays the asset**, **verify stays the gate**, **holes stay honest**, **time/RNG/I/O stay injected** for replay.

**Explicit non-goals (same as `DESIGN.md` §3):** Skipping oracle-backed verification for speed; emitting TypeScript that bypasses WebIR; silent “best effort” for unsupported constructs; adding request-scoped PHP↔TS FFI beyond the existing chimera request unit.

This section is the **program roadmap to `v2.0.0`**. Milestones here are **numbered V2-M1…** so they do not collide with closed v1 milestones 0–6A. Work can interleave with the **Multi-lane program** above; sequencing rules below resolve conflicts.

### Dimensions of scale (all must remain measurable)

| Dimension | v1 reality | v2 target |
| --- | --- | --- |
| **Code volume** | Whole-tree ingest in one CLI invocation | **Resumable / incremental ingest** with content-addressed caches, bounded memory, documented sharding across subtrees |
| **Trace volume** | NDJSON per request; operator-managed disks | **Tiered corpora** (rotation, compression, optional object-store layout), **multi-host capture** with merge semantics and namespace rules |
| **Verify throughput** | Concurrency + optional `worker_threads` (D202–D207) | **Partitioned replay** (trace shards), **merged machine reports**, optional **worker fleet** protocol that preserves per-trace semantics |
| **Emit output size** | Monolithic generated app for pilots | **Chunked / multi-package emit layouts** where backends allow, keeping provenance on every surface |
| **Runtime / chimera** | Single proxy + Redis session option (M6) | **Coordinated multi-instance chimera** (routing tables, sticky shadow/canary), **%-traffic canary**, multi-AZ cutover **runbooks** |

### Milestone V2-M1 — Partitioned verify (provably equivalent sharding)

**Goal:** Operators can split a corpus into **K shards**, replay in parallel on separate machines or processes, and **merge** results into one report that matches **single-process** replay on a golden fixture (within existing diff semantics).

- [x] **Contract:** **`chrysalis.verify.summary.merged`** with **`schemaVersion: 1`** documents shard inputs, per-shard paths, and merged **`CorrectnessReport`**; **`toolVersion`** matches **`verify --json-summary`** discipline (**`buildMergedVerifySummaryJson`** in **`@chrysalis/verify`**).
- [x] **CLI / library:** **`chrysalis verify --shard-index i --shard-count K`** (and **`CHRYSALIS_VERIFY_SHARD_*`** env) filters traces deterministically; **`chrysalis verify-merge`** combines **`summary.json`** shards; **`mergeCorrectnessReports`** in **`@chrysalis/verify`**.
- [x] **Proof:** Vitest **`packages/verify/tests/replay.test.ts`** (partition + merge vs monolithic aggregate) and **`merge-partition.test.ts`**.
- [x] **Docs:** **`packages/verify/README.md`** + **`docs/OPERATIONS.md`** (partitioned verify + **`verify-merge`**).

**Done when:** CI runs at least one **partitioned + merged** verify path on a committed fixture and gates the merged JSON with **`ci-gates`**. **Closed:** **`verify-merged-summary`** gate + **`verify-tiny-blog.mjs`** **`reports/ci/verify-e2e-merged-summary.json`** + fixture **`fixtures/ci/verify-merged-summary-smoke.json`** in **`typecheck-and-test`**.

### Milestone V2-M2 — Resumable ingest + shard boundaries

**Goal:** Ingest **does not require** a single long-lived process that holds the entire IR in RAM; teams can define **shard roots** (e.g. service, bounded context, repo subtree) and resume after failure.

- [x] **Route-level ingest sharding (v1):** **`ingestDirectory`** **`shardIndex` / `shardCount`** filters manifest routes by **`routeFileShardBucket(file)`**; **`buildCallEffectMap`** keeps the **full** route list for sound lib widening. **`chrysalis ingest` / `emit`** **`--shard-*`**. Vitest **`packages/ingest/tests/route-shard-ingest.test.ts`**.
- [x] **Incremental cache (v1, opt-in):** **`ingestDirectory`** **`ingestCacheDir`** + **`loadOrParsePhpAstWithCache`** (SHA-256 of file bytes + parser provider + **`INGEST_AST_CACHE_VERSION`**); **`chrysalis ingest` / `emit`** **`--ingest-cache <dir>`**. Vitest **`packages/ingest/tests/parse-cache.test.ts`**.
- [x] **Merge model (v1 + cross-shard dedupe):** **`mergeWebIrModules`** in **`@chrysalis/webir`** remaps node ids and unions disjoint shard roots; duplicate **`METHOD path`** on route roots throws. **Structural dedupe** ( **`merge-dedupe-key.ts`**, **DESIGN D247** ) reuses one **`NodeId`** per structural key so shared **`lib/`** IR across shards is not duplicated. **`chrysalis ingest` / `emit` / `status`** accept **`--merge-all-shards --shard-count K`** to run **`ingestDirectory`** for each shard **`i`** and merge (Vitest: **`packages/webir/tests/merge-modules.test.ts`**, **`packages/webir/tests/merge-dedupe-key.test.ts`**, **`packages/ingest/tests/merge-webir-modules.test.ts`**, CLI **`merge-all-shards-ingest-cli.test.ts`**, **`merge-all-shards-emit-cli.test.ts`**, **`route-shard-status-cli.test.ts`**). **Note:** monolithic ingest may still **over-count** **`nodes.size`** (per-route passes); merged graphs can be **smaller** — optional future: within-module dedupe when ingesting all routes in one builder.
- [x] **Synthetic many-route ingest (v0, CI-sized):** Vitest **`packages/ingest/tests/many-routes-synthetic-ingest.test.ts`** builds a temp **12-route** manifest + trivial PHP pages; asserts full ingest and **K=4** shard partition counts (documents a stress **size class**). Optional **wall-clock** ceiling when **`CHRYSALIS_INGEST_BUDGET_MS`** is set (**DESIGN D254**) and optional **RSS** ceiling when **`CHRYSALIS_INGEST_RSS_MAX_BYTES`** is set (**DESIGN D255**; **docs/OPERATIONS.md** + **DESIGN D276**).
- [x] **Ingest progress JSON (diagnostic, v0):** **`chrysalis.ingest.progress`** **`schemaVersion` 0** written when **`--ingest-progress-file <path>`** is set on **`ingest` / `emit` / `verify --project` / `repair` / `insight` / `status --project`**; **`IngestOptions.ingestProgressFile`** in **`@chrysalis/ingest`**. Vitest **`ingest-progress-file.test.ts`** + CLI **`ingest-progress-file-cli.test.ts`**. **DESIGN D277** (forensics only; incompatible with **`--merge-all-shards`**). **`verify`** requires **`--project`** when the flag is set (**D280**).
- [x] **Hole policy unchanged:** new scale paths must not introduce silent translation; **AST cache** rejects invalid entries and **re-parses** (**`parse-cache.test.ts`**, **DESIGN D248**).

**Done when:** documented **N-file** ingest completes with **resume** after simulated crash; `status --json` reflects merged shard stats.

**Progress (2026-04-30):** **Parser-level resume / reuse** is covered by **`parse-cache`** Vitest (AST JSON keyed by bytes + parser + cache version; **corrupt entry** re-parse test). **Many-route shard math** is covered by the synthetic ingest test. **WebIR merge** + **`--merge-all-shards`** on **`ingest` / `emit` / `status`** shipped (**D246–D247**). **`status --json`** includes **`ingestSharding`** (**D248**). **Emit-side crash resume (v1):** **`emit-hono` / `emit-fastify`** **`emitResume`**, **`.chrysalis-emit-state.json`**, CLI **`chrysalis emit --emit-resume`** (**DESIGN D254**). **Ingest operator runbook (v1, D275):** **`docs/OPERATIONS.md`** — *Ingest scale and resume (V2-M2 runbook)* (**`--ingest-cache`**, sharding, merge, contrast with **`emit --emit-resume`**). **Synthetic CI guards (D255, D276):** optional **`CHRYSALIS_INGEST_BUDGET_MS`** / **`CHRYSALIS_INGEST_RSS_MAX_BYTES`** on the **12-route** stress test. **Ingest progress JSON (diagnostic, D277):** CLI **`--ingest-progress-file`** writes **`chrysalis.ingest.progress`** per completed route (does not skip ingest). **`verify --project`**, **`repair`**, **`insight`** (**D280**). **Full ingest checkpoint (D294):** partial WebIR persistence + **`--ingest-resume-checkpoint`** (**`@chrysalis/webir`** **`module-checkpoint`**, **`@chrysalis/ingest`** **`ingest-checkpoint`**); incompatible with **`--merge-all-shards`**; Vitest **`packages/ingest/tests/ingest-checkpoint-resume.test.ts`**, CLI **`ingest-progress-file-cli.test.ts`** (merge rejection).

### Milestone V2-M3 — Multi-host oracle + corpus operations

**Goal:** Multiple **observe** agents (different hosts, envs, or canary cells) contribute traces into a **single operator workflow** without corrupting the spec story.

- [x] **Corpus layout (operator doc v1):** **`docs/ADMINISTRATION.md`** — multi-host trace directory conventions and merge discipline (path merge via **`corpus-merge`**; content dedupe/sampling still manual / future).
- [x] **Corpus tree merge (v1):** **`mergeCorpusDirectories`** + **`chrysalis corpus-merge`** copy **`YYYY-MM-DD/*.ndjson`** into one **`--out`** root; **`--on-duplicate error|skip`**, optional **`--dedupe-trace-id skip`** (header traceId winner by source order), deterministic sampling **`--sample-modulo K --sample-remainder R`** (traceId hash buckets), **`--dry-run`**, and **`--json-out`** machine summary (**`chrysalis.corpus-merge.summary`**). Vitest **`packages/oracle/tests/merge-corpus.test.ts`** + CLI tests; CI gate **`corpus-merge-summary`** on **`fixtures/ci/corpus-merge-summary-smoke.json`** (**`pnpm run ci:corpus-merge-summary`**).
- [x] **Multi-host merge → verify (v1, tiny-blog):** **`scripts/verify-tiny-blog.mjs`** splits captured NDJSON across **`reports/ci/traces-host-a`** and **`reports/ci/traces-host-b`**, merges into **`reports/ci/traces-merged-multi-host`**, asserts trace-count parity with the monolithic capture, and replays the merged corpus against **Hono** at **`VERIFY_THRESHOLD`** (same WebIR module as monolithic replays; **pristine `blog.sqlite` copy** for merged replay so DB state matches a fresh verify).
- [x] **Retention / sizing (operator doc v0 + script):** **`docs/ADMINISTRATION.md`** — **Corpus volume and retention (v0)** (rotation, compression, sizing heuristics); reference **`scripts/corpus-rotate-archive.mjs`** + **`pnpm run corpus:rotate-archive`** for moving old **`YYYY-MM-DD/`** buckets to an archive root.
- [x] **Ops docs:** multi-host capture discipline lives under **Multi-host trace corpora** + **Corpus volume and retention** in **`docs/ADMINISTRATION.md`**.

**Done when:** two synthetic “hosts” produce traces, merge runs, and **verify** passes against merged corpus on a fixture sized for CI. **Closed:** **`verify-tiny-blog.mjs`** path above (runs in **`verify-e2e`** when PHP is available).

### Milestone V2-M4 — Emit layout + build scalability

**Goal:** Generated TypeScript stays **auditable** but **fits** large teams’ build systems (incremental `tsc`, optional package boundaries).

- [x] **Emit strategy flags (v1):** **`emitStrategy.routeRegistration`** **`eager`** (default) vs **`lazy`** (dynamic **`import()`** per route in **`server.ts`**); CLI **`--emit-route-registration`**. **`provenanceRoot`** + **`@chrysalis-provenance`** on handler files (**`formatEmitProvenanceDisplay`**). **Handler import barrel (v0, D256):** **`emitStrategy.handlerImportBarrel`** + **`src/chrysalis-handler-imports.ts`**; CLI **`--emit-handler-import-barrel`**. **Route path constants (D258):** **`emitStrategy.emitRoutePathConstants`** + **`src/chrysalis-route-paths.ts`** (**`buildChrysalisRoutePathsModuleSource`**); CLI **`--emit-route-path-constants`**. **Per-handler fingerprints (D259):** **`emitStrategy.emitHandlerFingerprints`** → **`chrysalis.emit-handler-fingerprints.json`** (**`buildEmitHandlerFingerprintsJson`**); CLI **`--emit-handler-fingerprints`**. **Runtime import facade v0 (D272):** **`emitStrategy.runtimeFacadeModule`** + **`src/chrysalis-runtime-facade.ts`** (**`buildChrysalisRuntimeFacadeModuleSource`**); CLI **`--emit-runtime-facade`**. **Shared runtime imports (D281):** **`emitStrategy.emitSharedRuntimeImports`** + **`src/chrysalis-runtime-imports.ts`** (**`buildChrysalisRuntimeSharedImportsModuleSource`**); CLI **`--emit-shared-runtime-imports`** (not with **`--emit-handler-import-barrel`**). **Identical lowered-body dedupe v0 (D282):** **`emitStrategy.emitDedupeIdenticalHandlerBodies`** + **`src/chrysalis-deduped/chrysalisBodyDedupe_*.ts`** (**`computeEmittedHandlerDedupeKey`**, **`chrysalisBodyDedupeExportId`** in **`@chrysalis/emit-shared`**); CLI **`--emit-dedupe-identical-handler-bodies`**; per-route handlers delegate; WebIR unchanged. Vitest **`packages/cli/tests/emit-dedupe-identical-handler-bodies-cli.test.ts`** (**`fixtures/dedupe-identical-handlers/`** subprocess **`emit`**, incl. **`--emit-route-path-constants`** + **`--emit-shared-runtime-imports`**); **`emit-hono`** / **`emit-fastify`** **`emit.test.ts`** cover **`handlerImportBarrel`** + **`routeRegistration.lazy`**, **`emitRoutePathConstants`**, **`runtimeFacadeModule`**, **`emitHandlerFingerprints`**, and **`emitSharedRuntimeImports`** with dedupe; **`ingest`** **`packages/ingest/tests/tiny-blog.test.ts`** loads **`fixtures/dedupe-identical-handlers/`**. **Doc slice (D278):** **`packages/emit-shared/README.md`** states what **is** shipped for V2-M4 layout vs deeper body work. **Within-module IR dedupe (D283):** **`dedupeStructuralSubgraphsInModule`**, CLI **`--ingest-dedupe-structural-subgraphs`** (same structural key as cross-shard **D247**); optional **`--ingest-dedupe-structural-subgraphs-ignore-origin`** (**`mergeDedupeStructuralKeyIgnoringOrigin`**, **DESIGN D294**); Vitest **`packages/ingest/tests/merge-webir-modules.test.ts`** (**`tiny-blog`** monolithic dedupe **`nodes.size`** = **`mergeWebIrModules`** over **K=2** shards) + **`packages/cli/tests/ingest-dedupe-structural-subgraphs-cli.test.ts`** + **`packages/webir/tests/merge-dedupe-key.test.ts`**. **Remaining:** **helper lifting** when IR differs beyond **origin-insensitive** structural equality (non-identical shapes / logic) stays backlog; further split/merge policies.
- [x] **Emit stats layout (v1):** **`summarizeEmittedTypeScriptLayout`** (**`@chrysalis/emit-shared`**) → **`hono.layout`** / **`fastify.layout`** in **`flagship-laravel-min`** / **`full`** **`emit-stats.json`** (**`tsFileCount`**, **`tsLineCount`**, **`largestFileRelativePath`**, **`largestFileLineCount`**). Vitest **`packages/emit-shared/tests/emitted-ts-layout.test.ts`**. Optional **CI ceiling gate** on layout numbers: **`emit-layout-floors`** + **`CHRYSALIS_EMIT_LAYOUT_MAX_*`** (**DESIGN D251**); default skip when unset.

**Done when:** flagship or a new **large-layout** fixture proves **multi-file emit** at a configured threshold without losing verify parity on a pinned corpus subset.

### Milestone V2-M5 — Multi-instance chimera + traffic-shaped rollout

**Goal:** **More than one** chimera/proxy instance can share consistent **routing + session + shadow** semantics for large sites.

- [x] **Shared config source (v1 contract):** **`kind`:** **`chrysalis.chimera.config`**, **`schemaVersion`:** **1** on **`chrysalis deploy --config`** JSON; **`parseChimeraDeployConfigJson`** (**`@chrysalis/runtime-chimera`**); legacy files without **`kind`** unchanged. Fixture **`fixtures/chimera-deploy-config-v1-smoke.json`**. **Optional HMAC (D255):** top-level **`hmacSha256`** + **`CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET`** or **`--config-hmac-secret`**. **Multi-key HMAC (D257):** **`hmacSha256`** may be a **hex string** or **`{ keyId: hex }`**; **`hmacPreviousSecrets`**, **`hmacSecretsByKeyId`**; CLI **`--config-hmac-keys-json`**, **`CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON`**, **`CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS`**. **Central URL + reload (D256):** **`--config-url`** / **`CHRYSALIS_CHIMERA_CONFIG_URL`**; **SIGHUP/SIGUSR2** reload (stop+restart in-process). **KMS rotation runbook** in **`docs/OPERATIONS.md`**. **Operator drift metrics (D258):** **`chrysalis.chimera.operator-snapshot`** JSON (**`deployRoutingFingerprintSha256`** + **`ChimeraStats`**); **`chrysalis deploy --operator-metrics-json`**, **`--operator-metrics-ndjson`**, **`--operator-metrics-interval-ms`**, **`CHRYSALIS_CHIMERA_INSTANCE_ID`**; **`scripts/chimera-routing-fingerprint.mjs`**; fixture **`fixtures/ci/chimera-operator-snapshot-v1-smoke.json`**; **`pnpm run ci:chimera-operator-snapshot`**. **Remaining:** external dashboard wiring beyond the in-repo **`examples/grafana/`** starter (Grafana/Loki/etc.) is operator-owned.
- [x] **Canary / shadow aggregation (proxy stats v1, D254):** **`ChimeraStats.canary`** summarizes modern-rule traffic vs served stack; **`ChimeraStats.shadow`** adds **`divergenceLines`** and **`mirrorErrors`** (fetch failures no longer inflate **`diverged`**). **NDJSON append (D258):** **`--operator-metrics-ndjson`** for fleet log sinks. **Batch merge (D259):** **`chrysalis.chimera.operator-snapshot.batch`** + **`scripts/aggregate-chimera-operator-snapshots.mjs`** for merging operator-snapshot NDJSON lines offline. **Remaining:** richer fleet-wide aggregation beyond NDJSON lines + batch merge (optional dashboards).
- [x] **Session (D273 + D178):** Shared **Redis** session payloads (`chrysalis:sess:<sid>` JSON): emitted apps via **`CHRYSALIS_SESSION_REDIS_URL`**; legacy PHP via **`Chrysalis\Oracle\Session\RedisChrysalisSessionHandler::registerFromEnv()`** (requires **phpredis**). **`redis://`** and **`rediss://`** (TLS) URLs in PHP (**D294**); optional query **`verify_peer=0|false`**. File-backed / in-memory / SQLite stores remain for single-instance or deterministic tests.
- [x] **Runbooks / stickiness (doc slice, D254):** **`docs/OPERATIONS.md`** — multi-AZ cutover outline, rollback, shared route map, LB + canary cookie stickiness, session caveats, emit-resume pointer. **Multi-process smoke (D255):** Vitest starts **two** **`startChimera`** handles (ephemeral ports). **LB harness (D256):** **`pnpm run ci:chimera-lb-smoke`** — HTTP round-robin in front of two chimera ports. **Remaining:** optional multi-machine CI demo beyond same-host smoke.

**Done when:** local or CI **multi-process** chimera demo (two nodes) + doc sign-off criteria; no weakening of verify before cutover.

### Milestone V2-M6 — Operator aggregation (optional, last)

**Status: closed (2026-05-02).** Reference: **`docs/OPERATIONS.md`** — **Fleet aggregation reference (V2-M6 closure)**; **DESIGN D274**.

**Goal:** **Fleet view**—many repos or many shards—feeds a dashboard that aggregates **`chrysalis status --json`** and verify summaries **without** becoming a new source of truth (read-only mirror of repo artifacts).

- [x] **Schema (v0 reference uplink):** fixture **`fixtures/ci/fleet-status-uplink-v0-smoke.json`** (**`kind`:** **`chrysalis.fleet.status-uplink`**, **`schemaVersion`:** **0**; **`items[].projectLabel`** + **`items[].status`**); Vitest **`fleet-status-uplink-schema.test.ts`** + **`fleet-status-uplink-export-script.test.ts`**; **`scripts/export-fleet-status-uplink.mjs`**. **Remaining:** richer exporter / UI, privacy review per deployment.
- [x] **Privacy (doc slice, D258):** **`docs/OPERATIONS.md`** — **Fleet JSON and privacy (V2-M6)**; no third-party telemetry; self-hosted or air-gapped JSON artifacts only.
- [x] **Operator JSON micro-slices (D260–D269):** **`chrysalis --help`** scale-out line + **`aggregate-chimera-operator-snapshots.mjs`** pointer; **`emit-shared` / `emit-hono` / `emit-fastify` / root `README.md` / `docs/README.md`** cross-links for **batch** + **emit-handler-fingerprints** artifacts; Vitest **stdin** + **invalid JSON** + **wrong kind** on the aggregate script (**`packages/runtime-chimera/tests/chimera-operator-snapshot-batch.test.ts`**).
- [x] **Verify summary batch (D271):** **`chrysalis.verify.summary.batch`** + **`scripts/aggregate-verify-summaries.mjs`** for merging **`chrysalis verify --json-summary`** artifacts offline; **`pnpm run ci:verify-summary-batch`**; **`docs/OPERATIONS.md`** + root **`README.md`** machine-JSON table.
- [x] **Operator doc refresh (D272–D273):** **`docs/README.md`** (Operations row + **`oracle-php`** pointer), **`docs/OPERATIONS.md`** (contributor **`pnpm run test:oracle-php-session-redis`** note), root **`README.md`** session parity paragraph (replaces stale Milestone 1 “session bridge” polish).

**Done when (met):** documented reference architecture (**`docs/OPERATIONS.md`** fleet aggregation section) + offline merge scripts (**`aggregate-chimera-operator-snapshots.mjs`**, **`aggregate-verify-summaries.mjs`**) + **`export-fleet-status-uplink.mjs`** + machine-JSON index (root **`README.md`**). **Optional** richer exporter UI / hosted dashboard remains **operator-owned** (not required for closure).

### Sequencing vs multi-lane work

1. **Redaction + corpus schema stability** (oracle lane) precedes any **default-on** multi-host merge that could mix secrets.
2. **Partitioned verify (V2-M1)** can land early; it mostly composes existing **`replayCorpus`** semantics.
3. **Incremental ingest (V2-M2)** should stay parser-accurate: **Lane A** parity gates apply before widening ingest shortcuts.
4. **Chimera multi-instance (V2-M5)** is operationally independent of ingest but **depends** on session + routing truth shared across nodes.

### v2.0.0 tag criteria (proposal)

**Documentation slice:** **`DESIGN.md`** Decision Log **D284** (2026-05-03) and **`CHANGELOG.md`** tie this checklist to versioned machine JSON / confidence artifacts operators must keep stable across releases.

- V2-M1 **and** V2-M2 **closed** (verify sharding + ingest resume are non-negotiable for “any size”).
- At least **one** of V2-M3 / V2-M4 **closed** (operators choose corpus-scale vs emit-scale priority).
- V2-M5 **closed** or explicitly **deferred** with DESIGN Decision Log entry if release must slip.
- V2-M6 **closed** (operator aggregation reference + offline merge scripts documented; **DESIGN D274**) or explicitly deferred.
- `CHANGELOG.md` + `DESIGN.md` Decision Log summarize scale contracts (`schemaVersion` bumps, corpus layout version, chimera config version).


