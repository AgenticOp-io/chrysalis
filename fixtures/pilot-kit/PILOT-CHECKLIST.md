# Pilot checklist (buyer)

## Packaging gate (no invent)

- [ ] `pnpm run hub:cursor-pilot-kit-smoke` → stdout **`PILOT_KIT_OK`**  
- [ ] Report: `reports/pilot-kit/cursor-pilot-kit-smoke.json` with `ok: true`  

## Machine

- [ ] Node 20+ / pnpm / PHP 8.1+ on PATH (`mysqli` + `pdo_sqlite` for laravel-min)  
- [ ] `pnpm install && pnpm -r build`  
- [ ] `pnpm run pilot:laravel-min` → `ok: true`  
- [ ] Optional COBOL wedge: `pnpm run pilot:cobol-clbs` → `ok: true` (EXTFMAP may remain sole open P0 — never invent)  

## Cursor

- [ ] MCP config from `fixtures/pilot-kit/cursor-mcp.json` (`cwd` = repo root)  
- [ ] Optional rule: copy `chrysalis-pilot.mdc` → `.cursor/rules/`  
- [ ] Agent can list Chrysalis MCP tools  

## Session

- [ ] Read `reports/pilot-kit/laravel-min-pilot.json` (and/or `cobol-clbs-pilot.json`)  
- [ ] Propose only; apply RED only after confirm + verify green  
- [ ] Residual holes written to ledger (not force-settled)  

## Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Buyer technical | | |
| AgenticOp (if assisted) | | |
