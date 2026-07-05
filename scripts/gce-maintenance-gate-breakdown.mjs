#!/usr/bin/env node
/** Fast maintenance gate breakdown — close run once; governance skips repeat close. */
import { runFullMatrixOracleCloseGate } from "./hub-ingest/hub-full-matrix-oracle-close-smoke.mjs";
import {
  runHonestGapsImplementationCloseGate,
  runHonestGapsPhase11DepthGate,
  runMaintenanceModeGovernanceGate,
  runMatrixExpansionPhase10Gate,
  runMultiLanguageEvidencePhase10Gate,
  runStrategicPlanPhase10DepthGate,
  runStrategicPlanPhase10HubCompletionGate,
  runStrategicPlanPhase10ProductionParityEntryGate,
  runStrategicPlanPhase10ProgramArchiveDocGate,
  runStrategicPlanPhase10ShipLogGate,
  runWordPressVerticalPhase10EntryGate,
} from "./hub-ingest/hub-cwl-fullstack-gates.mjs";

const opts = {
  skipOracleVerify: true,
  skipEmitHttp: true,
  skipGoldVerify: true,
  skipProjectCwlRoundtrip: true,
  skipCwlRfcRoundtrip: true,
  skipLaravelLiveGaps: true,
  skipMigrationOsMegaBatch: true,
  skipMigrationOsStandaloneBatch: true,
  skipPhpWedgeFlagships: true,
  skipEmitParityFlagships: true,
  skipChimeraOriginBatch: true,
  skipArtifact: true,
};

const close = await runFullMatrixOracleCloseGate(opts);
const skipCloseOpts = { ...opts, skipFullMatrixOracleClose: true };

const entry = await runStrategicPlanPhase10ProductionParityEntryGate(skipCloseOpts);
const depth = await runStrategicPlanPhase10DepthGate(skipCloseOpts);
const wordpress = await runWordPressVerticalPhase10EntryGate(skipCloseOpts);
const matrix = await runMatrixExpansionPhase10Gate();
const multiLang = await runMultiLanguageEvidencePhase10Gate(skipCloseOpts);
const hubCompletion = runStrategicPlanPhase10HubCompletionGate();
const shipLog = runStrategicPlanPhase10ShipLogGate();
const archiveDoc = runStrategicPlanPhase10ProgramArchiveDocGate();
const phase11Depth = await runHonestGapsPhase11DepthGate(skipCloseOpts);
const governance = await runMaintenanceModeGovernanceGate(skipCloseOpts);
const phase11 = await runHonestGapsImplementationCloseGate(skipCloseOpts);

process.stdout.write(
  `${JSON.stringify(
    {
      closeOk: close.ok === true,
      closeSummary: close.masterSlice
        ? {
            ok: close.masterSlice.ok,
            slice41a: close.masterSlice.slice41a?.ok,
            slice41d: close.masterSlice.slice41d?.ok,
            slice41e: close.masterSlice.slice41e?.ok,
          }
        : null,
      reinforcement: { entry, depth, wordpress, matrix, multiLang, hubCompletion },
      shipLog,
      archiveDoc,
      phase11Depth,
      governanceSummary: {
        ok: governance.ok,
        closeOk: governance.closeOk,
        docOk: governance.docOk,
        pausedOk: governance.pausedOk,
        strategicPlanOk: governance.strategicPlanOk,
        roadmapOk: governance.roadmapOk,
        llmEntryOk: governance.llmEntryOk,
      },
      phase11Summary: {
        ok: phase11.ok,
        docOk: phase11.docOk,
        scaffoldingOk: phase11.scaffoldingOk,
        depthOk: phase11.depthOk,
        maintenanceOk: phase11.maintenanceOk,
      },
    },
    null,
    2,
  )}\n`,
);
