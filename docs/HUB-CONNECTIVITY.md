# Translation Hub — connectivity and agents

Chrysalis does **not** require proprietary cloud APIs for servers, databases, or language detection. Everything reachable from the **Translation Hub** uses **SSH**, **local install on the hub VM**, or **local install on the origin (legacy) host**.

---

## Architecture

| Role | Where it runs | How you reach it |
| --- | --- | --- |
| **Translation Hub** (operator web, port **19090**) | Hub VM (e.g. `chrysalis-test-vm`) | Browser, or `ssh -L 19090:127.0.0.1:19090 user@hub` |
| **Chrysalis CLI** (ingest, emit, verify) | Same host as hub (or CI laptop) | Local shell on hub; `packages/cli/dist/bin.js` |
| **Origin / legacy app** | Customer servers | **SSH** + optional **scp** pull into `~/.chrysalis-hub/workspaces/` |
| **Origin scan agent** | Installed on origin | **SSH** invokes `chrysalis-origin-scan`; no inbound port on origin |
| **SQLite app DB** (`CHRYSALIS_DB_PATH`) | Hub or app host | Local file path, or file on origin copied via scp |
| **Session store** (file / SQLite / Redis) | Co-located with PHP + Node during cutover | Local paths or **Redis on your network** (reachable via SSH tunnel if needed) |
| **PHP oracle / capture** | Legacy PHP hosts | Local PHP + `packages/oracle-php`; optional **Redis** via env URL |

There is **no** Chrysalis-hosted database or agent cloud. If Redis or MySQL live only on a private network, use **SSH port forwarding** from the hub (documented below).

---

## Hub host — local installation checklist

On the machine that runs `scripts/chrysalis-operator-web.mjs` (started by `scripts/gce-chrysalis-status.sh`):

1. **Node 20+**, built Chrysalis workspace (`pnpm -r build`).
2. **OpenSSH client** (`ssh`, `scp`) with keys in `~/.ssh/` for each origin user.
3. **PHP 8+** on `PATH` if you run capture, nikic parser, or PHP smoke tests on the hub.
4. **Python 3** on `PATH` (used by the origin agent installer script; hub probe checks for it).
5. Optional **redis-cli** when using `CHRYSALIS_SESSION_REDIS_URL` for session-bridge tests.

Probe from the hub:

```bash
node scripts/agents/chrysalis-hub-probe.mjs
```

With origin SSH (replace user, host, path):

```bash
node scripts/agents/chrysalis-hub-probe.mjs \
  --ssh deploy@10.0.0.5 \
  --remote-path /var/www/legacy-app \
  --identity ~/.ssh/id_ed25519
```

In the **New project** UI, use **Test hub + SSH connectivity** (same checks via `POST /api/hub/probe-connectivity`).

---

## Hub-driven origin prep (recommended) {#hub-origin-prep}

When you **add a site** or click **Prepare all sites (SSH)** in the Console, the hub:

1. **`scp`** copies `scripts/agents/` to a temp directory on the origin.
2. Runs **`chrysalis-origin-bootstrap.sh`**, which installs **`chrysalis-origin-scan`** and writes **`~/.chrysalis/observe/CAPTURE-ON-ORIGIN.md`** (how to run **`packages/oracle-php`** with **`auto_prepend_file`** on staging).
3. Optionally creates **`chrysalis.observe.json`** in the app root if missing.

The hub does **not** install Node, Chrysalis, or change **`php.ini`** on customer servers. Conversion still runs on the **hub** after **`scp`** pull.

CLI (from the hub host):

```bash
node scripts/chrysalis-hub-prep-origin.mjs --host deploy@10.0.0.5 --path /var/www/legacy-app
```

API: **`POST /api/hub/projects/:id/prep-all-sites`** or **`POST …/sites/:siteId/prep`**.

---

## Origin host — install the scan agent {#origin-agent}

Autodetect over SSH uses **`chrysalis-origin-scan`** on the origin when present. It only reads the filesystem (and `.env` keys for **hints**); it does not open database or Redis connections.

### Install (on the legacy server)

Copy the repo `scripts/agents/` directory to the origin, or run from a checkout:

```bash
cd /path/to/chrysalis/scripts/agents
chmod +x install-origin-agent.sh chrysalis-origin-scan.sh
./install-origin-agent.sh
```

This installs `~/.local/bin/chrysalis-origin-scan` (override dir with `CHRYSALIS_AGENT_DIR`).

**Requirements on origin:** `python3`, `bash`. Optional: `php` for legacy capture on that host.

### Manual test (on origin)

```bash
chrysalis-origin-scan /var/www/legacy-app | head -c 500
```

Expect JSON with `source: "origin-agent"` and a `languages` array.

### Install via SSH from your laptop

```bash
scp scripts/agents/chrysalis-origin-scan.sh scripts/agents/install-origin-agent.sh \
  deploy@origin.example:/tmp/chrysalis-agents/
ssh deploy@origin.example 'cd /tmp/chrysalis-agents && ./install-origin-agent.sh'
```

### Hub behavior without the agent

If the agent is missing, the hub falls back to **`find`** over SSH (`source: "ssh-find"`). File counts still work; `.env` service hints are not collected.

---

## Databases and Redis — SSH/local only

