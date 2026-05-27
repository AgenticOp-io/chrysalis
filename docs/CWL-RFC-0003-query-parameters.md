# CWL RFC 0003 — Query parameters

**Status:** accepted (2026-05-26)  
**ROADMAP:** G80  
**DESIGN:** D385

## Summary

Promote `?q=` query string access from Express (`req.query`), Flask (`request.args`), and PHP (`$_GET`) into CWL with `query name;` bindings and WebIR `requestField` `source: "query"`.

## Syntax

```cwl
@route GET "/search"
handler search {
  effects: none;
  query q;
  return { ok: true, q: q };
}
```

| Part | WebIR |
| --- | --- |
| `query q;` | Declares a query-string binding for the handler |
| `q: q` in `return { … }` | `data.requestField({ source: "query", name: "q" })` |

## Verification

- Structural + trace: **`cwl-query-params-hono`**, **`cwl-query-params-fastify`**, **`cwl-query-params-nextjs`**
- Fixture: **`fixtures/hub-gold-cwl-query-params/routes.cwl`**

## Non-goals

- Typed query coercion (int/bool) in v1 — all query params are strings in WebIR.
- Repeated/array query keys.
