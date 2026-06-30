# Use cases

A goal-indexed catalog: pick the row that matches what you are trying to do, run the
**command(s)**, and follow the linked guide for the full walkthrough. This page is a map,
not a tutorial — the deep, copy-pasteable steps live in the
[How-to cookbook](./HOW-TO.md) and the [User guide](./USER-GUIDE.md).

> **The one invariant behind every use case:** the running PHP app is the spec. Chrysalis
> translates through **WebIR**, captures behavior with the **oracle**, and **verifies** the
> emitted TypeScript by replaying captured traces. Unsupported constructs become **holes**,
> never silent guesses. See [`WHITEPAPER.md`](./WHITEPAPER.md) and root `DESIGN.md`.

> **Operator stack (2026):** federation, evidence hub, Intelligence Shorthand, and agent POC — start at [`MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 0. Migration OS (port, federate, evidence, agents)

| Goal | Do this | See |
| --- | --- | --- |
| Run the full operator demo | `pnpm run migration-evidence:demo` | [`MIGRATION-OS.md`](./MIGRATION-OS.md) |
| Port a site to CWL + verify + shards | `chrysalis port-site <dir> --origin php` | [`SITE-TO-CWL-LLM-PROGRAM.md`](./SITE-TO-CWL-LLM-PROGRAM.md) |
| Submit verify-green shard to VMF | `chrysalis federation submit-shard` | [`SITE-PORT-FEDERATION-PROGRAM.md`](./SITE-PORT-FEDERATION-PROGRAM.md) |
| Export Intelligence Shorthand (CPU) | `pnpm run web-llm:export-shorthand` | [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md) |
| Wire agent tools (MCP) | `pnpm run web-llm:mcp-server` | [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md) |

---

## 1. Evaluate the toolchain

| Goal | Do this | See |
| --- | --- | --- |
| Understand the architecture before committing | Read the narrative, then skim a worked scenario | [Whitepaper](./WHITEPAPER.md); [How-to](./HOW-TO.md) 1–2 |
| See what is honestly supported (no false "green") | Check the capability matrix and tiers | [`CAPABILITY-MATRIX.md`](./CAPABILITY-MATRIX.md); [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) |
| Try it on the bundled sample app | Ingest + emit + verify `fixtures/tiny-blog` | [User guide](./USER-GUIDE.md) "Recommended workflow"; [How-to](./HOW-TO.md) 2 |
| Decide which deployment pattern fits | Compare shadow / canary / cutover | [Deployment](./DEPLOYMENT.md) |

## 2. Translate one PHP application

| Goal | Do this | See |
| --- | --- | --- |
| First-time setup | `chrysalis init` to create `chrysalis.project.json` | [User guide](./USER-GUIDE.md) `init`; [Installation](./INSTALLATION.md) |
| PHP source → WebIR | `chrysalis ingest <src>` | [User guide](./USER-GUIDE.md) `ingest` |
| WebIR → TypeScript (Hono or Fastify) | `chrysalis emit` | [User guide](./USER-GUIDE.md) `emit` |
| One-shot translate a single file | `chrysalis convert <file>` | [User guide](./USER-GUIDE.md) "Translate one specific PHP file" |
| Find the risky parts of a legacy codebase first | `chrysalis archaeology` | [User guide](./USER-GUIDE.md) `archaeology` |
| Choose glayzzle vs nikic parser | `--parser-provider nikic` (honest skip if `php`/`vendor` missing) | [User guide](./USER-GUIDE.md) `ingest`; `ROADMAP.md` Lane A |

## 3. Capture behavior (the oracle)

| Goal | Do this | See |
| --- | --- | --- |
| Record real HTTP + SQL + session traces | `chrysalis observe` to stage, capture into `traces/` | [User guide](./USER-GUIDE.md) `observe`; [Operations](./OPERATIONS.md) |
| Keep secrets out of the corpus | Tune `chrysalis.observe.json` (merged onto `DEFAULT_REDACTION`) | [Administration](./ADMINISTRATION.md) "redaction"; `DESIGN.md` D202–D210 |
| Manage / sample / rotate the trace corpus | `chrysalis corpus`, `corpus-merge`; `pnpm run corpus:rotate-archive` | [User guide](./USER-GUIDE.md) `corpus*`; [Administration](./ADMINISTRATION.md) |
| Merge traces captured on many hosts | `chrysalis corpus-merge` | [Operations](./OPERATIONS.md) "capture" |

## 4. Prove the translation is correct (verify)

| Goal | Do this | See |
| --- | --- | --- |
| Replay captured traces against emitted TS | `chrysalis verify` | [User guide](./USER-GUIDE.md) `verify` |
| Get a machine-readable pass/fail for CI | `chrysalis verify --json-summary` (has `schemaVersion`/`toolVersion`) | [User guide](./USER-GUIDE.md) "machine summary"; root `README.md` |
| Verify against both backends at once | Emit + verify Hono and Fastify; compare `verify.summary.dual` | [User guide](./USER-GUIDE.md) "Capture once, replay across both backends" |
| Triage a verify failure fast | Read stderr divergence histogram + next steps | [How-to](./HOW-TO.md) 7; [User guide](./USER-GUIDE.md) `verify` |
| Debug a single route | Replay one route only | [User guide](./USER-GUIDE.md) "Replay only one route" |
| Shard verify across machines | `verify` shards + `verify-merge` | [Operations](./OPERATIONS.md) "verify sharding" |

## 5. Manage migration debt (holes)

| Goal | Do this | See |
| --- | --- | --- |
| See where the debt is (ingest vs emit vs auth vs dynamic `new`) | `chrysalis migration-debt --json-out` | [User guide](./USER-GUIDE.md); `ROADMAP.md` Lane D |
| Gate CI on holes / correctness | `--max-holes`, `--min-correctness` (exit 4) | [Administration](./ADMINISTRATION.md) "CI gates" |
| Trend status over time | `chrysalis status --json`, `chrysalis insight` | [User guide](./USER-GUIDE.md) `status`, `insight` |
| Auto-propose fixes for known patterns (confidence-gated) | `chrysalis rewrite`, `chrysalis repair` | [User guide](./USER-GUIDE.md) `rewrite`, `repair` |

## 6. Run dual-stack in production

| Goal | Do this | See |
| --- | --- | --- |
| Put old + new behind one URL (chimera) | `chrysalis deploy` router | [User guide](./USER-GUIDE.md) `deploy`; [Operations](./OPERATIONS.md) "dual-stack router" |
| Shadow / canary / full cutover | Pick the pattern, follow the playbook | [Deployment](./DEPLOYMENT.md); [How-to](./HOW-TO.md) 13–16 |
| Share sessions between PHP and Node during cutover | Redis session bridge (`rediss://` supported) | [Operations](./OPERATIONS.md) "sessions"; [How-to](./HOW-TO.md) 17 |
| Roll back the canary quickly | Signed routing config hot-reload | [How-to](./HOW-TO.md) 16; [Operations](./OPERATIONS.md) |
| Aggregate metrics across a fleet | Operator rollups + reference Grafana starter | [Administration](./ADMINISTRATION.md); `examples/grafana/` |

## 7. Operate at scale (warehouse-sized estates)

| Goal | Do this | See |
| --- | --- | --- |
| Resume a crashed huge-project ingest | `--ingest-checkpoint-file` + `--ingest-resume-checkpoint` | [User guide](./USER-GUIDE.md) "Resume a crashed ingest" |
| Ingest in parallel across machines | route shards + `--merge-all-shards` | [User guide](./USER-GUIDE.md) "Run ingest in parallel" |
| Reduce emitted module size (shared helpers) | `--ingest-lift-shared-helpers*` | [`IR-HELPER-LIFTING.md`](./IR-HELPER-LIFTING.md) |
| Run CI-scale tests off your laptop | `pnpm run test:gce` (detached on `chrysalis-test-vm`) | [GCE runner](./GCE-LOCAL-VERIFY.md) |

## 8. Run from CI or another language

| Goal | Do this | See |
| --- | --- | --- |
| Full GitHub Actions workflow | Paste the reference workflow | [How-to](./HOW-TO.md) 12; [Administration](./ADMINISTRATION.md) |
| Invoke from Python or Go | Use the shims that forward to the Node `bin.js` | [Installation](./INSTALLATION.md) "Python and Go entrypoints"; [How-to](./HOW-TO.md) 23 |
| Consume the JSON artifacts | Read the `schemaVersion`/`kind` tables + `pnpm run ci:*` gates | root `README.md`; [Administration](./ADMINISTRATION.md) |

## 9. Use the Translation Hub (web portal)

| Goal | Do this | See |
| --- | --- | --- |
| Try the public demo server | Visit the demo on port 19090 | [Hub demo install](./HUB-DEMO-INSTALL.md) |
| Stand up your own hub | Client/server install + multi-site SSH batch | [Hub server install](./HUB-SERVER-INSTALL.md); [Hub connectivity](./HUB-CONNECTIVITY.md) |
| Run prepare → setup → translate → verify from the browser | Console "Run full pipeline" / per-site actions | [Hub connectivity](./HUB-CONNECTIVITY.md) |

## 10. Work across the whole program (multi-repo)

| Goal | Do this | See |
| --- | --- | --- |
| Open Chrysalis + WPTP siblings in one window without phantom repos | Open `chrysalis-program.code-workspace` | [Multi-repo workspace](./MULTI-REPO-WORKSPACE.md) |
| Understand the repo topology (D1–D7) | Read the program charter | [`MASTER-PROGRAM.md`](./MASTER-PROGRAM.md); [`GIT-LAYOUT.md`](./GIT-LAYOUT.md) |
| Add a new source adapter / emit target / matrix edge | Develop the sibling repo against IR v0 + Chrysalis harnesses | [Multi-repo workspace](./MULTI-REPO-WORKSPACE.md) §5; [`WPTP-GLOBAL-SCOPE.md`](./WPTP-GLOBAL-SCOPE.md) |

## 11. Commercial / licensing

| Goal | Do this | See |
| --- | --- | --- |
| Mark a vendor tree / check a license tier | `chrysalis license` (`init`/`license` are not gated) | [User guide](./USER-GUIDE.md) `license`; [`COMMERCIAL.md`](./COMMERCIAL.md) |
| Understand the offering posture | Read the revenue-ordering doc | [`COMMERCIAL.md`](./COMMERCIAL.md); [WPTP D6 policy](./WPTP-D6-ENTERPRISE-POLICY.md) |

---

## Contributing use cases

| Goal | Do this | See |
| --- | --- | --- |
| Add a feature the right way | Find/add the `ROADMAP.md` item, own one package, IR before passes | `AGENTS.md`; [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Handle an unsupported PHP construct | Emit a **hole** (`legacy:<reason>`), add a fixture, file a ROADMAP item | `AGENTS.md` §4 |
| See what already shipped | Browse the completed log | [`ROADMAP-ARCHIVE.md`](../ROADMAP-ARCHIVE.md) |
| Cut a release | Follow the tag + artifacts checklist | [Release process](./RELEASE.md) |