| Store | Variable | Access pattern |
| --- | --- | --- |
| Emitted SQLite | `CHRYSALIS_DB_PATH` | Local file on the Node host. Create parent dir writable by the app user. |
| Sessions (dev) | `CHRYSALIS_SESSION_DIR` | Directory of JSON files; both stacks on **one** host. |
| Sessions (single host) | `CHRYSALIS_SESSION_SQLITE_PATH` | Local SQLite file. |
| Sessions (multi-host) | `CHRYSALIS_SESSION_REDIS_URL` | `redis://host:6379` on **your** network. From hub-only tooling, tunnel: `ssh -L 6379:127.0.0.1:6379 deploy@origin` then `redis://127.0.0.1:6379`. |
| Legacy MySQL/Postgres | App `.env` on origin | Chrysalis does not connect for hub scan; agent reports **hints** only. App teams use normal SSH/DBA access for migrations. |

Emitted apps and verify **never** call external SaaS; see `DESIGN.md` §3 (injected `ctx`, no `process.env` in generated handlers).

---

## SSH key setup (hub → origin)

1. On the **hub** VM, generate or copy a key: `ssh-keygen -t ed25519 -f ~/.ssh/chrysalis_hub`.
2. Install public key on origin: `ssh-copy-id -i ~/.ssh/chrysalis_hub.pub deploy@origin`.
3. In the hub UI, set **SSH key path on hub** to `/home/<user>/.ssh/chrysalis_hub`.
4. Run **Test hub + SSH connectivity** before enabling autodetect.

BatchMode is used (no password prompts). Use `ssh-agent` or a key without passphrase on the hub for unattended pulls.

---

## Firewall and ports

| Port | Service | Notes |
| --- | --- | --- |
| **22** | SSH | Hub → origin (outbound from hub). |
| **80 / 443** | nginx (shared VM) | Hub site **`chrysalis-hub`** only — **D6396**; do not edit FDE sites |
| **19090** | Translation Hub | Prefer **`127.0.0.1`** behind nginx; public **https://chrysalis.agenticop.io** |
| **8765** | FDE runner | **Do not touch** (shared VM) |
| **3000+** | Emitted Node / verify | Local or your LB; not opened by Chrysalis automatically. |
| **6379** | Redis | Only if you use session bridge; keep on private network. |

On GCE: allow **tcp:443** (and **80** for ACME). Optionally close **tcp:19090** after localhost bind. See [`HUB-DEMO-INSTALL.md`](./HUB-DEMO-INSTALL.md).

---

## Hub translation pipeline (all origin → output pairs)

For the **full origin×output path model** (ingest / WebIR / emit / verify lanes, grades, contract alternates), see **[HUB-TRANSLATION-PATHS.md](./HUB-TRANSLATION-PATHS.md)** and `pnpm run hub:path-matrix`.

Scripts under `scripts/hub-ingest/` implement the full path:

| Step | Script | When |
| --- | --- | --- |
| Contract discovery | `discover-contract-artifacts.mjs` | Recursive OpenAPI/Swagger/HAR under site tree (**G20**) |
| WPTP compose (any origin) | `wptp-compose-site.mjs` | When contracts exist → **hono** / **nextjs** silver (origin language irrelevant) |
| Lift non-PHP sources | `lift-to-webir.mjs` | **javascript**/**typescript** (G21), **python** (G22), **java**/**go** (G23–G24), **ruby**/**csharp**/**kotlin**/**rust**/**scala**/**swift**/**vue** (pattern lift, G25); **sql**/**html**/**css**/**json**/**yaml**/**markdown**/**c**/**cpp** (per-file GET, G25); handler bodies stay holes unless literal |
| Matrix smoke | `hub-matrix-smoke.mjs` | `pnpm run hub:matrix-smoke` — one fixture tree per hub origin (**fixtures/hub-pattern-lift**) |
| Emit TypeScript stacks | `emit-from-hub.mjs` | Output `typescript`, `hono`, `fastify` |
| Emit Python (Flask) | `emit-python-from-hub.mjs` | Output `python` from hub WebIR (**G26**) |
| Gold verify (literal JS/TS) | `hub-gold-verify.mjs` | `pnpm run hub:gold-verify` — zero-hole lift + Hono emit (**G26**) |
| WPTP contract gold smoke | `hub-wptp-gold-smoke.mjs` | `pnpm run hub:wptp-gold-smoke` when **`wptp-matrix`** sibling exists |
| Emit Java / Go | `emit-java-from-hub.mjs`, `emit-go-from-hub.mjs` | Output **java** / **go** from hub WebIR (**G27**) |
| Path matrix export | `hub-path-matrix.mjs` | `pnpm run hub:path-matrix` — JSON for every pair (**G29**) |
| Completion gate | `hub-completion.mjs` | `pnpm run ci:hub-completion` — matrix smoke + gold verify + trace replay (CI) |
| Trace replay oracle | `hub-gold-trace-replay.mjs` | In-process **`@chrysalis/verify`** replay against emitted Hono (**G28**) |
| Emit Ruby / C# / Rust | `emit-ruby-from-hub.mjs`, etc. | Output **ruby**, **csharp**, **rust** from hub WebIR (**G28**) |
| Emit Next.js | `emit-nextjs-from-hub.mjs` | Output `nextjs` (needs `wptp-emit-nextjs` sibling) |
| Other output languages | `emit-target-stub.mjs` | Output e.g. `python`, `java` (scaffold + README until WPTP emit) |
| PHP gold path | `hub-translate.mjs` | Uses Chrysalis CLI ingest + emit, or export + Next.js |
| Orchestrator | `hub-translate.mjs` | Called from operator **Run translation** |

CLI: `pnpm run hub:translate -- <projectDir> --origin python --output hono`

---

## Related documents

- [Deployment](./DEPLOYMENT.md) — GCE hub VM, shared-host rules.
- [Operations](./OPERATIONS.md) — session bridge, verify, dual-stack.
- [Installation](./INSTALLATION.md) — workspace build and CLI shims.
