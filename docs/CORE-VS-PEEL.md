# Core vs peel charter

> **Status:** active (**D6551**)  
> **Rule:** *What is allowed to live outside typed WebIR / CWL core?*  
> **Authority:** `DESIGN.md` §3 item 6 (IR is the product) · CWL pillar constitution · dual primary §12  
> **Not:** a stack rewrite (TS vs Rust). Implementation language is secondary to this boundary.  
> **Note:** **D6550** is UT↔Helix spine (**G10125**) — different decision; do not collide.

---

## 1. The single rule

| Zone | May live here | Must not live here |
| --- | --- | --- |
| **Core** | WebIR types/dialects; CWL grammar + AST + parse/print/diagnose; hole contracts; verify dispose semantics over WebIR; provenance rules | Origin dialect peels, hub golds, smoke theater, COBOL/GnuCOBOL adapters, emit-target fashion, LLM glue |
| **Peel** | Route-surface peels, inventory adapters, oracle sidecars (any language), hub smokes/proves, fat origin lifts, emit backends, CLI orchestration | New WebIR ops, CWL grammar, silent “fixes” that change language meaning |

**Promotion:** a peel earns core **only** when it defines or changes **IR semantics**, **CWL surface**, **hole honesty contracts**, or **verify dispose meaning**.  
**Demotion:** volume and velocity are not reasons to promote. ~84% of `scripts/hub-ingest/*.mjs` are already peels (smoke/gate/prove) — that is healthy, not a failure.

---

## 2. Census (2026-08-05, convert tree)

| Surface | Approx | Zone |
| --- | --- | --- |
| `scripts/hub-ingest` smoke/gate/prove | **1152 / 1375** | **Peel** (correct) |
| CWL language tooling (`cwl-parser`…`cwl-fullstack-holes`) | **8** | **Core** (owned in `chrysalis-cwl`; convert mirrors/junctions) |
| Agent G helpers (`hub-t`, `hub-cwl-*`) | **4** (+ `hub-t`) | **Core-adjacent** — language-owned helpers; sync from CWL; not fat lift |
| `*-ast-ingest` / `*-route-lift` / pattern peels | **~20** | **Peel** |
| Fat `hub-lift-webir-route.mjs` | **~741 LOC** | **Peel** (origin + COBOL) |
| Thin `hub-lift-cwl-webir.mjs` (pillar) | **~172 LOC** | **Core-adjacent** (CWL→WebIR only) |
| `@chrysalis/webir` | typed package | **Core** (SoR in `chrysalis-cwl/packages/webir`; Convert reverse-home junction / `file:` — [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md)) |
| `@chrysalis/verify` / hole typing | typed packages | **Core** |
| `emit-hono` / `emit-fastify` / `runtime-cwl*` | typed packages | **Peel-of-emit** (replaceable backends; CWL-Above-Code) |
| `oracle-*` (PHP/Go/Java/…) | polyglot | **Peel** (origin truth sidecars — strength, not debt) |
| `packages/cli` (~463 TS) | typed | **Shell** — orchestration; must not become a second IR |

---

## 3. Where the rule leads (forced moves)

### Do now (boundary hygiene)

1. **Treat every new hub `.mjs` as peel by default.** Require an explicit “promotes to core because …” note before touching WebIR dialects, CWL grammar, or verify meaning.
2. **Keep CWL language edits in `chrysalis-cwl`.** Convert only syncs / consumes (`sync:convert`, junctions, `hub:cwl-language-pillar-smoke`).
3. **Do not type-wash smokes.** Rewriting 1k prove scripts into TS/Rust is anti-leverage.

### Do next (substrate, still convert-owned work)

