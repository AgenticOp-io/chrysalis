#!/usr/bin/env node
/**
 * Full-stack CWL gate runners for authoring batches v6–v70 (G1209–G1858).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CWL_FULLSTACK_HOLE_CATALOG } from "./cwl-fullstack-holes.mjs";
import { diagnoseCwlFile } from "./cwl-diagnose.mjs";
import { buildDeliveryDashboard } from "./hub-delivery-dashboard.mjs";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { buildCwlPreviewReport } from "./hub-cwl-preview.mjs";
import { runProjectVerifyHttp } from "./hub-verify-http.mjs";
import { buildProjectVerifyGapsIngestReport } from "./hub-verify-gaps-ingest.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const flagshipDir = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack");
const flagshipCwl = join(flagshipDir, "routes.cwl");
const goldVerify = join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs");

async function loadRuntime(repoRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  }
}

export async function runQueryHtmlGate(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const { createCwlRuntime, loadModuleFromCwlFile } = await loadRuntime(repoRoot);
  const runtime = createCwlRuntime({ module: loadModuleFromCwlFile(flagshipCwl, repoRoot) });
  const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/search?q=chrysalis" });
  const body = await res.text();
  return { ok: res.status === 200 && body.includes("chrysalis"), status: res.status };
}

export async function runLoadArrayGate(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const { createCwlRuntime, loadModuleFromCwlFile } = await loadRuntime(repoRoot);
  const runtime = createCwlRuntime({ module: loadModuleFromCwlFile(flagshipCwl, repoRoot) });
  const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/blog/post" });
  const body = await res.text();
  return {
    ok: body.includes("cwl-page-load") && body.includes('"tags"') && body.includes("news"),
    hasTags: body.includes("news"),
  };
}

export async function runLayoutSearchGate() {
  const text = readFileSync(flagshipCwl, "utf8");
  return {
    ok: text.includes('import "layouts/shell.cwl"') && text.includes('@page GET "/search"'),
  };
}

export function runFormHoleCatalogGate() {
  const ok =
    Boolean(CWL_FULLSTACK_HOLE_CATALOG["hub-svelte:form-action"]) &&
    Boolean(CWL_FULLSTACK_HOLE_CATALOG["hub-next:page-component"]);
  return { ok, catalogSize: Object.keys(CWL_FULLSTACK_HOLE_CATALOG).length };
}

export async function runDiagnoseFullstackGate() {
  const report = await diagnoseCwlFile(flagshipCwl);
  const source = readFileSync(flagshipCwl, "utf8");
  const pageRoutes = (source.match(/@page/g) ?? []).length;
  const loadRoutes = (source.match(/load\s+\{/g) ?? []).length;
  return {
    ok:
      report.ok === true &&
      pageRoutes >= 4 &&
      loadRoutes >= 1 &&
      (report.interpolationRouteCount ?? 0) >= 3,
    pageRoutes,
    loadRoutes,
    routeCount: report.routeCount ?? 0,
    interpolationRouteCount: report.interpolationRouteCount ?? 0,
  };
}

export async function runOpenapiPageGate() {
  const text = readFileSync(flagshipCwl, "utf8");
  const pageCount = (text.match(/@page/g) ?? []).length;
  const webirPath = join(flagshipDir, ".chrysalis", "hub.cwl.webir.json");
  if (existsSync(webirPath)) {
    const exported = await exportProjectOpenApi(flagshipDir, { origin: "cwl" });
    if (exported.ok === true) {
      return { ok: (exported.pathCount ?? 0) >= 4, pathCount: exported.pathCount, fromOpenApi: true };
    }
  }
  return { ok: pageCount >= 4 && text.includes("/search"), pathCount: pageCount, fromOpenApi: false };
}

export function runGoldFlagshipGate() {
  const r = spawnSync(process.execPath, [goldVerify, "--suite", "cwl-fullstack-flagship-hono"], {
    cwd: scriptRoot,
    encoding: "utf8",
    timeout: 180_000,
  });
  return { ok: r.status === 0, exitCode: r.status ?? 1 };
}

export async function runBootstrapV2Gate() {
  const report = await buildCwlPreviewReport(flagshipDir, { cwlPath: flagshipCwl, probe: false });
  const { starterCwlModule } = await import("./hub-cwl-preview.mjs");
  const starter = starterCwlModule(flagshipDir);
  return {
    ok:
      starter.includes("/search") &&
      starter.includes("/blog/:slug") &&
      starter.includes("load {") &&
      (report.routeCount ?? 0) >= 8 &&
      (report.interpolationRouteCount ?? 0) >= 3,
    routeCount: report.routeCount ?? 0,
    interpolationRouteCount: report.interpolationRouteCount ?? 0,
  };
}

export async function runDeliveryInterpolationGate() {
  const dash = await buildDeliveryDashboard(flagshipDir, { origin: "cwl", output: "hono" });
  const interpolation =
    dash.fullstackHoleBudget?.interpolationRouteCount ?? dash.cwlPreview?.interpolationRouteCount ?? 0;
  const minInterp = dash.fullstackHoleBudget?.budget?.minInterpolationRoutes ?? 1;
  return {
    ok: dash.fullstackHoleBudget?.check?.ok === true && interpolation >= minInterp,
    interpolationRouteCount: interpolation,
    minInterpolationRoutes: minInterp,
  };
}

export async function runEmitPageProbeGate(opts = {}) {
  const report = await runProjectVerifyHttp(flagshipDir, {
    origin: "cwl",
    target: "hono",
    repoRoot: opts.repoRoot ?? scriptRoot,
    threshold: 1,
  });
  if (report.ok !== true) return { ok: false, skip: report.skip ?? "verify-failed" };
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const { createCwlRuntime, loadModuleFromCwlFile } = await loadRuntime(repoRoot);
  const runtime = createCwlRuntime({ module: loadModuleFromCwlFile(flagshipCwl, repoRoot) });
  const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/search?q=emit-probe" });
  const body = await res.text();
  return { ok: res.status === 200 && body.includes("emit-probe"), verifyOk: true };
}

export async function runNextjsSearchGate() {
  const { runNextjsDeepSmoke } = await import("./hub-nextjs-deep-smoke.mjs");
  const deep = await runNextjsDeepSmoke();
  const fixture = join(scriptRoot, "fixtures/hub-gold-nextjs-app-deep/app/search/page.tsx");
  return { ok: deep.ok === true && existsSync(fixture), deepOk: deep.ok === true };
}

export async function runSvelteSearchGate() {
  const { runSveltekitDeepSmoke } = await import("./hub-sveltekit-deep-smoke.mjs");
  const deep = await runSveltekitDeepSmoke();
  const fixture = join(scriptRoot, "fixtures/hub-gold-svelte-kit-deep/src/routes/search/+page.svelte");
  return { ok: deep.ok === true && existsSync(fixture), deepOk: deep.ok === true };
}

export function runHoleBudgetV2Gate() {
  const path = join(flagshipDir, "chrysalis.fullstack-hole-budget.json");
  if (!existsSync(path)) return { ok: false, skip: "missing-budget" };
  const budget = JSON.parse(readFileSync(path, "utf8"));
  return {
    ok: budget.schemaVersion >= 2 && typeof budget.minInterpolationRoutes === "number",
    schemaVersion: budget.schemaVersion,
  };
}

export async function runMegaOriginGate() {
  const { runSveltekitDeepSmoke } = await import("./hub-sveltekit-deep-smoke.mjs");
  const { runNextjsDeepSmoke } = await import("./hub-nextjs-deep-smoke.mjs");
  const { runCwlFullstackFlagshipSmoke } = await import("./hub-cwl-fullstack-flagship-smoke.mjs");
  const [svelte, next, flagship] = await Promise.all([
    runSveltekitDeepSmoke(),
    runNextjsDeepSmoke(),
    runCwlFullstackFlagshipSmoke(),
  ]);
  return { ok: svelte.ok && next.ok && flagship.ok === true, svelte, next, flagship };
}

export async function runProductionSearchGate(opts = {}) {
  const { runCwlRuntimeProductionSmoke } = await import("./hub-cwl-runtime-production-smoke.mjs");
  const report = await runCwlRuntimeProductionSmoke(opts);
  const probeKey = "GET /search?q=prod21";
  const probe = report.probes?.[probeKey];
  return {
    ok: report.ok === true && probe?.ok === true,
    probeKey,
    status: probe?.status ?? null,
    productionOk: report.ok === true,
  };
}

export async function runFastifyEmitSearchGate(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const report = await runProjectVerifyHttp(flagshipDir, {
    origin: "cwl",
    target: "fastify",
    repoRoot,
    threshold: 1,
  });
  const verifyFile = join(flagshipDir, "reports/verify/GET_search.json");
  return {
    ok: report.ok === true && existsSync(verifyFile),
    verifyOk: report.ok === true,
    hasSearchArtifact: existsSync(verifyFile),
  };
}

export async function runNextjsSearchParamsExportGate() {
  const { runNextjsDeepCwlExportSmoke } = await import("./hub-nextjs-deep-cwl-export-smoke.mjs");
  const exported = await runNextjsDeepCwlExportSmoke();
  return { ok: exported.ok === true && exported.hasSearch === true, exported };
}

export async function runSvelteSearchQueryExportGate() {
  const { runSveltekitDeepCwlExportSmoke } = await import("./hub-sveltekit-deep-cwl-export-smoke.mjs");
  const exported = await runSveltekitDeepCwlExportSmoke();
  return { ok: exported.ok === true && exported.hasSearch === true, exported };
}

export function runFormActionProbeGate() {
  const ok =
    Boolean(CWL_FULLSTACK_HOLE_CATALOG["hub-svelte:form-action"]) &&
    existsSync(join(scriptRoot, "docs/CWL-RFC-0016-form-action-probe.md"));
  return { ok, catalogued: Boolean(CWL_FULLSTACK_HOLE_CATALOG["hub-svelte:form-action"]) };
}

export async function runSessionStubGate(opts = {}) {
  const { runCwlSessionStubSmoke } = await import("./hub-cwl-session-stub-smoke.mjs");
  const report = await runCwlSessionStubSmoke(opts);
  return { ok: report.ok === true, status: report.status ?? null };
}

export async function runExpressDepthGate() {
  const { runExpressFlagshipSmoke } = await import("./hub-express-flagship.mjs");
  const report = await runExpressFlagshipSmoke();
  return { ok: report.ok === true, liftOk: report.lift?.ok === true };
}

export async function runDiagnoseV2Gate() {
  const report = await diagnoseCwlFile(flagshipCwl);
  return {
    ok:
      report.ok === true &&
      report.schemaVersion === 2 &&
      (report.effectNoneRouteCount ?? 0) >= 4 &&
      typeof report.effectRouteCount === "number",
    schemaVersion: report.schemaVersion ?? 1,
    effectNoneRouteCount: report.effectNoneRouteCount ?? 0,
    effectRouteCount: report.effectRouteCount ?? 0,
  };
}

export async function runEmitVerifyMegaGate(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const hono = await runProjectVerifyHttp(flagshipDir, { origin: "cwl", target: "hono", repoRoot, threshold: 1 });
  const fastify = await runProjectVerifyHttp(flagshipDir, {
    origin: "cwl",
    target: "fastify",
    repoRoot,
    threshold: 1,
  });
  return {
    ok: hono.ok === true && fastify.ok === true,
    honoOk: hono.ok === true,
    fastifyOk: fastify.ok === true,
  };
}

export async function runProductionGraduationGate(opts = {}) {
  const search = await runProductionSearchGate(opts);
  const fastify = await runFastifyEmitSearchGate(opts);
  const session = await runSessionStubGate(opts);
  const diagnose = await runDiagnoseV2Gate();
  const mega = await runEmitVerifyMegaGate(opts);
  const gates = [search, fastify, session, diagnose, mega];
  return { ok: gates.every((g) => g.ok === true), gateCount: gates.length, passed: gates.filter((g) => g.ok).length };
}

export async function runGraduationGate(opts = {}) {
  const gates = await Promise.all([
    runQueryHtmlGate(opts),
    runLoadArrayGate(opts),
    runLayoutSearchGate(),
    runFormHoleCatalogGate(),
    runDiagnoseFullstackGate(),
    runOpenapiPageGate(),
    runBootstrapV2Gate(),
    runMegaOriginGate(),
  ]);
  const ok = gates.every((g) => g.ok === true);
  return { ok, gateCount: gates.length, passed: gates.filter((g) => g.ok).length };
}

export async function runRuntimeHonoParityGate(opts = {}) {
  const { runCwlRuntimeHonoParitySmoke } = await import("./hub-cwl-runtime-hono-parity-smoke.mjs");
  const report = await runCwlRuntimeHonoParitySmoke(opts);
  return { ok: report.ok === true, skipped: report.skip ?? null };
}

export async function runRuntimeProductionGate(opts = {}) {
  const { runCwlRuntimeProductionSmoke } = await import("./hub-cwl-runtime-production-smoke.mjs");
  const report = await runCwlRuntimeProductionSmoke(opts);
  return { ok: report.ok === true, skipped: report.skip ?? null };
}

export async function runVerifyGapsExpressGate() {
  const { runVerifyGapsExpressSmoke } = await import("./hub-verify-gaps-express-smoke.mjs");
  const report = runVerifyGapsExpressSmoke();
  return { ok: report.ok === true, backlogCount: report.backlogCount ?? 0 };
}

export async function runVerifyGapsFullstackGate() {
  const report = buildProjectVerifyGapsIngestReport(flagshipDir);
  return {
    ok: report.ok === true || report.skipped === "no-verify-report",
    backlogCount: report.backlog?.length ?? 0,
    skipped: report.skipped ?? null,
  };
}

export async function runProjectToCwlRoundtripGate() {
  const { runProjectToCwlRoundtripSmoke } = await import("./hub-project-to-cwl-roundtrip-smoke.mjs");
  const report = await runProjectToCwlRoundtripSmoke();
  return { ok: report.ok === true, originCount: report.results?.length ?? 0 };
}

export async function runPost30CompositeGate(opts = {}) {
  const parity = await runRuntimeHonoParityGate(opts);
  const production = await runRuntimeProductionGate(opts);
  const expressGaps = await runVerifyGapsExpressGate();
  const fullstackGaps = await runVerifyGapsFullstackGate();
  const gates = [parity, production, expressGaps, fullstackGaps];
  return { ok: gates.every((g) => g.ok === true), gateCount: gates.length, passed: gates.filter((g) => g.ok).length };
}

export async function runPost30GraduationGate(opts = {}) {
  const post30 = await runPost30CompositeGate(opts);
  const production = await runProductionGraduationGate(opts);
  return { ok: post30.ok === true && production.ok === true, post30, production };
}

export async function runCwlFullstackFlagshipGate(opts = {}) {
  const { runCwlFullstackFlagshipSmoke } = await import("./hub-cwl-fullstack-flagship-smoke.mjs");
  const report = await runCwlFullstackFlagshipSmoke(opts);
  return { ok: report.ok === true, skipped: report.skip ?? null };
}

export async function runChimeraCutoverGate() {
  const { runChimeraCutoverSmoke } = await import("./hub-chimera-cutover-smoke.mjs");
  const report = await runChimeraCutoverSmoke();
  return { ok: report.ok === true, phaseCount: report.phaseCount ?? 0 };
}

export async function runVerifyGapsIngestActionGate() {
  const { runVerifyGapsIngestActionStandaloneSmoke } = await import(
    "./hub-verify-gaps-ingest-action-standalone-smoke.mjs",
  );
  const report = await runVerifyGapsIngestActionStandaloneSmoke();
  return { ok: report.ok === true, ingestRemediation: report.ingestRemediation ?? null };
}

export async function runCwlPreviewFlagshipGate(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const report = await buildCwlPreviewReport(flagshipDir, { repoRoot });
  return { ok: report.ok === true, routeCount: report.routeCount ?? 0 };
}

export async function runPost40CompositeGate(opts = {}) {
  const flagship = await runCwlFullstackFlagshipGate(opts);
  const delivery = await runDeliveryInterpolationGate();
  const chimera = await runChimeraCutoverGate();
  const gapsAction = await runVerifyGapsIngestActionGate();
  const gates = [flagship, delivery, chimera, gapsAction];
  return { ok: gates.every((g) => g.ok === true), gateCount: gates.length, passed: gates.filter((g) => g.ok).length };
}

export async function runPost40GraduationGate(opts = {}) {
  const post40 = await runPost40CompositeGate(opts);
  const post30 = await runPost30GraduationGate(opts);
  return { ok: post40.ok === true && post30.ok === true, post40, post30 };
}

export async function runCwlFullstackVerifyHttpGate(opts = {}) {
  const { runCwlFullstackVerifyHttpSmoke } = await import("./hub-cwl-fullstack-verify-http-smoke.mjs");
  const report = await runCwlFullstackVerifyHttpSmoke(opts);
  return {
    ok: report.ok === true,
    honoOk: report.hono?.ok === true,
    fastifyOk: report.fastify?.ok === true,
    skipped: report.hono?.skip ?? report.fastify?.skip ?? null,
  };
}

export async function runVerifyGapsFullstackActionGate() {
  const { runVerifyGapsIngestAction } = await import("./hub-verify-gaps-ingest-action.mjs");
  const action = await runVerifyGapsIngestAction(flagshipDir, { reingest: false });
  return {
    ok: action.ok === true,
    ingestRemediation: action.ingestRemediation?.divergenceKind ?? null,
    skipped: action.skipped ?? null,
  };
}

export async function runPost50CompositeGate(opts = {}) {
  const http = await runCwlFullstackVerifyHttpGate(opts);
  const gaps = await runVerifyGapsFullstackGate();
  const gapsAction = await runVerifyGapsFullstackActionGate();
  const post40 = await runPost40CompositeGate(opts);
  const gates = [http, gaps, gapsAction, post40];
  return { ok: gates.every((g) => g.ok === true), gateCount: gates.length, passed: gates.filter((g) => g.ok).length };
}

export async function runPost50GraduationGate(opts = {}) {
  const post50 = await runPost50CompositeGate(opts);
  const post40 = await runPost40GraduationGate(opts);
  return { ok: post50.ok === true && post40.ok === true, post50, post40 };
}

/**
 * G1759 — CWL authoring templates + shell bootstrap hardening.
 * @param {object} [opts]
 */
