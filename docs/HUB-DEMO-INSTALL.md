# Chrysalis Translation Hub — demo install guide

This guide is for the **public demo hub** on the Chrysalis test VM. Use it to walk through the UI without deploying your own server first.

## Demo URL

Open in your browser:

**http://34.61.255.147:19090/**

The hub listens on port **19090** only. It does not use port 80 (other apps on the shared VM may own that port).

## What you need

| Item | Notes |
|------|--------|
| Browser | Any modern desktop browser |
| Legacy app (optional) | PHP, Node, Python, Java, etc. on a server you can reach by SSH |
| SSH key on the hub VM | Private key path on the **hub** machine, not your laptop, when using SSH pull |

Gold-path translation (**PHP → TypeScript / Hono / Fastify**) uses Chrysalis ingest on the hub. Other **web** language pairs lift to WebIR and emit scaffolds or framework targets.

## Quick tour (no SSH)

1. Open the demo URL.
2. Read this guide from **Demo guide** in the nav (or `/docs/hub-install`).
3. Click **New project**.
4. Set **Origin** and **Output** (output list is **web application targets only** — no SQL, JSON, or native-only languages).
5. Leave SSH fields empty; use a name only and create the project (you can point **Local project path** at a folder already on the hub under `~/.chrysalis-hub/workspaces/`).
6. Open **Console** → **Run translation** and watch the live log.

## Full flow (SSH from hub to your server)

1. On your **origin** server, install the scan helper (optional but recommended):

   ```bash
   curl -fsSL https://raw.githubusercontent.com/AgenticOp-io/chrysalis/main/scripts/agents/install-origin-agent.sh | bash
   ```

   Or copy `scripts/agents/chrysalis-origin-scan.sh` from the Chrysalis repo.

2. On the **hub VM**, ensure your SSH public key is in `~/.ssh/authorized_keys` on the origin (or use a key file path the hub user can read).

3. In **New project**:
   - **Host**, **User**, **Port**, **Remote project path**
   - Check **Pull code to hub on create**
   - Optionally **Autodetect languages over SSH**
   - Pick **Origin** (web stack) and **Output** (web target, e.g. TypeScript or Hono)

4. **Test hub + SSH connectivity** before create.

5. **Create project** → **Open console** → **Run translation**.

## Output languages (web only)

The **Output** menu includes modern **web** stacks, for example:

- TypeScript, JavaScript, PHP, Python, Java, Kotlin, Go, Ruby, C#, Rust, Scala
- Vue, HTML, CSS, SCSS
- **Hono**, **Fastify**, **Next.js** (TypeScript frameworks)

It does **not** include SQL, JSON, YAML, Markdown, C/C++, Swift, or other non-web targets.

## Path explorer (575-pair matrix)

Open **Path explorer** in the nav (`#/paths`) or:

`http://34.61.255.147:19090/#/paths?origin=javascript&output=hono`

The page auto-loads cross-language synthesis, lists all **17 gold pairs**, and shows per-pair ingest/emit lanes plus **CI gold suite** coverage (`GET /api/hub/gold-suites`).

## Grades shown in the UI

| Grade | Meaning |
|-------|---------|
| **Gold** | Proven paths (e.g. PHP → TypeScript / Hono / Fastify; JS/TS/Python/CWL hub literal or structured lifts) |
| **Silver** | Hub lift + native or framework emit (scaffold depth varies) |
| **Open** | Runnable scaffold / WebIR pipeline; deepen with WPTP emit adapters over time |

## Hub data locations (on the demo VM)

| Path | Purpose |
|------|---------|
| `~/.chrysalis-hub/projects.json` | Project registry |
| `~/.chrysalis-hub/workspaces/<id>/` | Pulled or local trees |
| `~/chrysalis-test/` | Chrysalis toolchain used by jobs |
| `~/.chrysalis-status-server.log` | Hub web server log |

## One-command deploy (operators)

From a Windows machine with `gcloud` auth and the repo checkout:

```powershell
pnpm run deploy:hub-demo
```

Or:

```powershell
.\scripts\gce-hub-deploy.ps1 -Project chrysalis-dev-f5x6qv
```

This runs local `build:hub-all`, uploads HEAD to **`chrysalis-test-vm`**, builds the full workspace, installs WPTP Next.js + parser vendor, runs **`hub-post-deploy-verify`**, restarts the hub on **:19090**, and prints the public URL.

Refresh only (no local build):

```powershell
.\scripts\gce-test-vm-refresh.ps1 -Project chrysalis-dev-f5x6qv
```

## Multi-site projects (professional use)

In **Console**, add multiple **origin sites** (SSH) to one project. Use **Run full pipeline** (prep + pull + translate) or **Run all sites** for translate-only. Default **3** parallel jobs (`CHRYSALIS_HUB_MAX_PARALLEL`). Each site has its own progress bar.

Server install: [HUB-SERVER-INSTALL.md](./HUB-SERVER-INSTALL.md).

## End-to-end portal workflow (no CLI)

1. **New project** — queue sites, **Create project & start setup** (or **Create & run full pipeline**).
2. **Console** — watch setup/translate in **Job log** (SSE).
3. **Observe on staging** — **Load observe guide**, run PHP oracle on staging, copy traces to hub.
4. **Upload traces** — select site, choose `.ndjson` / `.zip`, **Upload traces for selected site**.
5. **Start emitted app** — hub runs `generated/hono` (or Next.js); verify URL is filled automatically.
6. **Verify** — **Verify all sites** or per-site **Verify** (oracle replay against emitted app).
7. **WPTP compose** (optional) — if the site tree has OpenAPI/HAR/WebIR, **WPTP compose site** for silver emit.

## Multi-tenant (optional)

Set `CHRYSALIS_OPERATOR_TOKEN` on the hub. The portal prompts for a Bearer token. The configured token is **admin** (sees all projects); other tokens only see projects they created.

## Run your own hub (not the demo)

From a machine with Node 20+ and SSH to origins:

```bash
git clone https://github.com/AgenticOp-io/chrysalis.git
cd chrysalis
pnpm install
pnpm run build:hub-all
export CHRYSALIS_OPERATOR_REPO="$(pwd)"
export CHRYSALIS_OPERATOR_PORT=19090
pnpm run hub:serve
```

Open **http://127.0.0.1:19090/** — create SSH or **local workspace** projects, run setup/translate/verify from the browser.

**Docker (optional):** `docker compose -f docker-compose.hub.yml up --build` — same UI on port **19090**, data in volume `chrysalis-hub-data`.

`build:hub-all` runs `pnpm -r build`, parser-bridge vendor, and clones/builds **`wptp-emit-nextjs`** for Next.js hub output.

See also `docs/DEPLOYMENT.md` and `docs/HUB-CONNECTIVITY.md`.

## Troubleshooting

- **Route not runnable** — Origin and output must differ; output must be a web target from the menu.
- **SSH scan failed** — Install `chrysalis-origin-scan` on the origin or disable autodetect and set origin manually.
- **PHP ingest errors** — Hub needs `php` and `packages/parser-bridge/vendor` (demo VM bootstrap installs these).
- **Next.js output** — Requires sibling **`wptp-emit-nextjs`** next to the repo (e.g. `~/wptp-emit-nextjs` on the demo VM). Bootstrap runs `node scripts/install-wptp-hub-deps.mjs` automatically; locally: `pnpm run build:hub-all`.
