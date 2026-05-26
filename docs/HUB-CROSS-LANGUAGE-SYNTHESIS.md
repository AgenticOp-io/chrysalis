# Cross-web-language synthesis (step-by-step)

This guide consolidates **everything the Translation Hub knows** about how web languages relate: shared semantics, systematic differences, and proven patterns. It is derived from **575** directed translation paths (23 origins × 26 outputs, including **CWL**), **WebIR**, and the path knowledge base.

**CWL (Chrysalis Web Language)** is the WebIR-native consolidation language — see **`docs/CWL.md`**.

**Machine-readable source:** `pnpm run hub:path-knowledge` → `reports/ci/hub-path-knowledge.json`  
**Synthesis export:** `pnpm run hub:cross-language-synthesis` → `reports/ci/hub-cross-language-synthesis.json`  
**Operator API:** `GET /api/hub/cross-language-synthesis`  
**Per-pair detail:** `GET /api/hub/path-knowledge?origin=<lang>&output=<lang>`

---

## Step 1 — Define the universe

| Set | Count | IDs |
| --- | ---: | --- |
| **Origins** | 23 | `php`, `javascript`, `typescript`, `vue`, `python`, `java`, `kotlin`, `go`, `ruby`, `csharp`, `rust`, `scala`, `cpp`, `c`, `swift`, `sql`, `html`, `css`, `scss`, `json`, `yaml`, `markdown`, **`cwl`** |
| **Outputs** | 26 | `typescript`, `javascript`, `php`, `python`, `java`, `kotlin`, `go`, `ruby`, `csharp`, `rust`, `scala`, `cpp`, `c`, `swift`, `sql`, `vue`, `html`, `css`, `scss`, `json`, `yaml`, `markdown`, `hono`, `fastify`, `nextjs`, **`cwl`** |
| **Directed pairs** | 575 | Every origin ≠ output (identity excluded) |

**Rule:** No pair bypasses **WebIR**. Migration is always *source → WebIR → target*, never a direct source-to-target transpiler fork.

---

## Step 2 — Classify languages (taxonomy)

| Kind | Origins | Typical role in synthesis |
| --- | --- | --- |
| **Dynamic app** | php, javascript, typescript, python, ruby | Full request/response apps; richest route + handler semantics |
| **Static JVM / .NET / native** | java, kotlin, scala, csharp, go, rust, swift | Annotations, macros, registration calls; pattern lift |
| **Frontend component** | vue | Server + client routes when present in source |
| **Markup / data** | html, css, scss, markdown, sql, json, yaml, c, cpp | Asset or schema files; file-lift only (one GET route per file) |
| **Framework outputs** | hono, fastify, nextjs, typescript | Chrysalis TS emit family; injected `ctx`, effect types |
| **Consolidation language** | **cwl** | WebIR-native `.cwl` authoring; direct ingest without lossy lift (G32) |

Use `originClusters` in path knowledge JSON to see ingest grouping:

| Ingest cluster | Origins |
| --- | --- |
| chrysalis-ingest | php |
| hub-cwl-direct | **cwl** |
| hub-ast-lift | javascript, typescript, python, java, go |
| hub-pattern-lift | vue, kotlin, ruby, csharp, rust, scala, swift |
| hub-file-lift | cpp, c, sql, html, css, scss, json, yaml, markdown |

---

## Step 3 — Anchor on WebIR (the shared semantic core)

All languages are lowered toward the same IR primitives. When synthesizing cross-language rules, map surface syntax **to these nodes**, not to another language’s syntax.

| WebIR concern | What every web stack must express |
| --- | --- |
| **Route** | HTTP method + path template → handler reference |
| **Handler** | Input/output types + **effects** (io, db, session, …) |
| **Body** | Statements lowering to literals, calls, holes |
| **Hole** | Typed placeholder with reason (`legacy:*`, `hub-*:*`) |
| **Provenance** | File, line, ingest pass |
| **Module** | Routes + optional lib roots merged with provenance |

**Chrysalis invariant:** Generated handlers use **injected context** (`ctx.time`, `ctx.random`, …) — not ambient `Date.now()`, `Math.random()`, or `process.env`.

---

## Step 4 — Map ingest lanes (how each origin enters WebIR)

