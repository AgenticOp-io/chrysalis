# CynoEngine × Chrysalis — incorporation plan

> **Status:** planned (2026-07-09)  
> **Authority:** DESIGN **D6374**; locked path still [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md)  
> **Upstream ideas:** [nimbus7772017/CynoEngine](https://github.com/nimbus7772017/CynoEngine) (Theurgy / salience engine)  
> **Collab issues:** [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1) · [chrysalis#54](https://github.com/AgenticOp-io/chrysalis/issues/54)  
> **Org home:** [`PROGRAM-HOME.md`](./PROGRAM-HOME.md)

## 0. Stance (non-negotiable)

| Do | Do not |
| --- | --- |
| Port **laws and gated prototypes** into Chrysalis TypeScript | Merge CynoEngine into the Chrysalis monorepo |
| Cite CynoEngine in DESIGN / this doc / IS docs | Import lake DSN, souls, private corpus, prod topology |
| Keep repos separate under AgenticOp-io when transferred | Replace oracle/verify with salience scores |
| All contributors may PR either repo | Bypass `STRATEGIC-PLAN.md` close-before-build |

**Shared thesis (both products):** competence lives in the **substrate**, not the model weights.  
**Different substrates:** Chrysalis = WebIR + CWL + oracle; Cyno = lake + LLM-free salience + governor.

---

## 1. Already shipped (baseline before this plan)

| Gate | What | Cyno rhyme |
| --- | --- | --- |
| **G9510 / D6372** | Live analytics: hit / near-miss / miss + `verifyCostMs`; demote on verify-fail; trajectory v2 | Outcome closes the loop; skip-LLM only on exact hit |
| **G8600** | IS tier retrieval + `skipLlm` | Surface ≠ do (retrieval before actor) |

Honest bound: G9510 near-miss is still **structural** (origin + tags / route band). Cyno’s salience mix is the upgrade path below.

---

## 2. Incorporation queue (Chrysalis-owned)

Implement in `@chrysalis/web-llm` + hub convert scripts. Each slice needs a smoke gate. **Cite CynoEngine** in the Decision Log entry and package README when shipping.

### G9520 — Near-miss salience v1 (Cyno-inspired)

**Problem:** migrations live in near-miss; origin/tag matching is brittle.  
**Steal (concept):** z-scored mix of task likeness + novelty + authority tier; never `skipLlm` on near-miss.  
**Ship:**

- `scoreNearMissCandidates()` over Open Legacy / shorthand corpus  
- Features: fingerprint overlap, tier rank (T5>T4>T3), optional novelty vs last donor  
- Trajectory fields: `nearMissScore`, `nearMissFeatures`  
- Gate: `hub:is-near-miss-salience-smoke`  
- Docs: this file + `INTELLIGENCE-SHORTHAND.md` § near-miss

**Non-goals:** embeddings/pgvector in Chrysalis core; copying `cyno_archi.py`.

### G9530 — Outcome → utility prior for capsules

**Problem:** promote/demote is binary; no graded utility from verify history.  
**Steal (concept):** Cyno law — *outcome closes the loop, never attribution*; `w_util`-style prior fed by graded outcomes only.  
**Ship:**

- Per-`domainId` utility record from verify correctness / apply accept-reject  
- Demote or down-rank when utility falls below floor  
- Artifact: `chrysalis.web-llm.is-utility.v1`  
- Gate: `hub:is-utility-prior-smoke`

**Non-goals:** credit from LLM self-report; cross-encoder relevance as utility (Cyno §4e lesson).

### G9540 — Convert / tool governor (STOP half)

**Problem:** hub convert has verify-before-apply but tiers are not first-class.  
**Steal (concept):** GREEN / YELLOW / RED action classes; visible; jointly held.  
**Ship:**

| Tier | Allowed |
| --- | --- |
| GREEN | status, resolve IS, list holes, analytics |
| YELLOW | write proposals under `.chrysalis/`, LLM enrich |
| RED | apply patches, deploy, mutate origin | confirm + verify green |

- Gate: `hub:convert-governor-smoke`  
- Wire into `hub_convert_*` tools

### G9550 — Aim persistence on convert / agent loops

**Problem:** contentless “proceed” drifts (Cyno brain-driven loop lesson).  
**Ship:**

- Require `domainId` + success gate before auto-cycle  
- Persist aim on trajectory; stall when a round neither advances aim nor verifies  
- Gate: `hub:convert-aim-persist-smoke`

---

## 3. Reciprocity (Cyno-owned — not Chrysalis build)

Chrysalis contributors may open PRs on CynoEngine **when invited**, but:

- **We do not edit CynoEngine `.gitignore` or force privacy files onto that repo.** Instance lockouts are **Michael’s / the Cyno maintainers’** choice.
- We only **recommend** privacy patterns (see §3a) in collab issues and this doc so contributors know what must never land in Chrysalis or public forks.

### 3a. Privacy recommendations (for Cyno maintainers — optional on their side)

These are **suggestions**, not patches we push to `nimbus7772017/CynoEngine`:

| Keep out of public git (recommended) | Why |
| --- | --- |
| `*_soul.md`, instance identity files | Customer/ISP persona + real org detail |
| `cyno.toml` with real hosts/paths (keep `*.example` only) | Topology / DSN |
| Lake dumps, `episodes.jsonl`, weights, utility JSON | Corpus + learned instance state |
| `.env`, API keys, Slack/Zabbix credentials | Secrets |
| Prod IPs, eNB addresses, customer PII in specs | Operational sensitivity |

**Chrysalis rule:** never vendor Cyno souls, lake dumps, or prod topology into this monorepo. Cite mechanisms only.

### 3b. Expansion ideas we offer Cyno (discussion only)

Implementation stays on their repo. Offered as peer notes:

1. **Config seam** — finish lifting hardcoded lake DSN / paths into `cyno.toml` + env-only secrets (their own draft already says this).  
2. **Evidence-used utility v2** — grade which surfaced rows were actually used in a successful outcome (their §4g); don’t feed utility from cross-encoder relevance.  
3. **Aim-gated drive** — refuse brain-driven auto-cycle on contentless “proceed”; persist aim across rounds.  
4. **CI “doc vs box”** — a smoke that fails when SPEC claims BUILT but a symbol/flag is missing (their “trust the box” lesson).  
5. **Provenance on lake rows** — stable `document_id` + source digest + ingest time (Chrysalis-style) for demote/quarantine.  
6. **Generic vs instance pack** — ship engine without souls; instance pack private/local only.  
7. **Optional org home** — `AgenticOp-io/CynoEngine` when they’re ready (same pattern as WPTP); still their privacy policy.

---

## 7. Status log (what we added on the Chrysalis side)

| Date | What |
| --- | --- |
| 2026-07-09 | **D6374** + this plan; STRATEGIC-PLAN §12 queues **G9520–G9550**; cite Cyno in IS docs / PROGRAM-HOME |
| 2026-07-09 | Privacy: **recommendations only** — we do **not** edit CynoEngine `.gitignore` or push lockout files to their tree |
| 2026-07-09 | Collab issues updated (CynoEngine#1, chrysalis#54) |

**Not yet built:** G9520–G9550 implementation (next “build” default = G9520).

---

## 4. Citation standard

When a Chrysalis change is Cyno-inspired, include in the PR / Decision Log:

```text
Inspired by CynoEngine (https://github.com/nimbus7772017/CynoEngine) —
<law or mechanism>, adapted to WebIR/oracle dispose. Not a code port.
```

---

## 5. Close order

```text
G9520 → G9530 → G9540 → G9550
```

Do not start G9530 until G9520 close smoke is green (salience without utility is still useful; utility without ranked near-miss is weaker). G9540/G9550 may parallel after G9520 if staffing allows.

**Default queue pointer:** [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12 item for **G9520**.

---

## 6. References

- CynoEngine README / `CynoEngine-SPEC.md` / `CYNOENGINE-SYSTEM-MAP.md` (instance map — treat as private topology)  
- Chrysalis [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md), [`INTELLIGENCE-SHORTHAND-PROTOCOL.md`](./INTELLIGENCE-SHORTHAND-PROTOCOL.md)  
- DESIGN **D6372** (live analytics), **D6374** (this program)