4. **WebIR reverse-home (Slice 3)** — **Done on Convert:** `packages/webir` is junction/`file:../chrysalis-cwl/packages/webir` (CWL SoR). Setup: `pnpm run link:webir-from-cwl`. Prove: `hub:webir-resolve-smoke`. Doc: [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md). Edit WebIR only under chrysalis-cwl.
5. **Fat CWL ingest honesty:** Convert keeps fat `cwl-ingest` (not a junction over thin) but must preserve pillar semantics such as RFC-0024 `attachmentHoles` — prove `hub:cwl-attachment-holes-smoke`. Optional later: call thin pillar lift for CWL-only paths.
6. **Dual-mode `cwl-fmt` is locked** ([`CWL-FMT-DUAL-MODE.md`](./CWL-FMT-DUAL-MODE.md)) — pillar parse→print vs convert WebIR fmt; do not merge into one file.
7. **Consumer pin prove:** `pnpm run hub:cwl-pin-smoke` — `file:` pin + `@chrysalis/cwl` VERSION surface (not a second spine).
8. **Consume CWL prove packs:** `hub:cwl-ingest-matrix-smoke` + `hub:cwl-helix-cutover-smoke` (prefers `smoke:ut-evidence`) — Convert spawns only; never forks DNA.

### Dual primary unchanged

9. **COBOL / language deepen peels** stay peels. Leadership is route-surface gold + honest residuals — not IR expansion.
10. **EXTFMAP / LiveView** remain charter-or-hole. Charter does not unlock invent.

### Stack implication (from the rule, not fashion)

11. **TS/npm stays the Convert shell** (CLI, hub, emits, peels).  
12. **Core is defined by contracts (WebIR + CWL + dispose), not by npm.** A future Rust/Go *core kernel* is allowed only if a named core package fails the bar — never as a peel rewrite.

---

## 4. Decision tests (use in review)

Before merging, answer:

1. Does this change **WebIR node/effect/dialect meaning**? → **Core** (typed package + fixture).
2. Does this change **CWL grammar / gold / diagnose**? → **Core** in `chrysalis-cwl`, then sync.
3. Does this only **lift one more origin shape** or **prove a gold**? → **Peel** (script + honest catalog OK).
4. Does this make emit backends look like SoR? → **Refuse** (CWL-Above-Code / D6541).
5. Are we “cleaning up” by moving peels into packages without a semantic win? → **Refuse**.

---

## 5. Explicit non-goals

- Rewriting Convert in another language for its own sake  
- Promoting dialect bingo into WebIR ops  
- Merging fat COBOL lift into the language pillar  
- Claiming core completeness because smoke count is high  
- Letting `packages/cli` invent IR

---

## 6. Related

| Doc | Role |
| --- | --- |
| [`DESIGN.md`](../DESIGN.md) §3 | IR is the product |
| [`CWL-PILLAR-HOME.md`](./CWL-PILLAR-HOME.md) | Convert pointer to language core |
| [`../chrysalis-cwl/docs/language/CWL-PILLAR-HOME.md`](../../chrysalis-cwl/docs/language/CWL-PILLAR-HOME.md) | CWL constitution |
| [`../chrysalis-cwl/docs/history/WEBIR-EXTRACT-PLAN.md`](../../chrysalis-cwl/docs/history/WEBIR-EXTRACT-PLAN.md) | WebIR substrate flip |
| [`AGENT-ERA-SUBSTRATE.md`](./AGENT-ERA-SUBSTRATE.md) | Hole types + dispose + CWL-Above-Code |
| [`CWL-FMT-DUAL-MODE.md`](./CWL-FMT-DUAL-MODE.md) | Locked peel vs core fmt split |
| [`DO-NOT-INVENT.md`](./DO-NOT-INVENT.md) | Peel honesty |
| [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12 | Dual primary queue |
| `AgenticOps/docs/UT-CONVERT-SECURE-SPINE.md` | CWL-owned UT↔Helix spine (**D6550** / G10125; `smoke:ut-spine`) — Convert consumes, don’t fork DNA |

## One line

**Peels may be many and messy; core must be small, typed, and hard to change — that is how Convert stays a translator instead of a script pile with an IR hobby.**
