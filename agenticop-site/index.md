# AgenticOp — CWL migration with Intelligence Shorthand

> **Site source:** landing copy for [agenticop.io](https://agenticop.io). Rebuild `index.html` from this file.

**AgenticOp** is the practice layer for **verified web modernization**: we help teams move legacy stacks onto **CWL** (Chrysalis Web Language) and run **agentic** workflows where **Intelligence Shorthand** replaces heavyweight LLM calls whenever verify already knows the answer.

**Chrysalis** (Apache-2.0, [AgenticOp-io/chrysalis](https://github.com/AgenticOp-io/chrysalis)) is the engine underneath — oracle capture, WebIR, verify replay, chimera cutover, and the `@chrysalis/web-llm` shorthand stack.

---

## Hero

**Eyebrow:** Verified web language, not another rewrite gamble

**Headline:** Ship in **CWL**. Let shorthand skip the LLM.

**Lead:** Most “AI migration” tools guess at source code and hope. AgenticOp treats **production behavior** as the contract, **CWL** as the durable migration artifact, and **Intelligence Shorthand** as the storage ladder that answers “do we need a 7B model for this route?” — usually **no**.

**Primary CTA:** [Explore Chrysalis on GitHub](https://github.com/theorem6/chrysalis)

**Secondary CTA:** [Technical overview (CWL + shorthand)](/whitepaper.html)

**Pills:** CWL · Intelligence Shorthand · Oracle replay · Verify gates · Agentic MCP

### Why this exists

- Translators that only read source still lie when runtime behavior is the real API.
- Raw LLM weights are the **most expensive** place to store migration know-how — and the least provable.
- **CWL + oracle traces + verify** externalize intelligence at **IS-T4/T5**; skill capsules at **IS-T3** let agents **skip the LLM** on repeat work.

---

## The tension

Teams want speed. Compliance and uptime demand evidence. AgenticOp holds both:

| Pillar | What it means |
| --- | --- |
| **CWL as contract** | Routes, effects, and pages in a reviewable web language — not an opaque emit dump. |
| **Shorthand before weights** | `resolveShorthandForTask` picks oracle ref, policy graph, or skill capsule before any model call. |
| **Verify decides** | Models **propose**; WebIR + oracle + verify **dispose**. No silent promotion. |

---

## Approach

A typical engagement threads corpus design, CWL export, shorthand corpus growth, and staged cutover.

1. **Observe and shape the corpus** — Record representative traffic and side effects. Redact per policy; keep enough signal for replay.
2. **Ingest → WebIR → CWL** — Lower legacy sources to WebIR; export **`.chrysalis/migration.cwl`** and preview surfaces. Holes stay typed and visible.
3. **Verify before celebration** — Replay the corpus against CWL runtime or emitted Node; score correctness per route.
4. **Grow Intelligence Shorthand** — Verify-green ports export **IS-T3** skill capsules and **IS-T4** policy graphs; agents retrieve them on the next similar task (`skipLlm: true` when coverage hits).
5. **Chimera cutover** — Shadow, canary, cutover between legacy and modern stack without fork-lifting the database.

---

## CWL — the web language we migrate *to*

**CWL** (Chrysalis Web Language) is the **authoritative** migration target in Chrysalis — not an afterthought emit format.

- **Route contracts:** method, path, params, body, status, content-type, auth effects.
- **Full-stack surface:** `@page` HTML, layouts, middleware presets (`use json`, `use auth session`, …).
- **Round-trip:** project → CWL → WebIR → Hono/Fastify/Next/CWL runtime — same semantics, reviewable diff in PRs.
- **WISP** showcases CWL in production-shaped demos; the language wins are generalizable beyond any one app.

**North star:** teams review and own **CWL**, not a one-shot TypeScript dump they cannot diff.

---

## Intelligence Shorthand — store migration intelligence without 14 GB

**Intelligence Shorthand (IS)** is the tier ladder for *what to store* instead of replicating a foundation model.

```
IS-T5 oracle-ref     ← verify replay traces (ground truth)
IS-T4 policy-graph   ← CWL / WebIR modules (deterministic)
IS-T3 skill-capsule  ← verify-gated procedural digest (~0.5–5 KB)
IS-T2 lora-delta     ← domain adapter on frozen base (optional, GPU)
IS-T1 quantized      ← shared 4-bit base (~3.5 GB)
IS-T0 weights        ← full neural baseline (~14 GB)
```

**Selection rule:** always prefer the **lowest tier** that passes verify for the task.

| Tier | When it wins | LLM needed? |
| --- | --- | --- |
| **T5** | Oracle replay covers the route | No |
| **T4** | CWL policy graph covers the task | No |
| **T3** | Verified skill capsule exists for this port family | Retrieve only |
| **T2+** | Novel language surface, no capsule yet | Propose (verify-gated) |

For a verify-green vertical slice, **CWL + oracle proof + IS-T3 capsule** can sit in **≪1 MB** versus **~14 GB** to hold the same behavior implicitly in weights — **orders of magnitude** for domain-specific migration intelligence.

**Runtime:** `@chrysalis/web-llm` — `resolveShorthandForTask`, trajectory fields (`skipLlm`, `isTier`), MCP tools (`web_llm_resolve_shorthand`, hub convert enrich / verify gate / apply).

**Charter:** *Models propose; WebIR + oracle + verify dispose.*

---

## Engine map (Chrysalis)

| Layer | Role |
| --- | --- |
| **Oracle** | Capture HTTP, SQL, sessions, time/randomness into a versioned corpus. |
| **WebIR + ingest** | Typed, effect-aware IR; holes are first-class. |
| **CWL** | Human-reviewable migration contract and authoring surface. |
| **Emit** | Hono, Fastify, Next, CWL runtime — multiple backends, one IR. |
| **Verify** | Replay corpus; machine-readable correctness for CI. |
| **Web-LLM + IS** | Trajectories, WVB benchmarks, shorthand export, agent MCP. |
| **Chimera** | `chrysalis deploy` shadow / canary / cutover. |

Deep dive: [Technical overview](/whitepaper.html) · [DESIGN.md](https://github.com/theorem6/chrysalis/blob/main/DESIGN.md) · [INTELLIGENCE-SHORTHAND.md](https://github.com/theorem6/chrysalis/blob/main/docs/INTELLIGENCE-SHORTHAND.md)

---

## Proof in the repository

| Pilot | Role |
| --- | --- |
| **tiny-blog** | Milestone vertical slice: ingest, CWL, oracle, verify, IS export path. |
| **laravel-min** | Fast flagship regression; session + migration gates. |
| **hub-wisp-management** | CWL module demo, operator docs, chimera gateway. |
| **Open Legacy index** | Federation entries for shorthand export (T3/T4/T5 per domain). |
| **fixtures/web-llm** | WVB cases, intelligence-shorthand goldens, trajectory fixtures. |

Large regenerated trees stay out of git by policy; reproduce via scripts in the Chrysalis README.

---

## Engage

| Offering | Focus |
| --- | --- |
| **Pilot** | Corpus + CWL export + verify gate + shorthand corpus seed + cutover plan. |
| **Run** | Corpus hygiene, IS export on each verify-green wave, chimera tuning, release alignment. |
| **Enablement** | Workshops on CWL authoring, shorthand tiers, oracle design, verify reports, MCP agent flows. |

Commercial playbook: [docs/COMMERCIAL.md](https://github.com/theorem6/chrysalis/blob/main/docs/COMMERCIAL.md)

---

## FAQ

### Is AgenticOp a separate product from Chrysalis?

Chrysalis is the open-source engine (Apache-2.0). AgenticOp is how we run programs on top: scoping, gates, cutover, and operator discipline — with **CWL** and **Intelligence Shorthand** as the default vocabulary.

### Do you ship “AI-written” production code without review?

No. LLM and agent tools **propose** hole closures and scaffolds; promotion passes **verify** and operator confirm. Shorthand tiers **T3–T5** often avoid the model entirely.

### What is CWL vs “generated TypeScript”?

TypeScript emit is a **backend**. **CWL** is the **durable contract** teams review, diff in PRs, and port across frameworks. AgenticOp engagements center CWL; emit follows the contract.

### Where is the technical whitepaper?

[/whitepaper.html](/whitepaper.html) — synced from `docs/WHITEPAPER.md` on deploy.

---

## Footer CTA

**Start from CWL and verified behavior, not hope.**

Clone a fixture, run verify, export shorthand. That loop is the spine of every AgenticOp engagement.

[Open the Chrysalis repository](https://github.com/AgenticOp-io/chrysalis)

---

*AgenticOp.io · Chrysalis is Apache-2.0 licensed.*
