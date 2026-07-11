#!/usr/bin/env node
/**
 * Site → CWL port pipeline with verify-gated trajectory logging (Phase 33 / G8400).
 *
 * Flow: site intelligence → WebIR ingest → CWL export → verify replay → dataset export.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildSiteIntelligenceReport,
  writeSiteIntelligenceArtifacts,
} from "./hub-ingest/hub-site-intelligence.mjs";
import { exportProjectMigrationCwl } from "./hub-ingest/hub-project-cwl-export.mjs";
import { ensureProjectWebir } from "./hub-ingest/hub-project-to-cwl-gates.mjs";
import { runProjectVerifyReplay } from "./hub-ingest/hub-verify-replay.mjs";
import { runWebLlmExportDataset } from "./web-llm-export-dataset.mjs";

export const SITE_PORT_REPORT_KIND = "chrysalis.site-port.v1";
export const SITE_PORT_REPORT_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  }
}

async function loadVerify() {
  try {
    return await import("@chrysalis/verify");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/verify/dist/index.js")).href);
  }
}

function corpusHasTraces(corpusRoot) {
  if (!existsSync(corpusRoot)) return false;
  try {
    for (const ent of readdirSync(corpusRoot, { withFileTypes: true, recursive: true })) {
      const name = ent.name;
      if (name.endsWith(".ndjson") || name.endsWith(".jsonl") || name === "trace.json") return true;
    }
  } catch {
    return false;
  }
  return false;
}

function parseArgs(argv) {
  let projectDir = null;
  let origin = null;
  let repoRoot = scriptRoot;
  let trajectoryPath = null;
  let corpusDir = null;
  let verifyTarget = "hono";
  let minRoutes = 1;
  let exportDataset = true;
  let verify = true;
  let jsonOnly = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (a === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (a === "--repo-root" && argv[i + 1]) repoRoot = resolve(argv[++i]);
    else if (a === "--trajectory" && argv[i + 1]) trajectoryPath = resolve(argv[++i]);
    else if (a === "--corpus" && argv[i + 1]) corpusDir = resolve(argv[++i]);
    else if (a === "--verify-target" && argv[i + 1]) verifyTarget = argv[++i];
    else if (a === "--min-routes" && argv[i + 1]) minRoutes = Number.parseInt(argv[++i], 10);
    else if (a === "--no-dataset") exportDataset = false;
    else if (a === "--no-verify") verify = false;
    else if (a === "--json") jsonOnly = true;
    else if (!a.startsWith("-") && !projectDir) projectDir = resolve(a);
  }
  if (!projectDir) {
    throw new Error(
      "usage: site-port-to-cwl.mjs <project-dir> [--origin php] [--trajectory path] [--corpus traces/] [--verify-target hono] [--min-routes N] [--no-verify] [--no-dataset] [--json]",
    );
  }
  return {
    projectDir,
    origin,
    repoRoot,
    trajectoryPath,
    corpusDir,
    verifyTarget,
    minRoutes,
    exportDataset,
    verify,
    jsonOnly,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.projectDir
 * @param {string} [opts.origin]
 * @param {string} [opts.repoRoot]
 * @param {string} [opts.trajectoryPath]
 * @param {string} [opts.corpusDir]
 * @param {string} [opts.verifyTarget]
 * @param {number} [opts.minRoutes]
 * @param {boolean} [opts.exportDataset]
 * @param {boolean} [opts.verify]
 */
