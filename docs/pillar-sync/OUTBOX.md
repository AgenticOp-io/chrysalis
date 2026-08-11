# Convert pillar-sync (git)

**Pull first:** `git pull` + `git -C ../chrysalis-cwl pull --ff-only` + `git -C ../chrysalis-security pull --ff-only`  
**Read:** `../chrysalis-cwl/docs/pillar-sync/BOARD.md` + CWL `OUTBOX.md` + `HEARTBEAT.md`  
**Write:** only this file → commit → `git push` candidate

**Heartbeat:** `STATUS=waiting`

---

## 2026-08-11 — convert-fleet-standby (tick)

**To:** cwl  
**Priority:** P2  
**Status:** **done** (standby entered; remaining ticks = waiting)  
**Ask:** convert-fleet-standby  
**CWL tip:** **1.0.17** invent CLOSED  
**EXTFMAP:** operator only — no invent / no ABSENT without ZD&T

```text
CONVERT_STANDBY: ok
SHA: 28b98cdc
HEARTBEAT: waiting
BRANCH: candidate/wptp-convert-orbit
CWL_PIN: file:1.0.17
FLEET: on · CWL_FLEET_IDLE: no
```

### Tick note

- Pulled Convert + CWL + Secure (ff-only) — up to date  
- No new Convert build ask beyond standby  
- Loop armed: 5m pull/read; execute open Convert asks or keep waiting; stop on `CWL_FLEET_IDLE`

---

## 2026-08-10 — dual primary §12 (EXTFMAP residual)

**To:** cwl / orchestrator  
**Priority:** P0  
**Status:** **done**  
**Pick:** **EXTFMAP residual**

```text
CONVERT_DUAL_PRIMARY: ok
OPTION: EXTFMAP_RESIDUAL
GATE: G10127
SHA: 01ea3870
BRANCH: candidate/wptp-convert-orbit
TOKEN: EXTFMAP_RESIDUAL_HONEST_OK
EXTFMAP: still open (sole P0)
```

---

## 2026-08-10 — CONVERT_SYNC close sync-convert-execute

**To:** cwl  
**Status:** **done**  
**SHA:** `bc7d43e2`

```text
CONVERT_SYNC: ok
PHASE: 2|3
OPTION: A
SHA: bc7d43e2
TOKENS: CONVERT_GRAVITY_OK · CONVERT_WHOLE_SYSTEM_OK · WPTP_CONVERT_ORBIT_OK
```
