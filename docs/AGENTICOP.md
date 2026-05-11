# AgenticOp and Chrysalis

**AgenticOp** is the public **practice** for agent-assisted modernization and operations that stays **grounded in production behavior**—not hand-waved rewrites.

- **Site / primary domain:** https://agenticop.io  
- **Display name:** **AgenticOp** (not “AgenticOps”; avoid **`agenticops.*`** hostnames in new materials).

## How it uses Chrysalis

**Chrysalis** (this repository, **MIT**) supplies the **engine**:

- **Oracle** capture and **corpus** design  
- **WebIR** ingest and emit  
- **`chrysalis verify`** replay and correctness reporting  
- **Chimera** dual-stack **`chrysalis deploy`** modes  

**AgenticOp** supplies the **program**: scoping, change management, CI gates, cutover, and optional retainers—always with room for **human** judgment while **verification** stays the authority on “did behavior match.”

## Assets

Vector logos and usage notes: **[`../branding/agenticop/README.md`](../branding/agenticop/README.md)**.

Commercial lever ordering (services, support, licensed builds): **[`COMMERCIAL.md`](./COMMERCIAL.md)**.

## Firebase Hosting (`agenticop.io`)

The landing page source lives in **[`agenticop-site/`](../agenticop-site/)** — **`index.html`** uses the same **inline** stylesheet as the original wisptools-era static page; **`site.css`** is **generated** for **`whitepaper.html`** only (from that inline block + **`whitepaper-append.css`** via **`scripts/rebuild-agenticop-site-css.mjs`**). **`assets/*.svg`** are kept in lockstep with **`branding/agenticop/`** by the same script. Also committed: **`whitepaper.html`**, **`whitepaper.md`** (byte copy of **`docs/WHITEPAPER.md`**). **`firebase.json`** deploys **`agenticop-site/`** to Hosting target **`agenticop`** → site **`agenticops-production`** in Firebase project **`wisptools-production`**. Technical overview: **https://agenticop.io/whitepaper.html**.

After editing **`docs/WHITEPAPER.md`** or **`index.html`** styles, run **`pnpm run sync:agenticop-site`** (or **`pnpm run deploy:agenticop-site`**) so **`whitepaper.md`** and **`site.css`** / **`assets/`** stay aligned; **`pnpm test`** guards **`whitepaper.md`** vs **`docs/WHITEPAPER.md`** and **`assets/`** vs **`branding/agenticop/`**.

- **Default web.app URL:** https://agenticops-production.web.app  
- **Custom domain** **agenticop.io**: add in Firebase console → Hosting → **agenticops-production** → Add custom domain (DNS at your registrar).

For maintainers with Firebase CLI access:

1. **`pnpm install`** (includes **`firebase-tools`**).
2. **`firebase login`** (once).
3. From the repo root: **`pnpm run deploy:agenticop-site`** (runs **`firebase deploy --only hosting`** against **`wisptools-production`**).

**`.firebaserc`** (committed) pins **`projects.default`** = **`wisptools-production`** and the **`hosting.agenticop`** → **`agenticops-production`** mapping. **`firebase.json`** sets **`hosting.target`** = **`agenticop`**. Do **not** deploy this target to the primary **`wisptools-production`** Hosting site if that site serves another app; this repo only targets **`agenticops-production`**.

**`.firebaserc.example`** is a minimal template for other Firebase projects.
