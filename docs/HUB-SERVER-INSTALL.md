# Translation Hub — server install (client/server)

Professional converters run the **hub server** on a central host. Browsers connect as clients. The hub uses **SSH/SCP** to reach any number of legacy origin sites per project and runs translations with **per-site progress meters** and **parallel batch** execution.

## Architecture

| Role | Component |
|------|-----------|
| **Server** | `scripts/chrysalis-operator-web.mjs` (REST + SSE on port **19090**) |
| **Client** | Browser UI (`chrysalis-operator-index.html` + `ui.js`) |
| **Data** | `~/.chrysalis-hub/projects.json` and `~/.chrysalis-hub/workspaces/<project>/sites/<site>/` |
| **Toolchain** | Chrysalis repo on the server (`pnpm run build:hub-all`) |

## Automated install (Linux)

```bash
git clone https://github.com/AgenticOp-io/chrysalis.git
cd chrysalis
chmod +x scripts/hub-install.sh
./scripts/hub-install.sh
bash scripts/gce-chrysalis-status.sh
```

Or: `pnpm run hub:install-server` then start with `gce-chrysalis-status.sh`.

**GCE refresh** (`scripts/gce-test-vm-refresh.ps1`) uploads the repo and runs `gce-test-vm-bootstrap.sh`, which builds the workspace, installs WPTP Next.js sibling, and runs **`gce-hub-finish-deploy.sh`** (PHP, verify, restart hub).

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `CHRYSALIS_STATUS_PORT` | `19090` | Hub listen port |
| `CHRYSALIS_STATUS_REPO` | `~/chrysalis-test` | Chrysalis checkout |
| `CHRYSALIS_HUB_MAX_PARALLEL` | `3` | Concurrent site translations |
| `CHRYSALIS_OPERATOR_TOKEN` | (empty) | Bearer token for API writes |
| `CHRYSALIS_SKIP_WPTP_HUB_DEPS` | `0` | Set `1` to skip `wptp-emit-nextjs` clone |

## Multi-site workflow

1. Create a **project** with output language (web targets only).
2. In **Console**, **Add site** — SSH host, user, path; code is pulled to `sites/<site-id>/`.
3. **Run all sites** — batch API runs up to `CHRYSALIS_HUB_MAX_PARALLEL` sites at once.
4. Each site shows its own **progress bar**; SSE event `batchProgress` updates the UI.

API:

- `POST /api/hub/projects/:id/sites` — add origin
- `POST /api/hub/projects/:id/run-batch` — parallel translate
- `GET /api/hub/projects/:id/batch-progress` — per-site meters
- `GET /api/hub/language-readiness` — popularity-ordered ingest/emit status (`scope=popular-web`, `grade=open|silver|gold`, `limit=N`)
- `GET /api/hub/language-work-queue` — scoped backlog rows (`scope=popular-web|all`, `grades=open,silver`)

See also [HUB-DEMO-INSTALL.md](./HUB-DEMO-INSTALL.md) and [HUB-CONNECTIVITY.md](./HUB-CONNECTIVITY.md).
