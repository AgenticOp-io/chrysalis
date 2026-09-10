# Go public (Apache remote flip)

> Operator runbook to flip `AgenticOp-io/chrysalis` from **private** → **public**.  
> Not legal advice. Coordinate with counsel before flipping.  
> Companion: [`PUBLIC-ENGINE-CLAIM.md`](./PUBLIC-ENGINE-CLAIM.md) · [`TRADE-SECRET-AND-OSS-BOUNDARY.md`](./TRADE-SECRET-AND-OSS-BOUNDARY.md) · `AgenticOps/commercial/chrysalis-private-pack/07-oss-scrub-checklist.md`

## Pre-flight (engine lane — must be green)

From repo root:

```bash
pnpm run hub:oss-scrub-smoke          # → OSS_SCRUB_OK · CONVERT_OSS_SCRUB (G10109)
pnpm run hub:public-engine-claim-smoke # → PUBLIC_CLAIM_OK · CONVERT_PUBLIC_CLAIM (G10108)
pnpm run hub:cursor-pilot-kit-smoke   # → PILOT_KIT_OK
pnpm run pilot:laravel-min
pnpm run pilot:cobol-clbs
```

All five must print `"ok": true`. OSS scrub also prints **`OSS_SCRUB_OK`** (tracked-tree only — history scrub remains operator below; no BFG from the smoke). Public-claim prints **`PUBLIC_CLAIM_OK`** and lists `honestGaps` (visibility / history / brand CTA / `copy:EXTFMAP` / counsel) — those gaps are not invented closes.

## History scrub (operator)

Working-tree scrub does **not** rewrite history. Before flip, confirm:

```powershell
# Must be empty (no commits that added these paths)
git log --all --oneline --full-history -- '.chrysalis-gcp-sa-key.json' '*gcp-sa-key.json' '.env' '.env.local'

# Must be empty (IBM Restricted Materials never committed)
git log --all --oneline --full-history -- '**/DFHAID.cpy' '**/DFHBMSCA.cpy' '**/EXTFMAP.cpy' '**/DFHATTR.cpy' '**/CMQ*.cpy'

# Spot-check: no PEM private key blobs
git log --all --oneline -S '-----BEGIN' -- '*.pem' '*.key' | Select-Object -First 20
```

If any hit is a real secret blob: **stop**, rotate the credential, rewrite or BFG history, force a clean remote with counsel. Do not flip while a live private key remains reachable from `git show`.

Docs/scripts that *name* `.chrysalis-gcp-sa-key.json` (gitignored path) are OK.

## WISP demo passwords (never commit)

Operator live login / admin probes read passwords from the environment only — see `scripts/lib/wisp-demo-credentials.mjs`:

- `CHRYSALIS_WISP_DEMO_EMAIL` (default `demo@wisptools.io`)
- `CHRYSALIS_WISP_DEMO_PASSWORD` (**required** for live demo login; no committed default)
- `CHRYSALIS_WISP_PLATFORM_ADMIN_EMAIL` (default `admin@wisptools.io`)
- `CHRYSALIS_WISP_PLATFORM_ADMIN_PASSWORD` (**required** for platform-admin probes / bootstrap)
- `CHRYSALIS_WISP_FIREBASE_ADMIN_JSON` (path to Firebase Admin SDK JSON for bootstrap)

Fixtures (`wisp-demo-manifest.v1.json`) keep password fields as `""`; verify scripts fill from env at runtime. Login HTML must not print a real password.

**Before flip (required):** rotate Firebase Auth passwords for `demo@wisptools.io` and `admin@wisptools.io` (and any other accounts that used the old committed literals). Those strings remain in **git history** even after tip scrub. Confirm Firebase web API key restrictions (HTTP referrer / app) for `wisptools-production` client config shipped in WISP fixtures.

Primary tip gate (does **not** embed contiguous burned literals in docs):

```bash
pnpm run hub:oss-scrub-smoke
# expect: "ok": true · OSS_SCRUB_OK · CONVERT_OSS_SCRUB (G10109)
```

Do **not** paste burned demo/admin password literals into docs or scripts — the smoke encodes those patterns from split parts. Do **not** invent replacement passwords into the repo — store only in operator env / password manager.

## Tip readiness

1. Commit and push intentional shippable work (Pilot Kit, ST flagships, COBOL no-z/OS claim docs).  
2. Do **not** `git add` `generated/_*`, `_gce-st-*`, `.chrysalis-cobc/*.exe`, IBM/MQ `.cpy` drops, SA JSON, or private-pack paths.  
3. Tag a release that includes the Pilot Kit (e.g. `v2.0.x` after push).

## Flip

```bash
gh repo edit AgenticOp-io/chrysalis --visibility public
```

Then:

1. Pin GitHub Release for the Pilot Kit tip.  
2. Confirm clone works without auth: `git clone https://github.com/AgenticOp-io/chrysalis.git`  
3. Brand lane (separate): “Start a Pilot” → [`CURSOR-PILOT-KIT.md`](./CURSOR-PILOT-KIT.md) 15-minute path — already **Requested** in AgenticOps `docs/CHANGELOG.md`.  
4. Keep trade secrets only under `AgenticOps/commercial/chrysalis-private-pack/`.

## Explicit non-goals

- Do not force-settle `copy:EXTFMAP` or invent CICS/VSAM/Db2 runtimes for a greener public demo (**D6447**).  
- Do not publish IBM Restricted Materials.  
- Do not claim LCB / CardDemo-online equivalence without a live z/OS (or CICS TX) prove — see [`COBOL-NO-ZOS-CEILING.md`](./COBOL-NO-ZOS-CEILING.md).

## Sign-off

| Gate | Status |
| --- | --- |
| Claim + scrub + pilot smokes | Operator re-run day of flip |
| History secret paths empty | Operator re-run day of flip |
| Tip pushed / tagged | Operator |
| Counsel OK | Operator |
| Brand Pilot CTA | Brand lane (Requested) |
| `gh repo edit --visibility public` | Operator |
