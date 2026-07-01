#!/usr/bin/env node
/**
 * Canonical GCE phase id list (CSV on stdout). Single source for init/bootstrap/resume scripts.
 */
import { ORACLE_PRODUCT_ULTRA_SLICE_IDS } from "./hub-ingest/hub-oracle-product-ultra-batch-smoke.mjs";
import { VERIFY_STANDALONE_MEGA_SLICE_IDS } from "./hub-ingest/hub-verify-standalone-mega-batch-smoke.mjs";

/** @type {string[]} */
const CORE_PHASES = [
  "build-install",
  "build-compile",
  "parser-bridge-vendor",
  "cli-shims",
  "hub-strategic-vitest",
  "strategic-plan-phase8-strict",
  "hub-express-flagship",
  "hub-plain-php-flagship",
  "hub-symfony-flagship",
  "hub-node-express-oracle-verify",
  "hub-node-oracle-spike",
  "hub-cwl",
  "hub-fixture-emits",
  "hub-cwl-authoring-v61-v63",
  "hub-cwl-authoring-v64-v70",
  "hub-cwl-authoring-v71-v90",
  "hub-cwl-authoring-v91-v110",
  "wptp-matrix",
  "hub-gold-verify",
  "hub-gold-trace-replay",
];

/** @type {string[]} */
const V106_PHASES = ORACLE_PRODUCT_ULTRA_SLICE_IDS.map((id) => `cwl-v106-${id}`);

/** @type {string[]} */
const V107_PHASES = VERIFY_STANDALONE_MEGA_SLICE_IDS.map((id) => `cwl-v107-${id}`);

/** @type {string[]} */
const V110_PHASES = ["cwl-v110-verify-gaps-parallel", "cwl-v110-migration-mega"];

/** @param {{ fullVitest?: boolean, post110?: boolean, skipInstall?: boolean, skipBuild?: boolean }} [opts] */
export function buildGcePhaseList(opts = {}) {
  /** @type {string[]} */
  const phases = [];
  if (opts.skipInstall !== true) phases.push("build-install");
  if (opts.skipBuild !== true) phases.push("build-compile");
  phases.push(...CORE_PHASES.slice(2));
  if (opts.fullVitest === true) phases.push("full-vitest");
  phases.push(
    "hub-completion-json",
    "hub-completion-gate",
    "hub-knowledge",
    "intelligence-shorthand-close",
    "migration-os-close",
    "open-web-llm-close",
    "wisp-web-llm-poc-close",
    "open-legacy-wedge",
    "cwl-http-verify",
    "cwl-batch-v40",
    "cwl-batch-v60",
    ...V106_PHASES,
    ...V107_PHASES,
    ...V110_PHASES,
  );
  if (opts.post110 !== false) phases.push("post110-verify-gaps");
  return phases;
}

/** Default full-suite list (matches gce-run-all-tests.sh). */
export function defaultGcePhaseList() {
  const skipInstall = process.env.CHRYSALIS_GCE_SKIP_PNPM_INSTALL === "1";
  const skipBuild = process.env.CHRYSALIS_GCE_SKIP_BUILD === "1";
  const fullVitest = process.env.CHRYSALIS_GCE_FULL_VITEST === "1";
  const post110 = process.env.CHRYSALIS_GCE_POST110_PHASE_B !== "0";
  return buildGcePhaseList({ skipInstall, skipBuild, fullVitest, post110 });
}

const cmd = process.argv[2];
if (cmd === "csv" || !cmd) {
  console.log(defaultGcePhaseList().join(","));
} else if (cmd === "count") {
  console.log(String(defaultGcePhaseList().length));
} else if (cmd === "json") {
  console.log(JSON.stringify(defaultGcePhaseList(), null, 2));
} else {
  console.error("usage: gce-phase-list.mjs [csv|count|json]");
  process.exit(2);
}
