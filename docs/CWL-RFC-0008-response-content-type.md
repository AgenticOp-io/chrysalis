# CWL RFC 0008 — Response content-type

**Status:** accepted (2026-05-27)  
**ROADMAP:** G117  
**DESIGN:** D416

## Summary

Explicit response `Content-Type` for migration contracts and verify replay header checks.

## Syntax

```cwl
@route GET "/json"
handler json_ok {
  effects: none;
  content-type "application/json";
  return { ok: true };
}
```

| Statement | WebIR |
| --- | --- |
| `content-type "mime/type";` | `web.request.response` attrs `contentType` |
| `content-type json;` | Shorthand → `application/json` |
| `content-type text;` | Shorthand → `text/plain; charset=utf-8` |

May combine with **`status N;`** (RFC-0006).

## Verification

- **`cwl-response-content-type-hono`**, **`cwl-response-content-type-fastify`**, **`cwl-response-content-type-nextjs`**
- Fixture: **`fixtures/hub-gold-cwl-response-content-type/routes.cwl`**
- Emit: **`@chrysalis/emit-shared`** lowers `web.request.response` to framework returns (not only `__respond`).

## Non-goals

- Full response header maps, cookies on response, streaming (future RFC).
