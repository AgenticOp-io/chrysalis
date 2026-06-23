# CWL UI — WISP `/login` vendor bridge policy (Phase 15)

> **Status:** accepted (2026-06-23)  
> **Tracking:** G7110, **DESIGN D6208**

## Policy

WISP Module_Manager **`/login`** remains a **single explicit hole**:

- **Reason:** `hub-svelte:firebase-auth`
- **Meaning:** Firebase client OAuth / session bootstrap is **vendor infra**, not CWL syntax

Native CWL **`return ui`** covers **all other** WISP page routes (M5 cutover). `/login` is the **documented exception** until a CWL-native auth RFC ships (out of Phase 15 v0 scope).

## Chimera contract

- **GET `/login`** — CWL route with hole; chimera may serve legacy Svelte+Firebase sidecar
- **API auth** — proxied upstream (`/api/*`); not lowered into CWL UI
- **No silent lowering** — do not replace the hole with HTML stubs that claim OAuth parity

## Phase 15 close (G7110)

- **RFC-0017** server element trees + **RFC-0018** `@component` reuse — shipped
- **This doc** — `/login` bridge policy — satisfies G7110 login requirement
- **Regression:** `hub:wisp-cwl-phase13-close-smoke` (**G6410**) — still expects exactly **one** `hub-svelte:firebase-auth` hole
