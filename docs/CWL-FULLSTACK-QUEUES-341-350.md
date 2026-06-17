# Full-stack CWL — queues 341–350 (Phase P post-126..130 + hub-bridge)

> **Status:** queues **341–345** complete (2026-06-17); **346–350** not chartered  
> **Authority:** `docs/STRATEGIC-PLAN.md` §12; **`ROADMAP.md` G4707+**  
> **Prerequisite:** queue 340 complete (schema **413**)

| Queue | ROADMAP | Theme | Batch | Schema |
| --- | --- | --- | --- | --- |
| 341 | G4707–G4716 | Post-269 Post-126 tri-origin verify-gaps replay | v341 | 414 |
| 342 | G4717–G4726 | Post-270 Post-127 verify-gaps ingest closure replay | v342 | 415 |
| 343 | G4727–G4736 | Post-271 Post-128 auth-probe reingest HTTP replay | v343 | 416 |
| 344 | G4737–G4746 | Post-272 Post-129 IR helper lifting replay | v344 | 417 |
| 345 | G4747–G4756 | Post-273 Post-130 post-90 verify-gaps composite replay (Phase P lock) | v345 | 418 |
| 346–350 | — | *Not chartered* | — | — |

**Next slice (346–365):** replay **post-274..293** (post-131..150 depth + hub-bridge).

**Vitest:** `hub-cwl-authoring-batch-v341.test.ts` through `v345.test.ts`

**Non-goals (unchanged):** production SQL/session without parity evidence; hydration.