| Lane | Depth | Best for | Limitation |
| --- | --- | --- | --- |
| **chrysalis-ingest** | Full semantic | PHP (Laravel, Symfony, plain) | Only origin with complete parser + oracle corpora |
| **hub-ast-lift** | Route + partial body | JS, TS, Python, Java, Go | Literals / simple objects; calls/middleware/SQL → holes |
| **hub-pattern-lift** | Route shell | Ruby, C#, Kotlin, Rust, Scala, Swift, Vue | Regex/framework patterns; bodies usually holes |
| **hub-file-lift** | Synthetic GET | SQL, HTML, JSON, … | No application logic |

**Synthesis action:** For each new surface construct, decide which lane it belongs in and whether it becomes a **lowering rule** or a **hole**.

---

## Step 5 — Catalog route registration (surface → WebIR)

Document how each ecosystem declares HTTP endpoints (pattern-lift and AST sources):

| Ecosystem | Registration style | Hub ingest |
| --- | --- | --- |
| PHP | Front controller, Laravel routes, attributes | chrysalis-ingest |
| JS/TS | `app.get/post`, Fastify, Express | javascript-ast-ingest |
| Python | `@app.route`, `@app.get`, FastAPI | python-ast-ingest (CPython ast) |
| Java/Kotlin | Spring `@GetMapping`, JAX-RS | java-ast / pattern |
| Go | `gin`, `echo`, `http.HandleFunc` | go-ast-ingest |
| Ruby | Sinatra, Rails routes | pattern-route-lift |
| C# | ASP.NET attributes | pattern-route-lift |
| Rust | actix, axum macros | pattern-route-lift |
| Scala | Play/Akka directives | pattern-route-lift |
| Swift | Vapor routes | pattern-route-lift |

**Shared abstraction to extract:** `(method, pathTemplate, handlerSymbol, registrationSite)`.

---

## Step 6 — Body / response lowering matrix

What hub ingest **lowers today** vs **holes** (critical for cross-language semantics):

| Construct | PHP ingest | JS/TS AST | Python AST | Pattern lift |
| --- | --- | --- | --- | --- |
| Literal return | Yes | Yes | Yes | Sometimes near registration |
| Object/dict literal | Yes | Yes (`__object_literal`) | Yes (simple dict) | Rare |
| `res.json()` / JSON response | Yes | Yes | Yes (dict) | Hole |
| Call expressions | Partial | Hole | Hole | Hole |
| Middleware chain | Partial | Partial (`app.use` detected; routes still gold) | Hole | Hole |
| SQL / ORM | Partial + effects | Hole | Hole | Hole |
| Session/auth | Partial | Hole | Hole | Hole |

**Hole naming pattern:** `hub-<lang>:<construct>` (e.g. `hub-js:call-expression`, `hub-python:dict-return` for non-const dicts).

**Synthesis action:** Treat the lowering matrix as the **feature checklist** for any unified semantic surface: each row is either “in IR” or “explicit hole.”

---

## Step 7 — Emit lanes (how WebIR leaves to a target)

| Emit lane | Targets | Emitted stack |
| --- | --- | --- |
| chrysalis-emit | PHP → TS/Hono/Fastify | `@chrysalis/emit` gold |
| hub-webir-typescript | Any origin → hono/fastify/nextjs/ts | Hono/Fastify/Next handlers |
| hub-cwl-emit | Any origin → cwl | `.cwl` projection (JS/TS/Python literal gold) |
| hub-native-python | → python | Flask |
| hub-native-java | → java | Spring-style |
| hub-native-go | → go | gin |
| hub-native-ruby | → ruby | Sinatra |
| hub-native-csharp | → csharp | ASP.NET |
| hub-native-rust | → rust | actix-web |
| hub-native-kotlin | → kotlin | Ktor |
| hub-native-scala | → scala | Akka HTTP |
| hub-native-swift | → swift | Vapor |
| hub-scaffold | Most open pairs | README + `hub:emit-scaffold-fallback` |
| wptp-compose | Contract present | OpenAPI/HAR → hono/nextjs |

**Synthesis action:** Each emit lane is a **projection** of the same WebIR route table into syntax — compare projections to find **minimal common denominator** syntax.

---

## Step 8 — Correctness / verify lanes (what “done” means)

