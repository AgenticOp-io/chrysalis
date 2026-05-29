# CWL RFC 0006 — Response status

**Status:** accepted (2026-05-26)  
**ROADMAP:** G100  
**DESIGN:** D395

## Summary

Optional explicit HTTP status before `return` for reviewable migration contracts.

## Syntax

```cwl
@route POST "/items"
handler items_create {
  effects: none;
  status 201;
  return { ok: true };
}
```

| Statement | WebIR |
| --- | --- |
| `status N;` | Metadata on route export; ingest wraps handler return in `web.request` `response` when N ≠ 200 |

Default status is **200** when omitted.

## Verification

- **`cwl-response-status-hono`**, **`cwl-response-status-fastify`**, **`cwl-response-status-nextjs`**
- Fixture: **`fixtures/hub-gold-cwl-response-status/routes.cwl`**

## Non-goals

- Response headers, content negotiation, streaming (future RFC).
