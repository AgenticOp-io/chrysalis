# Intelligence Shorthand (IS) — storing LLM intelligence with minimal space and GPU

> **Status:** specification + IS-T3 export (**D6289**)  
> **Artifact kind:** `chrysalis.web-llm.intelligence-shorthand`  
> **Export:** `pnpm run web-llm:export-shorthand`  
> **Authority:** complements **D6280** (Site → CLL → LLM), **D6287** (VMF), Horizon C (deferred fine-tune)

## The question

Can you store the “intelligence” of an LLM in **many orders of magnitude** less space and GPU than full weights?

**Short answer:**  
- **General-purpose intelligence in neural weights alone:** **No** — hard ceiling around **4–8×** compression before catastrophic collapse (Nature/npj 2026 phase-transition work).  
- **Domain-specific migration intelligence (Chrysalis-shaped tasks):** **Yes — when covered** — by **not** storing weights for what WebIR, oracle, and verify already dispose. Economics live on **cache hit rate** and **verifier cost**, not on “× vs 7B weights.”

Chrysalis’s moat is the second path: **models propose; WebIR + oracle + verify dispose.** Intelligence Shorthand (IS) is the formal tier ladder for *what to store* instead of replicating a 7B–70B brain.

**Product primary metrics (D6372 / G9510):** `hitRate` / `nearMissRate` / `missRate` / `verifyCostMsP50` from live job trajectories (`chrysalis.web-llm.is-live-analytics`). Fixture skip-LLM ≥50% is a curated routing gate — not production coverage.

