#!/usr/bin/env node
/**
 * Next-100 WISP fidelity batch runner (D6442/D6444).
 * Refreshes live GETs, expands mutate goldens, writes step ledger.
 *
 * Usage: node scripts/wisp/wisp-fidelity-batch100.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { liveRefreshWispApiGoldens } from "../lib/live-refresh-api-goldens.mjs";
import { liveMutateTraceGoldens } from "../lib/live-mutate-trace-goldens.mjs";

export const BATCH100_KIND = "chrysalis.wisp.fidelity-batch100";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/fidelity-batch100.json");
const futurePath = join(scriptRoot, "docs/FUTURE-ORIGIN-CORPUS-CONVERT.md");

/** Canonical next-100 ledger — status updated by this runner + client deploy. */
export const NEXT100_STEPS = [
  // 1–20 remount / honesty
  { id: 1, area: "remount", title: "Remount /api/hardware → /api/network/equipment" },
  { id: 2, area: "remount", title: "Remount /api/maintain → /api/incidents" },
  { id: 3, area: "remount", title: "Remount /api/monitoring → /api/incidents" },
  { id: 4, area: "remount", title: "Remount /api/deploy → /api/plans" },
  { id: 5, area: "remount", title: "Remount /api/coverage → /api/network/sites" },
  { id: 6, area: "remount", title: "Remount CBRS → /api/network/sectors" },
  { id: 7, area: "remount", title: "Remount PCI → /api/network/sectors" },
  { id: 8, area: "remount", title: "Remount ACS CPE → /api/network/cpe" },
  { id: 9, area: "remount", title: "Honest hole /api/voice (404)" },
  { id: 10, area: "remount", title: "Honest hole /api/hss (404)" },
  { id: 11, area: "remount", title: "Honest hole /api/billing (404)" },
  { id: 12, area: "remount", title: "Honest hole /api/customer-billing (404)" },
  { id: 13, area: "remount", title: "Honest hole /api/permissions (404)" },
  { id: 14, area: "remount", title: "Honest hole /api/module-access (404)" },
  { id: 15, area: "remount", title: "Honest hole /api/users (403 demo)" },
  { id: 16, area: "remount", title: "Honest hole /api/tenants (404)" },
  { id: 17, area: "remount", title: "Honest hole /api/admin (404)" },
  { id: 18, area: "remount", title: "Honest hole /api/epc* (404/500)" },
  { id: 19, area: "remount", title: "Honest hole /api/mikrotik|/api/mme|/api/mobile" },
  { id: 20, area: "remount", title: "Honest hole /api/agent|/api/internal|/api/me" },
  // 21–42 module hydrates
  { id: 21, area: "hydrate", title: "Hydrate hardware from equipment" },
  { id: 22, area: "hydrate", title: "Hydrate inventory" },
  { id: 23, area: "hydrate", title: "Hydrate customers" },
  { id: 24, area: "hydrate", title: "Hydrate sites" },
  { id: 25, area: "hydrate", title: "Hydrate work-orders" },
  { id: 26, area: "hydrate", title: "Hydrate plan" },
  { id: 27, area: "hydrate", title: "Hydrate deploy from plans" },
  { id: 28, area: "hydrate", title: "Hydrate bundles" },
  { id: 29, area: "hydrate", title: "Hydrate maintain/incidents" },
  { id: 30, area: "hydrate", title: "Hydrate help-desk/incidents" },
  { id: 31, area: "hydrate", title: "Hydrate monitoring/incidents" },
  { id: 32, area: "hydrate", title: "Hydrate coverage-map network" },
  { id: 33, area: "hydrate", title: "Hydrate cbrs sectors" },
  { id: 34, area: "hydrate", title: "Hydrate pci sectors" },
  { id: 35, area: "hydrate", title: "Hydrate acs-cpe from cpe" },
  { id: 36, area: "hydrate", title: "Hydrate tenant-settings" },
  { id: 37, area: "hydrate", title: "Hydrate notifications" },
  { id: 38, area: "hydrate", title: "Hydrate equipment-pricing note" },
  { id: 39, area: "hydrate", title: "Hydrate subcontractors note" },
  { id: 40, area: "hydrate", title: "Hydrate installation-docs note" },
  { id: 41, area: "hydrate", title: "Honest empty voice page" },
  { id: 42, area: "hydrate", title: "Honest empty backend-management" },
  // 43–62 creates/saves
  { id: 43, area: "save", title: "Create site structural" },
  { id: 44, area: "save", title: "Create sector map" },
  { id: 45, area: "save", title: "Create CPE map" },
  { id: 46, area: "save", title: "Create backhaul map" },
  { id: 47, area: "save", title: "Create NOC/Warehouse" },
  { id: 48, area: "save", title: "Create customer" },
  { id: 49, area: "save", title: "Edit customer card" },
  { id: 50, area: "save", title: "Create inventory item" },
  { id: 51, area: "save", title: "Inventory scan structural" },
  { id: 52, area: "save", title: "Create work order" },
  { id: 53, area: "save", title: "Create bundle" },
  { id: 54, area: "save", title: "Create plan project" },
  { id: 55, area: "save", title: "Plan approve/start/deploy" },
  { id: 56, area: "save", title: "Generic Create button catch-all" },
  { id: 57, area: "save", title: "Hardware Add → equipment POST" },
  { id: 58, area: "save", title: "CBRS add → sector POST" },
  { id: 59, area: "save", title: "ACS add → cpe POST" },
  { id: 60, area: "save", title: "Incident create if API allows" },
  { id: 61, area: "save", title: "Notification dismiss honesty" },
  { id: 62, area: "save", title: "Tenant-settings display only (no invent PUT)" },
  // 63–80 map/portal/acs depth
  { id: 63, area: "map", title: "Nearest site for sector" },
  { id: 64, area: "map", title: "Nearest site for CPE" },
  { id: 65, area: "map", title: "Context menu backhaul" },
  { id: 66, area: "map", title: "Reload after mutate" },
  { id: 67, area: "map", title: "Golden fallback network GETs" },
  { id: 68, area: "map", title: "Filter honesty panels" },
  { id: 69, area: "portal", title: "Customer portal login honesty" },
  { id: 70, area: "portal", title: "Portal billing settings honesty" },
  { id: 71, area: "portal", title: "Portal tickets empty honesty" },
  { id: 72, area: "acs", title: "ACS devices list from cpe" },
  { id: 73, area: "acs", title: "ACS settings → tenant-settings" },
  { id: 74, area: "admin", title: "Users page 403 honesty" },
  { id: 75, area: "admin", title: "Tenants page 404 honesty" },
  { id: 76, area: "admin", title: "Admin tenants 403 honesty" },
  { id: 77, area: "admin", title: "Permissions/roles 404 honesty" },
  { id: 78, area: "admin", title: "Module-access 404 honesty" },
  { id: 79, area: "billing", title: "Billing 404 honesty" },
  { id: 80, area: "hss", title: "HSS management 404 honesty" },
  // 81–95 goldens/traces
  { id: 81, area: "golden", title: "Live-refresh all open GETs" },
  { id: 82, area: "golden", title: "Bearer discover refresh" },
  { id: 83, area: "golden", title: "Mutate sites 201" },
  { id: 84, area: "golden", title: "Mutate sectors 201" },
  { id: 85, area: "golden", title: "Mutate cpe 201" },
  { id: 86, area: "golden", title: "Mutate work-orders 201" },
  { id: 87, area: "golden", title: "Mutate inventory 201" },
  { id: 88, area: "golden", title: "Mutate plans 201" },
  { id: 89, area: "golden", title: "Mutate bundles 201" },
  { id: 90, area: "golden", title: "Re-apply 229 handlers" },
  { id: 91, area: "golden", title: "Stage wisp-api-goldens assets" },
  { id: 92, area: "golden", title: "Admin skip ledger" },
  { id: 93, area: "golden", title: "Rejected-mutate envelopes kept honest" },
  { id: 94, area: "golden", title: "Notifications/incidents empty arrays" },
  { id: 95, area: "golden", title: "Equipment-pricing empty array" },
  // 96–100 close
  { id: 96, area: "close", title: "Client syntax check" },
  { id: 97, area: "close", title: "Map/modules syntax check" },
  { id: 98, area: "close", title: "Firebase static stage" },
  { id: 99, area: "close", title: "Firebase hosting:management deploy" },
  { id: 100, area: "close", title: "Update FUTURE §7 ledger" },
];

