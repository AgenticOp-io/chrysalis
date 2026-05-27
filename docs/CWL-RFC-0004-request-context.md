# CWL RFC 0004 — Request headers and cookies

**Status:** accepted (2026-05-26)  
**ROADMAP:** G84  
**DESIGN:** D389

## Summary

Promote Express `req.headers` / `req.cookies`, Flask headers, and PHP `$_SERVER` / `$_COOKIE` access into CWL **`header`** and **`cookie`** bindings.

## Syntax

```cwl
@route GET "/auth"
handler auth_check {
  effects: none;
  header Authorization;
  cookie session_id;
  return { auth: Authorization, sid: session_id };
}
```

| Binding | WebIR |
| --- | --- |
| `header Name;` | `requestField({ source: "header", name: "Name" })` |
| `cookie name;` | `requestField({ source: "cookie", name: "name" })` |

Header names preserve case (e.g. `Authorization`, `Accept-Language`).

## Verification

- **`cwl-request-context-hono`**, **`cwl-request-context-fastify`**, **`cwl-request-context-nextjs`**
- Fixture: **`fixtures/hub-gold-cwl-request-context/routes.cwl`**

## Non-goals

- Multi-value headers, signed cookies, or auth middleware presets (future RFC).
