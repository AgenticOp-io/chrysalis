# WPTP — Convert orbit (cohesion)

**Status:** active — Convert-owned  
**Not:** CWL DNA / Secure Helix core  
**Layout:** AgenticOps `platforms/wptp-*` (preferred) · optional `engines/wptp-*` clones

**Parent map:** how this orbit fits peels / CWL DNA / Helix — [`CONVERT-WHOLE-SYSTEM.md`](./CONVERT-WHOLE-SYSTEM.md).

## Thesis

WPTP (Web Platform Translation Program) built the **WebIR bundle interchange**, **contract-first** OpenAPI/HAR paths, **Next.js emit**, and **compatibility matrix** that Convert’s Hub still uses. The product spine is now **CWL · Convert · Secure** with Rosetta meaning in `@chrysalis/webir` + CWL. WPTP stays as Convert’s **optional orbit** — peels, Hub legs, CI evidence — not a second language SoR.

```text
  platforms/wptp-adapter-*  ─┐
  OpenAPI / HAR              ├─► Convert Hub compose / peels
  platforms/wptp-emit-*     ─┤
  platforms/wptp-matrix     ─┘     grades / harness
           │
           ▼
  @chrysalis/webir  (CWL reverse-home junction)
  export-webir-bundle.mjs
           │
           ▼
  @wptp/ir import (optional hop for Next / matrix)
```

## Sibling roots (one resolver)

Shared: [`scripts/lib/wptp-siblings.mjs`](../scripts/lib/wptp-siblings.mjs)

| Preference | Path |
| --- | --- |
| 1 | `WPTP_SIBLINGS_ROOT` env |
| 2 | `AgenticOps/platforms/` when `wptp-ir/package.json` exists |
| 3 | `AgenticOps/engines/` (legacy clones next to convert) |

Per-repo overrides: `WPTP_IR_ROOT`, `WPTP_MATRIX_ROOT`, `WPTP_EMIT_NEXTJS_ROOT`, …

**Canonical portfolio clones:** `platforms/wptp-*`. Duplicate `engines/wptp-matrix` / `engines/wptp-emit-nextjs` are legacy install defaults — prefer platforms; do not edit both.

## CWL package junctions (required for Hub pin)

```powershell
pnpm run link:cwl-packages-from-cwl   # cwl + webir + runtime-* + emit-runtime-cwl
pnpm run link:webir-from-cwl          # webir only (subset)
```

These paths are **gitignored**. Never `git add` / `git rm` them — on Windows, reparse points delete **into** `chrysalis-cwl`.

## Convert entrypoints

| Script | Role |
| --- | --- |
| `pnpm run hub:install-wptp` | Ensure emit-nextjs + matrix built |
| `pnpm run hub:wptp-orbit-smoke` | Cohesion: siblings + CWL webir/cwl junctions |
| `pnpm run hub:wptp-gold-smoke` | Matrix gold (needs siblings) |
| `pnpm run wptp:d7-audit` | Quarterly checklist helper |
| `pnpm run wptp:d3-silver-harness` / `wptp:d4-*` / `wptp:silver-nextjs-harness` | CI harnesses |

Honest skip: `CHRYSALIS_SKIP_WPTP=1` or `CHRYSALIS_SKIP_WPTP_HUB_DEPS=1`.

## What Convert must not do

- Fork `@chrysalis/webir` or CWL grammar into `@wptp/ir`
- Treat matrix Gold as language DNA proof (use CWL golds + convert gravity for that)
- Edit `engines/chrysalis-cwl` from WPTP work

## Related

- Program charter: [`MASTER-PROGRAM.md`](./MASTER-PROGRAM.md)
- Multi-root IDE: [`MULTI-REPO-WORKSPACE.md`](./MULTI-REPO-WORKSPACE.md)
- D7 ongoing: [`WPTP-D7-ONGOING.md`](./WPTP-D7-ONGOING.md)
- WebIR reverse-home: [`WEBIR-REVERSE-HOME.md`](./WEBIR-REVERSE-HOME.md)
- CWL consume: [`CONVERT-CWL-CONSUME.md`](./CONVERT-CWL-CONSUME.md)
- Paused index: [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md)
