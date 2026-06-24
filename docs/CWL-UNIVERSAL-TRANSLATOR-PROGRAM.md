# CWL universal translator program (Phase 26)

> **Status:** **Program closed** (2026-06-24, **G7690**) — was **active** (**G7600**, 2026-06-24)  
> **Authority:** **DESIGN D6267**; [`CWL-UNIVERSAL-TRANSLATOR-PARITY.md`](./CWL-UNIVERSAL-TRANSLATOR-PARITY.md) (inbound parity, **G7590**); this program (**N×N through CWL**)  
> **Requires:** **G7590** full web language program **closed**

## Thesis

**Universal translator** = every chartered web language converts to every other **through CWL as the primary hub**:

```text
Lang A  →  lift  →  WebIR  →  CWL  →  emit  →  Lang B
```

Phase **25** closed **inbound parity** (all origins → CWL at CWL evidence bar). Phase **26** closes **outbound + composer cross-edges** — not brute-force 16×16 CI, but a **composer charter** (**MASTER-PROGRAM** §9) with mandatory roundtrip, CWL outbound targets, and evidenced cross-edges.

**Charter:** `fixtures/hub-universal-translator-slice/chrysalis.translator-composer.v1.json` (`composerCrossEdges`, `cwlOutboundTargets`)

## What “N×N through CWL” means (locked)

| Tier | Scope | Bar |
| --- | --- | --- |
| **Inbound (regression)** | All hub web origins → CWL | Mandatory roundtrip route parity (**G7603**) |
| **CWL outbound** | CWL → native + hono/fastify | Hole-free emit on gold CWL fixture (**G7602**) |
| **Composer cross-edges** | Chartered `from → to` pairs | `A → CWL → B` hole budget + route parity (**G7604**) |
| **Program regression** | **G7690** composite | Includes **G7590** subordinate |

**Still out of scope:** Unchartered 575×26 marketing matrix; edges without CI; string transpile without WebIR.

## Phases

### Phase 26a — Composer charter (**G7601**)

Signed composer charter, docs aligned, taxonomy sync.

**Close:** `pnpm run hub:cwl-phase26a-close-smoke`

### Phase 26b — CWL outbound emit (**G7602**)

CWL hub fixture emits to every `cwlOutboundTargets` entry hole-free.

**Close:** `pnpm run hub:cwl-phase26b-close-smoke`

### Phase 26c — Mandatory inbound roundtrip (**G7603**)

All web origins: export → CWL re-lift with **route parity** (no Vitest skip).

**Close:** `pnpm run hub:cwl-phase26c-close-smoke`

### Phase 26d — Composer cross-edges (**G7604**)

Every `composerCrossEdges` pair: **A → CWL → B** green.

**Close:** `pnpm run hub:cwl-phase26d-close-smoke`

### Program close (**G7690**)

Phases **26a–26d** + **G7590** regression composite green.

**Smoke:** `pnpm run hub:cwl-universal-translator-close-smoke`

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| **G7600** | Program entry | `hub:cwl-universal-translator-program-entry-smoke` |
| **G7601** | Phase 26a charter close | `hub:cwl-phase26a-close-smoke` |
| **G7602** | Phase 26b CWL outbound close | `hub:cwl-phase26b-close-smoke` |
| **G7603** | Phase 26c roundtrip mandatory close | `hub:cwl-phase26c-close-smoke` |
| **G7604** | Phase 26d cross-edge close | `hub:cwl-phase26d-close-smoke` |
| **G7690** | **Universal translator program close** | `hub:cwl-universal-translator-close-smoke` |

## Default maintenance queue (program closed)

1. **G7690 regression** — `pnpm run hub:cwl-universal-translator-close-smoke`
2. **G7590 subordinate** — included in G7690 composite
3. **G6731** optional IR helper tier

## Related

- [`CWL-FULL-WEB-LANGUAGE-PROGRAM.md`](./CWL-FULL-WEB-LANGUAGE-PROGRAM.md) — **G7590**
- [`PROJECT-TO-CWL-TRANSLATE-PATH.md`](./PROJECT-TO-CWL-TRANSLATE-PATH.md) — inbound path
- [`MASTER-PROGRAM.md`](./MASTER-PROGRAM.md) — composer / N×N discipline
