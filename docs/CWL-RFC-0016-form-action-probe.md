# CWL RFC-0016 — Form-action hole probe

**Status:** accepted (2026-06-01)  
**Tracking:** G1401, DESIGN D1401

## Summary

Queue 25 verifies **catalogued form-action holes** remain explicit (`hub-svelte:form-action`) and are never silently lowered. This RFC documents the probe gate only — no form-action lowering in scope.

## Probe contract

- `CWL_FULLSTACK_HOLE_CATALOG["hub-svelte:form-action"]` exists
- Deep Svelte smoke still reports catalogued holes only
- Reserved fixture path: `fixtures/hub-gold-svelte-kit-deep/src/routes/notify/+server.ts` (POST API, not form-action)

## Non-goals

- SvelteKit `actions` export lowering
- Progressive enhancement / CSRF modeling