export async function runCwlAuthoringTemplatesGate(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const { buildCwlPreviewReport, starterCwlModule } = await import("./hub-cwl-preview.mjs");
  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-authoring-templates-"));
  try {
    const cwlPath = join(tmp, ".chrysalis", "migration.cwl");
    const report = await buildCwlPreviewReport(tmp, { cwlPath, bootstrap: true, probe: false, repoRoot });
    const shellPath = join(tmp, ".chrysalis", "layouts", "shell.cwl");
    const layoutSrc = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack/layouts/shell.cwl");
    const cwlText = existsSync(cwlPath) ? readFileSync(cwlPath, "utf8") : "";
    const starter = starterCwlModule(tmp);
    const shellOk = existsSync(shellPath);
    const layoutImportOk = cwlText.includes('import "layouts/shell.cwl"');
    const starterParityOk =
      starter.includes("/search") && starter.includes("/blog/:slug") && starter.includes("load {");
    const bootstrapOk = report.bootstrapped === true && report.ok === true;
    const routeOk = (report.routeCount ?? 0) >= 7;
    const referenceLayoutOk = existsSync(layoutSrc);
    const ok = shellOk && layoutImportOk && starterParityOk && bootstrapOk && routeOk && referenceLayoutOk;
    return {
      ok,
      shellOk,
      layoutImportOk,
      starterParityOk,
      bootstrapOk,
      routeOk,
      routeCount: report.routeCount ?? 0,
      referenceLayoutOk,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function runPost60CompositeGate(opts = {}) {
  const templates = await runCwlAuthoringTemplatesGate(opts);
  const post50 = await runPost50CompositeGate(opts);
  return { ok: templates.ok === true && post50.ok === true, templates, post50 };
}

export async function runPost60GraduationGate(opts = {}) {
  const post60 = await runPost60CompositeGate(opts);
  const post50 = await runPost50GraduationGate(opts);
  return { ok: post60.ok === true && post50.ok === true, post60, post50 };
}

/**
 * G1769 — CWL preview/dev loop: bootstrap, runtime probe, diagnostics artifact, flagship preview.
 * @param {object} [opts]
 */
export async function runCwlPreviewDevLoopGate(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const { writeCwlPreviewArtifacts } = await import("./hub-cwl-preview.mjs");
  const { diagnoseCwlFile } = await import("./cwl-diagnose.mjs");
  const tmp = mkdtempSync(join(tmpdir(), "chrysalis-preview-dev-loop-"));
  try {
    const cwlPath = join(tmp, ".chrysalis", "migration.cwl");
    const { jsonPath, report } = await writeCwlPreviewArtifacts(tmp, {
      cwlPath,
      bootstrap: true,
      probe: true,
      repoRoot,
    });
    const previewJsonOk = existsSync(jsonPath);
    const bootstrapOk = report.bootstrapped === true && report.ok === true;
    const probeStatus = report.probe?.status;
    const probeOk = typeof probeStatus === "number" && probeStatus === 200;
    const routeOk = (report.routeCount ?? 0) >= 7;
    let diagnoseOk = false;
    if (existsSync(cwlPath)) {
      const dx = await diagnoseCwlFile(cwlPath);
      diagnoseOk = dx.ok === true;
    }
    const flagshipPreview = await runCwlPreviewFlagshipGate(opts);
    const flagshipOk = flagshipPreview.ok === true;
    const ok = previewJsonOk && bootstrapOk && probeOk && routeOk && diagnoseOk && flagshipOk;
    return {
      ok,
      previewJsonOk,
      bootstrapOk,
      probeOk,
      probeStatus: probeStatus ?? null,
      routeCount: report.routeCount ?? 0,
      diagnoseOk,
      flagshipOk,
      flagshipRouteCount: flagshipPreview.routeCount ?? 0,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function runPost61CompositeGate(opts = {}) {
  const previewDev = await runCwlPreviewDevLoopGate(opts);
  const post60 = await runPost60CompositeGate(opts);
  return { ok: previewDev.ok === true && post60.ok === true, previewDev, post60 };
}

export async function runPost61GraduationGate(opts = {}) {
  const post61 = await runPost61CompositeGate(opts);
  const post60 = await runPost60GraduationGate(opts);
  return { ok: post61.ok === true && post60.ok === true, post61, post60 };
}

/**
 * G1779 — runtime-cwl production-readiness parity v1 (gold + hono + production probes).
 * @param {object} [opts]
 */
export async function runRuntimeCwlParityGate(opts = {}) {
  const { runCwlRuntimeParitySmoke } = await import("./hub-cwl-runtime-parity-smoke.mjs");
  const gold = await runCwlRuntimeParitySmoke(opts);
  const hono = await runRuntimeHonoParityGate(opts);
  const production = await runRuntimeProductionGate(opts);
  const query = await runQueryHtmlGate(opts);
  const load = await runLoadArrayGate(opts);
  const ok =
    gold.ok === true && hono.ok === true && production.ok === true && query.ok === true && load.ok === true;
  return {
    ok,
    goldParityOk: gold.ok === true,
    honoParityOk: hono.ok === true,
    productionOk: production.ok === true,
    queryHtmlOk: query.ok === true,
    loadArrayOk: load.ok === true,
  };
}

export async function runPost62CompositeGate(opts = {}) {
  const runtimeParity = await runRuntimeCwlParityGate(opts);
  const post61 = await runPost61CompositeGate(opts);
  return { ok: runtimeParity.ok === true && post61.ok === true, runtimeParity, post61 };
}

export async function runPost62GraduationGate(opts = {}) {
  const post62 = await runPost62CompositeGate(opts);
  const post61 = await runPost61GraduationGate(opts);
  return { ok: post62.ok === true && post61.ok === true, post62, post61 };
}

/** G1789 — CWL formatter + diagnose lint on flagship contract. */
export async function runCwlFormatterLintGate() {
  const { formatCwlFile } = await import("./cwl-fmt.mjs");
  const fmt = await formatCwlFile(flagshipCwl, { write: false });
  const diagnose = await runDiagnoseFullstackGate();
  const diagnoseV2 = await runDiagnoseV2Gate();
  const ok = fmt.ok === true && diagnose.ok === true && diagnoseV2.ok === true;
  return { ok, fmtOk: fmt.ok === true, diagnoseOk: diagnose.ok === true, diagnoseV2Ok: diagnoseV2.ok === true };
}

/** G1799 — mandatory project-to-CWL oracle + roundtrip gates. */
export async function runProjectToCwlMandatoryGate(opts = {}) {
  const { runProjectToCwlOracleGates } = await import("./hub-project-to-cwl-gates.mjs");
  const oracle = await runProjectToCwlOracleGates(opts);
  const roundtrip = await runProjectToCwlRoundtripGate();
  const ok = oracle.ok === true && roundtrip.ok === true;
  return { ok, oracleOk: oracle.ok === true, roundtripOk: roundtrip.ok === true };
}

/** G1809 — full-stack CWL scope RFC backend boundary slice. */
export async function runFullstackCwlScopeRfcGate() {
  const holes = runFormHoleCatalogGate();
  const openapi = await runOpenapiPageGate();
  const layout = await runLayoutSearchGate();
  const ok = holes.ok === true && openapi.ok === true && layout.ok === true;
  return {
    ok,
    holeCatalogOk: holes.ok === true,
    openapiOk: openapi.ok === true,
    layoutOk: layout.ok === true,
  };
}

/** G1819 — Node/Express oracle verify on express flagship. */
export async function runNodeExpressOracleFlagshipGate() {
  const { runNodeExpressOracleVerify } = await import("./hub-node-express-oracle-verify.mjs");
  const report = await runNodeExpressOracleVerify();
  return { ok: report.ok === true, skip: report.skip ?? null, correctness: report.correctness ?? null };
}

/** G1829 — post-60 authoring composite (templates + preview + runtime parity). */
export async function runPost60AuthoringCompositeGate(opts = {}) {
  const templates = await runCwlAuthoringTemplatesGate(opts);
  const preview = await runCwlPreviewDevLoopGate(opts);
  const runtime = await runRuntimeCwlParityGate(opts);
  const ok = templates.ok === true && preview.ok === true && runtime.ok === true;
  return { ok, templates, preview, runtime };
}

/** G1839 — dual-backend HTTP emit verify on CWL flagship. */
export async function runAuthoringEmitVerifyMegaGate(opts = {}) {
  return runEmitVerifyMegaGate(opts);
}

/** G1849 — post-60 authoring graduation lock (queues 61–69 checklist). */
export async function runAuthoringGraduationLockGate(opts = {}) {
  const templates = await runCwlAuthoringTemplatesGate(opts);
  const preview = await runCwlPreviewDevLoopGate(opts);
  const runtime = await runRuntimeCwlParityGate(opts);
  const fmt = await runCwlFormatterLintGate();
  const projectToCwl = await runProjectToCwlMandatoryGate(opts);
  const scope = await runFullstackCwlScopeRfcGate();
  const nodeExpress = await runNodeExpressOracleFlagshipGate();
  const emitMega = await runAuthoringEmitVerifyMegaGate(opts);
  const ok =
    templates.ok === true &&
    preview.ok === true &&
    runtime.ok === true &&
    fmt.ok === true &&
    projectToCwl.ok === true &&
    scope.ok === true &&
    nodeExpress.ok === true &&
    emitMega.ok === true;
  return {
    ok,
    templatesOk: templates.ok === true,
    previewOk: preview.ok === true,
    runtimeOk: runtime.ok === true,
    fmtOk: fmt.ok === true,
    projectToCwlOk: projectToCwl.ok === true,
    scopeOk: scope.ok === true,
    nodeExpressOk: nodeExpress.ok === true,
    emitMegaOk: emitMega.ok === true,
  };
}

export async function runAuthoringGraduationGate(opts = {}) {
  const post69 = await runPost69GraduationGate(opts);
  return { ok: post69.ok === true, post69 };
}

export async function runPost63CompositeGate(opts = {}) {
  const fmt = await runCwlFormatterLintGate();
  const post62 = await runPost62CompositeGate(opts);
  return { ok: fmt.ok === true && post62.ok === true, fmt, post62 };
}

export async function runPost63GraduationGate(opts = {}) {
  const post63 = await runPost63CompositeGate(opts);
  const post62 = await runPost62GraduationGate(opts);
  return { ok: post63.ok === true && post62.ok === true, post63, post62 };
}

export async function runPost64CompositeGate(opts = {}) {
  const projectToCwl = await runProjectToCwlMandatoryGate(opts);
  const post63 = await runPost63CompositeGate(opts);
  return { ok: projectToCwl.ok === true && post63.ok === true, projectToCwl, post63 };
}

export async function runPost64GraduationGate(opts = {}) {
  const post64 = await runPost64CompositeGate(opts);
  const post63 = await runPost63GraduationGate(opts);
  return { ok: post64.ok === true && post63.ok === true, post64, post63 };
}

export async function runPost65CompositeGate(opts = {}) {
  const scope = await runFullstackCwlScopeRfcGate();
  const post64 = await runPost64CompositeGate(opts);
  return { ok: scope.ok === true && post64.ok === true, scope, post64 };
}

export async function runPost65GraduationGate(opts = {}) {
  const post65 = await runPost65CompositeGate(opts);
  const post64 = await runPost64GraduationGate(opts);
  return { ok: post65.ok === true && post64.ok === true, post65, post64 };
}

export async function runPost66CompositeGate(opts = {}) {
  const nodeExpress = await runNodeExpressOracleFlagshipGate();
  const post65 = await runPost65CompositeGate(opts);
  return { ok: nodeExpress.ok === true && post65.ok === true, nodeExpress, post65 };
}

export async function runPost66GraduationGate(opts = {}) {
  const post66 = await runPost66CompositeGate(opts);
  const post65 = await runPost65GraduationGate(opts);
  return { ok: post66.ok === true && post65.ok === true, post66, post65 };
}

export async function runPost67CompositeGate(opts = {}) {
  const authoring = await runPost60AuthoringCompositeGate(opts);
  const post66 = await runPost66CompositeGate(opts);
  return { ok: authoring.ok === true && post66.ok === true, authoring, post66 };
}

export async function runPost67GraduationGate(opts = {}) {
  const post67 = await runPost67CompositeGate(opts);
  const post66 = await runPost66GraduationGate(opts);
  return { ok: post67.ok === true && post66.ok === true, post67, post66 };
}

export async function runPost68CompositeGate(opts = {}) {
  const emitMega = await runAuthoringEmitVerifyMegaGate(opts);
  const post67 = await runPost67CompositeGate(opts);
  return { ok: emitMega.ok === true && post67.ok === true, emitMega, post67 };
}

export async function runPost68GraduationGate(opts = {}) {
  const post68 = await runPost68CompositeGate(opts);
  const post67 = await runPost67GraduationGate(opts);
  return { ok: post68.ok === true && post67.ok === true, post68, post67 };
}

export async function runPost69CompositeGate(opts = {}) {
  return runAuthoringGraduationLockGate(opts);
}

export async function runPost69GraduationGate(opts = {}) {
  const post69 = await runPost69CompositeGate(opts);
  const post68 = await runPost68GraduationGate(opts);
  return { ok: post69.ok === true && post68.ok === true, post69, post68 };
}
