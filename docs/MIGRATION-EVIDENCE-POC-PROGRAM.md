# Migration Evidence POC (Phase 35)

> **Status:** closed (**G8480**, superseded by **G8550** Migration OS)  
> **Authority:** **DESIGN D6284**  
> **Hub:** [`MIGRATION-OS.md`](./MIGRATION-OS.md)

## What this is

A **unified operator hub** for Horizon 2 “Hub as migration OS”: one page linking verify-gated evidence from port-site, federation, and web-LLM agent programs. **Models propose; WebIR + oracle + verify dispose.**

This is not hosted Hub API ingest — it is the **local evidence dashboard** sponsors run before enterprise deployment.

## One-command demo

```bash
pnpm run migration-evidence:demo
# or
chrysalis evidence demo
```

Open `reports/migration-evidence/poc/index.html`.

## Gates

| ID | Goal | Smoke |
| --- | --- | --- |
| **G8480** | Unified Migration Evidence POC close | `hub:migration-evidence-poc-close-smoke` |
| **G8550** | Migration OS composite (evidence + open legacy + VMF hub) | `hub:migration-os-close-smoke` |

## Sub-program hubs

| Program | Hub |
| --- | --- |
| Site-Port + VMF | `reports/federation/poc/index.html` |
| Web-LLM agent | `reports/web-llm/poc/index.html` |
| Verify League | `reports/federation/league/index.html` |

## Related docs

- [`SITE-PORT-FEDERATION-PROGRAM.md`](./SITE-PORT-FEDERATION-PROGRAM.md)
- [`SITE-TO-CWL-LLM-PROGRAM.md`](./SITE-TO-CWL-LLM-PROGRAM.md)
- [`OPEN-WEB-LLM-POC.md`](./OPEN-WEB-LLM-POC.md)
