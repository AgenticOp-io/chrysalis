# Deployment guide

This document explains where each piece of Chrysalis runs in CI and production, what depends on what, and how to roll out the dual-stack pattern safely. It is written for platform engineers, release engineers, SREs, and CI owners.

For the day-to-day commands, read [Operations](./OPERATIONS.md). For a single-page command reference and worked examples, read the [User guide](./USER-GUIDE.md). For environment variables, CI gates, and the report tree, read [Administration](./ADMINISTRATION.md).

---

## Table of contents

1. [What "deploying Chrysalis" means](#what-deploying-chrysalis-means)
2. [Components and where they live](#components-and-where-they-live)
3. [Build-time placement](#build-time-placement)
4. [Runtime placement](#runtime-placement)
5. [Three end-to-end deployment patterns](#three-end-to-end-deployment-patterns)
6. [Configuration, secrets, and compliance](#configuration-secrets-and-compliance)
7. [Health checks and runtime signals](#health-checks-and-runtime-signals)
8. [Rollback playbooks](#rollback-playbooks)
9. [Release tarballs and versioning](#release-tarballs-and-versioning)
10. [Google Cloud: Firebase vs Compute Engine projects](#google-cloud-firebase-vs-compute-engine-projects)
11. [Related documents](#related-documents)

---

## What "deploying Chrysalis" means

Chrysalis is a Node.js workspace and a CLI. "Deploying it" can mean any of four things, depending on what you actually want:

1. **Putting the toolchain on a build host or developer machine.** This is what CI agents and developer laptops need: Node 20+, pnpm, the workspace cloned and built, optional PHP if you intend to run capture or use the alternate parser.
2. **Running the *output* of the tool — the TypeScript service Chrysalis emits — as your modern stack.** That is just a normal Node service. Chrysalis has no opinion about how you host it.
3. **Loading the PHP capture file into your existing PHP application** so live traffic produces trace files. Optional, but the only way to build a behavioral test suite from real users.
4. **Running the dual-stack HTTP router (Chimera)** in front of both your old PHP server and your new Node server while you cut over. Optional.

You may need only the first two for a clean rewrite of an isolated app. You will want all four for a real, gradual migration of a live system.

---

## Components and where they live

| Component | Runs where | Owned by |
| --- | --- | --- |
| **Chrysalis workspace** (the CLI) | CI agents, developer laptops, optional internal build VM | Build / dev tooling |
| **Emitted TypeScript app** | Wherever you run Node services (Kubernetes, ECS, VMs, Fly.io, …) | Application team |
| **PHP capture file** (`packages/oracle-php/src/bootstrap.php`) | Same hosts as your legacy PHP app, loaded via `auto_prepend_file` | Legacy app team |
| **Trace corpus storage** | Object store, NFS, internal S3 — wherever you keep build outputs | SRE / data team |
| **Verify reports** | CI build outputs, optionally archived to your dashboarding pipeline | Application team |
| **Dual-stack router** (Chimera) | Edge proxy tier or a sidecar in each cell | Platform / SRE |
| **Optional license enforcement** | Same hosts as the gated CLI | Build / vendor relations |

Nothing in the default open-source flow requires Chrysalis itself to hold customer traffic, run a database, or store secrets. Trace corpora and verify reports are files that live on infrastructure your team owns.

---

## Build-time placement

### CI agents and developer laptops

These need:

- **Node 20+** and **pnpm 9.x**.
- The workspace cloned (or extracted from a release tarball).
- A successful `pnpm install` and `pnpm -r build`.
- Optional **PHP 8+** on `PATH` if you want the alternate `nikic` parser, the PHP capture file, or PHP-side smoke tests.
- Optional **Composer** for the parser bridge's PHP dependencies (the workspace can bootstrap a local `composer.phar` when PHP is present).

A typical CI job looks like:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm -r build
- run: pnpm test
# project-specific gates:
- run: node packages/cli/dist/bin.js ingest /path/to/php-app
- run: node packages/cli/dist/bin.js emit /path/to/php-app --out generated/app --target=hono
```

If you are gating on a verify run, you also need somewhere for the emitted server to listen and a corpus directory to read from.

### Cache what is worth caching

| Cache | Effect |
| --- | --- |
| **pnpm store** | Speeds up `pnpm install` between jobs. Put `~/.local/share/pnpm/store` (or the platform equivalent) in your CI cache. |
| **Ingest AST cache** (`--ingest-cache <dir>`) | Skips re-parsing unchanged PHP files. Good for re-running ingest in successive jobs against the same tree. |
| **Docker layer caching** | Standard pattern: copy `package.json` + `pnpm-lock.yaml` first, run `pnpm install`, copy source, run `pnpm -r build`. |

### Vendor builds with a license gate

Some vendor distributions set `CHRYSALIS_REQUIRE_LICENSE=1`. When the gate is on, every command except `init` and `license` requires a valid local Ed25519 envelope and a public key. CI must inject:

- `CHRYSALIS_LICENSE` (the envelope as a base64 string) **or** `CHRYSALIS_LICENSE_PATH` (a file).
- `CHRYSALIS_LICENSE_PUBLIC_KEY` (a PEM string) **or** `CHRYSALIS_LICENSE_PUBLIC_KEY_PATH`.

Enforcement is offline; there is no license server to reach.

---

## Runtime placement

### Where the emitted Node service runs

The output of `chrysalis emit` is a normal Node project. Standard practice applies:

```bash
cd <emit-out>
npm ci --omit=dev    # or npm install --omit=dev
NODE_ENV=production node dist/server.js
```

Or build a container, deploy with your platform of choice, and point a load balancer at it.

The emitted app reads a small set of environment variables. The most important ones:

| Variable | What it controls |
| --- | --- |
| `PORT` | Port to listen on. Default `3000`. |
| `CHRYSALIS_DB_PATH` | Path to a SQLite file when the emitted app uses `node:sqlite`. |
| `CHRYSALIS_SESSION_DIR` | Per-session JSON file directory. Single-host development only. |
| `CHRYSALIS_SESSION_SQLITE_PATH` | Shared SQLite session table. Single-host cutover. |
| `CHRYSALIS_SESSION_REDIS_URL` | Redis-backed sessions. The right answer for multi-host. |
| `CHRYSALIS_SESSION_COOKIE` | Cookie name for the session id. Default `chrysalis_sid`. |

For multi-instance deployments, use Redis sessions (see [Operations](./OPERATIONS.md) for the exact bridge).

### Where the legacy PHP server runs

Your existing servers, unchanged. To turn capture on, load the Chrysalis bootstrap before each request:

- **PHP-FPM:** add `php_value[auto_prepend_file] = /opt/chrysalis/packages/oracle-php/src/bootstrap.php` (or wherever you place the file).
- **Apache + mod_php:** `php_value auto_prepend_file /opt/chrysalis/packages/oracle-php/src/bootstrap.php`.
- **Built-in dev server:** the `chrysalis observe` command does this for you with `php -d auto_prepend_file=...`.

Set `CHRYSALIS_TRACE_DIR` to a writable directory. Optionally drop a `chrysalis.observe.json` in your PHP app root to extend redaction rules; the bootstrap reads it on startup.

You usually do **not** want capture in production by default. Enable it on canary or observe-mode hosts only.

### Where the dual-stack router runs

Run `chrysalis deploy` either at the edge proxy tier (one process per pop / region / cell) or as a sidecar in each application cell. Every instance behind your load balancer must read the **same** routing config — either by mounting the same file from a shared store, or by pointing every instance at the same `--config-url`.

Configuration details (modes, HMAC, rules) are in [Operations](./OPERATIONS.md) and in `packages/runtime-chimera/README.md`.

For canary stickiness to work, your load balancer must keep a given user on the same Chimera instance, or the stickiness cookie must be sticky to the load balancer layer. Otherwise the user can flip between buckets across requests.

---

## Three end-to-end deployment patterns

### Pattern A — CI translation gate (no production traffic)

Run Chrysalis in CI to keep the generated TypeScript honest, but do not actually serve user traffic from it yet.

1. Check out Chrysalis and your PHP code in CI.
2. `pnpm install && pnpm -r build`.
3. `chrysalis ingest /path/to/php-app` — fail the build if hole counts grow beyond a threshold.
4. `chrysalis emit /path/to/php-app --out generated/app --target=hono` — fail the build if `tsc --noEmit` cannot type-check the output.
5. **Optionally** start the emitted server and run `chrysalis verify <fixture-corpus> --base-url … --json-summary`. Fail the build if the aggregate score drops.

The fixture corpus does not have to be huge. A small recorded set covering your most-trafficked routes catches most regressions quickly. Treat the corpus the same way you treat any test fixture: keep it under version control if it is small, or in a private store with retention if it is large.

### Pattern B — Staging capture and verify

Capture traffic on staging where it is safe, then replay it in CI.

1. Deploy your legacy PHP app to staging with the Chrysalis capture file loaded.
2. Set `CHRYSALIS_TRACE_DIR` to a writable directory and let it run for a meaningful window (a few hours of synthetic or recorded traffic).
3. Move the trace files into a private store. If multiple staging hosts captured at the same time, run `chrysalis corpus-merge` to combine them.
4. In CI, deploy the emitted Node app to a staging host (or run it on the CI agent), point `chrysalis verify` at the merged corpus and the new app's base URL, and fail the build below your correctness threshold.

This is the strongest signal you can get short of running both stacks live.

### Pattern C — Production dual-stack

When you are ready to send real users at the new code:

1. Deploy the **emitted Node app** to production behind an internal URL.
2. Deploy the legacy PHP app behind another internal URL (it was already deployed; just make sure the proxy can reach it).
3. Deploy the **dual-stack router** at the edge or as a sidecar, configured with `--mode=shadow`.
4. Watch the shadow log for a few hours. Every divergence between the two stacks is appended as one NDJSON line; pull them into your dashboarding stack and fix the underlying lowering or runtime gap.
5. Switch the router to `--mode=canary` with a small `--canary-percent` (1–5%). Every response carries debug headers (`x-chrysalis-target`, `x-chrysalis-canary`) so you can confirm the split.
6. Increase the canary percent over hours or days. Watch your usual metrics on the modern side.
7. When you are happy, switch to `--mode=cutover`. The router still falls back to PHP for any rule that does not match, so you can roll routes over one at a time by editing the rules list.

Throughout, keep the previous routing config revision tagged in your tickets so you can roll back by reapplying it.

---

## Configuration, secrets, and compliance

- **Trace corpora are sensitive.** Even with default redaction, captured traffic includes path parameters, body fields you have not added rules for, and SQL bind values. Store on infrastructure you control. Restrict access. Apply retention.
- **Redaction is dual-encoded.** The TypeScript-side defaults (`packages/oracle/src/redaction.ts`) and the PHP-side defaults (`packages/oracle-php/src/Redactor.php`) must stay aligned. CI runs `pnpm run test:oracle-php-redactor` in every relevant job to catch drift.
- **Custom redaction.** Add a `chrysalis.observe.json` at each PHP app root. The same file should be present (or equivalent rules should be configured) on every host that captures.
- **Routing config signing.** The dual-stack router can require an HMAC over the config payload before loading. Use it whenever the routing file is mounted from a shared store. Two layouts are supported (single secret, key id map); see [Operations](./OPERATIONS.md).
- **Redis over TLS.** PHP supports `rediss://`; an optional `verify_peer=0` query disables certificate verification when you must (for self-signed staging environments).
- **License envelope.** Vendor builds carry an Ed25519 public key and require a signed envelope. Verification is offline.

---

## Health checks and runtime signals

| Concern | Suggested signal |
| --- | --- |
| Emitted app liveness | An HTTP route you add for that purpose. The emitter does not mandate one. |
| Verify health in CI | `chrysalis verify … --json-summary` → `pass: true`. |
| Migration drift | `chrysalis status --project … --json` plus the `deployRoutingFingerprintSha256` from operator snapshots. |
| Fleet rollups | The offline scripts in `scripts/`: `aggregate-chimera-operator-snapshots.mjs`, `aggregate-verify-summaries.mjs`, `export-fleet-status-uplink.mjs`. |
| Shadow-mode divergences | NDJSON appended under `--shadow-log-dir`, one record per diverging request. Pull into your dashboarding stack. |

A simple example: write the current status snapshot to disk every minute on a build host (no network):

```bash
node packages/cli/dist/bin.js status --project /opt/your-php-app --json > /var/lib/chrysalis/status.json
```

---

## Rollback playbooks

| Failure | What to do |
| --- | --- |
| `chrysalis emit` was interrupted halfway | Re-run with `--emit-resume`. It picks up where it left off using `<out>/.chrysalis-emit-state.json`. Drop the flag to start fresh. |
| `chrysalis verify` falls below threshold | Look at the per-route reports under `--report`. With `--project`, divergences include candidate IR node ids. Either fix the lowering, run `chrysalis repair`, or roll the change back. |
| Dual-stack router rejected a new config on reload | The previous config keeps running. The reload error is on stderr. Fix the JSON, HMAC digest, or content, then send `SIGHUP` again. |
| Canary regression visible in modern metrics | Lower `--canary-percent` to 0 or switch back to `--mode=shadow` (or `--mode=legacy`) by reloading the config. Restore the previous config revision when ready. |
| Trace corpus has filled the disk | Use `pnpm run corpus:rotate-archive` to move old day buckets, or `chrysalis corpus-merge --sample-modulo K` to keep a stable random sample. |
| Holes show up at runtime | Look up the reason in `chrysalis.holes.json`. Either close the hole with `chrysalis repair --hole-patch`, register the missing constructor with `registerPhpFqnCtor` in your emitted `src/index.ts`, or route that path back to PHP via the dual-stack router. |

---

## Release tarballs and versioning

The Chrysalis project publishes source archives on its [Releases page](https://github.com/theorem6/chrysalis/releases): `chrysalis-<version>-source.tar.gz` and `.zip`. They are signed git archives; extract, `pnpm install`, `pnpm -r build`, and you are at the same state as a fresh clone of that tag.

The workspace's semantic version (in `package.json` at the root) is the source of truth for the `toolVersion` field embedded in machine JSON outputs. Every signed artefact (verify summaries, operator snapshots, …) records the tool version that produced it so multi-version fleets are easy to debug.

For the maintainer-facing release process, see [Release process](./RELEASE.md).

---

## Google Cloud: Firebase vs Compute Engine projects

**Policy (operator convention).** Use **Firebase-oriented GCP projects** (Hosting, Functions, App Hosting, and other Google-managed surfaces) only for workloads that need **public HTTPS on ports 80 and 443** and do not require arbitrary listening ports on a long-lived VM. Use **Compute Engine (GCE)** in **separate** GCP projects when you need **custom ports**, persistent VMs, or full control of the network path beyond what Firebase exposes.

A single GCP project **may** still contain both Firebase APIs and GCE; Google allows that. The policy above is about **how you choose to split work** so firewall and blast-radius stay predictable: prefer **no GCE VMs** in Firebase-first projects, and keep **GCE-only** workloads out of Firebase-only projects when you can.

**Snapshot (inventory via `gcloud`, account `david@agenticop.io`).** All listed projects sit under **organization `922377885623`**. Compute instance counts and whether any **enabled** API name matched `firebase` are shown; empty projects are still valid Firebase *targets* if you attach an app later.

| Project ID | GCE VMs (count) | Enabled API matched `firebase` |
| --- | ---: | :---: |
| `agenticop-io` | 0 | yes |
| `lte-pci-mapper-65450042-bbf71` | 1 (`acs-hss-server`) | yes |
| `agenticops-io-web` | 0 | no |
| `chrysalis-dev-f5x6qv` | 0–1 (optional **`chrysalis-test-vm`** from **`scripts/gce-test-vm.ps1`**) | no |
| `clientcontactmgmt` | 0 | no |
| `emerald-water-268021` | 0 | no |
| `fragility-gce-363264` | 0 | no |
| `ftth-mapping-f9363` | 0 | no |
| `ftth-reset` | 0 | no |
| `ftth-svelte` | 0 | no |
| `mapping-772cf` | 0 | no |
| `mipuesto` | 0 | no |
| `petersonmappingapp` | 0 | no |
| `projectid-qgsk` | 0 | no |
| `test-1b8ad` | 0 | no |
| `wisptools-management-75a26` | 0 | no |
| `wisptools-production` | 0 | no |

**Cleanup target (recommended).** The only **mixed** row today is **`lte-pci-mapper-65450042-bbf71`** (Firebase + GCE). When you are ready, **migrate** `acs-hss-server` (or its workload) to a dedicated GCE project such as **`chrysalis-dev-f5x6qv`** (attach billing, enable Compute Engine), then **retire** the VM from the Firebase project so that project returns to **Firebase / 443-only** semantics.

**Automated migration (snapshot + image + new VM).** After billing is on the target project, run **`scripts/gcp-migrate-gce-vm.ps1`** (see script header for parameters). It copies the boot disk into a new instance in **`agenticop-io`** (or another project you choose); then you delete the old VM in the Firebase project when satisfied.

**Cheap GCE dev VM + bootstrap (Chrysalis).** From a Windows machine with **`gcloud`** and **`git`** on **`PATH`**, after **`gcloud auth login`**:

- **`powershell -ExecutionPolicy Bypass -File .\scripts\gce-test-vm.ps1 -Project <PROJECT_ID> -DeployFromLocalGit -Recreate`** — creates a preemptible **`e2-micro`** Debian 12 instance (default name **`chrysalis-test-vm`**, zone **`us-central1-a`**), enables Compute unless you pass **`-SkipServicesEnable`**, uploads **`scripts/gce-test-vm-bootstrap.sh`**, archives the current repo **`HEAD`** with **`git archive`** (so private GitHub remotes work without tokens on the VM), runs **`pnpm install`**, **`pnpm --filter @chrysalis/cli build`**, and **`pnpm run test:cli-shims`**. Optional **`-BillingAccountId <BILLING_ACCOUNT_ID>`** links billing when the project has none yet (from **`gcloud billing accounts list`**). Use **`-TunnelThroughIap`** when SSH must go through IAP. Omit **`-DeployFromLocalGit`** only when the VM can **`git clone`** your **`RepoUrl`** without credentials.
- **`scripts/gce-test-vm-auto.ps1`** — tries each project you can list until one can enable Compute and run the VM script (interactive exploration only).

**Labels.** The stock `gcloud projects update` in current Cloud SDK builds only supports **renaming** projects, not label keys. Set **project labels** in the Google Cloud Console (project picker, then **IAM & Admin** / project **Settings** / labels, depending on console version) or the Resource Manager API, for example `edge=firebase-https` vs `edge=gce`, so filters and org policy stay readable.

---

## Related documents

- [User guide](./USER-GUIDE.md) — full command reference with worked examples.
- [Operations](./OPERATIONS.md) — runbooks for ingest scale-out, dual-stack rollout, sessions, and fleet rollups.
- [Administration](./ADMINISTRATION.md) — environment variables, CI gates, the report tree.
- [Installation](./INSTALLATION.md) — first-time install and smoke tests.
- [Whitepaper](./WHITEPAPER.md) — architecture in narrative form.

If you are setting up the AgenticOp public site, see [AgenticOp](./AGENTICOP.md). It is unrelated to running the toolchain on your code.
