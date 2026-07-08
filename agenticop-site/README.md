# AgenticOp site mirror (Chrysalis repo — not production hosting)

**Production site:** **[AgenticOp-io/agenticops-web](https://github.com/AgenticOp-io/agenticops-web)** — dark theme, `agenticops.css`, multi-page layout, Firebase deploy from that repo only.

**Do not** `firebase deploy` this folder. It will overwrite **https://agenticop.io** with the wrong design. Use:

```bash
pnpm run deploy:agenticop-site   # runs firebase in ../agenticops-web
```

Set **`AGENTICOPS_WEB_DIR`** if the clone is elsewhere. See **`docs/AGENTICOP.md`**.

## What this folder is for

- **`whitepaper.md`** — byte copy of **`docs/WHITEPAPER.md`** for Zenodo and optional hosted whitepaper sync
- **`whitepaper.html`** — technical overview (styles from generated **`site.css`**)
- **`index.md`** — internal landing copy notes (not the live site)
- **`assets/`** — SVG logos synced from **`branding/agenticop/`**

Keep **`whitepaper.md`** in lockstep: **`pnpm run sync:agenticop-site`** (Vitest guards vs **`docs/WHITEPAPER.md`**).

Zenodo (docs only): **`pnpm run publish:zenodo`**
