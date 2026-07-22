#!/usr/bin/env node
/**
 * Deepen WISP CWL fidelity after residuals close (D6442).
 * Client deepen (sites edit, map SiteEdit PUT, detail hydrate, remounts) +
 * expanded load-bind + live GET/mutate (incl. customer POST) via residuals-close.
 *
 * Usage: node scripts/wisp/wisp-fidelity-deepen.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runFidelityResidualsClose } from "./wisp-fidelity-residuals-close.mjs";

export const DEEPEN_KIND = "chrysalis.wisp.fidelity-deepen";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen.json");

function syntaxCheck(rel) {
  const file = join(scriptRoot, rel);
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  return {
    file: rel,
    ok: r.status === 0,
    stderr: (r.stderr || "").trim().slice(0, 400),
  };
}

export async function runFidelityDeepen(opts = {}) {
  const startedAt = new Date().toISOString();
  const syntax = [
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-client.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-map.js"),
  ];
  if (!syntax.every((s) => s.ok)) {
    const report = {
      kind: DEEPEN_KIND,
      schemaVersion: 1,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      syntax,
      note: "Syntax check failed — abort before live probes",
    };
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
    return report;
  }

  const residuals = await runFidelityResidualsClose(opts);
  const loadBind = residuals?.residuals?.loadBind;
  const mutateResults = residuals?.mutate?.mutates || [];
  const customerMutate = Array.isArray(mutateResults)
    ? mutateResults.find((p) => p.path === "/api/customers")
    : null;

  const report = {
    kind: DEEPEN_KIND,
    schemaVersion: 1,
    ok: syntax.every((s) => s.ok) && residuals?.ok !== false,
    startedAt,
    finishedAt: new Date().toISOString(),
    clientDeepen: [
      "monitoring → /api/monitoring/graphs",
      "admin tenants remount /admin/tenants",
      "sites table Edit + PUT /api/network/sites/:id",
      "map SiteEditModal PUT",
      "inventory/work-order row nav + detail hydrate",
      "load-bind expand (WO/plan/hardware/bundles/users/monitoring/admin)",
      "customer POST mutate probe",
    ],
    syntax,
    residualsClose: {
      platformAdmin: residuals?.residuals?.platformAdmin,
      monitoringGraphs: residuals?.residuals?.monitoringGraphs,
      customerCreateQuirk: residuals?.residuals?.customerCreateQuirk,
      loadBind,
    },
    liveRefresh: {
      ok: residuals?.refresh?.ok,
      written: residuals?.refresh?.written,
    },
    liveMutate: {
      ok: residuals?.mutate?.ok,
      customer: customerMutate,
    },
    residualsReport: join(scriptRoot, "reports/wisp/fidelity-residuals-close.json"),
    note: "Deepen batch — no invented APIs (D6442)",
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        syntax: syntax.map((s) => s.ok),
        loadBindPages: loadBind?.pages?.length,
        refreshWritten: report.liveRefresh.written,
        customerMutate: customerMutate?.status ?? customerMutate?.action ?? null,
        reportPath,
      },
      null,
      2,
    ),
  );
  return report;
}

async function main() {
  await runFidelityDeepen();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen")) main();
