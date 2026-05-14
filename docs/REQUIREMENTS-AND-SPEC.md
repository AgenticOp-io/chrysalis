# Chrysalis — Functional Requirements and Technical Specification

**Document type:** requirements + technical specification (derived from project vision)  
**Normative sources:** `DESIGN.md` (architecture and non-negotiables), `ROADMAP.md` (milestone acceptance), `AGENTS.md` (contribution constraints). This document **does not** override those files; on conflict, update `DESIGN.md` (with Decision Log) or change this document.  
**Companion:** `docs/WHITEPAPER.md` — narrative architecture overview.

---

## 1. Vision and scope

### 1.1 Vision (from `DESIGN.md`)

Chrysalis is a **web framework** whose primary adoption path is **growing inside a legacy web application** until the new stack can absorb it. The **running application’s observed behavior** (HTTP, SQL, sessions, time, side effects) is treated as the **primary specification** for whether translated code is acceptable—not source code alone.

The PHP-to-TypeScript pipeline is the **first** ingest/emit pair; **WebIR** is the long-lived product surface.

### 1.2 In scope

- Parse PHP sources into a **fixed-schema** AST representation consumable from Node.
- Lower AST and project configuration into **WebIR** (multi-dialect, typed, effect-aware IR).
- Emit **TypeScript** web applications for supported targets (e.g. Hono, Fastify) without hardcoding a single backend inside `webir`, `ingest`, `verify`, or `cli` beyond documented adapters.
- **Record** legacy behavior into a **trace corpus** with configurable **redaction**.
- **Replay** corpora against emitted applications and produce **correctness reports** and machine-readable summaries.
- **Dual-stack routing** (Chimera): legacy and modern stacks behind one HTTP origin, with documented modes and optional session bridge.
- **CLI** orchestration, **`status`** that **combines** signals, optional **repair** loop gated by verify, **archaeology** (schema + traces → typed **domain output files**), and **versioned CI JSON files** where documented.

### 1.3 Out of scope (non-goals at product level)

- GPL-licensed core distribution (`DESIGN.md` principle 10).
- Function-level PHP↔TypeScript FFI (`DESIGN.md` / `AGENTS.md`).
- Silent translation of unsupported constructs (must be **holes**).
- Hidden **`Date.now()` / `Math.random()` / env / live network** in generated handlers or verify sandboxes where replay must match traces (`DESIGN.md` principle 7; use injected context instead).

---

## 2. Definitions

| Term | Meaning |
|------|---------|
| **WebIR** | Typed intermediate representation organized into dialects (`web.request`, `effect`, `data`, `control`, `target.ts`, …). |
| **Hole** | First-class IR node for unsupported or delegated behavior; compiles; carries a stable reason string; may delegate to legacy at runtime. |
| **TraceFrame / TraceCorpus** | Recorded behavioral unit / persisted deduplicated collection (typically NDJSON on disk). |
| **Oracle** | Subsystem that records traces from the legacy stack (PHP **capture bootstrap** + Node-side corpus I/O). |
| **Verify** | Replay engine that drives HTTP (and optional SQL tape) against the emitted app and diffs outcomes. |
| **Chimera** | Production HTTP proxy routing between legacy and modern upstreams. |

---

## 3. Functional requirements

Each requirement is **testable** or **auditable**. **Priority:** P0 = identity of the product; P1 = core vertical slice; P2 = operations at scale / ergonomics.

### 3.1 Specification and verification

| ID | Priority | Requirement | Design trace |
|----|----------|-------------|--------------|
| FR-001 | P0 | The system SHALL treat **observed runtime behavior** (trace corpus) as the authority for **verify**, not static source alone. | `DESIGN.md` §3.1, §5.2 |
| FR-002 | P0 | The system SHALL support **replay** of a corpus against a **running** emitted base URL with **stable, documented** ordering policy for the verifier. | `packages/verify/README.md` |
| FR-003 | P1 | Verify SHALL produce a **per-route** and **overall** correctness report and persist **output files** under a configurable report directory. | `DESIGN.md` §5.2 |
| FR-004 | P1 | Verify SHALL support **machine-readable** summary output with a documented **`kind`** / **`schemaVersion`** contract for CI. | Root `README.md` machine-JSON table |
| FR-005 | P1 | Where traces include sufficient **SELECT row payloads**, the system SHALL support **recorded SQL tape** replay without requiring a live database for those reads (documented header/middleware contract). | `packages/verify/README.md` |
| FR-006 | P2 | The system MAY partition replay by **shard** of traces and merge disjoint correctness reports when shards form a complete partition. | `DESIGN.md` D237; `packages/verify/README.md` |

### 3.2 Translation pipeline (PHP → WebIR → TypeScript)

