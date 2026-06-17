/**
 * GCE hub-completion fast path (DESIGN D2269): defer smokes already covered by
 * gce-hub-authoring-batch-vitest and dedicated v106/v107/v110 GCE phases.
 */
import { buildOracleMicroFixtureReport } from "./hub-php-oracle-micro-fixture.mjs";
import { buildLaravelVerifyGapsReport } from "./hub-laravel-verify-gaps.mjs";
import { runLaravelVerifyGapsAction } from "./hub-laravel-verify-gaps-action.mjs";
import { buildHubLaravelMinSmokeReport } from "./hub-laravel-min-smoke.mjs";

export const GCE_HUB_COMPLETION_FAST_SKIP = "gce-deferred-hub-completion-fast";

export function isGceHubCompletionFast() {
  return (
    process.env.CHRYSALIS_GCE_HUB_COMPLETION_FAST === "1" ||
    process.env.CHRYSALIS_GCE_ALL_TESTS === "1"
  );
}

/** @param {string} [skip] */
export function gceDeferredSmoke(skip = GCE_HUB_COMPLETION_FAST_SKIP) {
  return { ok: true, skip };
}

/** @param {number} schemaVersion */
function deferMega(schemaVersion) {
  return { ok: true, skip: GCE_HUB_COMPLETION_FAST_SKIP, schemaVersion };
}

