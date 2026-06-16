#!/usr/bin/env node
/** PHP wedge batch v8: v7 + IR helper full path + reingest Fastify HTTP (G1015). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhpNextjsVerifyBatchSmoke } from "./hub-php-nextjs-verify-batch-smoke.mjs";
import { runPhpOracleMicroVerifyBatchSmoke } from "./hub-php-oracle-micro-verify-batch-smoke.mjs";
import { runLaravelVerifyGapsBatchSmoke } from "./hub-laravel-verify-gaps-batch-smoke.mjs";
import { runNodeExpressOracleStandaloneSmoke } from "./hub-node-express-oracle-standalone-smoke.mjs";
import { runGapsIngestClosureBatchSmoke } from "./hub-gaps-ingest-closure-batch-smoke.mjs";
import { runGapsIngestStrictBatchSmoke } from "./hub-gaps-ingest-strict-batch-smoke.mjs";
import { runIrHelperLiftingSmoke } from "./hub-ir-helper-lifting-smoke.mjs";
import { runIrHelperLiftingSemanticSmoke } from "./hub-ir-helper-lifting-semantic-smoke.mjs";
import { runIrHelperLiftingEmbedSmoke } from "./hub-ir-helper-lifting-embed-smoke.mjs";
import { runIrHelperLiftingFullPathSmoke } from "./hub-ir-helper-lifting-full-path-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyHttpFastifySmoke } from "./hub-laravel-auth-probe-reingest-verify-http-fastify-smoke.mjs";
import {
  gceDeferredMegaDedupe,
  isGceMegaDedupeEnabled,
  PHP_WEDGE_GCE_DEFERRED,
} from "./hub-gce-mega-dedupe.mjs";
import { createSmokeProgress, runSmokeStep, runSmokeStepSync } from "./hub-smoke-progress.mjs";

export const HUB_PHP_WEDGE_BATCH_KIND = "chrysalis.hub.php-wedge-batch-smoke";
export const HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION = 8;

const SCOPE = "php-wedge";

/**
 * @param {string} label
 * @param {string} coveredBy
 */
function deferredStep(label, coveredBy) {
  createSmokeProgress(SCOPE).defer(label, coveredBy);
  return gceDeferredMegaDedupe(coveredBy);
}

export async function runPhpWedgeBatchSmoke() {
  const gceMegaDedupe = isGceMegaDedupeEnabled();
  createSmokeProgress(SCOPE).info(gceMegaDedupe ? "batch start (GCE dedupe on)" : "batch start");

  const nextjsVerify = gceMegaDedupe
    ? deferredStep("nextjsVerify", PHP_WEDGE_GCE_DEFERRED.nextjsVerify)
    : await runSmokeStep(SCOPE, "nextjsVerify", () => runPhpNextjsVerifyBatchSmoke());
  const oracleMicro = gceMegaDedupe
    ? deferredStep("oracleMicro", PHP_WEDGE_GCE_DEFERRED.oracleMicro)
    : await runSmokeStep(SCOPE, "oracleMicro", () => runPhpOracleMicroVerifyBatchSmoke());
  const laravelGaps = runSmokeStepSync(SCOPE, "laravelGaps", () => runLaravelVerifyGapsBatchSmoke());
  const nodeExpressOracle = gceMegaDedupe
    ? deferredStep("nodeExpressOracle", PHP_WEDGE_GCE_DEFERRED.nodeExpressOracle)
    : await runSmokeStep(SCOPE, "nodeExpressOracle", () => runNodeExpressOracleStandaloneSmoke());
  const gapsIngestClosure = gceMegaDedupe
    ? deferredStep("gapsIngestClosure", PHP_WEDGE_GCE_DEFERRED.gapsIngestClosure)
    : await runSmokeStep(SCOPE, "gapsIngestClosure", () => runGapsIngestClosureBatchSmoke());
  const gapsIngestStrict = gceMegaDedupe
    ? deferredStep("gapsIngestStrict", PHP_WEDGE_GCE_DEFERRED.gapsIngestStrict)
    : await runSmokeStep(SCOPE, "gapsIngestStrict", () => runGapsIngestStrictBatchSmoke());
  const irHelperLifting = runSmokeStepSync(SCOPE, "irHelperLifting", () => runIrHelperLiftingSmoke());
  const irHelperLiftingSemantic = runSmokeStepSync(SCOPE, "irHelperLiftingSemantic", () =>
    runIrHelperLiftingSemanticSmoke(),
  );
  const irHelperLiftingEmbed = runSmokeStepSync(SCOPE, "irHelperLiftingEmbed", () => runIrHelperLiftingEmbedSmoke());
  const irHelperLiftingFullPath = runSmokeStepSync(SCOPE, "irHelperLiftingFullPath", () =>
    runIrHelperLiftingFullPathSmoke(),
  );
  const authProbeReingestVerifyHttpFastify = await runSmokeStep(
    SCOPE,
    "authProbeReingestVerifyHttpFastify",
    () => runLaravelAuthProbeReingestVerifyHttpFastifySmoke(),
  );

  const ok =
    nextjsVerify.ok === true &&
    oracleMicro.ok === true &&
    laravelGaps.ok === true &&
    nodeExpressOracle.ok === true &&
    gapsIngestClosure.ok === true &&
    gapsIngestStrict.ok === true &&
    irHelperLifting.ok === true &&
    irHelperLiftingSemantic.ok === true &&
    irHelperLiftingEmbed.ok === true &&
    irHelperLiftingFullPath.ok === true &&
    authProbeReingestVerifyHttpFastify.ok === true;

  createSmokeProgress(SCOPE).info(ok ? "batch ok" : "batch FAIL");

  return {
    kind: HUB_PHP_WEDGE_BATCH_KIND,
    schemaVersion: HUB_PHP_WEDGE_BATCH_SCHEMA_VERSION,
    ok,
    gceMegaDedupe,
    nextjsVerify,
    oracleMicro,
    laravelGaps,
    nodeExpressOracle,
    gapsIngestClosure,
    gapsIngestStrict,
    irHelperLifting,
    irHelperLiftingSemantic,
    irHelperLiftingEmbed,
    irHelperLiftingFullPath,
    authProbeReingestVerifyHttpFastify,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPhpWedgeBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
