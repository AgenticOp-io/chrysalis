# CWL RFC-0018 — Native UI components (v0.1)

**Status:** accepted (2026-06-23)  
**Tracking:** G7113, DESIGN D6208  
**Extends:** [RFC-0017](CWL-RFC-0017-native-ui-v0.md)

## Summary

Reusable server UI fragments via module-level **`@component`** definitions and **`return ui Component { props }`** on pages.

## Syntax

```cwl
@component Card {
  prop title;
  return ui {
    element "div" class "card" {
      element "h2" { text title; }
    }
  };
}

@page GET "/card"
page card_page {
  effects: none;
  return ui Card { title: "Hello"; };
}
```

Props accept string literals or bare identifiers (path/query/load bindings per RFC-0014 rules).

## Lowering

Components expand at ingest to a **`data.ui.tree`** (no second IR). Unknown components → **`cwl:unknown-component:<name>`** hole.

## Verify

- `fixtures/hub-gold-cwl-ui-v0` — component + binding routes
- `pnpm run hub:cwl-ui-v0-smoke` (**G7111**)

## Non-goals (v0.1)

- Client islands, slots, children composition
- Cross-module component imports
- Replacing `hub-svelte:firebase-auth` on WISP `/login`
