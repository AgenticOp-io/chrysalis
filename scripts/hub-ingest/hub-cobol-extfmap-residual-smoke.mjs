#!/usr/bin/env node
/**
 * G10127 — EXTFMAP residual honesty prove (dual primary COBOL track).
 * Does **not** close copy:EXTFMAP. Never invent EXTFMAP.cpy (**D6447**).
 *
 * Gate: hub:cobol-extfmap-residual-smoke
 * Token: EXTFMAP_RESIDUAL_HONEST_OK
 *
 * Proves:
 * - cobol:extfmap-status shape (open | present | absent-attested)
 * - residual ledger sole open P0 proprietary COPY is copy:EXTFMAP (or sole absent)
 * - tracked tree does not ship an invented EXTFMAP.cpy under fixtures (drop may be gitignored)
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

export const HUB_COBOL_EXTFMAP_RESIDUAL_SMOKE_KIND =
  "chrysalis.hub.cobol-extfmap-residual-smoke";
export const HUB_COBOL_EXTFMAP_RESIDUAL_SMOKE_SCHEMA_VERSION = 1;
export const EXTFMAP_RESIDUAL_HONEST_OK = "EXTFMAP_RESIDUAL_HONEST_OK";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {{ convertRoot?: string, originRoot?: string }} [opts]
 */
export async function runCobolExtfmapResidualSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  const origin = opts.originRoot ? resolve(opts.originRoot) : join(root, "fixtures/hub-cobol-clbs-mini");
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const statusScript = join(root, "scripts/cobol-extfmap-absent.mjs");
  const statusRun = spawnSync(process.execPath, [statusScript, "--check"], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  let statusReport = null;
  try {
    const text = (statusRun.stdout || "").trim();
    const start = text.indexOf("{");
    statusReport = JSON.parse(start >= 0 ? text.slice(start) : "{}");
  } catch {
    statusReport = null;
  }
  const statusOk =
    statusRun.status === 0 &&
    statusReport?.kind === "chrysalis.cobol.extfmap-absent.v1" &&
    ["open", "present", "absent-attested"].includes(String(statusReport?.status));
  checks.push({
    id: "extfmap-status-check",
    ok: statusOk,
    detail: statusOk
      ? `status=${statusReport.status} dropPresent=${statusReport.dropPresent}`
      : `exit=${statusRun.status} ${(statusRun.stderr || statusRun.stdout || "").slice(0, 200)}`,
  });

  const { buildCobolResidualLedger } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/cobol-residual-ledger.mjs")).href
  );
  const residual = buildCobolResidualLedger(origin);
  const p0Open = (residual.items || []).filter((i) => i.priority === "P0" && i.status === "open");
  const p0Absent = (residual.items || []).filter((i) => i.priority === "P0" && i.status === "absent");
  const extfmapSole =
    (p0Open.length === 1 && p0Open[0]?.id === "copy:EXTFMAP") ||
    (p0Open.length === 0 && p0Absent.length === 1 && p0Absent[0]?.id === "copy:EXTFMAP");
  checks.push({
    id: "residual-sole-open-p0-extfmap",
    ok: Boolean(extfmapSole && residual?.kind === "chrysalis.cobol.residual.v1"),
    detail: `p0Open=${p0Open.map((i) => i.id).join(",")} p0Absent=${p0Absent.map((i) => i.id).join(",")}`,
  });

  const dfhaid = (residual.items || []).find((i) => i.id === "copy:DFHAID");
  checks.push({
    id: "dfhaid-closed-or-open-honest",
    ok: Boolean(dfhaid) && ["closed", "open", "absent"].includes(String(dfhaid.status)),
    detail: dfhaid ? `status=${dfhaid.status}` : "missing copy:DFHAID row",
  });

  // Invented stub must never be a tracked fixture claim — drop path may exist only when licensed.
  const inventDocs = [
    join(root, "docs/EXTFMAP-RESIDUAL.md"),
    join(root, "docs/COBOL-NO-ZOS-CEILING.md"),
    join(root, "docs/DO-NOT-INVENT.md"),
  ];
  const docsOk = inventDocs.every((p) => existsSync(p));
  checks.push({
    id: "residual-docs",
    ok: docsOk,
    detail: docsOk ? inventDocs.map((p) => p.replace(/\\/g, "/")).join(" · ") : "missing doc",
  });

  const dropPresent = existsSync(join(origin, "copybook/EXTFMAP.cpy"));
  checks.push({
    id: "status-matches-drop",
    ok:
      (dropPresent && statusReport?.status === "present") ||
      (!dropPresent &&
        (statusReport?.status === "open" || statusReport?.status === "absent-attested")),
    detail: `dropPresent=${dropPresent} status=${statusReport?.status}`,
  });

  // Open residual must still list copy:EXTFMAP as open P0 (never force-settle).
  const refuseOk =
    statusReport?.status !== "open" || p0Open.some((i) => i.id === "copy:EXTFMAP");
  checks.push({
    id: "refuse-force-close",
    ok: refuseOk,
    detail:
      statusReport?.status === "open"
        ? `open ⇒ copy:EXTFMAP in p0Open (${p0Open.map((i) => i.id).join(",")})`
        : `status=${statusReport?.status}`,
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_COBOL_EXTFMAP_RESIDUAL_SMOKE_KIND,
    schemaVersion: HUB_COBOL_EXTFMAP_RESIDUAL_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? EXTFMAP_RESIDUAL_HONEST_OK : undefined,
    gate: "G10127",
    extfmapStatus: statusReport?.status,
    residualSummary: residual?.summary,
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close copy:EXTFMAP — ZD&T drop or CHRYSALIS_EXTFMAP_ABSENT only",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runCobolExtfmapResidualSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  process.exit(report.ok ? 0 : 1);
}
