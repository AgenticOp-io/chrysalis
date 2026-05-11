# AgenticOp static site (Firebase Hosting)

Source for **https://agenticop.io** (custom domain on Hosting site **`agenticops-production`**, project **`wisptools-production`**).

- **`site.css`** — generated for **`whitepaper.html`** only: run **`node scripts/rebuild-agenticop-site-css.mjs`** (also part of **`pnpm run sync:agenticop-site`**). It copies the inline **`<style>`** block from **`index.html`** (the canonical wisptools-era palette) plus **`whitepaper-append.css`**, and copies **`branding/agenticop/*.svg`** into **`assets/`** so the hosted logos match the repo marks.
- **`index.html`** — landing page; **inline CSS** (same as last committed design before split). Do not move its styles to **`site.css`** without updating the rebuild script.
- **`index.html`** — full landing (brand, methodology, Chrysalis engine, in-repo pilots table, FAQ).
- **`whitepaper.html`** + **`whitepaper.md`** — Chrysalis technical overview (Markdown synced from **`docs/WHITEPAPER.md`** on each **`pnpm run deploy:agenticop-site`**).
- **`assets/`** — SVG logos (keep in sync with **`branding/agenticop/`** when marks change).

Keep **`agenticop-site/whitepaper.md`** in lockstep with **`docs/WHITEPAPER.md`**: **`pnpm run sync:agenticop-site`** (Vitest asserts they match).

Deploy from repo root: **`pnpm run deploy:agenticop-site`** (runs sync, then Firebase; see **`docs/AGENTICOP.md`**). Public URLs: **https://agenticop.io/** · **https://agenticop.io/whitepaper.html**
