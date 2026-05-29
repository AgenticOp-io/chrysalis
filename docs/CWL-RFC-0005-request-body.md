# CWL RFC 0005 — JSON request body fields

**Status:** accepted (2026-05-26)  
**ROADMAP:** G99  
**DESIGN:** D394

## Summary

Promote JSON POST body field access into CWL **`body`** bindings (requires module `use json;` for parser middleware preset).

## Syntax

```cwl
module api;
use json;

@route POST "/items"
handler items_create {
  effects: none;
  body title;
  body qty;
  return { ok: true, title: title, qty: qty };
}
```

| Binding | WebIR |
| --- | --- |
| `body name;` | `requestField({ source: "body", name: "name" })` |

## Verification

- **`cwl-request-body-hono`**, **`cwl-request-body-fastify`**, **`cwl-request-body-nextjs`**
- Fixture: **`fixtures/hub-gold-cwl-request-body/routes.cwl`**

## Non-goals

- Raw body bytes, multipart uploads, nested path into body (future RFC).
