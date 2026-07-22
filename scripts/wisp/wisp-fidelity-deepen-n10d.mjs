#!/usr/bin/env node
/**
 * Deepen passes 33–42 (next 10 after n10c) — D6442.
 * Usage: node scripts/wisp/wisp-fidelity-deepen-n10d.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firebaseDemoIdToken, liveRefreshWispApiGoldens } from "../lib/live-refresh-api-goldens.mjs";
import { liveMutateTraceGoldens } from "../lib/live-mutate-trace-goldens.mjs";
import { applyWispApiGoldenHandlers } from "../wisp-cwl-apply-api-golden-handlers.mjs";

export const DEEPEN_N10D_KIND = "chrysalis.wisp.fidelity-deepen-n10d";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen-n10d.json");

const PASSES = [
  { id: 33, title: "Inventory bulk-update" },
  { id: 34, title: "WO assign from list" },
  { id: 35, title: "Plan toggle-visibility" },
  { id: 36, title: "Sites bulk-import" },
  { id: 37, title: "Network geocode" },
  { id: 38, title: "Notifications GET refresh after mark-read" },
  { id: 39, title: "Equipment PUT after create" },
  { id: 40, title: "Bundle item PUT" },
  { id: 41, title: "Incident close from list" },
  { id: 42, title: "Plan hardware requirements/analyze" },
];

function syntaxCheck(rel) {
  const r = spawnSync(process.execPath, ["--check", join(scriptRoot, rel)], { encoding: "utf8" });
  return { file: rel, ok: r.status === 0, stderr: (r.stderr || "").trim().slice(0, 400) };
}

async function firstId(baseUrl, headers, listPath, keys) {
  const r = await fetch(`${baseUrl}${listPath}`, { headers, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) return { status: r.status, id: "", row: null, rows: [] };
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
  const row = rows[0] || null;
  return { status: r.status, id: String(row?._id || row?.id || ""), row, rows };
}

async function probe(method, baseUrl, headers, path, body) {
  try {
    const r = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(25_000),
    });
    const text = await r.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 200) };
    }
    return { path, method, status: r.status, ok: r.status >= 200 && r.status < 300, body: parsed };
  } catch (e) {
    return { path, method, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function runFidelityDeepenN10d(opts = {}) {
  const startedAt = new Date().toISOString();
  const syntax = [
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-client.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-map.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-modules.js"),
  ];
  if (!syntax.every((s) => s.ok)) {
    const report = { kind: DEEPEN_N10D_KIND, ok: false, startedAt, finishedAt: new Date().toISOString(), syntax };
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    return report;
  }

  const baseUrl = (opts.baseUrl ?? "https://hss.wisptools.io").replace(/\/$/, "");
  const tenantId =
    (opts.tenantId || process.env.CHRYSALIS_HSS_TENANT_ID || "").trim() ||
    "6a166eb07089304417ec967a";
  const login = await firebaseDemoIdToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (login.ok && login.idToken) headers.Authorization = `Bearer ${login.idToken}`;
  headers["X-Tenant-ID"] = tenantId;

  const refresh = await liveRefreshWispApiGoldens({
    firebaseDemoLogin: true,
    discover: true,
    applyHandlers: true,
    paths: [
      "/api/inventory",
      "/api/work-orders",
      "/api/plans",
      "/api/network/sites",
      "/api/notifications",
      "/api/network/equipment",
      "/api/bundles",
      "/api/incidents",
    ],
    ...opts,
  });
  const mutate = await liveMutateTraceGoldens({ firebaseDemoLogin: true, applyHandlers: true, ...opts });

  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 33 inventory bulk-update
  {
    const inv = await firstId(baseUrl, headers, "/api/inventory", ["items", "records"]);
    const ids = inv.rows
      .slice(0, 3)
      .map((r) => r._id || r.id)
      .filter(Boolean);
    if (ids.length) {
      probes.push({
        pass: 33,
        ...(await probe("POST", baseUrl, headers, "/api/inventory/bulk-update", {
          itemIds: ids,
          updates: { notes: `chrysalis-bulk-${Date.now()}` },
        })),
      });
    } else probes.push({ pass: 33, action: "skip-empty" });
  }

  // 34 WO assign
  {
    const wo = await firstId(baseUrl, headers, "/api/work-orders", ["workOrders", "items"]);
    if (wo.id) {
      probes.push({
        pass: 34,
        ...(await probe("POST", baseUrl, headers, `/api/work-orders/${wo.id}/assign`, {
          userId: "cwl-demo",
          userName: "CWL Demo",
        })),
      });
    } else probes.push({ pass: 34, action: "skip-empty" });
  }

  // 35 plan toggle-visibility
  {
    const plan = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
    if (plan.id) {
      probes.push({
        pass: 35,
        ...(await probe("PUT", baseUrl, headers, `/api/plans/${plan.id}/toggle-visibility`, {})),
      });
    } else probes.push({ pass: 35, action: "skip-empty" });
  }

  // 36 sites bulk-import
  {
    const stamp = Date.now();
    probes.push({
      pass: 36,
      ...(await probe("POST", baseUrl, headers, "/api/network/sites/bulk-import", {
        sites: [
          {
            name: `CWL Bulk Site ${stamp}`,
            type: ["tower"],
            status: "active",
            location: { latitude: 39.75 + (stamp % 100) / 10000, longitude: -104.98 },
            notes: "chrysalis-sites-bulk-import",
          },
        ],
      })),
    });
  }

  // 37 geocode
  {
    probes.push({
      pass: 37,
      ...(await probe("POST", baseUrl, headers, "/api/network/geocode", {
        address: "1600 California St, Denver, CO",
      })),
    });
  }

  // 38 notifications GET (+ optional mark-read refresh)
  {
    const list = await probe("GET", baseUrl, headers, "/api/notifications");
    const rows = Array.isArray(list.body)
      ? list.body
      : list.body?.notifications || list.body?.items || [];
    const nid = rows[0]?._id || rows[0]?.id;
    let mark = { action: "skip-empty-list" };
    if (nid) {
      mark = await probe("PUT", baseUrl, headers, `/api/notifications/${nid}/read`, {});
    }
    const refreshGet = await probe("GET", baseUrl, headers, "/api/notifications");
    probes.push({ pass: 38, list, mark, refreshGet });
  }

  // 39 equipment create + PUT
  {
    const created = await probe("POST", baseUrl, headers, "/api/network/equipment", {
      name: `CWL Equip ${Date.now()}`,
      type: "backhaul",
      manufacturer: "Trace",
      model: "N10d",
      serialNumber: `EQ-N10D-${Date.now()}`,
      status: "active",
      location: { latitude: 39.74, longitude: -104.99 },
      notes: "chrysalis-n10d-equipment-create",
      createdBy: "demo@wisptools.io",
    });
    const eid = created.body?._id || created.body?.id;
    let put = { action: "skip-no-id" };
    if (created.ok && eid) {
      put = await probe("PUT", baseUrl, headers, `/api/network/equipment/${eid}`, {
        notes: `chrysalis-n10d-equipment-put-${Date.now()}`,
        status: "active",
      });
    }
    probes.push({
      pass: 39,
      create: created,
      put,
      note: put.ok
        ? "create+put"
        : put.status === 403
          ? "honest-put-403-ownership (You can only edit equipment you created)"
          : "put-failed",
    });
  }

  // 40 bundle item PUT
  {
    const b = await firstId(baseUrl, headers, "/api/bundles", ["bundles", "items"]);
    if (b.id) {
      let itemId = "";
      const items = Array.isArray(b.row?.items) ? b.row.items : [];
      if (items[0]) itemId = String(items[0]._id || items[0].id || "");
      if (!itemId) {
        const added = await probe("POST", baseUrl, headers, `/api/bundles/${b.id}/items`, {
          name: "CWL Bundle Item N10d",
          quantity: 1,
          category: "Radio Equipment",
          equipmentType: "Radio",
          notes: "chrysalis-bundle-item-n10d",
        });
        itemId = String(added.body?._id || added.body?.id || added.body?.item?._id || "");
        if (!itemId && Array.isArray(added.body?.items) && added.body.items.length) {
          const last = added.body.items[added.body.items.length - 1];
          itemId = String(last._id || last.id || "");
        }
        if (!itemId) {
          const refreshed = await firstId(baseUrl, headers, "/api/bundles", ["bundles", "items"]);
          const match = refreshed.rows.find((r) => String(r._id || r.id) === b.id) || refreshed.row;
          const its = Array.isArray(match?.items) ? match.items : [];
          if (its[0]) itemId = String(its[0]._id || its[0].id || "");
        }
      }
      if (itemId) {
        probes.push({
          pass: 40,
          ...(await probe("PUT", baseUrl, headers, `/api/bundles/${b.id}/items/${itemId}`, {
            quantity: 2,
            notes: "chrysalis-bundle-item-put",
          })),
        });
      } else probes.push({ pass: 40, action: "skip-no-item" });
    } else probes.push({ pass: 40, action: "skip-empty" });
  }

  // 41 incident close
  {
    const created = await probe("POST", baseUrl, headers, "/api/incidents", {
      title: `CWL Close ${Date.now()}`,
      description: "chrysalis-close",
      incidentType: "other",
      source: "other",
      incidentNumber: `INC-CL-${Date.now()}`,
      status: "new",
      severity: "medium",
      detectedAt: new Date().toISOString(),
    });
    const id = created.body?._id || created.body?.id;
    if (created.ok && id) {
      probes.push({
        pass: 41,
        ...(await probe("POST", baseUrl, headers, `/api/incidents/${id}/close`, {})),
      });
    } else {
      const inc = await firstId(baseUrl, headers, "/api/incidents", ["incidents", "items"]);
      if (inc.id) {
        probes.push({
          pass: 41,
          ...(await probe("POST", baseUrl, headers, `/api/incidents/${inc.id}/close`, {})),
        });
      } else probes.push({ pass: 41, action: "skip-empty", create: created });
    }
  }

  // 42 plan requirements + analyze
  {
    const plan = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
    if (plan.id) {
      const requirements = await probe("POST", baseUrl, headers, `/api/plans/${plan.id}/requirements`, {
        category: "Radio",
        equipmentType: "Radio",
        quantity: 1,
        notes: "chrysalis-plan-requirements",
      });
      const analyze = await probe("POST", baseUrl, headers, `/api/plans/${plan.id}/analyze`, {
        notes: "chrysalis-plan-analyze",
      });
      probes.push({ pass: 42, requirements, analyze });
    } else probes.push({ pass: 42, action: "skip-empty" });
  }

  let applied = null;
  try {
    applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });
  } catch (e) {
    applied = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const report = {
    kind: DEEPEN_N10D_KIND,
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
    note: "Deepen passes 33–42 — no invented APIs (D6442)",
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        probes: probes.map((p) => ({
          pass: p.pass,
          ok: p.ok,
          status: p.status,
          action: p.action,
          create: p.create?.ok ?? p.create?.status,
          put: p.put?.ok ?? p.put?.action,
          list: p.list?.ok ?? p.list?.status,
          mark: p.mark?.ok ?? p.mark?.action,
          refreshGet: p.refreshGet?.ok,
          requirements: p.requirements?.ok ?? p.requirements?.status,
          analyze: p.analyze?.ok ?? p.analyze?.status,
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
  await runFidelityDeepenN10d();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10d")) main();
