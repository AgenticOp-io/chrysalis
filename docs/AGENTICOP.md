# AgenticOp and Chrysalis

**AgenticOp** is the public **practice** for verification-led modernization and operations: delivery centers **CWL** as the migration contract and **Intelligence Shorthand** so agents skip heavyweight LLM calls when verify already externalized the answer — always **grounded in production behavior** (oracle traces and replay), not speculative rewrites.

- **Site / primary domain:** https://agenticop.io  
- **Demo hub (HTTPS):** https://hub.agenticop.io — Translation Hub operator UI (Caddy + Let's Encrypt on GCE).  
- **WISP demo (HTTPS, optional):** https://wisp.agenticop.io  
- **Display name:** **AgenticOp** (not “AgenticOps”; avoid **`agenticops.*`** hostnames in new materials).

## How it uses Chrysalis

**Chrysalis** (this repository, **MIT**) supplies the **engine**:

- **Oracle** capture and **corpus** design  
- **WebIR** ingest and emit  
- **`chrysalis verify`** replay and correctness reporting  
- **Chimera** dual-stack **`chrysalis deploy`** modes  

**AgenticOp** supplies the **program**: scoping, change management, CI gates, cutover, and optional retainers—engineering judgment stays in the loop while **verification** remains the authority on whether behavior matched.

## Assets

Vector logos and usage notes: **[`../branding/agenticop/README.md`](../branding/agenticop/README.md)**.

Commercial lever ordering (services, support, licensed builds): **[`COMMERCIAL.md`](./COMMERCIAL.md)**.

## Firebase Hosting (`agenticop.io`)

The landing page source lives in **[`agenticop-site/`](../agenticop-site/)** — **`index.html`** uses the same **inline** stylesheet as the original wisptools-era static page; **`site.css`** is **generated** for **`whitepaper.html`** only (from that inline block + **`whitepaper-append.css`** via **`scripts/rebuild-agenticop-site-css.mjs`**). **`assets/*.svg`** are kept in lockstep with **`branding/agenticop/`** by the same script. Also committed: **`whitepaper.html`**, **`whitepaper.md`** (byte copy of **`docs/WHITEPAPER.md`**). **`firebase.json`** deploys **`agenticop-site/`** to Hosting target **`agenticop`** → site **`agenticops-production`** in Firebase project **`wisptools-production`**. Technical overview: **https://agenticop.io/whitepaper.html**.

After editing **`docs/WHITEPAPER.md`** or **`index.html`** styles, run **`pnpm run sync:agenticop-site`** (or **`pnpm run deploy:agenticop-site`**) so **`whitepaper.md`** and **`site.css`** / **`assets/`** stay aligned; **`pnpm test`** guards **`whitepaper.md`** vs **`docs/WHITEPAPER.md`** and **`assets/`** vs **`branding/agenticop/`**.

### Zenodo (documentation only — no source code)

Publish markdown materials (CWL + Intelligence Shorthand) **without** a repo tarball:

1. Token: [zenodo.org/account/settings/applications/tokens/new/](https://zenodo.org/account/settings/applications/tokens/new/) — scopes **`deposit:write`**, **`deposit:actions`**.
2. Preview bundle + metadata: **`pnpm run publish:zenodo`**
3. Publish: **`$env:ZENODO_TOKEN='<token>'; pnpm run publish:zenodo -- --publish`**
4. Sandbox test: add **`--sandbox`**

Script: **`scripts/publish-zenodo.mjs`**. Do **not** enable GitHub–Zenodo release archiving if you want to avoid automatic code uploads.

- **Default web.app URL:** https://agenticops-production.web.app  
- **Custom domain** **agenticop.io**: add in Firebase console → Hosting → **agenticops-production** → Add custom domain (DNS at your registrar).

For maintainers with Firebase CLI access:

1. **`pnpm install`** (includes **`firebase-tools`**).
2. **`firebase login`** (once).
3. From the repo root: **`pnpm run deploy:agenticop-site`** (runs **`firebase deploy --only hosting`** against **`wisptools-production`**).

**`.firebaserc`** (committed) pins **`projects.default`** = **`wisptools-production`** and the **`hosting.agenticop`** → **`agenticops-production`** mapping. **`firebase.json`** sets **`hosting.target`** = **`agenticop`**. Do **not** deploy this target to the primary **`wisptools-production`** Hosting site if that site serves another app; this repo only targets **`agenticops-production`**.

**`.firebaserc.example`** is a minimal template for other Firebase projects.

## Demo hub TLS (`hub.agenticop.io`)

The Translation Hub runs on GCE **`chrysalis-test-vm`** (port **19090**). Public HTTPS uses **Caddy** on the VM with automatic **Let's Encrypt** certificates.

### One-time DNS (at your registrar)

| Host | Type | Value |
| --- | --- | --- |
| `hub.agenticop.io` | A | GCE VM external IP (same as hub IP deploy) |
| `wisp.agenticop.io` | A | same IP (optional; WISP on **19100**) |

Wait for DNS propagation before running TLS setup (Let's Encrypt HTTP-01).

### GCP firewall

Allow **tcp:443** to the VM (e.g. tag **`chrysalis-hub`** or default network rule). Port **19090** can stay for direct IP access during transition.

### Deploy TLS on the VM

From repo root (after DNS points at the VM):

```powershell
pnpm run deploy:hub-caddy-tls
```

Or: **`.\scripts\gce-hub-caddy-deploy.ps1 -Project chrysalis-dev-f5x6qv`**

Script: **`scripts/gce-hub-caddy-tls.sh`**. Override hosts with **`CHRYSALIS_HUB_PUBLIC_HOST`**, **`CHRYSALIS_WISP_PUBLIC_HOST`**, ACME email with **`CHRYSALIS_CADDY_ACME_EMAIL`** (default **`hello@agenticop.io`**).

After TLS is live, site and WISP doc links default to **`https://hub.agenticop.io`**. Override with **`CHRYSALIS_HUB_DOCS_BASE`** for IP-only dev.
