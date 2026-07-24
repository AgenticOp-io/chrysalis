# Trade secret + Apache OSS boundary (budget path)

> **Status:** operator playbook (not legal advice)  
> **Decision:** Prefer **trade secret + trademark + services** over patents when budget is tight.  
> **License intent:** Chrysalis engine → **Apache-2.0** public; exclusivity from **what you never publish** + contracts.  
> **Companion private pack (do not OSS):** `AgenticOps/commercial/chrysalis-private-pack/` (sibling of this repo).

This doc is **safe to keep in the public tree**. It names *categories* and *rules*. It must **not** contain customer data, tuned thresholds from live jobs, redaction path lists for a named client, GCE topology, or signing keys.

---

## 0. Hard rule

| If it will be in the Apache repo / public docs / blog / demo source | It is **not** a trade secret anymore |
| --- | --- |
| If it lives only in the private pack, customer vault, or NDA MSA | It **can** be a trade secret |

Open-sourcing the **engine** does not require open-sourcing the **practice**. AgenticOp bills for the practice.

---

## 1. Publish under Apache (engine moat becomes community)

Ship these freely — they recruit users and prove honesty:

| Asset | Why public is OK |
| --- | --- |
| WebIR / CWL / ingest / emit / verify / oracle packages | Product adoption; Apache patent grant cuts both ways |
| Canon laws (**D6442** / **D6447** / **D6448** / **D6448-ST**) as *principles* | Brand + trust; hard to monopolize as IP anyway |
| Public fixtures, gold smokes, matrix grades with honest Bronze/Silver | Credibility; no client PII |
| CLI, hub UI chrome, Migration OS *schemas* | Interop |
| COBOL CLBS-shaped *mini* prove + docs that cite public benchmarks | Shows rigor; weights/frameworks are prior art |

**Do not** confuse “published methodology narrative” with “protectable secret.” Once in git for the world, competitors can copy the *idea*. They still cannot copy your **closed engagement evidence**.

---

## 2. Keep private (trade secret candidates — beyond COBOL)

Ranked by how much they still matter after Apache OSS:

### A. Engagement evidence (strongest)

| Secret | Examples | Why it survives OSS |
| --- | --- | --- |
| Customer corpora / traces | Oracle NDJSON, session-shaped captures | Never in `main`; customer-controlled storage |
| Residual hole ledgers from live converts | Named `data-cwl-hole` taxonomies per app | Learned failure modes = delivery speed |
| Signed-in ST prove artifacts | Screenshots, route diffs, checklist JSON with hostnames | D6448-ST evidence packs |
| Private adapters | `wptp-adapter-*`, IdP corpora (see `WPTP-D6-ENTERPRISE-POLICY.md`) | Contract-bound repos |

### B. Operational playbooks (strong if not blogged)

| Secret | Examples | Notes |
| --- | --- | --- |
| ST-close runbooks | Ordered steps that actually cleared ArcGIS / auth / overlays on a *class* of apps | Generalize in private pack; scrub names before any case study |
| Inventory → gap → convert sequencing | Which adapters first; when to stop and amend | Distinct from public `UNIVERSAL-CONVERSION-METHOD.md` *outline* |
| Propose/dispose tuning | Verify thresholds, plateau `N`, skip-LLM hit-rate floors from **live** IS jobs | Fixture numbers in-repo ≠ production priors |
| Chimera cutover recipes | Dual-stack route %, HMAC config, rollback triggers | Ops, not code |

### C. Commercial & credential secrets (always private)

| Secret | Location rule |
| --- | --- |
| License Ed25519 **private** signing key | Offline machine only; never GitHub |
| GCP SA keys, Firebase tokens, SSH | `.chrysalis-gcp-sa-key.json` gitignored; rotate on leak |
| Pricing, SOW rate cards, MSA playbooks | Outside engine repo |
| Support channel + customer lists | CRM / vault |

### D. Brand (not trade secret — still protect)

| Asset | Action |
| --- | --- |
| **AgenticOp** / **Chrysalis** names & logos | Trademark use guidelines; `branding/agenticop/` |
| Public URL | `https://chrysalis.agenticop.io/` |

Trademarks are cheap relative to patents and fit the budget path.

---

## 3. What looks like a secret but is not (after OSS)

Do **not** waste energy “protecting” these once the repo is public:

- “Use an LLM then verify”
- “Inventory before convert”
- “Emit holes instead of silent guess”
- “WebIR + CWL dual IR” as a slogan
- CLBS / LegacyCodeBench-shaped 30/20/50 scoring (public prior art)
- Anything already in `DESIGN.md` Decision Log on a public remote

Those are **positioning**. Defend them with **execution quality** and **AgenticOp delivery**, not secrecy.

---

## 4. Split-repo layout (recommended)

```text
AgenticOps/
  engines/PHP_converter/          # → Apache-2.0 public Chrysalis
  commercial/chrysalis-private-pack/   # NEVER public; templates + filled engagement packs
  brand/agenticops-web/           # marketing; separate ownership
```

| Rule | Detail |
| --- | --- |
| No private pack path inside the OSS git tree | Avoid accidental `git add` |
| One vault per customer engagement | `engagements/<client-slug>/` under private pack |
| Scrub before any public case study | Hostnames, tokens, employee names, unique hole strings |

---

## 5. Before flipping GitHub to public (scrub checklist)

Run from a clean clone; fail the flip if any hit:

1. [ ] No `.chrysalis-gcp-sa-key.json`, `*-gcp-sa-key.json`, `.env*`, Firebase tokens  
2. [ ] No customer trees under `fixtures/` beyond agreed public samples  
3. [ ] No filled `chrysalis-private-pack` or engagement ledgers  
4. [ ] `reports/` / `generated/` large dumps reviewed or gitignored  
5. [ ] LICENSE + NOTICE Apache-2.0; `package.json` / `COMMERCIAL.md` license text consistent  
6. [ ] Demo hosts don’t expose private corpora or admin without auth  
7. [ ] LICENSE signing **private** key never lived in history (rotate if unsure)  
8. [ ] CONTRIBUTING states: customer adapters and corpora are **not** accepted into `main`

Private pack checklist (filled): `AgenticOps/commercial/chrysalis-private-pack/07-oss-scrub-checklist.md`

---

## 6. How AgenticOp still monetizes

Aligned with [`COMMERCIAL.md`](./COMMERCIAL.md):

1. **Services** — convert programs using private ST packs + corpora  
2. **SLA / support** — named channel on the OSS engine  
3. **Optional licensed distribution** — vendor builds + signed envelopes (keys stay secret)  
4. **Training** — curriculum can cite public canon; workshops use private failure taxonomy  

Exclusivity = **contracts + secrets + speed**, not “they can’t read the code.”

---

## 7. Explicit non-goals

- Filing broad software patents on convert methodology (budget path: skip)  
- Claiming trade-secret status for text you already published  
- Putting “confidential” watermarks on files that ship in Apache `main`

---

## Related

- [`COMMERCIAL.md`](./COMMERCIAL.md)  
- [`WPTP-D6-ENTERPRISE-POLICY.md`](./WPTP-D6-ENTERPRISE-POLICY.md)  
- [`COMPLETE-CONVERSION-SUCCESS-TEMPLATE.md`](./COMPLETE-CONVERSION-SUCCESS-TEMPLATE.md)  
- [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md) (public metrics vs live priors)  
- Private pack: `../../commercial/chrysalis-private-pack/` (relative from AgenticOps layout)
