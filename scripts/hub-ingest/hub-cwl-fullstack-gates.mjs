#!/usr/bin/env node
/**
 * Full-stack CWL gate runners for authoring batches v6–v30 (G1209–G1458).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CWL_FULLSTACK_HOLE_CATALOG } from "./cwl-fullstack-holes.mjs";
import { diagnoseCwlFile } from "./cwl-diagnose.mjs";
import { buildDeliveryDashboard } from "./hub-delivery-dashboard.mjs";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { buildCwlPreviewReport } from "./hub-cwl-preview.mjs";
import { runProjectVerifyHttp } from "./hub-verify-http.mjs";

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
