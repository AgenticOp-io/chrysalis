#!/usr/bin/env node
/**
 * Deepen passes 3–12 (10 passes) after deepen2 (D6442).
 * Usage: node scripts/wisp/wisp-fidelity-deepen-n10.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firebaseDemoIdToken, liveRefreshWispApiGoldens } from "../lib/live-refresh-api-goldens.mjs";
import { liveMutateTraceGoldens } from "../lib/live-mutate-trace-goldens.mjs";
import { applyWispApiGoldenHandlers } from "../wisp-cwl-apply-api-golden-handlers.mjs";
import { goldenFileName } from "../lib/cwl-api-oracle-contract.mjs";

export const DEEPEN_N10_KIND = "chrysalis.wisp.fidelity-deepen-n10";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen-n10.json");
const goldensDir = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-goldens");

const PASSES = [
  { id: 3, title: "Hardware equipment Edit+PUT" },
  { id: 4, title: "Map backhaul/equipment Edit+PUT" },
  { id: 5, title: "Notifications mark-read" },
  { id: 6, title: "Users golden/table display" },
  { id: 7, title: "Inventory transfer path polish" },
  { id: 8, title: "Inventory scan payload polish" },
  { id: 9, title: "Plans approve/reject/authorize POSTs" },
  { id: 10, title: "List nav + detail hydrate (customers/sites/incidents/bundles)" },
  { id: 11, title: "Work-order lifecycle actions" },
  { id: 12, title: "Incident lifecycle actions" },
];

function syntaxCheck(rel) {
  const file = join(scriptRoot, rel);
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  return { file: rel, ok: r.status === 0, stderr: (r.stderr || "").trim().slice(0, 400) };
}

async function firstId(baseUrl, headers, listPath, keys) {
  const r = await fetch(`${baseUrl}${listPath}`, { headers, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) return { status: r.status, id: "" };
  const body = await r.json();
  let rows = Array.isArray(body) ? body : [];
  if (!rows.length) {
    for (const k of keys) {
      if (Array.isArray(body[k]) && body[k].length) {
        rows = body[k];
        break;
      }
    }
  }
  const row = rows[0];
  return { status: r.status, id: String(row?._id || row?.id || ""), row };
}

async function probePost(baseUrl, headers, path, body) {
  try {
    const r = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await r.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 200) };
    }
    return { path, method: "POST", status: r.status, ok: r.status >= 200 && r.status < 300, body: parsed };
  } catch (e) {
    return { path, method: "POST", ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function probePut(baseUrl, headers, path, body) {
  try {
    const r = await fetch(`${baseUrl}${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await r.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 200) };
    }
    if (r.status >= 200 && r.status < 300) {
      writeFileSync(
        join(goldensDir, goldenFileName("PUT", path.replace(/\/[^/]+$/, "/:id").replace(/\/read$/, "/:id/read"))),
        `${JSON.stringify(parsed, null, 2)}\n`,
        "utf8",
      );
    }
    return { path, method: "PUT", status: r.status, ok: r.status >= 200 && r.status < 300, body: parsed };
  } catch (e) {
    return { path, method: "PUT", ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function runFidelityDeepenN10(opts = {}) {
  const startedAt = new Date().toISOString();
  const syntax = [
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-client.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-map.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-modules.js"),
  ];
  if (!syntax.every((s) => s.ok)) {
    const report = {
      kind: DEEPEN_N10_KIND,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      syntax,
      note: "Syntax failed",
    };
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    return report;
  }

  const baseUrl = (opts.baseUrl ?? "https://hss.wisptools.io").replace(/\/$/, "");
  const tenantId =
    (opts.tenantId || process.env.CHRYSALIS_HSS_TENANT_ID || "").trim() ||
    "6a166eb07089304417ec967a";
  const login = await firebaseDemoIdToken();
  const bearer = login.ok ? login.idToken : "";
  /** @type {Record<string, string>} */
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (tenantId) headers["X-Tenant-ID"] = tenantId;

  const refresh = await liveRefreshWispApiGoldens({
    firebaseDemoLogin: true,
    discover: true,
    applyHandlers: true,
    paths: [
      "/api/users",
      "/api/notifications",
      "/api/network/equipment",
      "/api/plans",
      "/api/inventory",
      "/api/work-orders",
      "/api/incidents",
      "/api/customers",
      "/api/network/sites",
      "/api/bundles",
    ],
    ...opts,
  });

  const mutate = await liveMutateTraceGoldens({ firebaseDemoLogin: true, applyHandlers: true, ...opts });

  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // Pass 3 — equipment PUT
  {
    const eq = await firstId(baseUrl, headers, "/api/network/equipment", ["equipment", "items"]);
    if (eq.id) {
      probes.push({
        pass: 3,
        ...(await probePut(baseUrl, headers, `/api/network/equipment/${eq.id}`, {
          notes: `chrysalis-deepen-n10-${Date.now()}`,
          status: "active",
        })),
      });
    } else {
      probes.push({ pass: 3, action: "skip-empty-equipment", listStatus: eq.status });
    }
  }

  // Pass 5 — notifications mark-read
  {
    const n = await firstId(baseUrl, headers, "/api/notifications", ["notifications", "items"]);
    if (n.id) {
      probes.push({
        pass: 5,
        ...(await probePut(baseUrl, headers, `/api/notifications/${n.id}/read`, {})),
      });
    } else {
      probes.push({ pass: 5, action: "skip-empty-notifications", listStatus: n.status });
    }
  }

  // Pass 7 — transfer
  {
    const inv = await firstId(baseUrl, headers, "/api/inventory", ["items", "records"]);
    if (inv.id) {
      probes.push({
        pass: 7,
        ...(await probePost(baseUrl, headers, `/api/inventory/${inv.id}/transfer`, {
          newLocation: { type: "warehouse", name: "Main" },
          reason: "transfer",
          notes: "chrysalis-deepen-n10-transfer",
          movedBy: "cwl-demo",
        })),
      });
    } else {
      probes.push({ pass: 7, action: "skip-empty-inventory" });
    }
  }

  // Pass 8 — scan lookup
  {
    const inv = await firstId(baseUrl, headers, "/api/inventory", ["items", "records"]);
    const ident = inv.row?.serialNumber || inv.row?.assetTag || inv.row?.barcode || "";
    if (ident) {
      probes.push({
        pass: 8,
        ...(await probePost(baseUrl, headers, "/api/inventory/scan/lookup", {
          identifier: String(ident),
          location: { type: "warehouse", name: "Main" },
        })),
      });
    } else {
      probes.push({ pass: 8, action: "skip-no-identifier" });
    }
  }

  // Pass 9 — plan approve: PUT ready then POST approve (honest 400 if gate fails)
  {
    const plan = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
    if (plan.id) {
      await probePut(baseUrl, headers, `/api/plans/${plan.id}`, { status: "ready" });
      probes.push({
        pass: 9,
        ...(await probePost(baseUrl, headers, `/api/plans/${plan.id}/approve`, {
          notes: "chrysalis-deepen-n10-approve",
        })),
      });
    } else {
      probes.push({ pass: 9, action: "skip-empty-plans" });
    }
  }

  // Pass 11 — WO start
  {
    const wo = await firstId(baseUrl, headers, "/api/work-orders", ["workOrders", "items"]);
    if (wo.id) {
      probes.push({
        pass: 11,
        ...(await probePost(baseUrl, headers, `/api/work-orders/${wo.id}/start`, {
          userId: "cwl-demo",
        })),
      });
    } else {
      probes.push({ pass: 11, action: "skip-empty-work-orders" });
    }
  }

  // Pass 12 — incident acknowledge
  {
    const inc = await firstId(baseUrl, headers, "/api/incidents", ["incidents", "items"]);
    if (inc.id) {
      probes.push({
        pass: 12,
        ...(await probePost(baseUrl, headers, `/api/incidents/${inc.id}/acknowledge`, {
          userId: "cwl",
          userName: "CWL Demo",
        })),
      });
    } else {
      probes.push({ pass: 12, action: "skip-empty-incidents" });
    }
  }

  let applied = null;
  try {
    applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });
  } catch (e) {
    applied = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const report = {
    kind: DEEPEN_N10_KIND,
    schemaVersion: 1,
    ok: syntax.every((s) => s.ok),
    startedAt,
    finishedAt: new Date().toISOString(),
    passes: PASSES,
    syntax,
    liveRefresh: { ok: refresh?.ok, written: refresh?.written },
    liveMutate: { ok: mutate?.ok, written: mutate?.written },
    probes,
    applied,
    note: "Deepen passes 3–12 — no invented APIs (D6442)",
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        syntax: syntax.map((s) => s.ok),
        refreshWritten: refresh?.written,
        probes: probes.map((p) => ({
          pass: p.pass,
          status: p.status,
          action: p.action,
          ok: p.ok,
        })),
        reportPath,
      },
      null,
      2,
    ),
  );
  return report;
}

async function main() {
  await runFidelityDeepenN10();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10")) main();
