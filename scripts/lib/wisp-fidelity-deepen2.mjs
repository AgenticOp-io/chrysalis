#!/usr/bin/env node
/**
 * Deepen2 — Edit+PUT fidelity after deepen1 (D6442).
 * Inventory/WO/incident/bundle/sector/CPE Edit+PUT, tenant-settings PUT,
 * map sector/CPE edit + device details, live PUT mutate probes.
 *
 * Usage: node scripts/lib/wisp-fidelity-deepen2.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { liveRefreshWispApiGoldens } from "./live-refresh-api-goldens.mjs";
import { liveMutateTraceGoldens } from "./live-mutate-trace-goldens.mjs";

export const DEEPEN2_KIND = "chrysalis.wisp.fidelity-deepen2";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen2.json");

function syntaxCheck(rel) {
  const file = join(scriptRoot, rel);
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  return {
    file: rel,
    ok: r.status === 0,
    stderr: (r.stderr || "").trim().slice(0, 400),
  };
}

export async function runFidelityDeepen2(opts = {}) {
  const startedAt = new Date().toISOString();
  const syntax = [
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-client.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-map.js"),
  ];
  if (!syntax.every((s) => s.ok)) {
    const report = {
      kind: DEEPEN2_KIND,
      schemaVersion: 1,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      syntax,
      note: "Syntax check failed — abort",
    };
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
    return report;
  }

  const refresh = await liveRefreshWispApiGoldens({
    firebaseDemoLogin: true,
    discover: true,
    applyHandlers: true,
    ...opts,
  });
  const mutate = await liveMutateTraceGoldens({
    firebaseDemoLogin: true,
    applyHandlers: true,
    ...opts,
  });

  const mutates = mutate?.mutates || [];
  const puts = mutates.filter((m) => m.method === "PUT");
  const putsOk = puts.filter((m) => m.action === "wrote" || (m.status >= 200 && m.status < 300));

  const report = {
    kind: DEEPEN2_KIND,
    schemaVersion: 1,
    ok: syntax.every((s) => s.ok) && mutate?.ok !== false,
    startedAt,
    finishedAt: new Date().toISOString(),
    clientDeepen2: [
      "inventory Edit+PUT /api/inventory/:id",
      "work-order Edit+PUT /api/work-orders/:id",
      "incident Edit+PUT /api/incidents/:id",
      "bundle Edit+PUT /api/bundles/:id",
      "sector/CPE structural Edit+PUT",
      "tenant-settings PUT form",
      "map SectorActionsMenu edit → sector PUT",
      "map CPE edit + UnifiedDeviceDetailsModal hydrate",
      "live PUT mutate probes",
    ],
    syntax,
    liveRefresh: { ok: refresh?.ok, written: refresh?.written },
    liveMutate: {
      ok: mutate?.ok,
      putCount: puts.length,
      putWrote: putsOk.length,
      puts: puts.map((p) => ({
        path: p.path,
        status: p.status,
        action: p.action,
      })),
    },
    note: "Deepen2 — Edit+PUT depth; no invented APIs (D6442)",
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        syntax: syntax.map((s) => s.ok),
        refreshWritten: refresh?.written,
        putWrote: putsOk.length,
        putTotal: puts.length,
        reportPath,
      },
      null,
      2,
    ),
  );
  return report;
}

async function main() {
  await runFidelityDeepen2();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen2")) main();