export async function runSitePortToCwl(opts) {
  const projectDir = resolve(opts.projectDir);
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const webLlm = await loadWebLlm();
  const trajectoryPath =
    opts.trajectoryPath ?? webLlm.resolveSitePortTrajectoryPath(repoRoot, projectDir);
  mkdirSync(dirname(trajectoryPath), { recursive: true });

  const sessionId = webLlm.createTrajectorySessionId("site-port");
  const steps = [];

  const intelligence = await buildSiteIntelligenceReport(projectDir);
  const intelArtifacts = await writeSiteIntelligenceArtifacts(projectDir, intelligence);
  const resolvedOrigin = opts.origin ?? intelligence.primaryOrigin ?? "php";
  const intelLog = webLlm.logSitePortStep({
    repoRoot,
    projectDir,
    gateName: webLlm.SITE_PORT_GATE_NAMES.intelligence,
    ok: true,
    detail: {
      primaryOrigin: resolvedOrigin,
      routeEstimate: intelligence.routeEstimate?.count ?? null,
      risk: intelligence.risk?.level ?? null,
    },
    sessionId,
    trajectoryPath,
  });
  steps.push({ step: "intelligence", ok: true, artifacts: intelArtifacts.jsonPath, log: intelLog });

  const webir = await ensureProjectWebir(projectDir, resolvedOrigin);
  const ingestLog = webLlm.logSitePortStep({
    repoRoot,
    projectDir,
    gateName: webLlm.SITE_PORT_GATE_NAMES.ingest,
    ok: webir.ok === true,
    skip: webir.skip,
    detail: { origin: resolvedOrigin, routeCount: webir.routeCount ?? null },
    sessionId,
    trajectoryPath,
  });
  steps.push({ step: "ingest", ok: webir.ok === true, skip: webir.skip ?? null, log: ingestLog });

  if (!webir.ok) {
    const report = buildReport({
      projectDir,
      origin: resolvedOrigin,
      ok: false,
      reason: webir.skip ?? "ingest-failed",
      intelligence,
      steps,
      trajectoryPath,
      sessionId,
    });
    writeReportArtifacts(projectDir, report);
    return report;
  }

  const cwl = await exportProjectMigrationCwl(projectDir, { origin: resolvedOrigin });
  const minRoutes = opts.minRoutes ?? 1;
  const cwlOk = cwl.ok === true && (cwl.routeCount ?? 0) >= minRoutes;
  const cwlLog = webLlm.logSitePortStep({
    repoRoot,
    projectDir,
    gateName: webLlm.SITE_PORT_GATE_NAMES.cwlExport,
    ok: cwlOk,
    detail: {
      routeCount: cwl.routeCount ?? null,
      holeCount: cwl.holeCount ?? null,
      cwlPath: cwl.cwlPath ?? null,
    },
    sessionId,
    trajectoryPath,
  });
  steps.push({ step: "cwl-export", ok: cwlOk, log: cwlLog });

  const ingest = await loadIngest();
  const uiLift = ingest.liftProjectUiAssets({ projectDir });
  const uiAssetsOk = uiLift.ok === true;
  const uiAssetsLog = webLlm.logSitePortStep({
    repoRoot,
    projectDir,
    gateName: webLlm.SITE_PORT_GATE_NAMES.uiAssets,
    ok: uiAssetsOk,
    skip: "skip" in uiLift ? uiLift.skip : undefined,
    detail: uiLift.ok
      ? {
          buildRoot: "buildRoot" in uiLift ? uiLift.buildRoot : null,
          framework: "framework" in uiLift ? uiLift.framework : null,
          bundleCount: "bundles" in uiLift ? uiLift.bundles.length : null,
          mapPath: "written" in uiLift ? uiLift.written.mapPath : null,
        }
      : { hole: uiLift.hole?.reason ?? null },
    sessionId,
    trajectoryPath,
  });
  steps.push({
    step: "ui-assets",
    ok: uiAssetsOk,
    skip: "skip" in uiLift ? uiLift.skip : null,
    log: uiAssetsLog,
  });

  const uiMarkupLift = ingest.liftProjectUiMarkup({ projectDir });
  const uiMarkupOk = uiMarkupLift.ok === true;
  const uiMarkupLog = webLlm.logSitePortStep({
    repoRoot,
    projectDir,
    gateName: webLlm.SITE_PORT_GATE_NAMES.uiMarkup,
    ok: uiMarkupOk,
    skip: "skip" in uiMarkupLift ? uiMarkupLift.skip : undefined,
    detail: uiMarkupLift.ok
      ? {
          sourceRoot: "sourceRoot" in uiMarkupLift ? uiMarkupLift.sourceRoot : null,
          framework: "framework" in uiMarkupLift ? uiMarkupLift.framework : null,
          bundleCount: "bundles" in uiMarkupLift ? uiMarkupLift.bundles.length : null,
          mapPath: "written" in uiMarkupLift ? uiMarkupLift.written.mapPath : null,
        }
      : { hole: uiMarkupLift.hole?.reason ?? null },
    sessionId,
    trajectoryPath,
  });
  steps.push({
    step: "ui-markup",
    ok: uiMarkupOk,
    skip: "skip" in uiMarkupLift ? uiMarkupLift.skip : null,
    log: uiMarkupLog,
  });

  const corpusRoot = opts.corpusDir ?? join(projectDir, "traces");
  const hasCorpus = corpusHasTraces(corpusRoot);
  let loadBind = null;
  if (hasCorpus) {
    const cwlTargets = ingest.defaultSiteConvertCwlPaths(projectDir);
    if (cwlTargets.length > 0) {
      loadBind = ingest.bindSiteProjectLoadFromTraces({
        tracesDir: corpusRoot,
        cwlPaths: cwlTargets,
      });
      const loadBindOk = loadBind.ok === true;
      const loadBindLog = webLlm.logSitePortStep({
        repoRoot,
        projectDir,
        gateName: webLlm.SITE_PORT_GATE_NAMES.siteLoadBind,
        ok: loadBindOk,
        detail: {
          tracesIndexed: loadBind.tracesIndexed,
          routesBound: loadBind.routes.filter((r) => r.skip === null).length,
        },
        sessionId,
        trajectoryPath,
      });
      steps.push({
        step: "site-load-bind",
        ok: loadBindOk,
        log: loadBindLog,
      });
    }
  }

  const verifyPkg = await loadVerify();
  const siteScale = verifyPkg.verifySiteScaleMatrix({
    projectDir,
    tracesDir: corpusRoot,
  });
  const siteScaleOk = siteScale.ok === true || siteScale.layersChecked === 0;
  const siteScaleLog = webLlm.logSitePortStep({
    repoRoot,
    projectDir,
    gateName: webLlm.SITE_PORT_GATE_NAMES.siteScaleMatrix,
    ok: siteScaleOk,
    skip: siteScale.layersChecked === 0 ? "no-layers" : undefined,
    detail: {
      layersChecked: siteScale.layersChecked,
      layersFailed: siteScale.layersFailed,
      layersSkipped: siteScale.layersSkipped,
      layers: siteScale.layers.map((l) => ({ layer: l.layer, ok: l.ok, skip: l.skip })),
    },
    sessionId,
    trajectoryPath,
  });
  steps.push({
    step: "site-scale-matrix",
    ok: siteScaleOk,
    skip: siteScale.layersChecked === 0 ? "no-layers" : null,
    log: siteScaleLog,
    report: siteScale,
  });

  /** @type {Record<string, unknown>} */
  let verify = { ok: true, skip: "verify-disabled" };

  if (opts.verify !== false) {
    if (webLlm.SITE_PORT_VERIFY_ORIGINS.has(resolvedOrigin)) {
      const verifyTarget = opts.verifyTarget ?? "hono";
      const replay = await runProjectVerifyReplay(projectDir, {
        origin: resolvedOrigin,
        target: verifyTarget,
        repoRoot,
      });
      const gateEval = webLlm.evaluateSitePortVerifyGate({
        ok: replay.ok === true,
        skip: replay.skip,
        correctness: replay.correctness,
      });
      verify = {
        ok: gateEval.ok === true,
        skip: replay.skip ?? (gateEval.skipped ? gateEval.reason : null),
        mode: hasCorpus ? "probe-replay-corpus-present" : "probe-replay",
        target: verifyTarget,
        correctness: replay.correctness ?? null,
        traceCount: replay.traceCount ?? null,
        routeCount: replay.routeCount ?? null,
        summaryPath: replay.summaryPath ?? null,
        corpusDir: hasCorpus ? corpusRoot : null,
      };
    } else {
      verify = { ok: true, skip: `origin-${resolvedOrigin}-unsupported` };
    }
  }

  const verifyLog = webLlm.logSitePortStep({
    repoRoot,
    projectDir,
    gateName: webLlm.SITE_PORT_GATE_NAMES.verify,
    ok: verify.ok === true,
    skip: typeof verify.skip === "string" ? verify.skip : undefined,
    detail: {
      mode: verify.mode ?? null,
      target: verify.target ?? null,
      correctness: verify.correctness ?? null,
      traceCount: verify.traceCount ?? null,
    },
    sessionId,
    trajectoryPath,
  });
  steps.push({ step: "verify", ok: verify.ok === true, skip: verify.skip ?? null, log: verifyLog });

  let dataset = null;
  if (opts.exportDataset !== false) {
    dataset = await runWebLlmExportDataset({
      repoRoot,
      inputs: [trajectoryPath],
      outDir: join(repoRoot, "reports/web-llm/dataset/site-port"),
    });
    const datasetOk = dataset.ok === true && (dataset.shardCount ?? 0) > 0;
    const datasetLog = webLlm.logSitePortStep({
      repoRoot,
      projectDir,
      gateName: webLlm.SITE_PORT_GATE_NAMES.dataset,
      ok: datasetOk,
      detail: {
        shardCount: dataset.shardCount ?? 0,
        outDir: dataset.outDir ?? null,
      },
      sessionId,
      trajectoryPath,
    });
    steps.push({ step: "dataset-export", ok: datasetOk, log: datasetLog });
  }

  const trajectorySummary = webLlm.summarizeTrajectorySession(trajectoryPath, sessionId);
  const verifyRequired = opts.verify !== false && webLlm.SITE_PORT_VERIFY_ORIGINS.has(resolvedOrigin);
  const verifyOk = !verifyRequired || verify.ok === true;
  const ok =
    cwlOk &&
    verifyOk &&
    trajectorySummary.ok === true &&
    (trajectorySummary.recordCount ?? 0) >= 4 &&
    (opts.exportDataset === false || (dataset?.shardCount ?? 0) > 0);

  const report = buildReport({
    projectDir,
    origin: resolvedOrigin,
    ok,
    intelligence,
    webir,
    cwl,
    uiAssets: formatUiAssetsReport(uiLift),
    uiMarkup: formatUiMarkupReport(uiMarkupLift),
    verify,
    dataset,
    steps,
    trajectoryPath,
    trajectorySummary,
    sessionId,
  });
  writeReportArtifacts(projectDir, report);
  return report;
}