**CynoEngine (upstream ideas, not a dependency):** near-miss salience, outcome→utility, convert governor, and aim persistence shipped under **D6375** / [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md), inspired by [CynoEngine](https://github.com/nimbus7772017/CynoEngine). Citation: `CYNOENGINE_ATTRIBUTION` on APIs and trajectory. We adapt laws into WebIR/oracle dispose — we do not import their lake, souls, or instance config.

---

## Deep research synthesis (2024–2026)

### 1. Neural weight compression has a physics floor

| Method | Typical compression | Caveat |
| --- | --- | --- |
| **4-bit quantization** | ~4× vs bf16 | Stable; ~90% task retention in stable phase |
| **3-bit quantization** | ~5× | Universal **phase transition point (PTP)** — last stable band across Llama/Qwen/Gemma |
| **2-bit quantization** | ~6–8× | **Catastrophic collapse** — 3×+ MMLU/ARC loss on 14B+ models |
| **Sub-1-bit (UltraSketchLLM)** | ~16×+ | Requires sketch + compression-aware FT; tolerable degradation only with extra machinery |
| **Pruning + quant + low-rank combined** | ~10× practical max | Sequential activation: quant first, prune at ~60%, rank-decompose only near PTP |

**Sources:** [Phase transitions in LLM compression](https://www.nature.com/articles/s44387-026-00072-8) (npj AI, 2026); [GSQ scalar quant](https://arxiv.org/abs/2604.18556); [HyperQuant](https://arxiv.org/html/2606.23406v1).

**Information-theoretic capacity:** trained transformers store roughly **2–3.6 bits of knowledge per parameter** — not 16 bits (Allen-Zhu et al.; follow-on memorization studies). You cannot squeeze arbitrary “world knowledge” far below ~3 bit/param **and keep the same behavior** without losing information.

**Verdict for “many orders of magnitude” in weights alone:** **Not feasible** beyond ~1 order of magnitude (10×) while preserving broad capability.

### 2. Distillation shrinks models, not magically

| Student:teacher param ratio | Effect |
| --- | --- |
| 0.1× (700M ← 7B) | Distillation Efficiency Deficit grows ~power law **r^−0.38** — ~2.7× worse loss gap vs 0.5× student |
| Multi-step distillation | 2–3 intermediate teachers help extreme compression |
| LoRA / QLoRA | **0.1–2%** trainable params; adapter **50–500 MB** vs **~14 GB** full 7B FT |

**Sources:** [Distillation scaling laws](https://arxiv.org/html/2502.08606v2); [DED power law](https://coale.science/storage/pdfs/642539f6-ad93-4ce4-a79d-9650c3a9db35.pdf); [MSKD EACL 2026](https://aclanthology.org/2026.eacl-srw.13.pdf).

**Verdict:** **10–100× parameter reduction** is achievable for **narrow tasks**; **1000×+ with same general intelligence** is not.

### 3. Externalization beats compression for agent intelligence

2026 agent literature converges on **moving capability out of weights**:

| Approach | Storage | GPU | Evidence |
| --- | --- | --- | --- |
| **Skill libraries** (Voyager, HASP, Formal Skill) | KB–MB executable code + embeddings | Base model frozen; top-k retrieval | Lifelong learning without weight updates |
| **Deterministic kernels** (Engram-style graphs) | Graph edges, not text | Zero LLM for covered paths | “Query never costs tokens again” |
| **Harness engineering** | Memory, protocols, tools | Smaller model + better harness ≈ frontier | [Externalization review](https://arxiv.gg/abs/2604.08224) |

**Verdict:** For **repeatable procedures**, externalized skills achieve **10³–10⁶×** vs storing equivalent behavior in weights — because you store **programs + proofs**, not a neural approximation.

### 4. Chrysalis already implements the extreme tier

| IS tier | What Chrysalis stores | Size (typical) |
| --- | --- | --- |
| **IS-T5** Oracle ref | Verify replay traces, fixtures | KB per route |
| **IS-T4** Policy graph | CWL / WebIR modules | KB per module |
| **IS-T3** Skill capsule | Verify gate + tool footprint + digest | **0.5–5 KB** per session |
| **IS-T2** LoRA delta | Horizon C adapter (future) | 50–500 MB |
| **IS-T1** Quantized base | Shared inference model | ~3.5 GB (7B 4-bit) |
| **IS-T0** Full weights | Baseline | ~14 GB (7B bf16) |

A verify-green **site-port** on tiny-blog produces **CWL + oracle proof + IS-T3 capsule** totaling **≪1 MB** — vs **~14 GB** to hold “how to port PHP blogs” implicitly in a 7B model. That size gap is a **storage analogy** (cached verified artifact ≪ engine), **not** a compression ratio of intelligence (**D6372**). You still need a model (or human) to mint capsules and to handle misses / near-miss hole deltas.

---

## IS tier ladder (formal)

```
IS-T5 oracle-ref     ← ground truth (verify replay)
IS-T4 policy-graph   ← WebIR/CWL (deterministic)
IS-T3 skill-capsule  ← verify-gated procedural shorthand
IS-T2 lora-delta     ← domain adapter on frozen base
IS-T1 quantized      ← shared compressed base model
IS-T0 weights        ← full neural baseline
```

**Selection rule:** always prefer the **lowest tier** that passes verify for the task:

```text
if oracle_replay_covers(task)     → IS-T5 (no LLM)
else if cwl_policy_covers(task)   → IS-T4 (no LLM)
else if verified_skill_exists     → IS-T3 (retrieve capsule)
else if domain_adapter_trained    → IS-T2 (LoRA on base)
else                              → IS-T1/T0 (general model proposes)
```

Implemented in `@chrysalis/web-llm`: `preferredShorthandTierForTask()`, `buildSkillCapsuleFromShard()`, **`resolveShorthandForTask()`** (runtime protocol). MCP tools: `web_llm_preferred_shorthand_tier`, **`web_llm_resolve_shorthand`**.

**Runtime protocol:** [`INTELLIGENCE-SHORTHAND-PROTOCOL.md`](./INTELLIGENCE-SHORTHAND-PROTOCOL.md) (**G8600**)

---

## Feasibility table — orders of magnitude

| Goal | Feasible reduction | Mechanism |
| --- | --- | --- |
| Same **general** LLM in weights | **≤10×** space, **≤4×** GPU | Quantization above 3-bit PTP |
| Same **task family** (migration port) | **10²–10³×** | LoRA + shared 4-bit base |
| Same **route behavior** (one app) | **10⁵–10⁷×** | CWL/WebIR policy graph |
| Same **HTTP semantics** (one endpoint) | **10⁶–10⁹×** | Oracle trace + fixture |
| **Horizon C fine-tune** on VMF corpus | Train **IS-T2** only; corpus stays **IS-T3** shards | Sponsor GPU for adapters, not full weights |

**“Many orders of magnitude” (10³+):** **Yes**, but only when intelligence means **verified behavior on chartered surfaces** — which is exactly Chrysalis’s product definition.

**“Many orders of magnitude” while keeping one model that does everything a 70B does:** **No** — contradicted by capacity scaling laws and compression PTPs.

---

## Artifact schema

Kind: `chrysalis.web-llm.intelligence-shorthand` (v1)

Example: [`fixtures/web-llm/intelligence-shorthand.example.v1.json`](../fixtures/web-llm/intelligence-shorthand.example.v1.json)

| Field | Purpose |
| --- | --- |
| `tier` | IS-T0 … IS-T5 |
| `domainId` | Fixture / route / program id |
| `payload.verifyGate` | **Required** `ok: true` — non-negotiable §3 |
| `payload.shardDigest` | Links to source trajectory without storing full chat |
| `storageBytesEstimate` | Honest byte count |
| `compressionFactorVs7BWeights` | **Storage analogy only** (order-of-magnitude vs 14 GB bf16) — **not** a product primary (**D6372**) |

## Live analytics (G9510)

Kind: `chrysalis.web-llm.is-live-analytics` (v1)

| Field | Purpose |
| --- | --- |
| `hitRate` / `nearMissRate` / `missRate` | Cache outcomes on job trajectories |
| `verifyCostMsP50` / `verifyCostMsMean` | Verifier wall-clock |
| `scope` | `live-job` \| `synthetic-smoke` \| `fixture-domains` |

```bash
pnpm run hub:is-live-analytics-close-smoke
# → reports/web-llm/shorthand/is-live-analytics.v1.json

pnpm run hub:is-near-miss-salience-smoke   # G9520
pnpm run hub:is-utility-prior-smoke       # G9530
pnpm run hub:convert-governor-smoke       # G9540
pnpm run hub:convert-aim-persist-smoke    # G9550
```

Near-miss: same origin + shared transfer tag or overlapping route-count band, then **salience-ranked** (G9520 / CynoEngine-inspired: tag overlap, route band, digest, tier authority, novelty) → replay donor capsule + LLM only for hole deltas; **never** `skipLlm`. Utility prior (G9530) down-ranks chronically noisy donors. Demote on verify-fail / source-digest mismatch.

---

## Zero-cost path (GCE / CI — no GPU)

Everything through **IS-T5** runs on **CPU only** on your existing `chrysalis-test-vm`:

| Step | Command | Cost |
| --- | --- | --- |
| Export T3–T5 from port reports + shards | `pnpm run web-llm:export-shorthand` | $0 GPU |
| Static hub | `pnpm run web-llm:build-shorthand-hub` | $0 |
| Close gate | `pnpm run hub:intelligence-shorthand-close-smoke` | $0 |
| Wired into federation publish | `publishFederationArtifacts()` | $0 |
| GCE phase | `intelligence-shorthand-close` in `gce-run-all-tests.sh`; fast slice `pnpm run test:gce:migration-os` | Same VM you already pay for |

Disable on GCE: `CHRYSALIS_GCE_INTELLIGENCE_SHORTHAND=0`

**Open hub after demo:** `reports/web-llm/shorthand/poc/index.html`

---

## When you need GPU (Horizon C) — cheapest options

IS-T3–T5 cover migration evidence **without any GPU**. Only **IS-T2 LoRA fine-tune** (optional Horizon C) needs one:

| Option | Typical cost | Best for |
| --- | --- | --- |
| **Your GCE VM (CPU)** | Already paid | IS export, verify, oracle — **use this first** |
| **GCE GPU lab (spot T4)** | ~$0.11/hr while running | IS-T2 LoRA — **`pnpm run gpu-lab:create`** then stop when done |
| **GitHub Actions** | Free tier / included | `wisp-poc-regression` runs G8560 |
| **Google Colab free** | $0 | Manual LoRA experiments (session limits) |
| **Kaggle notebooks** | $0 | ~30h/week GPU — one-off LoRA trials |
| **Vast.ai / RunPod spot** | ~$0.50–$1.50/hr | Pay-per-hour LoRA (~$5–20/run) |
| **Lambda / CoreWeave 1×A100** | ~$1–$3/hr | LoRA rank ≥32 only |
| **Always-on 8×H100** | $8k+/mo | **Avoid** until corpus + sponsor |

**Recommendation:** Stay on **IS-T4/T5 (CWL + oracle)** until WVB plateaus; then **one spot GPU session (~2–4 hr)** for a single **IS-T2 LoRA** (~120 MB).

---

## Commands

```bash
# After port-site / federation demo (verify-green shards exist)
pnpm run web-llm:export-shorthand
# → reports/web-llm/shorthand/intelligence-shorthands.v1.json

# IS-T2 LoRA prep (CPU only — G8610)
pnpm run gpu-lab:prep
pnpm run hub:is-t2-lora-prep-smoke
# → reports/web-llm/lora/train-manifest.v1.json
```

See [`GCE-GPU-LAB.md`](./GCE-GPU-LAB.md) for optional spot GPU train sessions.

Federation merge can treat IS-T3 capsules like training shards — **smaller, dedupe-friendly, verify-gated**.

---

## Horizon C recommendation (when GPU is funded)

Do **not** fine-tune full 7B+ weights on the VMF corpus first.

1. **Shared IS-T1 base** — one 4-bit 3B–7B model for all contributors  
2. **Per-domain IS-T2 LoRA** — 50–200 MB adapters from verify-gated shards  
3. **Promote to IS-T3** any behavior that passes WVB + verify without adapter  
4. **Promote to IS-T4/T5** when CWL + oracle fully cover the route  

Expected spend: **~$50–200 per LoRA experiment** (spot A100 hours), not **$8k+/month** for an always-on 8×H100 node.

---

## Non-goals

- Lossy “summarize the model into 1 MB” without verify — violates DESIGN §3  
- Storing customer source in shorthand — forbidden (VMF charter)  
- Claiming IS-T3 replaces frontier models for open-ended reasoning  

---

## References

- Allen-Zhu & Li, *Knowledge Capacity Scaling Laws* — [arxiv 2404.05405](https://arxiv.org/abs/2404.05405)  
- *Phase transitions in large language model compression* — [Nature npj AI 2026](https://www.nature.com/articles/s44387-026-00072-8)  
- Wang et al., *Voyager* — skill library without fine-tuning — [arxiv 2305.16291](https://arxiv.org/html/2305.16291)  
- *Externalization in LLM Agents* — [arxiv 2604.08224](https://arxiv.gg/abs/2604.08224)  
- Formal Skill / HASP — executable runtime skills (2026)  
- Chrysalis: `DESIGN.md` §3, `docs/WEB-LLM-TRAINING-RECIPE.md`, `docs/SITE-PORT-FEDERATION-PROGRAM.md`
