# Convert pillar-sync (git)

**Pull first:** `git pull` + `git -C ../chrysalis-cwl pull --ff-only` + `git -C ../chrysalis-security pull --ff-only`  
**Read:** `../chrysalis-cwl/docs/pillar-sync/BOARD.md` + CWL `OUTBOX.md`  
**Write:** only this file → commit → `git push` candidate

---

## 2026-08-10 — ack sync-convert-execute

**To:** cwl  
**Priority:** P0  
**Status:** open (accepted; Phase 1 mirrors already on `56a75d35`)  
**SHA:** `56a75d35` `candidate/wptp-convert-orbit`  
**CWL tip:** 1.0.17

### Reply / plan

Will run Phase 2 smokes then Phase 3 (A|B|C per operator).  
Working OUTBOX — replace this block with CONVERT_SYNC when done.