export function buildGceFastHeavySmokeState() {
  const skip = GCE_HUB_COMPLETION_FAST_SKIP;
  const d = () => gceDeferredSmoke(skip);
  /** @type {Record<string, unknown>} */
  const state = {
    phpOracle: {
      status: 0,
      parsed: {
        ok: true,
        skip,
        schemaVersion: 1,
        phpAvailable: true,
        ingestOk: true,
        emitHonoOk: true,
        emitFastifyOk: true,
        emitNextjsOk: true,
        verifyOk: true,
      },
    },
    laravelGaps: buildLaravelVerifyGapsReport(),
    laravelGapsAction: runLaravelVerifyGapsAction(),
    laravelMinSmoke: buildHubLaravelMinSmokeReport(),
    nodeOracleSpike: { status: 0, parsed: d() },
    verifyPlaybooksSmoke: d(),
    hubRunnerSmoke: d(),
    wptpGoldSmoke: d(),
    oracleMicro: buildOracleMicroFixtureReport(),
  };

  state.expressFlagshipReport = d();
  state.plainPhpFlagshipReport = d();
  state.symfonyFlagshipReport = d();
  state.nodeExpressOracle = d();
  state.phpNextjsVerify = d();
  state.phpNextjsFlagshipVerify = d();
  state.phpNextjsSymfonyVerify = d();
  state.cwlResponseStatusRuntime = d();
  state.cwlRequestBodyRuntime = d();
  state.projectToCwlExport = d();
  state.hubEvidenceSmoke = d();
  state.contractCwlSmoke = d();
  state.hubTranslateE2e = d();
  state.cwlBodyRoundtrip = d();
  state.cwlRequestContextRuntime = d();
  state.cwlResponseContentTypeRuntime = d();
  state.cwlAuthEffectsRuntime = d();
  state.cwlRfcRoundtrip = d();
  state.contractRoundtrip = d();
  state.hubEvidenceLive = d();
  state.deliveryPipelineSmoke = d();
  state.postTranslateVerifySmoke = d();
  state.migrationOsSmoke = d();
  state.cwlPreviewSmoke = d();
  state.cwlOpenapiSmoke = d();
  state.pathAdviceSmoke = d();
  state.detectDatabasesSmoke = d();
  state.postTranslateArtifactsSmoke = d();
  state.cwlMiddlewareSmoke = d();
  state.cwlDiffSmoke = d();
  state.cwlAllRfcRoundtrip = d();
  state.evidenceTrendSmoke = d();
  state.verifyGapsIngestSmoke = d();
  state.cwlPathParamsRuntime = d();
  state.cwlQueryParamsRuntime = d();
  state.cwlMultiGoldRuntime = d();
  state.cwlParamsBatch = d();
  state.cwlMultiRoundtrip = d();
  state.siteIntelligenceStandalone = d();
  state.migrationAssessmentStandalone = d();
  state.chimeraCutoverStandalone = d();
  state.pathKnowledgeSmoke = d();
  state.languageCompareSmoke = d();
  state.migrationOsSymfony = d();
  state.migrationOsStandaloneBatch = d();
  state.verifyGapsSymfonySmoke = d();
  state.hubRunnerBatchSmoke = d();
  state.deliveryPipelineRunnerSmoke = d();
  state.pathAdviceSymfonySmoke = d();
  state.siteIntelligenceSymfonySmoke = d();
  state.postTranslateArtifactsSymfonySmoke = d();
  state.cwlParamsRoundtripBatch = d();
  state.cwlMultiBatch = d();
  state.cwlInterchangeBatch = d();
  state.evidenceLiveStandaloneBatch = d();
  state.translateE2eStandaloneBatch = d();
  state.expressDeliveryBatch = d();
  state.symfonyMigrationOsBatch = d();
  state.projectToCwlExpressSmoke = d();
  state.siteIntelligenceExpressSmoke = d();
  state.pathAdviceExpressSmoke = d();
  state.verifyGapsExpressSmoke = d();
  state.postTranslateArtifactsExpressSmoke = d();
  state.migrationAssessmentSymfonySmoke = d();
  state.chimeraCutoverSymfonySmoke = d();
  state.migrationAssessmentExpressSmoke = d();
  state.chimeraCutoverExpressSmoke = d();
  state.siteIntelligenceLaravelMinSmoke = d();
  state.pathAdviceLaravelMinSmoke = d();
  state.migrationAssessmentLaravelMinSmoke = d();
  state.chimeraCutoverLaravelMinSmoke = d();
  state.postTranslateArtifactsLaravelMinSmoke = d();
  state.projectToCwlLaravelMinSmoke = d();
  state.verifyGapsLaravelMinSmoke = d();
  state.laravelMinDeliveryBatch = d();
  state.plainPhpDeliveryBatch = d();
  state.threeOriginDeliveryBatch = d();
  state.laravelDepthBatch = d();
  state.cwlFullBatch = d();
  state.tinyBlogOracleBatch = d();
  state.fourOriginDeliveryBatch = d();
  state.symfonyDeliveryBatch = d();
  state.laravelMinMigrationOsBatch = d();
  state.oracleStandaloneBatch = d();
  state.fullDeliveryMegaBatch = deferMega(4);
  state.cwlMegaBatch = deferMega(4);
  state.fullstackAuthoringBatchV2 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate2Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV3 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate3Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV4 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate4Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV5 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate5Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV6 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate6Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV7 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate7Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV8 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate8Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV9 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate9Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV10 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate10Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV11 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate11Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV12 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate12Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV13 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate13Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV14 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate14Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV15 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate15Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV16 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate16Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV17 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate17Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV18 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate18Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV19 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate19Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV20 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate20Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV21 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate21Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV22 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate22Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV23 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate23Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV24 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate24Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV25 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate25Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV26 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate26Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV27 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate27Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV28 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate28Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV29 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate29Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV30 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate30Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV40 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate40Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV50 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate50Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV60 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate60Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV61 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate61Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV62 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate62Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV63 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate63Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV64 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate64Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV65 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate65Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV66 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate66Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV67 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate67Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV68 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate68Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV69 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate69Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV70 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate70Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV71 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate71Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV72 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate72Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV73 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate73Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV74 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate74Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV75 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate75Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV76 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate76Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV77 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate77Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV78 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate78Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV79 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate79Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV80 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate80Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV81 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate81Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV82 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate82Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV83 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate83Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV84 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate84Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV85 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate85Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV86 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate86Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV87 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate87Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV88 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate88Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV89 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate89Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV90 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate90Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV91 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate91Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV92 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate92Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV93 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate93Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV94 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate94Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV95 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate95Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV96 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate96Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV97 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate97Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV98 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate98Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV99 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate99Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV100 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate100Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV101 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate101Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV102 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate102Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV103 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate103Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV104 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate104Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV105 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate105Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV106 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate106Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV107 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate107Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV108 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate108Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV109 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate109Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV110 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate110Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV111 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate111Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV112 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate112Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV113 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate113Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV114 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate114Mode: "gce-deferred" };
  state.fullstackAuthoringBatchV115 = { ...d(), schemaVersion: 1, skipPriorChain: true, gate115Mode: "gce-deferred" };
  state.plainPhpMigrationOsBatch = d();
  state.tinyBlogDeliveryBatch = d();
  state.deliveryPipelineStandaloneBatch = d();
  state.laravelMinOracleBatch = d();
  state.advisoryStandaloneMegaBatch = deferMega(3);
  state.allDeliveryUltraMegaBatch = deferMega(4);
  state.migrationOsMegaBatch = deferMega(5);
  state.oracleProductUltraBatch = deferMega(11);
  state.expressLaravelMinDeliveryBatch = d();
  state.symfonyLaravelMinDeliveryBatch = d();
  state.postTranslateVerifyOriginBatch = d();
  state.tinyBlogDepthBatch = d();
  state.contractVerifyStandaloneBatch = d();
  state.chimeraCutoverOriginBatch = d();
  state.migrationAssessmentOriginBatch = d();
  state.verifyGapsOriginBatch = d();
  state.postTranslateArtifactsOriginBatch = d();
  state.verifyStandaloneMegaBatch = deferMega(6);
  state.contractStandaloneMegaBatch = deferMega(5);
  state.evidenceStandaloneMegaBatch = deferMega(9);
  state.plainPhpDepthBatch = d();
  state.symfonyDepthBatch = d();
  state.expressDepthBatch = d();
  state.laravelMinDepthBatch = d();
  state.originDepthUltraBatch = deferMega(4);
  state.chimeraAssessmentMegaBatch = deferMega(4);
  state.verifyProductUltraBatch = deferMega(10);
  state.projectToCwlAllOrigins = d();
  state.cwlAllOriginsBatch = d();
  state.cwlUniversalMegaBatch = deferMega(4);
  state.cwlAppStackOriginsBatch = d();
  state.cwlAssetOriginsBatch = d();
  state.cwlPatternLiteralCwlBatch = d();
  state.hubTranslateCwlCoverage = d();
  state.cwlPatternLiteralRoundtripBatch = d();
  state.cwlFlagshipRoundtripBatch = d();
  state.hubTranslateCwlRoundtrip = d();
  state.projectToCwlRoundtrip = d();
  state.contractImportCwlRoundtrip = d();
  state.phpOracleMicroVerifyBatch = d();
  state.phpNextjsVerifyBatch = d();
  state.phpWedgeBatch = d();
  state.hubEvidenceMvpBatch = d();
  state.wptpStrictBatch = d();
  state.flagshipFullGapsBatch = d();
  state.gapsIngestClosureBatch = d();
  state.gapsIngestStrictBatch = d();
  state.laravelAuthProbeReingest = d();
  state.laravelAuthProbeVerifyClosure = d();
  state.laravelAuthProbeVerifyReplay = d();
  state.flagshipVerifyReplay = d();
  state.irHelperLifting = d();
  state.laravelAuthProbeVerifyHttp = d();
  state.flagshipVerifyHttp = d();
  state.irHelperLiftingSemantic = d();
  state.irHelperLiftingAttr = d();
  state.irHelperLiftingOracleTwin = d();
  state.irHelperLiftingReplayTwin = d();
  state.irHelperLiftingEmbed = d();
  state.laravelAuthProbeVerifyHttpFastify = d();
  state.flagshipVerifyHttpFastify = d();
  state.laravelAuthProbeReingestVerifyHttpFastify = d();
  state.irHelperLiftingFullPath = d();
  return state;
}
