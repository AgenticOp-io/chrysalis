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

## Grades shown in the UI

| Grade | Meaning |
|-------|---------|
| **Gold** | PHP → TypeScript / Hono / Fastify via Chrysalis ingest + emit (oracle-grade path) |
| **Silver** | Hub lift + TypeScript framework emit |
| **Open** | Runnable scaffold / WebIR pipeline; deepen with WPTP emit adapters over time |

## Hub data locations (on the demo VM)

| Path | Purpose |
|------|---------|
| `~/.chrysalis-hub/projects.json` | Project registry |
| `~/.chrysalis-hub/workspaces/<id>/` | Pulled or local trees |
| `~/chrysalis-test/` | Chrysalis toolchain used by jobs |
| `~/.chrysalis-status-server.log` | Hub web server log |

## Run your own hub (not the demo)

From a machine with Node 20+ and SSH to origins:

```bash
git clone https://github.com/AgenticOp-io/chrysalis.git
cd chrysalis
pnpm install
pnpm run build:hub-all
export CHRYSALIS_STATUS_REPO="$(pwd)"
export CHRYSALIS_STATUS_PORT=19090
node scripts/chrysalis-operator-web.mjs
```

`build:hub-all` runs `pnpm -r build`, parser-bridge vendor, and clones/builds **`wptp-emit-nextjs`** for Next.js hub output.

See also `docs/DEPLOYMENT.md` and `docs/HUB-CONNECTIVITY.md`.

## Troubleshooting

- **Route not runnable** — Origin and output must differ; output must be a web target from the menu.
- **SSH scan failed** — Install `chrysalis-origin-scan` on the origin or disable autodetect and set origin manually.
- **PHP ingest errors** — Hub needs `php` and `packages/parser-bridge/vendor` (demo VM bootstrap installs these).
- **Next.js output** — Requires sibling **`wptp-emit-nextjs`** next to the repo (e.g. `~/wptp-emit-nextjs` on the demo VM). Bootstrap runs `node scripts/install-wptp-hub-deps.mjs` automatically; locally: `pnpm run build:hub-all`.
