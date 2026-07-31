# Pilot checklist (buyer)

## Machine

- [ ] Node 20+ / pnpm / PHP 8.1+ on PATH  
- [ ] `pnpm install && pnpm -r build`  
- [ ] `pnpm run pilot:laravel-min` → `ok: true`  
- [ ] Optional COBOL wedge: `pnpm run pilot:cobol-clbs` → `ok: true` (EXTFMAP may remain sole open P0)  

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
