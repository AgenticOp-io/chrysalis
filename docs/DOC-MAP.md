# Convert documentation map

**Lane:** `engines/chrysalis-convert` · GitHub [AgenticOp-io/chrysalis](https://github.com/AgenticOp-io/chrysalis)  
**CWL tip pin (Convert):** **`1.0.88`** · CI sibling `fixtures/ci/cwl-sibling.json` → `cwl-v1.0.88` · smoke `hub:cwl-pin-smoke` → `CONVERT_TIP_1_0_88_OK`  
**Remaining doc gaps:** [`DOC-HOLES.md`](./DOC-HOLES.md)

This is the **Convert documentation index**. Prefer this page over hunting the `docs/` tree. Operator reading order for day-to-day Migration OS work still starts at [`MIGRATION-OS.md`](./MIGRATION-OS.md); contributor/agent rules stay in root [`AGENTS.md`](../AGENTS.md) + [`DESIGN.md`](../DESIGN.md).

---

## 1. Entry points (pick one)

| If you need… | Start here |
| --- | --- |
| **Where docs live (this map)** | [`DOC-MAP.md`](./DOC-MAP.md) |
| Operator stack / demos / gates | [`MIGRATION-OS.md`](./MIGRATION-OS.md) |
| How peels + CWL DNA + WPTP + Helix fit | [`CONVERT-WHOLE-SYSTEM.md`](./CONVERT-WHOLE-SYSTEM.md) |
| Locked build order | [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) · product canon [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) |
| Inventory-first convert method | [`UNIVERSAL-CONVERSION-METHOD.md`](./UNIVERSAL-CONVERSION-METHOD.md) |
| AI / contributor laws | [`AGENTS.md`](../AGENTS.md) · [`DESIGN.md`](../DESIGN.md) |
| Historical / paused programs | [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`archive/INDEX.md`](./archive/INDEX.md) |
| Honest remaining doc debt | [`DOC-HOLES.md`](./DOC-HOLES.md) |

Legacy catalog (long tables): [`README.md`](./README.md) — still valid; **this map owns navigation**.

---

## 2. What Convert owns vs CWL vs Secure

| Concern | Owner | Convert role |
| --- | --- | --- |
| Grammar, RFCs, language golds, parse/print, DNA gene surface | **CWL** (`engines/chrysalis-cwl`) | Consume via `file:` junctions; never fork |
| Origin lift, inventory, peels, Hub, fat ingest, emit, oracle/verify, Chimera | **Convert** | Translate only (**D6442** / **D6447**) |
| Helix traffic DNA, seed/compare/enforce, cutover phenotype | **Secure** (`engines/chrysalis-security`) | Consume cutover smoke only |
| `@wptp/ir` / matrix / Next emit | **Convert orbit** (`platforms/wptp-*`) | Optional Hub peels — not DNA SoR |

Pointers: [`CWL-PILLAR-HOME.md`](./CWL-PILLAR-HOME.md) · [`CORE-VS-PEEL.md`](./CORE-VS-PEEL.md) (**D6551**) · umbrella `AgenticOps/docs/THREE_PILLARS.md`.

---

## 3. Consume path (CWL tip → Convert prove)

| Step | Doc / artifact | Proof |
| --- | --- | --- |
| Pin policy + handoff | [`CONVERT-CWL-CONSUME.md`](./CONVERT-CWL-CONSUME.md) | `file:../chrysalis-cwl/packages/cwl` ≡ **1.0.88** |
| CI sibling bootstrap | [`fixtures/ci/cwl-sibling.json`](../fixtures/ci/cwl-sibling.json) | `ref: cwl-v1.0.88` · `tipVersion: 1.0.88` |
| Gravity (Rosetta Step 2) | [`CONVERT-GRAVITY.md`](./CONVERT-GRAVITY.md) | `hub:convert-gravity-smoke` → `CONVERT_GRAVITY_OK` |
| WebIR reverse-home | [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md) | Junction + `file:` |
| Fmt dual-mode | [`CWL-FMT-DUAL-MODE.md`](./CWL-FMT-DUAL-MODE.md) | Pillar parse/print ≠ Convert WebIR fmt |
| Whole-system cohesion | [`CONVERT-WHOLE-SYSTEM.md`](./CONVERT-WHOLE-SYSTEM.md) | `hub:convert-whole-system-smoke` → `CONVERT_WHOLE_SYSTEM_OK` |
| Named post-1.0.88 exec ceilings | [`CONVERT-EXEC-CEILINGS.md`](./CONVERT-EXEC-CEILINGS.md) | Residual policy; catalog/smoke land with [PR #102](https://github.com/AgenticOp-io/chrysalis/pull/102) |

**DNA fingerprint / proof tip ladder (document facts only — no Helix invent):**

| Tip | RFC (CWL SoR) | Gold | Convert consume honesty |
| --- | --- | --- | --- |
| **1.0.85** | [RFC-0042](../../chrysalis-cwl/docs/language/CWL-RFC-0042-dna-fingerprint.md) | `94` | Certificate / fingerprint / bank / `match live` — parse + catalog; refuse weak/bad shapes |
| **1.0.86** | [RFC-0043](../../chrysalis-cwl/docs/language/CWL-RFC-0043-dna-fingerprint-strong.md) | `95` | Fingerprint strength **sha384+**; `sha256` → `cwl:dna-fingerprint-too-weak` |
| **1.0.87** | [RFC-0044](../../chrysalis-cwl/docs/language/CWL-RFC-0044-dna-proof.md) | `96` | Multi-fingerprint · `match bank` · `dna expect` — document facts |
| **1.0.88** (current pin) | [RFC-0045](../../chrysalis-cwl/docs/language/CWL-RFC-0045-dna-proof-unit.md) | `97` | Named `dna proof` / `use dna proof` · quorum · lineage · supersedes · witness · scope |

DESIGN: **D6596–D6599**. Peel golds `40`–`63` via `hub:genome-deepen-peel-smoke`. Golds `94`–`97` are **document facts** — never invent Helix verify, digests, PQ hashes, or Nest/LiveView/Flutter façades.

---

## 4. Gravity, exec ceilings, whole-system, WPTP orbit

| Topic | Doc |
| --- | --- |
| Gravity / Translation closed | [`CONVERT-GRAVITY.md`](./CONVERT-GRAVITY.md) |
| Exec ceilings (opaque `g_*`, foreach N-iter, island execution) | [`CONVERT-EXEC-CEILINGS.md`](./CONVERT-EXEC-CEILINGS.md) · oracle wait in [`CONVERT-CWL-CONSUME.md`](./CONVERT-CWL-CONSUME.md) |
| Whole-system map + one-shot gate | [`CONVERT-WHOLE-SYSTEM.md`](./CONVERT-WHOLE-SYSTEM.md) |
| WPTP as Convert Hub/CI peels | [`WPTP-CONVERT-ORBIT.md`](./WPTP-CONVERT-ORBIT.md) · [`MULTI-REPO-WORKSPACE.md`](./MULTI-REPO-WORKSPACE.md) |
| Core vs peel charter | [`CORE-VS-PEEL.md`](./CORE-VS-PEEL.md) |
| Complete conversion / ST | [`COMPLETE-CONVERSION-PROTOCOL.md`](./COMPLETE-CONVERSION-PROTOCOL.md) · [`COMPLETE-CONVERSION-SUCCESS-TEMPLATE.md`](./COMPLETE-CONVERSION-SUCCESS-TEMPLATE.md) |

---

## 5. Pillar-sync (git bus)

| File | Rule |
| --- | --- |
| [`pillar-sync/OUTBOX.md`](./pillar-sync/OUTBOX.md) | **Convert writes only this** — commit + push candidate |
| [`pillar-sync/README.md`](./pillar-sync/README.md) | Local pointer |
| CWL `docs/pillar-sync/BOARD.md` + `OUTBOX.md` | Read every turn (pull siblings first) |
| Protocol | `chrysalis-cwl/docs/pillar-sync/PROTOCOL.md` |

Do not edit CWL or Secure trees from Convert sessions.

---

## 6. Mirrored CWL RFCs (non-SoR)

Convert `docs/CWL-RFC*.md` through **RFC-0021** (plus the RFC-0022 **pointer**) are **historical mirrors / consume notes**. They are **not** the source of truth.

| Fact | Location |
| --- | --- |
| Canonical RFC index | [`chrysalis-cwl/docs/language/CWL-RFC.md`](../../chrysalis-cwl/docs/language/CWL-RFC.md) |
| Convert mirror index (banner) | [`CWL-RFC.md`](./CWL-RFC.md) |
| DNA surface bridge pointer | [`CWL-RFC-0022-dna-surface-bridge.md`](./CWL-RFC-0022-dna-surface-bridge.md) |
| DNA fingerprint → proof units (1.0.85–1.0.88) | CWL RFC-0042 … RFC-0045 (no Convert full-text mirrors) |

Fill or deepen language RFCs **only** in `chrysalis-cwl`. Convert peels and hole catalogs consume them.

---

## 7. Engine / Hub / commercial (short index)

| Area | Docs |
| --- | --- |
| Install / CLI / ops | [`INSTALLATION.md`](./INSTALLATION.md) · [`USER-GUIDE.md`](./USER-GUIDE.md) · [`HOW-TO.md`](./HOW-TO.md) · [`OPERATIONS.md`](./OPERATIONS.md) |
| Hub / public URL | [`HUB-DEMO-INSTALL.md`](./HUB-DEMO-INSTALL.md) — **https://chrysalis.agenticop.io/** |
| Commercial | [`COMMERCIAL.md`](./COMMERCIAL.md) |
| GCE verify | [`GCE-LOCAL-VERIFY.md`](./GCE-LOCAL-VERIFY.md) |
| Do-not-invent index | [`DO-NOT-INVENT.md`](./DO-NOT-INVENT.md) |
| WISP POC (filled proof) | [`WISP-CWL-CONSOLIDATED-PIPELINE.md`](./WISP-CWL-CONSOLIDATED-PIPELINE.md) |

Full tables remain in [`README.md`](./README.md).

---

## 8. Known CI / doc debt (honesty — not greenwash)

Documented so the map does not invent green CI:

| Item | State (as of tip **1.0.88** pin on main) |
| --- | --- |
| Tip pin + gravity | On main — [PR #100](https://github.com/AgenticOp-io/chrysalis/pull/100) |
| `ReferenceError: empty is not defined` (emit auth → lib-helpers) | Open fix [PR #101](https://github.com/AgenticOp-io/chrysalis/pull/101) — local prove claimed; do not treat main CI as fixed until merged |
| `wptp-harness-smoke` / `@wptp/ir` install | Orbit CI sensitive to matrix lock + sibling checkout; harness workflow on main may still fail without the sibling `wptp-ir` path used on the fix branch — see DOC-HOLES |
| Named exec-ceiling catalog + smoke | Open [PR #102](https://github.com/AgenticOp-io/chrysalis/pull/102) |
| Clean-checkout Vitest reds (hub gate-only smokes needing prior reports) | Known (**D6575**) — do not force green |

See [`DOC-HOLES.md`](./DOC-HOLES.md) for the living gap list.
