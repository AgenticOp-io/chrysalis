# CWL RFC-0019 — Native UI v1 (client islands + events)

**Status:** accepted (2026-06-16)  
**Tracking:** G7304, G7310, DESIGN D6260  
**Extends:** [RFC-0017](CWL-RFC-0017-native-ui-v0.md), [RFC-0018](CWL-RFC-0018-native-ui-components.md)

## Summary

Phase **19** extends server UI v0 with **client islands** and **declarative event bindings**. Islands are **explicit boundaries** — no silent Svelte/React lowering. Hydration and client runtime execution remain **non-goals** in v1; islands serialize to `data-cwl-island="client"` markers with event metadata for future client bundles.

## Syntax

### Client island

```cwl
return ui {
  element "main" {
    client ui {
      element "button" {
        text "Add";
        on click { action "increment"; }
      }
    }
  }
};
```

| Construct | Meaning |
| --- | --- |
| `client ui { … }` | Client island boundary (serialized; server renders wrapper + metadata) |
| `on EVENT { action "name"; }` | Declarative event binding on parent element (metadata only in v1) |

## WebIR lowering

- Islands lower to `data.ui.tree` nodes with `kind: "island"`, `client: true`.
- Events attach to element nodes as `events: [{ name, action }]`.
- Runtime renders islands as `<div data-cwl-island="client">…</div>` with `data-cwl-on-{event}` attributes.

## Non-goals (v1)

- Hydration or client JS execution in `runtime-cwl`
- Silent lowering of Svelte/React/Vue components
- Full client state stores

## Verify

- Gold fixture `fixtures/hub-gold-cwl-ui-v1`
- Suites `cwl-ui-v1-hono`, `cwl-ui-v1-fastify`
- Gate **G7310** — `pnpm run hub:cwl-phase19-close-smoke`