| ID | Priority | Requirement | Design trace |
|----|----------|-------------|--------------|
| FR-010 | P0 | The system SHALL parse PHP source into a **versioned, fixed-shape AST JSON** (`PhpAst`) without executing PHP in the parser bridge. | `packages/parser-bridge/README.md` |
| FR-011 | P0 | Ingest SHALL lower supported constructs into **WebIR** with every node carrying **`origin`** (and other required metadata per `DESIGN.md` §5.1). | `DESIGN.md` §5.1; `packages/ingest/README.md` |
| FR-012 | P0 | Unsupported constructs SHALL become **typed holes** with stable **reason** strings; ingest SHALL NOT throw or silently omit unsupported code paths. | `DESIGN.md` §3.2; `AGENTS.md` §4 |
| FR-013 | P0 | Emit packages SHALL consume **WebIR** and SHALL NOT depend on a single framework as the only possible backend across `webir` / `ingest` / `verify` / `cli`. | `DESIGN.md` §3.6 |
| FR-014 | P1 | The CLI SHALL support **multiple emit targets** documented for the repo (e.g. Hono and Fastify) and fixtures/CI SHALL demonstrate cross-target verify where claimed. | `README.md`; `ROADMAP.md` |
| FR-015 | P2 | The system MAY support **route-level ingest sharding** and **merging** of WebIR modules with documented **rules for dropping duplicate structure**. | `DESIGN.md` D246–D247; `packages/ingest/README.md` |

### 3.3 Oracle (capture)

| ID | Priority | Requirement | Design trace |
|----|----------|-------------|--------------|
| FR-020 | P0 | Oracle capture SHALL apply **redaction** before persisting sensitive fields (headers, cookies, bodies, SQL rows/params as configured). | `packages/oracle/README.md` |
| FR-021 | P0 | Default redaction rules in TypeScript (`DEFAULT_REDACTION`) and PHP (`Redactor.php`) SHALL remain **lockstep** when either is changed. | `AGENTS.md` oracle-php redaction |
| FR-022 | P1 | The system SHALL record dimensions needed for faithful replay where supported: HTTP request/response, SQL text and optional rows, **session changes**, time/RNG observations as documented. | `DESIGN.md` §5.2 |
| FR-023 | P1 | Corpus persistence SHALL be **append-oriented** with **deduplication** policy as documented in the oracle package. | `packages/oracle/README.md` |

### 3.4 Dual-stack (Chimera) and coexistence

| ID | Priority | Requirement | Design trace |
|----|----------|-------------|--------------|
| FR-030 | P0 | Chimera SHALL route each client-visible request to **one** primary upstream per mode rules (`legacy`, `cutover`, `shadow`, `canary`) as documented. | `DESIGN.md` §5.3; `packages/runtime-chimera/README.md` |
| FR-031 | P1 | In **shadow** mode, the client-visible response SHALL come from legacy; modern MAY be invoked in the background; failures on the modern path SHALL NOT change the client response contract. | `packages/runtime-chimera/README.md` |
| FR-032 | P1 | Chimera configuration SHALL support a **versioned JSON** contract (`kind`, `schemaVersion`) for deploy-time loading. | `DESIGN.md` D253 |
| FR-033 | P2 | The system MAY provide a **session bridge** (e.g. Redis) so PHP and emitted Node stacks share session state with aligned serialization and cookie policy as documented. | `DESIGN.md` §5.3; `packages/oracle-php/README.md` |

### 3.5 Provenance, effects, and replay-stable behavior

| ID | Priority | Requirement | Design trace |
|----|----------|-------------|--------------|
| FR-040 | P0 | Generated **output** that represents domain or API shapes SHALL carry **provenance** sufficient for audit (e.g. JSDoc `@chrysalis-provenance` where that pattern is used). | `DESIGN.md` §3.3, §6.3 |
| FR-041 | P0 | Handler-level **effects** SHALL be modeled in the IR/type system as documented; widening at boundaries SHALL be explicit. | `DESIGN.md` §3.5, §6.1 |
| FR-042 | P1 | Generated code and verify replay paths SHALL use **injectable** time and randomness (no `Date.now()` / `Math.random()` in generated handlers where **repeatable runs** are required). | `DESIGN.md` §3.7; `AGENTS.md` §2 |

### 3.6 Tooling and observability

| ID | Priority | Requirement | Design trace |
|----|----------|-------------|--------------|
| FR-050 | P1 | The CLI SHALL provide **`status`** (including `--json` where documented) composing corpus, verify, migration, and IR-derived signals as specified. | `README.md`; `DESIGN.md` §5.1 footprint |
| FR-051 | P2 | Optional **repair** flows SHALL be gated by **re-verify**; repair proposals are not authoritative without passing the verify gate. | `DESIGN.md` §5.2 step 6 |
| FR-052 | P2 | Documented **CI gate scripts** SHALL validate versioned **JSON files** (`kind`, `schemaVersion`) without silent failure modes inconsistent with `DESIGN` D231. | Root `README.md` ci-gates; `AGENTS.md` |

### 3.7 Licensing (optional product gate)

| ID | Priority | Requirement | Design trace |
|----|----------|-------------|--------------|
| FR-060 | P2 | When enabled via environment variables, the CLI SHALL enforce **commercial license** checks per `docs/COMMERCIAL.md` without changing IR or **Oracle capture** behavior. | `DESIGN.md` D289 |

---

## 4. Technical specification

### 4.1 Platform and repository

