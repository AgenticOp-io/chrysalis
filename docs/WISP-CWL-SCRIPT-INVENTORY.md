# WISP script inventory and disposition

The behavioral audit inventories every WISP-named `.mjs` file under `scripts/`.
The current inventory contains 240 scripts:

- 1 canonical end-to-end compiler;
- 8 generators;
- 1 consolidated audit library;
- 5 deployment/runtime wrappers;
- 88 verification or smoke scripts;
- 108 historical phase/deepen/generated-output mutators;
- 29 support or compatibility scripts.

The exact path list is generated on every build in
`reports/wisp/wisp-conversion-audit.json` under `scriptInventory`.

## Canonical

`scripts/wisp-cwl-one-pass.mjs` owns the full conversion. No other script may
claim to be a complete build.

## Logic incorporated into the canonical build

The following previously separate responsibilities now run as imported stages:

- origin source corpus and conversion queue generation;
- recursive backend Express route extraction;
- API proxy generation and specificity ordering;
- API golden application;
- module-tip extraction;
- wizard-catalog extraction;
- ArcGIS vendor-island build;
- structural conversion of every origin piece;
- static export;
- route, residue, hole, control, action, shell, and source-route audits;
- original CSS synchronization;
- GCE bundle creation and verification;
- optional GCE deployment.

The POC-from-scratch package aliases now enter the one-pass compiler.

## Generator scripts

Generators are retained only when their output is independently testable and
the one-pass compiler imports their implementation. Standalone commands remain
useful for focused debugging, but production output comes from one-pass.

Examples include the ArcGIS bundle, API proxy, module tips, wizard catalog,
static export, and client asset builders.

## Verification scripts

The 88 smoke/verify/audit scripts are milestone history and focused probes.
They are not chained wholesale because many assert obsolete phase-specific
fixtures. Stable, generally applicable checks are being consolidated into:

- ingest unit tests;
- `scripts/wisp/wisp-conversion-audit.mjs`;
- GCE bundle verification;
- `scripts/hub-ingest/hub-wisp-live-all-routes-audit.mjs`.

## Historical mutators

The 108 `apply-*`, `phase*`, `deepen*`, `batch*`, restart, and hole-filling
scripts are not canonical. They represent post-generation edits from earlier
iterations. Their reusable ideas have only four valid destinations:

1. structural ingest and event conversion;
2. origin-piece conversion helpers;
3. source-derived asset/API generators;
4. the central CWL browser runtime.

The one-pass path uses `structuralOnly: true`, so these scripts cannot overwrite
fresh source-derived routes during bundling.

## Support and compatibility scripts

Support scripts remain for trace capture, old reports, Firebase compatibility,
and operator utilities. Firebase is not part of the canonical WISP conversion
path. GCE is the deployment authority.

`scripts/wisp-cwl-pipeline.mjs` currently supplies bundle/deployment functions
to one-pass. Its old phase-oriented CLI is compatibility code, not the build
entry point.

## Retirement rules

A historical script can be deleted when:

- its unique behavior is present in a canonical module;
- an automated test or audit proves that behavior;
- no package command or deploy wrapper invokes it;
- two clean one-pass builds produce equivalent inventories.

Until then, it remains explicitly classified but must not be added to the
canonical call graph.
