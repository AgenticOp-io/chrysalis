# COBOL — IBM SDFHCOB / AID copybook drop (operator status)

> **As of:** 2026-07-28  
> **Purpose:** Track the licensed path to close residual ledger **P0** (`DFHAID` / `DFHBMSCA` / `EXTFMAP` / `CMQ*`) without inventing stubs (**D6442** / **D6447**).  
> **Related:** `hub:cobol-residual-ledger`, [`COBOL-MODERNIZATION-PROVE.md`](./COBOL-MODERNIZATION-PROVE.md), [`DO-NOT-INVENT.md`](./DO-NOT-INVENT.md).

---

## Goal

Drop licensed members into `fixtures/hub-cobol-clbs-mini/copybook/`:

- `DFHAID.cpy` (or PDS member export)
- `DFHBMSCA.cpy`
- optionally `EXTFMAP` / IBM MQ `CMQ*` (separate MQ entitlement)

Then re-run `hub:cobol-clbs-prove-smoke` / residual ledger — P0 proprietary-copy rows should shrink.

---

## Have (local Downloads, 2026-07-28)

| Artifact | Notes |
| --- | --- |
| `cicsts64.pax.Z` (~957 MB) | CICS TS **6.4 open beta** product (GIMZIP) |
| `cics64.lic.pax.Z` (~32 KB) | Beta activation module |
| `Beta Installation.txt` + readmes + Program Directory PDFs | Install JCL / docs |
| `CICS.6.4.Beta.09.Developer.Components.zip` | **JCICS JARs only** — no COBOL copybooks |
| Unpacked under `Downloads/_cics-beta-unpack/` | Outer pax + `SMPRELF` RELFILEs; EBCDIC `DFHAID` / `DFHBMSCA` / `SDFHCOB` markers found inside HCI7700 RELFILEs |

**Proven:** books are inside the beta package.  
**Not proven yet:** clean COBOL `.cpy` carve on Windows/WSL/GCE Linux without z/OS GIMUNZIP + SMP/E.

---

## Wrong paths (do not retry for this goal)

| What | Why skip |
| --- | --- |
| **CICS Transaction Gateway** trial (`ibm-cicstg-mp-trial.tar.gz` / container) | Client gateway — not SDFHCOB |
| **Virtual Dev and Test for z/OS** purchase | Paid ZD&T; not required if a free Z trial host exists |
| **IBM Z Trial: Data Gatherer + SMF Explorer** | Wrong product — no CICS / SDFHCOB |
| Ansible / ZOAU “managed node” setup | Needs an existing z/OS; does not provision one |
| Invented `DFHAID.cpy` stubs | Forbidden |

---

## Still need

1. **Free IBM Z Software Trial** with a real z/OS (prefer **ZD&T trial** or a trial that includes **CICS Transaction Server**) — https://www.ibm.com/products/z/trials  
2. Upload `cicsts64.pax.Z` + `cics64.lic.pax.Z` to that system’s USS  
3. Follow `Beta Installation.txt` (GIMUNZIP / SMP/E + activation)  
4. Export `SDFHCOB(DFHAID)` and `SDFHCOB(DFHBMSCA)` into the fixture `copybook/` tree (license: beta/non-production only; do not publish IBM source as Chrysalis product code)

GCE `chrysalis-test-vm` alone cannot finish the install (Linux ≠ z/OS). Upload there only as a **staging drop** of the `.pax.Z` files if useful for later transfer to the trial LPAR.

---

## Chrysalis stance meanwhile

- Residual ledger **P0** stays open (`pnpm run hub:cobol-residual-ledger`)
- Engine deepen continues on inventory / WebIR / gnu-honest subjects — **not** on fake AID books
- Behavioral bar remains **65/65**; no LCB claim

---

## Operator checklist

- [ ] Cancel/ignore Data Gatherer–SMF trial if still provisioning  
- [ ] Request **ZD&T** or **CICS TS** IBM Z trial  
- [ ] Confirm email names the right product before waiting  
- [ ] Install beta → export DFHAID/DFHBMSCA → place under `copybook/`  
- [ ] Re-prove clbs + residual ledger  
