# Convert documentation holes (honest residual)

**Purpose:** Living list of documentation (and doc-adjacent CI) gaps so [`DOC-MAP.md`](./DOC-MAP.md) stays complete without claiming false green.  
**Updated:** 2026-10-10 · CWL tip pin **1.0.88**

Close a hole by landing the doc/code **and** deleting or rewriting the bullet here.

---

## Open (Convert-owned or Convert-tracked)

1. **Emit `empty` / lib-helpers verify break** — Main tip pin landed, but tiny-blog verify can still hit `ReferenceError: empty is not defined` when auth helpers emit broken `lib-helpers` bodies. Fix track: [PR #101](https://github.com/AgenticOp-io/chrysalis/pull/101) (`candidate/convert-fix-lib-helpers-empty-import`). Docs must not claim main verify-e2e green until that merges.

2. **`wptp-harness-smoke` / `@wptp/ir` CI** — Optional orbit workflow can fail when matrix `npm ci` lacks `@wptp/ir@0.1.3` or the job does not checkout `wptp-ir`. Partial fix in flight on the empty-helpers branch (`wptp-harness-smoke.yml` sibling checkout). Until merged + proven on main, treat harness as **debt**, not green.

3. **Named exec-ceiling catalog + smoke** — Policy doc [`CONVERT-EXEC-CEILINGS.md`](./CONVERT-EXEC-CEILINGS.md) describes residuals. Machine catalog `fixtures/ci/convert-exec-ceilings.json` + `hub:convert-exec-ceiling-smoke` land with [PR #102](https://github.com/AgenticOp-io/chrysalis/pull/102). Until merge, prove ceilings via narrative + existing peels (`hub:cwl-early-exit-smoke`, island peels), not `CONVERT_EXEC_CEILINGS_HONEST`.

4. **Oracle fill for the three exec ceilings** — Opaque `g_*`/DB evaluate, foreach N-iteration HTML, browser island **execution** remain honest residuals (**D6447**). Docs name them; closing requires oracle + verify gold — not invent. Owner: Convert (+ Secure only for live DNA phenotype, not language invent).

5. **Convert RFC mirrors stale vs CWL tip** — Convert keeps full-text mirrors only through ~RFC-0021 (+ RFC-0022 pointer). RFCs **0023–0045** exist only under `chrysalis-cwl/docs/language/`. Do **not** re-mirror full text into Convert; keep [`CWL-RFC.md`](./CWL-RFC.md) as non-SoR banner + DOC-MAP tip ladder. Ops may still confuse agents who open Convert `CWL-RFC-0013` TBDs — that file is stamped non-SoR; prefer CWL canonical.

6. **DESIGN decision-log tip footnotes** — Historical **D6596–D6599** lines still say “CWL PR open; no tag yet” for tips that later tagged (`cwl-v1.0.88` etc.). Append-only log: do not rewrite history; current pin truth lives in [`CONVERT-CWL-CONSUME.md`](./CONVERT-CWL-CONSUME.md), [`fixtures/ci/cwl-sibling.json`](../fixtures/ci/cwl-sibling.json), and this map. Optional future: one “landed” footnote after D6599.

7. **Encoding mojibake in some Convert CWL pointers** — Files such as [`CWL-PILLAR-HOME.md`](./CWL-PILLAR-HOME.md) may show `ï¿½` where em-dashes/arrows were corrupted. Cosmetic; fix when touching those files (partially addressed in the DOC-MAP pass).

8. **Clean-checkout Vitest / hub gate-only reds** — **D6575**: many `packages/cli` hub smokes need prior conversion report artifacts. Documented as packaging-honest debt — not a tip-pin failure. Do not seed fake reports (**D6447**).

9. **Site / Firebase redeploy** — BOARD may list site emit + Firebase as open under the **site/brand** lane. Convert docs do not own `agenticops` Firebase deploy; do not document Convert as site publisher.

10. **WISP empirical fidelity ops** — Pipeline docs are filled; live GCE chimera / Firebase ship remains operator-triggered (`wisp:deploy:*`). Not a Convert language-doc hole; keep in WISP runbooks.

---

## Closed by this DOC-MAP pass (do not re-open without regress)

- Missing Convert documentation index → [`DOC-MAP.md`](./DOC-MAP.md)
- Tip **1.0.88** consume + DNA ladder **1.0.85–1.0.88** not linked from an index → DOC-MAP §3 + [`CONVERT-CWL-CONSUME.md`](./CONVERT-CWL-CONSUME.md)
- RFC mirror TBD left as if Convert-SoR → [`CWL-RFC.md`](./CWL-RFC.md) + [`CWL-RFC-0013-page-load-functions.md`](./CWL-RFC-0013-page-load-functions.md) non-SoR banners
- Exec ceilings unnamed in the index → [`CONVERT-EXEC-CEILINGS.md`](./CONVERT-EXEC-CEILINGS.md) + DOC-MAP §4

---

## Ops-owned (not Convert doc writers)

| Gap | Owner |
| --- | --- |
| CWL language RFC text / golds after tip bump | CWL pillar |
| Helix soak / cutover phenotype | Secure pillar |
| Public site genome Firebase | Site / brand lane |
| Licensed COBOL EXTFMAP drop | Operator + IBM entitlement ([`EXTFMAP-RESIDUAL.md`](./EXTFMAP-RESIDUAL.md)) |