function formatUiAssetsReport(uiLift) {
  if (uiLift.ok !== true) {
    return { ok: false, hole: uiLift.hole?.reason ?? null, detail: uiLift.hole?.detail ?? null };
  }
  if ("skip" in uiLift) {
    return { ok: true, skip: uiLift.skip };
  }
  return {
    ok: true,
    framework: uiLift.framework,
    buildRoot: uiLift.buildRoot,
    bundleCount: uiLift.bundles.length,
    mapPath: uiLift.written.mapPath,
  };
}

function formatUiMarkupReport(uiLift) {
  if (uiLift.ok !== true) {
    return { ok: false, hole: uiLift.hole?.reason ?? null, detail: uiLift.hole?.detail ?? null };
  }
  if ("skip" in uiLift) {
    return { ok: true, skip: uiLift.skip };
  }
  return {
    ok: true,
    framework: uiLift.framework,
    sourceRoot: uiLift.sourceRoot,
    bundleCount: uiLift.bundles.length,
    mapPath: uiLift.written.mapPath,
  };
}

function buildReport(input) {
  return {
    kind: SITE_PORT_REPORT_KIND,
    schemaVersion: SITE_PORT_REPORT_SCHEMA_VERSION,
    ok: input.ok === true,
    ...(input.reason ? { reason: input.reason } : {}),
    projectDir: input.projectDir,
    origin: input.origin,
    intelligence: {
      primaryOrigin: input.intelligence?.primaryOrigin ?? null,
      routeEstimate: input.intelligence?.routeEstimate?.count ?? null,
      risk: input.intelligence?.risk?.level ?? null,
    },
    ingest: input.webir
      ? { ok: input.webir.ok === true, routeCount: input.webir.routeCount ?? null, skip: input.webir.skip ?? null }
      : null,
    cwl: input.cwl
      ? {
          ok: input.cwl.ok === true,
          routeCount: input.cwl.routeCount ?? null,
          holeCount: input.cwl.holeCount ?? null,
          cwlPath: input.cwl.cwlPath ?? null,
        }
      : null,
    uiAssets: input.uiAssets ?? null,
    uiMarkup: input.uiMarkup ?? null,
    verify: input.verify ?? null,
    dataset: input.dataset
      ? {
          ok: input.dataset.ok === true,
          shardCount: input.dataset.shardCount ?? 0,
          outDir: input.dataset.outDir ?? null,
        }
      : null,
    trajectory: {
      path: input.trajectoryPath,
      sessionId: input.sessionId,
      recordCount: input.trajectorySummary?.recordCount ?? null,
    },
    steps: input.steps ?? [],
    generatedAt: new Date().toISOString(),
  };
}

function writeReportArtifacts(projectDir, report) {
  const outDir = join(resolve(projectDir), ".chrysalis");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "site-port.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  const report = await runSitePortToCwl(args);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !args.jsonOnly) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
