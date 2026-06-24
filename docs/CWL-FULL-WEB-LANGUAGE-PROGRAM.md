# CWL full web language program (Phase 25)

> **Status:** **Program closed** (2026-06-24, **G7590**) — was **active** (**G7500**, 2026-06-24)  
> **Authority:** **DESIGN D6264** / **D6265**; [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §7; [`CWL-UNIVERSAL-TRANSLATOR-PARITY.md`](./CWL-UNIVERSAL-TRANSLATOR-PARITY.md)  
> **Requires:** **G7490** customer pilot program **closed**

## Thesis

**Fully complete web language** — no reserved or hedged surfaces on chartered tiers. CWL is the **verified authoring source for all in-scope web application code** (API, Pages, Data, Effects, UI), not “complete on flagship with holes elsewhere.”

**Universal translator parity** — project-to-CWL (`migration.cwl` export, semantic diff, all hub web origins) meets the **same bar as CWL-authored modules**: hole budgets, native projection ratio, gold verify, and HTTP cutover evidence on oracle-tier flagships.

Prior programs closed the **language** (G7150), **universal in-scope source** (G7390), and **customer pilot slice** (G7490). Phase 25 closes the remaining gap: **translator ≡ CWL** on evidence, not just export plumbing.

**Charter:** `fixtures/hub-full-web-language-slice/chrysalis.full-language-charter.v1.json`

## What “fully complete” means (locked)

| Tier | Scope | Bar |
| --- | --- | --- |
| **CWL-authored** | Flagship, greenfield, data-v2, UI v1 gold | **100%** native CWL projection, zero holes |
| **Translator oracle** | PHP plain + Symfony + Express flagships | **Hole-free** export + same verify replay as CWL |
| **Translator web matrix** | Hub web-origin languages (see charter) | **≥99%** native projection aggregate |
| **All origins export** | 24/24 hub origin fixtures | Lift → WebIR → `migration.cwl` succeeds |

**Still out of scope:** infra/vendor layers (DB, Firebase, ArcGIS, GenieACS), live proprietary customer repos, 575×26 marketing matrix.

## Phases (shipped)

### Phase 25a — Completion charter (**G7501**)

Signed charter, taxonomy sync (no “reserved UI”), program docs aligned.

**Close:** `pnpm run hub:cwl-phase25a-close-smoke`

### Phase 25b — CWL-authored complete (**G7502**)

All chartered CWL modules at **100%** native projection.

**Close:** `pnpm run hub:cwl-phase25b-close-smoke`

### Phase 25c — Universal translator parity (**G7503**)

Oracle-tier hole-free export; all origins export; web-origin native ratio ≥ charter; mandatory translate path green.

**Close:** `pnpm run hub:cwl-phase25c-close-smoke`

### Phase 25d — Translator verify replay (**G7504**)

CWL flagship gold + HTTP verify; translator oracle paths at CWL-equivalent evidence.

**Close:** `pnpm run hub:cwl-phase25d-close-smoke`

### Program close (**G7590**)

Phases **25a–25d** + **G7490** regression composite green.

**Smoke:** `pnpm run hub:cwl-full-web-language-close-smoke`

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| **G7500** | Program entry | `hub:cwl-full-web-language-program-entry-smoke` |
| **G7501** | Phase 25a charter close | `hub:cwl-phase25a-close-smoke` |
| **G7502** | Phase 25b CWL complete close | `hub:cwl-phase25b-close-smoke` |
| **G7503** | Phase 25c translator parity close | `hub:cwl-phase25c-close-smoke` |
| **G7504** | Phase 25d translator verify close | `hub:cwl-phase25d-close-smoke` |
| **G7590** | **Full web language program close** | `hub:cwl-full-web-language-close-smoke` |

## Default maintenance queue (program closed)

1. **G7590 regression** — `pnpm run hub:cwl-full-web-language-close-smoke`
2. **G6731** optional IR helper tier

## Related

- [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md) — **G7490**
- [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md) — **G7390**
- [`PROJECT-TO-CWL-TRANSLATE-PATH.md`](./PROJECT-TO-CWL-TRANSLATE-PATH.md)
- [`CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md)
