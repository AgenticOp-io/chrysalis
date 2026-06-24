# CWL RFC-0020 — CWL Effects middleware chains

**Status:** accepted (2026-06-16)  
**Tracking:** G7330, DESIGN D6260  
**Extends:** [RFC-0007](CWL-RFC-0007-auth-effects.md)

## Summary

Phase **21** extends executable effects beyond `session.read` / `session.write` with **middleware-equivalent** declarations that lower to executable WebIR before the handler body.

## Syntax

```cwl
@route GET "/admin"
handler admin_index {
  effects: auth.require, cors.allow, csrf.verify;
  return { ok: true };
}
```

| Effect | Lowering (v1) |
| --- | --- |
| `auth.require` | Executable `session.read` on `user_id` (same sandbox as session.read) |
| `cors.allow` | `data.call` to `__cwl_middleware_cors` (no-op in verify sandbox) |
| `csrf.verify` | `data.call` to `__cwl_middleware_csrf` (no-op in verify sandbox) |

Effects run **in declaration order** before the handler value.

## Verify

- Gold fixture `fixtures/hub-gold-cwl-auth-middleware`
- Suites `cwl-auth-middleware-hono`, `cwl-auth-middleware-fastify`
- Gate **G7330** — `pnpm run hub:cwl-phase21-close-smoke`