| Lane | Applies to | Meaning |
| --- | --- | --- |
| legacy-oracle-php | PHP → TS/Hono/Fastify gold | Capture on staging + `chrysalis verify` |
| hub-structural-gold | JS/TS/Python literal → Hono gold | Zero-hole footprint + emit smoke |
| hub-trace-replay | Literal → Hono/Fastify gold | `@chrysalis/verify` in-process replay |
| wptp-contract | OpenAPI/HAR present | WPTP harness (any origin) |
| none | Silver/open (517 pairs) | Runnable; no trace parity claimed |

**Synthesis action:** A semantic rule is “real” only when it has a **verify lane** — spec + replay, not opinion.

---

## Step 9 — Grade distribution (honest coverage)

Current hub matrix (from path knowledge summary):

| Grade | Pairs | Interpretation |
| --- | ---: | --- |
| **gold** | 11 | CI-backed verify |
| **silver** | 256 | Runnable lift + real/native or TS emit |
| **open** | 261 | Scaffold fallback |

Gold pairs today:

- **php** → typescript, hono, fastify (3)
- **javascript** → typescript, hono, fastify (3)
- **typescript** → typescript, hono, fastify (3)
- **python** → typescript, hono, fastify (3)

---

## Step 10 — Similarities between languages (clusters)

Use these when merging concepts — languages in the same cluster share ingest strategy and often framework shape.

### 10a — By ingest lane

- **AST cluster:** javascript ≈ typescript (same acorn path); python stands alone (CPython ast); java ≈ go (annotation/call patterns).
- **Pattern cluster:** ruby, csharp, rust, scala, swift, kotlin, vue — framework-specific regex lift.
- **File cluster:** markup/data languages — not comparable for handler semantics.

### 10b — By ecosystem family (from language profiles)

| Family | Members | Shared migration notes |
| --- | --- | --- |
| js-ecosystem | javascript, typescript (+ hono/fastify/nextjs outputs) | Middleware, JSON APIs, npm emit |
| php-ecosystem | php | Only full ingest + oracle |
| python-ecosystem | python | Decorators, Flask/FastAPI |
| jvm | java, kotlin, scala | Annotations, Spring/Play/Akka |
| dotnet | csharp | ASP.NET attributes |
| go-ecosystem | go | Registration functions |
| rust-ecosystem | rust | Macros |
| ruby-ecosystem | ruby | DSL routes |

### 10c — Per-pair similarities (automated)

Every pair in path knowledge includes:

- `sim-webir` — shared IR
- `sim-ingest-lane` — count of peers with same ingest lane
- `sim-emit-lane` — count of peers with same emit lane
- `sim-gold-cluster` — if grade is gold
- `sim-language-family` — if origin/output share family (rare for cross-lang pairs)

---

## Step 11 — Differences between languages (what must not be collapsed)

| Dimension | Variation across hub origins |
| --- | --- |
| **Typing** | Dynamic (PHP, JS, Python, Ruby) vs static (Java, Go, Rust, …) |
| **Route declaration** | Functions vs annotations vs macros vs DSL |
| **Concurrency** | Sync PHP/WSGI vs async Node/FastAPI/Go goroutines |
| **Standard library** | PHP superglobals vs Node req/res vs WSGI vs Servlet |
| **Package model** | composer, npm, pip, maven, cargo, … |
| **Effect visibility** | Only PHP path has systematic effect types in ingest today |

**Per-pair `differences` in path knowledge:**

- `diff-origin-output-role` — kind + profile notes
- `diff-ingest-vs-emit` — lane mismatch detail
- `diff-verify` — whether trace parity exists
- `diff-no-php-ingest` — when emit lane cannot be chrysalis-emit

---

## Step 12 — Best practices (cross-language rules)

From `bestPractices` in path knowledge (align with DESIGN.md):

| ID | Rule |
| --- | --- |
| bp-webir-spine | One IR for all pairs |
| bp-holes-not-guesses | Unsupported → typed hole |
| bp-oracle-is-spec | Verify = capture + replay |
| bp-php-capture-staging | Oracle on staging for PHP |
| bp-contract-first | OpenAPI/HAR over source guess |
| bp-literal-gold-staging | Literal gold before full semantic parity |
| bp-native-emit-silver | Native emit ≠ verified |
| bp-scaffold-open | Open grade is honest incomplete |
| bp-injected-ctx | No ambient nondeterminism in generated code |
| bp-trace-upload | Non-PHP: recorders + upload + replay |