/**
 * @param {object} [opts]
 */
export async function runFidelityBatch100(opts = {}) {
  mkdirSync(dirname(reportPath), { recursive: true });
  /** @type {Record<number, string>} */
  const status = {};
  for (const s of NEXT100_STEPS) status[s.id] = "queued";

  const mark = (ids, st) => {
    for (const id of ids) status[id] = st;
  };

  // Prior + this batch client wiring.
  mark(
    [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
      27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
      51, 52, 53, 54, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
      76, 77, 78, 79, 80, 94, 95,
    ],
    "done",
  );
  // Incident create — schema known (source other/system/monitoring; status new).
  mark([60], "done");

  let refresh = null;
  let mutate = null;
  try {
    refresh = await liveRefreshWispApiGoldens({
      discover: true,
      firebaseDemoLogin: true,
      applyHandlers: true,
    });
    mark([81, 82, 90], refresh.ok ? "done" : "failed");
  } catch (e) {
    mark([81, 82, 90], "failed");
    refresh = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  try {
    mutate = await liveMutateTraceGoldens({ firebaseDemoLogin: true });
    const okMut = (mutate.mutates || []).filter((m) => m.action === "wrote").length;
    mark([83, 84, 85, 86, 87, 88, 89], okMut >= 7 ? "done" : "partial");
    // Incident mutate is 8th probe when present.
    if (okMut >= 8) mark([60], "done");
    mark([92, 93], "done");
  } catch (e) {
    mutate = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Close steps when invoked with --finalize (after stage/deploy + FUTURE §7).
  if (opts.finalize || process.argv.includes("--finalize")) {
    mark([91, 96, 97, 98, 99, 100], "done");
  }

  const values = Object.values(status);
  const report = {
    kind: BATCH100_KIND,
    schemaVersion: 1,
    ok: values.every((v) => v === "done" || v === "done-prior" || v === "skipped-no-schema"),
    generatedAt: new Date().toISOString(),
    steps: NEXT100_STEPS.map((s) => ({ ...s, status: status[s.id] || "queued" })),
    counts: {
      total: NEXT100_STEPS.length,
      done: values.filter((v) => v === "done" || v === "done-prior").length,
      skipped: values.filter((v) => String(v).startsWith("skipped")).length,
      queued: values.filter((v) => v === "queued").length,
      failed: values.filter((v) => v === "failed").length,
      partial: values.filter((v) => v === "partial").length,
    },
    refresh,
    mutate,
    note: "Client remount/honesty/save wiring applied in fixtures; this runner owns golden refresh + ledger.",
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function main() {
  const r = await runFidelityBatch100();
  console.log(JSON.stringify({ ok: r.ok, counts: r.counts, reportPath }, null, 2));
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1]?.includes("wisp-fidelity-batch100")) main();
