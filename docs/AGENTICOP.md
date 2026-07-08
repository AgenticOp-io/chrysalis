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

## Public site (`agenticop.io`)

**Canonical source:** **[AgenticOp-io/agenticops-web](https://github.com/AgenticOp-io/agenticops-web)** — layout, **`agenticops.css`**, pages, nav, and Firebase config. Clone beside this repo (e.g. **`../agenticops-web`**) and deploy from there only.

| Repo | Role |
| --- | --- |
| **`agenticops-web`** | **Production** marketing site → **https://agenticop.io** |
| **`chrysalis/agenticop-site/`** | **Mirror only** — **`whitepaper.md`** sync from **`docs/WHITEPAPER.md`**, Zenodo bundle; **never** `firebase deploy` this folder |

### Deploy (from Chrysalis root)

```bash
pnpm run deploy:agenticop-site
```

Runs **`firebase deploy --only hosting:agenticops`** in **`../agenticops-web`** (override with **`AGENTICOPS_WEB_DIR`**). Default Firebase project: **`agenticop-io`** (override with **`AGENTICOP_FIREBASE_PROJECT`**).

Or from the site repo:

```bash
cd ../agenticops-web
firebase deploy --only hosting:agenticops --project agenticop-io
```

See **`agenticops-web/README.md`**, **`AGENTS.md`**, and **`DNS_SETUP.md`** in that repo.

### Whitepaper mirror (this repo)

After editing **`docs/WHITEPAPER.md`**, run **`pnpm run sync:agenticop-site`** so **`agenticop-site/whitepaper.md`** and **`site.css`** / **`assets/`** stay aligned; **`pnpm test`** guards the copy.

### Zenodo (documentation only — no source code)

Publish markdown materials (CWL + Intelligence Shorthand) **without** a repo tarball:

1. Token: [zenodo.org/account/settings/applications/tokens/new/](https://zenodo.org/account/settings/applications/tokens/new/) — scopes **`deposit:write`**, **`deposit:actions`**.
2. Preview bundle + metadata: **`pnpm run publish:zenodo`**
3. Publish: **`$env:ZENODO_TOKEN='<token>'; pnpm run publish:zenodo -- --publish`**
4. Sandbox test: add **`--sandbox`**

Script: **`scripts/publish-zenodo.mjs`**. Do **not** enable GitHub–Zenodo release archiving if you want to avoid automatic code uploads.

**Legacy:** Root **`firebase.json`** + **`.firebaserc`** in this repo are **not** used for production deploys. They remain for historical reference only; use **`agenticops-web`** instead.

## Demo hub TLS (`hub.agenticop.io`)

The Translation Hub runs on GCE **`chrysalis-test-vm`** (port **19090**). Public HTTPS uses **nginx + certbot** on the VM (port **80** is already nginx; **443** terminates TLS and reverse-proxies to **19090**).

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

Script: **`scripts/gce-hub-nginx-tls.sh`** (invoked by **`pnpm run deploy:hub-caddy-tls`**). Override hosts with **`CHRYSALIS_HUB_PUBLIC_HOST`**, **`CHRYSALIS_WISP_PUBLIC_HOST`**, ACME email with **`CHRYSALIS_HUB_ACME_EMAIL`** (default **`hello@agenticop.io`**). Set **`CHRYSALIS_HUB_NGINX_WISP=1`** when **`wisp.agenticop.io`** DNS exists.

After TLS is live, site and WISP doc links default to **`https://hub.agenticop.io`**. Override with **`CHRYSALIS_HUB_DOCS_BASE`** for IP-only dev.