---

## Step 13 — Contract-first overlay (origin-agnostic path)

When **OpenAPI**, **Swagger**, or **HAR** exists:

1. Skip native ingest for route discovery.
2. Run `wptp-compose-site.mjs` / `wptp-emit-pipeline.mjs`.
3. Verify with **wptp-contract** (when sibling `wptp-matrix` present).

**Synthesis action:** Contract IR is a **parallel front-end** into the same emit targets — any unified surface should treat **API contracts** as first-class, not an afterthought.

---

## Step 14 — Extract consolidation primitives

From steps 1–13, the **cross-language primitives** already implicit in Chrysalis:

```text
1. HTTP.Route(method, path, handlerId)
2. HTTP.Handler(inputs, outputs, effects, body)
3. HTTP.Request  — method, path, query, headers, cookies, body, session
4. HTTP.Response — status, headers, body
5. Effect.Set    — io, db, session, mail, …
6. Hole.Ref      — reason, inputType, outputType, provenance
7. Literal.Value — bool | int | string | structured map
8. Context.Inject — time, random, env (never ambient in emitted code)
9. Trace.Frame   — request/response pairs for replay oracle
10. Contract.API — OpenAPI/HAR alternate ingest
```

Map every language feature to one of these ten before inventing new categories.

---

## Step 15 — Step-by-step workflow (maintain and extend this synthesis)

| Step | Action | Command / API |
| --- | --- | --- |
| 15.1 | Regenerate full knowledge DB | `pnpm run hub:path-knowledge` |
| 15.2 | Inspect one pair | `node scripts/hub-ingest/hub-path-knowledge-cli.mjs --origin X --output Y` |
| 15.3 | Compare lane peers | Filter `pairs[]` where `pathRef.ingestLane` or `emitLane` matches |
| 15.4 | List gold-only semantics | Filter `grade === "gold"` |
| 15.5 | List holes for an origin | Run lift on fixture; read `chrysalis.holes.json` |
| 15.6 | Add lowering rule | Extend `*-ast-ingest.mjs` or ingest package; add fixture; update matrix |
| 15.7 | Promote verify | Add suite to `hub-gold-manifest.mjs`; extend recorder if needed |
| 15.8 | Update profiles | Edit `LANGUAGE_PROFILES` in `hub-path-knowledge.mjs` |
| 15.9 | Document decision | DESIGN.md Decision Log if architecture changes |
| 15.10 | Re-run CI | `pnpm run ci:hub-completion` |

---

## Step 16 — Related artifacts (index)

| Artifact | Path |
| --- | --- |
| Path matrix builder | `scripts/hub-ingest/hub-translation-paths.mjs` |
| Knowledge base builder | `scripts/hub-ingest/hub-path-knowledge.mjs` |
| Language catalog | `scripts/hub-ingest/language-catalog.mjs` |
| Human path guide | `docs/HUB-TRANSLATION-PATHS.md` |
| Knowledge API doc | `docs/HUB-PATH-KNOWLEDGE.md` |
| North star design | `DESIGN.md` (WebIR, holes, oracle, effects) |
| Gold suites | `scripts/hub-ingest/hub-gold-manifest.mjs` |

---

## Appendix A — Feature comparison table (quick reference)

| Feature | PHP | JS/TS | Python | Java/Go | Pattern langs |
| --- | --- | --- | --- | --- | --- |
| Route lift | Full | AST | AST | AST/pattern | Pattern |
| Literal body | Full | Gold path | Gold path | Partial | Rare |
| Middleware | Partial | Hole | Hole | Hole | Hole |
| DB effects | Partial | Hole | Hole | Hole | Hole |
| Oracle | Full | Recorder stub | Recorder stub | None | None |
| Native emit out | Scaffold | TS family | Flask | Spring/gin | Ktor/Sinatra/… |

## Appendix B — Pair query cheat sheet

```bash
# Full database
pnpm run hub:path-knowledge

# Path lanes only
pnpm run hub:path-matrix

# Similarities + practices for one pair
curl "http://127.0.0.1:19090/api/hub/path-knowledge?origin=java&output=typescript"
```

---

*Generated methodology aligns with Translation Hub G29–G31 (path matrix, knowledge base). Regenerate JSON after route or profile changes.*
