# AgenticOp and Chrysalis

**AgenticOp** is the public **practice** for verification-led modernization and operations: delivery centers **CWL** as the migration contract and **Intelligence Shorthand** so agents skip heavyweight LLM calls when verify already externalized the answer — always **grounded in production behavior** (oracle traces and replay), not speculative rewrites.

- **Site / primary domain:** https://agenticop.io  
- **Demo hub (HTTPS):** https://chrysalis.agenticop.io — Chrysalis public UI (nginx + certbot on GCE; alias **https://hub.agenticop.io**).  
- **WISP demo (HTTPS, optional):** https://wisp.agenticop.io  
- **Display name:** **AgenticOp** (not “AgenticOps”; avoid **`agenticops.*`** hostnames in new materials).

## How it uses Chrysalis

**Chrysalis** (this repository, **Apache-2.0**) supplies the **engine**:

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

## Demo hub TLS (`hub.agenticop.io` / `chrysalis.agenticop.io`)

**Authority:** **DESIGN D6396** · [`HUB-DEMO-INSTALL.md`](./HUB-DEMO-INSTALL.md) · [`nginx/chrysalis-hub.vhost.example`](./nginx/chrysalis-hub.vhost.example)

The Translation Hub runs on GCE **`chrysalis-test-vm`** (app port **19090**). Public HTTPS uses **nginx + certbot webroot** on the VM: **443** terminates TLS and reverse-proxies to **`127.0.0.1:19090`**. Port **80** is shared with FDE — Chrysalis only adds site **`chrysalis-hub`**.

### One-time DNS (at your registrar)

| Host | Type | Value |
| --- | --- | --- |
| `hub.agenticop.io` | A | **34.61.255.147** (`chrysalis-test-vm` external IP) |
| `chrysalis.agenticop.io` | A | same IP (required alias) |
| `wisp.agenticop.io` | A | same IP (optional; WISP chimera on **19100** — separate vhost, not this procedure) |

Wait for DNS propagation before certbot (Let's Encrypt HTTP-01).

### GCP firewall

Allow **tcp:443** (and **tcp:80** for ACME) to the VM. After HTTPS works and the hub binds **`127.0.0.1`**, optionally **close tcp:19090**.

### Do not touch (shared VM)

- FDE nginx sites: **`fragility-default-ip`**, **`fragility-public`**
- FDE runner port **8765**
- FDE **`default_server`** on **:80**

### Deploy TLS on the VM

From repo root (after DNS points at the VM):

```powershell
pnpm run deploy:hub-caddy-tls
```

Or: **`.\scripts\gce-hub-caddy-deploy.ps1 -Project chrysalis-dev-f5x6qv`**

Script: **`scripts/gce-hub-nginx-tls.sh`**. Hosts default to **`hub.agenticop.io chrysalis.agenticop.io`**. ACME email default **`admin@agenticop.io`** (`CHRYSALIS_HUB_ACME_EMAIL`). ACME webroot **`/var/www/chrysalis/acme`**.

After TLS is live, Chrysalis doc links default to **`https://chrysalis.agenticop.io`**. Override with **`CHRYSALIS_HUB_DOCS_BASE`** for IP-only dev.