| Item | Specification |
|------|----------------|
| Monorepo | `pnpm` workspaces; packages under `packages/*`. |
| Language | TypeScript **strict** everywhere in TS packages. |
| Runtime | Node.js **>= 20** (root `package.json` `engines`). |
| PHP | Required for `nikic` parser-bridge tests and oracle-php smoke tests where applicable. |
| Testing | Vitest; CLI subprocess tests may load built `dist/` per `AGENTS.md`. |

### 4.2 Package boundaries (logical)

| Package | Responsibility |
|---------|------------------|
| `@chrysalis/parser-bridge` | PHP → `PhpAst` JSON only. |
| `@chrysalis/ingest` | `PhpAst` + project options → WebIR `Module`. |
| `@chrysalis/webir` | IR types, dialects, passes, oracle footprint, merge helpers. |
| `@chrysalis/emit-hono` / `@chrysalis/emit-fastify` | WebIR → emitted TS project for a target stack. |
| `@chrysalis/emit-shared` | Shared emit strategies and **shared output helpers**. |
| `@chrysalis/oracle` | Corpus model, read/merge, observe session API (Node). |
| `packages/oracle-php` | PHP **capture bootstrap**: capture, redaction, session bridge hooks. |
| `@chrysalis/verify` | `replayCorpus`, diff, reports, merge, JSON summary builders. |
| `@chrysalis/runtime-chimera` | HTTP proxy, modes, rule matching, deploy config parsing. |
| `@chrysalis/cli` | `chrysalis` entrypoint and orchestration. |
| `@chrysalis/archaeology`, `@chrysalis/insight`, `@chrysalis/rewrite`, `@chrysalis/repair`, `@chrysalis/compat`, `@chrysalis/license` | As per each package `README.md`. |

**Forbidden:** Circular dependencies between packages; hardcoding a single emit backend inside `webir` / `ingest` / `verify` / `cli` (`AGENTS.md`).

### 4.3 WebIR node contract (normative fields)

Per `DESIGN.md` §5.1, each node SHALL expose at minimum:

- `id: NodeId`
- `type: WebIRType` (may include hole or unknown shapes)
- `effects: EffectSet`
- `provenance: Provenance[]`
- `origin: Locator`

### 4.4 Trace and verify outputs (interfaces)

- **Trace corpus:** On-disk layout and schema as documented in `@chrysalis/oracle` and `oracle-php` README files; redaction applied at capture.
- **Verify report:** `CorrectnessReport` + on-disk `summary.json` and per-route files; **field meanings** in `@chrysalis/verify/README.md`.
- **Verify JSON summary (stdout):** `kind: "chrysalis.verify.summary"`, `schemaVersion: 1`, `toolVersion` from workspace version (see root `README.md`).

### 4.5 Chimera deploy configuration

- **Versioned file:** `kind: "chrysalis.chimera.config"`, `schemaVersion: 1` (see `packages/runtime-chimera/README.md`).
- **Modes:** `legacy` | `cutover` | `shadow` | `canary` (exact strings).
- **Optional:** HMAC over signing payload, remote config URL, operator metrics NDJSON—specifications and env vars documented in package README and `docs/OPERATIONS.md` where applicable.

### 4.6 Non-functional requirements

| ID | Category | Requirement |
|----|----------|---------------|
| NFR-001 | Correctness | Golden fixtures and/or verify gates for ingest, emit, and replay paths as defined in `ROADMAP.md` and package tests. |
| NFR-002 | Security | No secrets in clear text in default corpus paths; redaction defaults maintained in lockstep (FR-021). |
| NFR-003 | Maintainability | Public API and invariants documented in each package `README.md` under Purpose / Public API / Invariants / Non-goals. |
| NFR-004 | CI | Root `pnpm test` and documented `pnpm run ci:*` gates enforce **JSON shapes** where claimed (`AGENTS.md` local ci-gates). |

---

## 5. Traceability (FR → `DESIGN.md` §3 non-negotiables)

| `DESIGN.md` §3 # | Principle | Representative FRs |
|------------------|-----------|----------------------|
| 1 | Running app is the spec | FR-001, FR-002, FR-003 |
| 2 | Partial output / holes | FR-012 |
| 3 | Provenance | FR-011, FR-040 |
| 4 | Dual-stack | FR-030, FR-031, FR-033 |
| 5 | Effects are types | FR-041 |
| 6 | IR is the product | FR-013, FR-015 |
| 7 | Determinism | FR-042 |
| 8 | Intent over syntax | Covered by ingest/rewrite passes and `ROADMAP.md` acceptance (not one-line FR) |
| 9 | Ship with holes / measured correctness | FR-003, FR-012 |
| 10 | License | FR-060; repo `LICENSE` |

---

## 6. Maintenance

- **When vision changes:** Update `DESIGN.md` (Decision Log) first, then align this document and `ROADMAP.md`.
- **When a feature ships:** Add or adjust FR IDs and acceptance pointers in `ROADMAP.md` milestone text or package READMEs; keep this document’s tables accurate in the same PR when practical.

---

*End of document.*
