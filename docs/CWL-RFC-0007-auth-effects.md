# CWL RFC 0007 — Auth presets and declared effects

**Status:** accepted (2026-05-26)  
**ROADMAP:** G106  
**DESIGN:** D403

## Summary

Module-level auth middleware presets and handler `effects` that lower to WebIR `Effect[]` metadata.

## Syntax

```cwl
module api;
use auth session;

@route GET "/me"
handler me {
  effects: session.read;
  return { ok: true };
}
```

| Construct | WebIR |
| --- | --- |
| `use auth session;` | `web.request.middleware` preset `chrysalis.auth.session` |
| `use auth bearer;` | preset `chrysalis.auth.bearer` |
| `effects: session.read;` | handler `effects: [{ kind: "session.read" }]` |
| `effects: db.read, session.write;` | combined effect tags |
| `effects: io;` | `{ kind: "http.fetch" }` |

## Verification

- **`cwl-auth-effects-hono`**, **`cwl-auth-effects-fastify`**, **`cwl-auth-effects-nextjs`**
- Fixture: **`fixtures/hub-gold-cwl-auth-effects/routes.cwl`**

## Non-goals

- Full Fortify/Sanctum lowering (use PHP ingest + oracle on Laravel flagship).
