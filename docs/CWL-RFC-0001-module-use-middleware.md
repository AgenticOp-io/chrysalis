# CWL RFC 0001 — Module `use` middleware presets

**Status:** accepted (2026-05-26)  
**ROADMAP:** G74  
**DESIGN:** D379

## Summary

Promote Express/Flask body-parser semantics into CWL as first-class module directives:

```cwl
module api;
use json;
use urlencoded;

@route POST "/echo"
handler echo_post {
  effects: io;
  return { ok: true };
}
```

## Motivation (cross-language synthesis)

| Source | Pattern | WebIR |
| --- | --- | --- |
| Express | `app.use(express.json())` | `web.request.middleware` preset `express.json` |
| Flask | implicit JSON/form parsing | synthetic `express.json` + `express.urlencoded` |
| Fastify | `@fastify/formbody` | future RFC |
| CWL (this RFC) | `use json;` / `use urlencoded;` | same presets as Express gold |

Evidence: hub gold suites **`js-middleware-*`**, **`python-middleware-*`**, **`hub-gold-replay-probe`** POST JSON probes.

## Syntax

| Line | Lowered preset |
| --- | --- |
| `use json;` | `express.json` |
| `use urlencoded;` | `express.urlencoded` |

- Module-level only (before or after `module` declaration, before routes).
- Order preserved as `order` on middleware nodes.
- Unknown `use` forms remain parse errors → holes in future RFCs.

## Implementation

- **`cwl-parser.mjs`**: `moduleUses[]` on `parseCwlModule`
- **`hub-cwl-middleware.mjs`**: `liftCwlModuleMiddlewareToWebir`
- **`cwl-ingest.mjs`**: emits middleware roots before routes

## Verification

- Structural: existing **`cwl-gold-hono`** / **`cwl-gold-fastify`** (no regression)
- Next: optional **`cwl-middleware-hono`** fixture with POST route + trace replay (follow-up)

## Non-goals

- Custom middleware functions in CWL (use holes + legacy delegate).
- Replacing `@chrysalis/ingest` PHP middleware lowering.
