# CynoEngine × Chrysalis — incorporation plan

> **Status:** **closed** (2026-07-09) — **G9520–G9550** shipped under **DESIGN D6375**  
> **Authority:** DESIGN **D6374** (plan) · **D6375** (implementation)  
> **Locked path:** [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md)  
> **Upstream ideas:** [nimbus7772017/CynoEngine](https://github.com/nimbus7772017/CynoEngine) (Theurgy / salience engine)  
> **Collab issues:** [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1) · [chrysalis#54](https://github.com/AgenticOp-io/chrysalis/issues/54)  
> **Org home:** [`PROGRAM-HOME.md`](./PROGRAM-HOME.md)

## 0. Stance (non-negotiable)

| Do | Do not |
| --- | --- |
| Port **laws and gated prototypes** into Chrysalis TypeScript | Merge CynoEngine into the Chrysalis monorepo |
| Cite CynoEngine in DESIGN / this doc / IS docs / trajectory fields | Import lake DSN, souls, private corpus, prod topology |
| Keep repos separate under AgenticOp-io when transferred | Replace oracle/verify with salience scores |
| All contributors may PR either repo | Bypass `STRATEGIC-PLAN.md` close-before-build |

**Shared thesis (both products):** competence lives in the **substrate**, not the model weights.  
**Different substrates:** Chrysalis = WebIR + CWL + oracle; Cyno = lake + LLM-free salience + governor.

**Citation string (every Cyno-inspired surface):**

```text
Inspired by CynoEngine (https://github.com/nimbus7772017/CynoEngine) —
adapted to WebIR/oracle dispose. Not a code port.
```

Exported as `CYNOENGINE_ATTRIBUTION` from `@chrysalis/web-llm`.

---

## 1. Already shipped (baseline before this plan)

| Gate | What | Cyno rhyme |
| --- | --- | --- |
| **G9510 / D6372** | Live analytics: hit / near-miss / miss + `verifyCostMs`; demote on verify-fail; trajectory v2 | Outcome closes the loop; skip-LLM only on exact hit |
| **G8600** | IS tier retrieval + `skipLlm` | Surface ≠ do (retrieval before actor) |

---

## 2. Incorporation queue — **closed (D6375)**

| Gate | Slice | Smoke | Package API |
| --- | --- | --- | --- |
| **G9520** | Near-miss salience v1 | `pnpm run hub:is-near-miss-salience-smoke` | `scoreNearMissCandidates`, ranked `resolveShorthandWithTransfer` |
| **G9530** | Outcome → utility prior | `pnpm run hub:is-utility-prior-smoke` | `recordUtilityOutcome`, `chrysalis.web-llm.is-utility` |
| **G9540** | Convert / tool governor | `pnpm run hub:convert-governor-smoke` | `classifyConvertAction`, `governConvertAction` |
| **G9550** | Aim persistence | `pnpm run hub:convert-aim-persist-smoke` | `createConvertAim`, `evaluateAimDrive` |
| **G9560** | Evidence-used utility v2 | `pnpm run hub:is-evidence-used-utility-smoke` | `recordEvidenceUsedUtility` |
| **G9570** | MCP governor coverage | `pnpm run hub:mcp-governor-coverage-smoke` | `listGovernedAgentTools` |
| **G9580** | Aim+governor cycle gate | `pnpm run hub:convert-cycle-gate-smoke` | `gateConvertCycle` |
| **G9590** | Doc-vs-box CI | `pnpm run hub:doc-vs-box-smoke` | scripts/exports ↔ DESIGN |

**Wiring:** hub IS routing logs `nearMissScore` / `collaborationAttribution` / `convertAim` / `governorTier`; verify-apply records utility + enforces RED governor.

**Non-goals (unchanged):** embeddings/pgvector in Chrysalis core; copying `cyno_archi.py`; LLM self-report as utility; merging repos.

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

## 4. Citation standard

When a Chrysalis change is Cyno-inspired, include in the PR / Decision Log:

```text
Inspired by CynoEngine (https://github.com/nimbus7772017/CynoEngine) —
<law or mechanism>, adapted to WebIR/oracle dispose. Not a code port.
```

---

## 5. Close order (completed)

```text
G9520 → G9530 → G9540 → G9550  (all green under D6375)
```

---

## 6. References

- CynoEngine README / `CynoEngine-SPEC.md` / `CYNOENGINE-SYSTEM-MAP.md` (instance map — treat as private topology)  
- Chrysalis [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md), [`INTELLIGENCE-SHORTHAND-PROTOCOL.md`](./INTELLIGENCE-SHORTHAND-PROTOCOL.md)  
- DESIGN **D6372** (live analytics), **D6374** (this program), **D6375** (implementation)

---

## 7. Status log

| Date | What |
| --- | --- |
| 2026-07-09 | **D6374** + this plan; STRATEGIC-PLAN §12 queues **G9520–G9550** |
| 2026-07-09 | Privacy: **recommendations only** — we do **not** edit CynoEngine `.gitignore` |
| 2026-07-09 | Collab issues updated (CynoEngine#1, chrysalis#54) |
| 2026-07-09 | **D6375** ships **G9520–G9550**; all four smokes; `CYNOENGINE_ATTRIBUTION` on APIs/trajectory/hub |
| 2026-07-09 | **D6376** — **G8550** Migration OS close schema **v6** composes **G9510** + **G9520–G9550** |
| 2026-07-09 | **D6377** — **G9560–G9590** evidence-used utility, MCP governor coverage, cycle gate, doc-vs-box; **G8550** v7; strategic plan shared on CynoEngine#1 |
