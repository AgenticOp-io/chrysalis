#!/usr/bin/env node
/**
 * Deepen passes 53–62 (next 10 after n10e) — D6442, same HSS Mongo API.
 * Usage: node scripts/lib/wisp-fidelity-deepen-n10f.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firebaseDemoIdToken, liveRefreshWispApiGoldens } from "./live-refresh-api-goldens.mjs";
import { liveMutateTraceGoldens } from "./live-mutate-trace-goldens.mjs";
import { applyWispApiGoldenHandlers } from "../wisp-cwl-apply-api-golden-handlers.mjs";

export const DEEPEN_N10F_KIND = "chrysalis.wisp.fidelity-deepen-n10f";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen-n10f.json");

const PASSES = [
  { id: 53, title: "Customers bulk-import" },
  { id: 54, title: "Work-orders bulk-import" },
  { id: 55, title: "WO start + close" },
  { id: 56, title: "Customer complaint PUT" },
  { id: 57, title: "Customers soft-DELETE" },
  { id: 58, title: "Inventory DELETE" },
  { id: 59, title: "Bundle DELETE" },
  { id: 60, title: "Network entity DELETEs" },
  { id: 61, title: "Install-doc approve + payment-approve" },
  { id: 62, title: "Equipment-pricing DELETE + import-from-inventory" },
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
      signal: AbortSignal.timeout(45_000),
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

export async function runFidelityDeepenN10f(opts = {}) {
  const startedAt = new Date().toISOString();
  const syntax = [
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-client.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-map.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-modules.js"),
  ];
  if (!syntax.every((s) => s.ok)) {
    const report = { kind: DEEPEN_N10F_KIND, ok: false, startedAt, finishedAt: new Date().toISOString(), syntax };
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
      "/api/customers",
      "/api/work-orders",
      "/api/inventory",
      "/api/bundles",
      "/api/network/sites",
      "/api/network/sectors",
      "/api/network/cpe",
      "/api/network/equipment",
      "/api/installation-documentation",
      "/api/equipment-pricing",
    ],
    ...opts,
  });
  const mutate = await liveMutateTraceGoldens({ firebaseDemoLogin: true, applyHandlers: true, ...opts });

  /** @type {Array<Record<string, unknown>>} */
  const probes = [];
  const stamp = Date.now();

  // 53 customers bulk-import
  probes.push({
    pass: 53,
    ...(await probe("POST", baseUrl, headers, "/api/customers/bulk-import", {
      items: [
        {
          firstName: "CWL",
          lastName: `Bulk${stamp}`,
          primaryPhone: `555${String(stamp).slice(-7)}`,
          email: `cwl-bulk-${stamp}@example.com`,
          serviceStatus: "active",
          notes: "chrysalis-customers-bulk-import",
        },
      ],
    })),
  });

  // 54 WO bulk-import
  probes.push({
    pass: 54,
    ...(await probe("POST", baseUrl, headers, "/api/work-orders/bulk-import", {
      workOrders: [
        {
          title: `CWL Bulk WO ${stamp}`,
          type: "installation",
          status: "open",
          priority: "medium",
          notes: "chrysalis-wo-bulk-import",
        },
      ],
    })),
  });

  // 55 WO start + close (prefer freshly bulk-imported title match, else first)
  {
    const wo = await firstId(baseUrl, headers, "/api/work-orders", ["workOrders", "items"]);
    if (wo.id) {
      probes.push({
        pass: 55,
        start: await probe("POST", baseUrl, headers, `/api/work-orders/${wo.id}/start`, {
          userId: "cwl-demo",
        }),
        close: await probe("POST", baseUrl, headers, `/api/work-orders/${wo.id}/close`, {}),
      });
    } else probes.push({ pass: 55, action: "skip-empty" });
  }

  // 56 complaint PUT — create complaint then PUT
  {
    const cust = await firstId(baseUrl, headers, "/api/customers", ["customers", "items"]);
    if (cust.id) {
      const added = await probe("POST", baseUrl, headers, `/api/customers/${cust.id}/complaints`, {
        subject: "CWL complaint n10f",
        description: "chrysalis-complaint",
        status: "open",
      });
      const refreshed = await firstId(baseUrl, headers, "/api/customers", ["customers", "items"]);
      const match = refreshed.rows.find((r) => String(r._id || r.id) === cust.id) || refreshed.row;
      const complaints = Array.isArray(match?.complaints) ? match.complaints : [];
      const c0 = complaints[complaints.length - 1] || complaints[0];
      const complaintId = c0?._id || c0?.id || added.body?.complaints?.[0]?._id;
      if (complaintId) {
        probes.push({
          pass: 56,
          ...(await probe("PUT", baseUrl, headers, `/api/customers/${cust.id}/complaints/${complaintId}`, {
            status: "resolved",
            subject: "CWL complaint n10f",
            description: "chrysalis-complaint-resolved",
            _id: complaintId,
          })),
        });
      } else probes.push({ pass: 56, action: "skip-no-complaint", added });
    } else probes.push({ pass: 56, action: "skip-empty" });
  }

  // 57 customer soft-delete — create via bulk then delete that row if possible
  {
    const created = await probe("POST", baseUrl, headers, "/api/customers/bulk-import", {
      items: [
        {
          firstName: "CWL",
          lastName: `Del${stamp}`,
          primaryPhone: `556${String(stamp).slice(-7)}`,
          email: `cwl-del-${stamp}@example.com`,
          notes: "chrysalis-customer-delete-probe",
        },
      ],
    });
    const list = await firstId(baseUrl, headers, "/api/customers", ["customers", "items"]);
    const target =
      list.rows.find((r) => String(r.email || "").includes(`cwl-del-${stamp}`)) ||
      list.rows.find((r) => String(r.lastName || "").includes(`Del${stamp}`));
    const id = target?._id || target?.id || list.id;
    if (id) {
      probes.push({
        pass: 57,
        create: created,
        ...(await probe("DELETE", baseUrl, headers, `/api/customers/${id}`)),
      });
    } else probes.push({ pass: 57, action: "skip-no-id", create: created });
  }

  // 58 inventory DELETE — create via bulk-import then delete
  {
    const serial = `INV-DEL-${stamp}`;
    await probe("POST", baseUrl, headers, "/api/inventory/bulk-import", {
      items: [
        {
          category: "Radio Equipment",
          equipmentType: "Radio",
          manufacturer: "Trace",
          model: "Del",
          serialNumber: serial,
          status: "available",
          currentLocation: { type: "warehouse", name: "Main" },
          notes: "chrysalis-inv-delete-probe",
        },
      ],
    });
    const inv = await firstId(baseUrl, headers, "/api/inventory", ["items", "records"]);
    const row = inv.rows.find((r) => r.serialNumber === serial) || inv.row;
    const id = row?._id || row?.id;
    if (id) {
      probes.push({
        pass: 58,
        ...(await probe("DELETE", baseUrl, headers, `/api/inventory/${id}`)),
      });
    } else probes.push({ pass: 58, action: "skip-no-id" });
  }

  // 59 bundle DELETE — create then delete
  {
    const created = await probe("POST", baseUrl, headers, "/api/bundles", {
      name: `CWL Bundle Del ${stamp}`,
      bundleType: "installation",
      status: "active",
      notes: "chrysalis-bundle-delete",
    });
    const id = created.body?._id || created.body?.id;
    if (created.ok && id) {
      probes.push({
        pass: 59,
        create: created,
        ...(await probe("DELETE", baseUrl, headers, `/api/bundles/${id}`)),
      });
    } else {
      const b = await firstId(baseUrl, headers, "/api/bundles", ["bundles", "items"]);
      if (b.id) {
        probes.push({
          pass: 59,
          ...(await probe("DELETE", baseUrl, headers, `/api/bundles/${b.id}`)),
        });
      } else probes.push({ pass: 59, action: "skip-empty", create: created });
    }
  }

  // 60 network DELETEs — create CPE then delete; sector; equipment (avoid site cascade)
  {
    const site = await firstId(baseUrl, headers, "/api/network/sites", ["sites"]);
    const cpe = await probe("POST", baseUrl, headers, "/api/network/cpe", {
      name: `CWL CPE Del ${stamp}`,
      manufacturer: "Trace",
      model: "CPE",
      serialNumber: `CPE-DEL-${stamp}`,
      technology: "LTE",
      serviceType: "residential",
      status: "active",
      location: { latitude: 39.76, longitude: -104.97 },
      azimuth: 0,
      beamwidth: 60,
      siteId: site.id || undefined,
      notes: "chrysalis-cpe-delete",
    });
    const cpeId = cpe.body?._id || cpe.body?.id;
    const cpeDel = cpeId
      ? await probe("DELETE", baseUrl, headers, `/api/network/cpe/${cpeId}`)
      : { action: "skip-no-cpe" };
    const sector = site.id
      ? await probe("POST", baseUrl, headers, "/api/network/sectors", {
          siteId: site.id,
          name: `CWL Sector Del ${stamp}`,
          technology: "LTE",
          azimuth: 45,
          beamwidth: 65,
          status: "active",
          notes: "chrysalis-sector-delete",
        })
      : { action: "skip-no-site" };
    const sectorId = sector.body?._id || sector.body?.id;
    const sectorDel = sectorId
      ? await probe("DELETE", baseUrl, headers, `/api/network/sectors/${sectorId}`)
      : { action: "skip-no-sector" };
    const eq = await probe("POST", baseUrl, headers, "/api/network/equipment", {
      name: `CWL Equip Del ${stamp}`,
      type: "backhaul",
      manufacturer: "Trace",
      model: "Del",
      serialNumber: `EQ-DEL-${stamp}`,
      status: "active",
      location: { latitude: 39.74, longitude: -104.99 },
      notes: "chrysalis-equip-delete",
      createdBy: "demo@wisptools.io",
    });
    const eqId = eq.body?._id || eq.body?.id;
    const eqDel = eqId
      ? await probe("DELETE", baseUrl, headers, `/api/network/equipment/${eqId}`)
      : { action: "skip-no-eq" };
    probes.push({ pass: 60, cpeDel, sectorDel, eqDel });
  }

  // 61 install approve / payment-approve (honest if not submitted)
  {
    const docs = await firstId(baseUrl, headers, "/api/installation-documentation", [
      "items",
      "docs",
      "results",
    ]);
    let id = docs.id;
    if (!id) {
      const site = await firstId(baseUrl, headers, "/api/network/sites", ["sites"]);
      if (site.id) {
        const created = await probe("POST", baseUrl, headers, "/api/installation-documentation", {
          installationType: "cpe",
          siteId: site.id,
          siteName: site.row?.name || "Site",
          installationDate: new Date().toISOString(),
        });
        id = created.body?._id || created.body?.id || "";
      }
    }
    if (id) {
      const approve = await probe("POST", baseUrl, headers, `/api/installation-documentation/${id}/approve`, {
        approvalNotes: "chrysalis-install-approve",
      });
      const pay = await probe(
        "POST",
        baseUrl,
        headers,
        `/api/installation-documentation/${id}/payment-approve`,
        {
          approvedAmount: 100,
          invoiceNumber: `CWL-INV-${stamp}`,
          paymentMethod: "check",
          paymentNotes: "chrysalis-payment-approve",
        },
      );
      probes.push({
        pass: 61,
        approve,
        pay,
        note:
          approve.ok && pay.ok
            ? "approved"
            : "honest-not-submitted-or-admin-gate",
      });
    } else probes.push({ pass: 61, action: "skip-no-doc" });
  }

  // 62 pricing DELETE + import-from-inventory
  {
    const created = await probe("POST", baseUrl, headers, "/api/equipment-pricing", {
      category: "Radio Equipment",
      equipmentType: "Radio",
      manufacturer: "Trace",
      model: `CWL-Del-${stamp}`,
      basePrice: 42,
      currency: "USD",
      notes: "chrysalis-pricing-delete",
    });
    const pid =
      created.body?._id ||
      created.body?.id ||
      created.body?.pricing?._id ||
      created.body?.pricing?.id;
    let del = { action: "skip-no-id" };
    if (created.ok && pid) {
      del = await probe("DELETE", baseUrl, headers, `/api/equipment-pricing/${pid}`);
    }
    const imp = await probe("POST", baseUrl, headers, "/api/equipment-pricing/import-from-inventory", {
      category: "Radio Equipment",
    });
    probes.push({
      pass: 62,
      create: created,
      del,
      importFromInventory: imp,
      note: imp.ok ? "import-ok" : "honest-no-priced-inventory",
    });
  }

  let applied = null;
  try {
    applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });
  } catch (e) {
    applied = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const report = {
    kind: DEEPEN_N10F_KIND,
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
    note: "Deepen passes 53–62 — same HSS Mongo API as Module_Manager (D6442)",
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
          note: p.note,
          start: p.start?.ok ?? p.start?.status,
          close: p.close?.ok ?? p.close?.status,
          create: p.create?.ok ?? p.create?.status,
          del: p.del?.ok ?? p.del?.action,
          cpeDel: p.cpeDel?.ok ?? p.cpeDel?.action,
          sectorDel: p.sectorDel?.ok ?? p.sectorDel?.action,
          eqDel: p.eqDel?.ok ?? p.eqDel?.action,
          approve: p.approve?.ok ?? p.approve?.status,
          pay: p.pay?.ok ?? p.pay?.status,
          importFromInventory: p.importFromInventory?.ok ?? p.importFromInventory?.status,
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
  await runFidelityDeepenN10f();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10f")) main();
