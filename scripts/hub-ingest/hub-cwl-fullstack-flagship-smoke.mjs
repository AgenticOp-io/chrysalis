#!/usr/bin/env node
/**
 * CWL full-stack flagship pilot smoke (G1157): hole budget + preview + diagnose + gold.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCwlPreviewReport } from "./hub-cwl-preview.mjs";
import { diagnoseCwlFile } from "./cwl-diagnose.mjs";
import { parseCwlModuleResolved } from "./cwl-module-graph.mjs";
import {
  checkFullstackHoleBudget,
  readFullstackHoleBudget,
} from "./hub-cwl-fullstack-hole-budget.mjs";

export const HUB_CWL_FULLSTACK_FLAGSHIP_SMOKE_KIND = "chrysalis.hub.cwl-fullstack-flagship-smoke";
export const HUB_CWL_FULLSTACK_FLAGSHIP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack");
const goldVerifyScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs");
const SUITE_IDS = ["cwl-fullstack-flagship-hono", "cwl-fullstack-flagship-fastify"];

/**
 * @param {object} [opts]
 */
export async function runCwlFullstackFlagshipSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const cwlPath = join(fixture, "routes.cwl");
  const base = {
    kind: HUB_CWL_FULLSTACK_FLAGSHIP_SMOKE_KIND,
    schemaVersion: HUB_CWL_FULLSTACK_FLAGSHIP_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-flagship-cwl-fullstack",
    ok: false,
  };
  if (!existsSync(cwlPath)) {
    return { ...base, skip: "missing-routes-cwl" };
  }

  const budgetRead = await readFullstackHoleBudget(fixture);
  if (!budgetRead.ok) {
    return { ...base, skip: budgetRead.reason };
  }

  const src = await readFile(cwlPath, "utf8");
  const parsed = parseCwlModuleResolved(src, "routes.cwl", { baseDir: fixture });
  const pageRoutes = parsed.routes.filter((r) => r.surfaceKind === "page");
  const apiRoutes = parsed.routes.filter((r) => (r.surfaceKind ?? "api") === "api");

  const preview = await buildCwlPreviewReport(fixture, {
    cwlPath,
    probe: true,
    repoRoot: scriptRoot,
  });
  const diagnose = await diagnoseCwlFile(cwlPath);
  const budgetCheck = checkFullstackHoleBudget(budgetRead.budget, {
    holeCount: preview.holeCount ?? 0,
    routeCount: preview.routeCount ?? 0,
    pageCount: pageRoutes.length,
    apiCount: apiRoutes.length,
    pageLoadCount: preview.pageLoadRouteCount ?? diagnose.loadRouteCount ?? 0,
    interpolationCount: preview.interpolationRouteCount ?? diagnose.interpolationRouteCount ?? 0,
  });

  /** @type {Record<string, boolean>} */
  const goldVerify = {};
  let goldOk = true;
  for (const suite of SUITE_IDS) {
    const gv = spawnSync(process.execPath, [goldVerifyScript, "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    goldVerify[suite] = gv.status === 0;
    if (gv.status !== 0) goldOk = false;
  }

  const ok =
    budgetCheck.ok &&
    preview.ok === true &&
    diagnose.ok === true &&
    typeof preview.probe?.status === "number" &&
    preview.probe.status === 200 &&
    goldOk;

  return {
    ...base,
    ok,
    budget: budgetRead.budget,
    budgetCheck,
    routeCount: parsed.routes.length,
    pageCount: pageRoutes.length,
    apiCount: apiRoutes.length,
    holeCount: preview.holeCount ?? 0,
    preview: {
      ok: preview.ok,
      probeStatus: preview.probe?.status ?? null,
    },
    diagnose: { ok: diagnose.ok, diagnostics: diagnose.diagnostics?.length ?? 0 },
    goldVerify,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlFullstackFlagshipSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
