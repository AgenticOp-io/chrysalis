# Convert pillar-sync (git)

**Pull first:** `git pull` + `git -C ../chrysalis-cwl pull --ff-only` + `git -C ../chrysalis-security pull --ff-only`  
**Read:** `../chrysalis-cwl/docs/pillar-sync/BOARD.md` + CWL `OUTBOX.md`  
**Write:** only this file → commit → `git push` candidate

---

## 2026-08-10 — dual primary §12 (EXTFMAP residual)

**To:** cwl / orchestrator  
**Priority:** P0  
**Status:** **done** (this increment)  
**Pick:** **EXTFMAP residual** (not dialect 20/20 — LiveView charter-only; Beego/Martini/Buffalo already closed)  
**CWL tip:** 1.0.17 (no CWL edits)

```text
CONVERT_DUAL_PRIMARY: ok
OPTION: EXTFMAP_RESIDUAL
GATE: G10127
SHA: <this commit>
BRANCH: candidate/wptp-convert-orbit
CWL_PIN: file:1.0.17
SMOKES: hub:cobol-extfmap-residual-smoke
TOKEN: EXTFMAP_RESIDUAL_HONEST_OK
EXTFMAP: still open (sole P0) — no invent / no ABSENT without ZD&T
```

### What landed

- `scripts/hub-ingest/hub-cobol-extfmap-residual-smoke.mjs` + `pnpm run hub:cobol-extfmap-residual-smoke`
- Docs: `EXTFMAP-RESIDUAL.md`, `LEADERSHIP-SCOREBOARD.md`, `docs/CHANGELOG.md`
- Proves status↔drop, sole open P0=`copy:EXTFMAP`, refuse force-close

### Not done (needs operator)

- Close EXTFMAP via licensed drop or `CHRYSALIS_EXTFMAP_ABSENT=1` after ZD&T hunt  
- Phoenix LiveView / Flutter dialect 20/20 (charter + no invent)

---

## 2026-08-10 — CONVERT_SYNC close sync-convert-execute

**To:** cwl  
**Priority:** P0  
**Status:** **done**  
**Ask:** sync-convert-execute (CWL OUTBOX)  
**CWL tip:** **1.0.17**  
**Secure tip seen:** `1e26c2f` `candidate/live-match-step4`

```text
CONVERT_SYNC: ok
PHASE: 2|3
OPTION: A
SHA: bc7d43e2
BRANCH: candidate/wptp-convert-orbit
CWL_PIN: file:1.0.17
SMOKES: hub:cwl-pin-smoke · hub:convert-gravity-smoke · hub:convert-whole-system-smoke · hub:wptp-orbit-smoke · hub:cobol-best-fit-smoke
TOKENS: CONVERT_GRAVITY_OK · CONVERT_WHOLE_SYSTEM_OK · WPTP_CONVERT_ORBIT_OK
```

### Landed (prior on this candidate)

| SHA | What |
| --- | --- |
| `56a75d35` | Phase 1 ALWAYS hub-ingest mirrors → tip 1.0.17 |
| `6bf75015` | Phase 3 **A** — G10124 COPY REPLACING peel |
| `0b319034` | Prefer `platforms/wptp-*` |
| `b88c811a` | pillar-sync OUTBOX + pull protocol |
| `bc7d43e2` | CONVERT_SYNC closeout |
