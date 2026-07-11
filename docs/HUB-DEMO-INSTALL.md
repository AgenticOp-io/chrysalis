# Chrysalis Translation Hub — demo install guide

This guide is for the **public demo hub** on the Chrysalis test VM. Use it to walk through the UI without deploying your own server first.

**Locked public edge (DESIGN D6396):** nginx on `chrysalis-test-vm` terminates TLS for **`hub.agenticop.io`** and **`chrysalis.agenticop.io`**, then proxies to the hub on **`127.0.0.1:19090`**. Do **not** invent a different edge (Caddy-only, alternate hostnames, or editing FDE nginx sites).

## Demo URLs

| URL | Role |
| --- | --- |
| **https://chrysalis.agenticop.io/** | Canonical Chrysalis public UI |
| https://hub.agenticop.io/ | Same app (alias A record) |
| http://34.61.255.147:19090/ | Direct IP (transition / break-glass; close **tcp:19090** once HTTPS + bind localhost work) |

Vhost source of truth: [`docs/nginx/chrysalis-hub.vhost.example`](./nginx/chrysalis-hub.vhost.example).  
Automated TLS: `pnpm run deploy:hub-caddy-tls` → `scripts/gce-hub-nginx-tls.sh`.

## Shared VM — do not deviate

On **`chrysalis-test-vm`** (external IP **34.61.255.147**), nginx **:80** is shared with **fragility-discovery-engine (FDE)**.

| Allowed | Forbidden |
| --- | --- |
| Add/edit **`/etc/nginx/sites-available/chrysalis-hub`** only | Edit **`fragility-default-ip`**, **`fragility-public`**, or any FDE site |
| Proxy hub → **`127.0.0.1:19090`** | Touch FDE runner port **8765** |
| ACME webroot **`/var/www/chrysalis/acme`** | Claim **`default_server`** on **:80** (FDE owns it) |

## Public HTTPS edge (locked procedure)

Prerequisites: DNS **A** records for **`hub.agenticop.io`** and **`chrysalis.agenticop.io`** → **34.61.255.147**; GCP firewall **tcp:443** (and **tcp:80** for ACME).

1. **Hub listen (after nginx works):** bind hub to localhost only:

   ```bash
   export CHRYSALIS_OPERATOR_BIND=127.0.0.1
   export CHRYSALIS_OPERATOR_PORT=19090
   # restart hub serve / systemd unit with these env vars
   ```

   Until then, `0.0.0.0:19090` is acceptable for break-glass (`http://34.61.255.147:19090/`).

2. **Create vhost** `/etc/nginx/sites-available/chrysalis-hub` from [`nginx/chrysalis-hub.vhost.example`](./nginx/chrysalis-hub.vhost.example):

   - `server_name hub.agenticop.io chrysalis.agenticop.io;`
   - `proxy_pass http://127.0.0.1:19090;`
   - WebSocket upgrade headers, `client_max_body_size 512m`, long `proxy_*_timeout` (86400s)

3. **TLS (certbot webroot — not `--nginx` plugin rewriting FDE sites):**

   ```bash
   sudo mkdir -p /var/www/chrysalis/acme
   sudo certbot certonly --webroot -w /var/www/chrysalis/acme \
     -d hub.agenticop.io -d chrysalis.agenticop.io \
     --non-interactive --agree-tos -m admin@agenticop.io \
     --cert-name hub.agenticop.io
   ```

4. **Enable:**

   ```bash
   sudo ln -sf /etc/nginx/sites-available/chrysalis-hub /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

5. **Verify:**

   ```bash
   curl -sI https://hub.agenticop.io/ | head
   curl -sI https://chrysalis.agenticop.io/ | head
   ```

6. **Optional:** close GCE firewall **tcp:19090** once HTTPS works and the hub binds **127.0.0.1**.

From a Windows operator laptop (same steps, scripted):

```powershell
pnpm run deploy:hub-caddy-tls
```

## What you need

| Item | Notes |
|------|--------|
| Browser | Any modern desktop browser |
| Legacy app (optional) | PHP, Node, Python, Java, etc. on a server you can reach by SSH |
| SSH key on the hub VM | Private key path on the **hub** machine, not your laptop, when using SSH pull |

Gold-path translation (**PHP → TypeScript / Hono / Fastify**) uses Chrysalis ingest on the hub. Other **web** language pairs lift to WebIR and emit scaffolds or framework targets.

## Quick tour (no SSH)

1. Open **https://chrysalis.agenticop.io/** (or the direct IP URL above).
2. Open **Documentation** in the nav (`#/guide`) — full operator library (Migration OS, CLI, hub, governance, WISP programs).
3. Or read the install walkthrough at `/docs/hub-install` (same content, plain text).
4. Click **New project**.
5. Set **Origin** and **Output** (output list is **web application targets only** — no SQL, JSON, or native-only languages).
6. Leave SSH fields empty; use a name only and create the project (you can point **Local project path** at a folder already on the hub under `~/.chrysalis-hub/workspaces/`).
7. Open **Console** → **Run translation** and watch the live log.

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

`https://chrysalis.agenticop.io/#/paths?origin=javascript&output=hono`

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

Public HTTPS (after DNS): `pnpm run deploy:hub-caddy-tls` — see **Public HTTPS edge** above.

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
export CHRYSALIS_OPERATOR_BIND=127.0.0.1   # when behind local nginx/TLS
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
- **HTTPS / nginx** — Only edit **`chrysalis-hub`**. If ACME fails, check DNS A records and that FDE `default_server` is not stealing `/.well-known` for our hostnames (our vhost must match `server_name`).
