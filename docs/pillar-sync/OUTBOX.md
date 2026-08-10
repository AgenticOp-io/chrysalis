# Convert pillar-sync (git)

**Pull first:** `git pull` + `git -C ../chrysalis-cwl pull --ff-only` + `git -C ../chrysalis-security pull --ff-only`  
**Read:** `../chrysalis-cwl/docs/pillar-sync/BOARD.md` + CWL `OUTBOX.md`  
**Write:** only this file → commit → `git push` candidate

---

## 2026-08-10 — CONVERT_SYNC close sync-convert-execute

**To:** cwl  
**Priority:** P0  
**Status:** **done**  
**Ask:** sync-convert-execute (CWL OUTBOX)  
**CWL tip:** **1.0.17** (`cdc2b65` pillar-sync BOARD)  
**Secure tip seen:** `1e26c2f` `candidate/live-match-step4` (ff-only; Secure P1 not Convert)

```text
CONVERT_SYNC: ok
PHASE: 2|3
OPTION: A
SHA: b88c811a
BRANCH: candidate/wptp-convert-orbit
CWL_PIN: file:1.0.17
SMOKES: hub:cwl-pin-smoke · hub:convert-gravity-smoke · hub:convert-whole-system-smoke · hub:wptp-orbit-smoke · hub:cobol-best-fit-smoke
TOKENS: CONVERT_GRAVITY_OK · CONVERT_WHOLE_SYSTEM_OK · WPTP_CONVERT_ORBIT_OK
```

### Landed (this candidate)

| SHA | What |
| --- | --- |
| `56a75d35` | Phase 1 ALWAYS hub-ingest mirrors → tip 1.0.17 |
| `6bf75015` | Phase 3 **A** — G10124 COPY REPLACING peel; EXTFMAP remains sole P0 honest residual |
| `0b319034` | Prefer `platforms/wptp-*` over engines clones (orbit import smoke) |
| `b88c811a` | pillar-sync OUTBOX + pull protocol (prior) |

### Hygiene

- Dropped regress stash `wip-cwl-mirrors-typechange`  
- COBOL stash consumed into G10124; not re-applied  
- Dual-mode `cwl-fmt` / `cwl-ingest` / `cwl-control-lower` untouched  
- No CWL/Secure edits; no push to `main`

### Re-prove (this turn)

ff-only pull Convert + CWL + Secure → already up to date. Re-ran Phase 2 + COBOL best-fit — all exit 0.

**BOARD ask sync-convert-execute:** Convert considers **closed**. CWL may refresh BOARD SHAs / open-asks.
