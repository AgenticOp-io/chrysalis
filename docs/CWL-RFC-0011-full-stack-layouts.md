# CWL RFC 0011 — Full-stack layouts and page params

**Status:** accepted (2026-06-01)  
**Tracking:** G1145, DESIGN D1145

## Summary

Compose full-stack CWL modules with **shared layout imports** and **parametric pages**:

```cwl
module docs;
import "layouts/shell.cwl";

@page GET "/docs/:slug"
page doc_show {
  param slug;
  return html "<html><body><h1>Doc</h1></body></html>";
}
```

## Motivation

Real apps split shared chrome (nav, auth presets, about pages) from feature routes. RFC-0009 multi-file imports already merge routes; RFC-0011 standardizes **layout fragments** as imported `.cwl` files containing `@page` routes and module `use` presets.

## Syntax

| Construct | Meaning |
| --- | --- |
| `import "layouts/shell.cwl";` | Merge layout routes + module presets (RFC-0009) |
| `@page` + `param` / `query` | Same binding rules as `@route` handlers (RFC-0002/0003) |

Layout files may contain:

- Module `use` presets shared by the entry module
- Additional `@page` routes (e.g. `/about`)
- No requirement for a `module` declaration in fragments

## Verify

- Fixture: `fixtures/hub-gold-cwl-layout`
- Smoke: `pnpm run hub:cwl-layout-smoke`
- Round-trip: `@page` emit parity via `renderCwlRoutes` (RFC-0010 + G1143)

## Non-goals

- CSS/asset pipelines
- Nested layout inheritance (`extends layout`)
- Component slots
