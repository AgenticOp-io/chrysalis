#!/usr/bin/env node
/**
 * Deepen passes 23–32 (next 10 after n10b) — D6442.
 * Usage: node scripts/wisp/wisp-fidelity-deepen-n10c.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firebaseDemoIdToken, liveRefreshWispApiGoldens } from "../lib/live-refresh-api-goldens.mjs";
import { liveMutateTraceGoldens } from "../lib/live-mutate-trace-goldens.mjs";
import { applyWispApiGoldenHandlers } from "../wisp-cwl-apply-api-golden-handlers.mjs";

export const DEEPEN_N10C_KIND = "chrysalis.wisp.fidelity-deepen-n10c";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen-n10c.json");

const PASSES = [
  { id: 23, title: "Inventory return + maintenance" },
  { id: 24, title: "WO complete from list" },
  { id: 25, title: "Incident convert-to-ticket live probe" },
  { id: 26, title: "Plan features POST" },
  { id: 27, title: "Hardware-deployments GET/PUT" },
  { id: 28, title: "Bundles items POST" },
  { id: 29, title: "Sector/CPE create polish probe" },
  { id: 30, title: "Customer create-subscriber" },
  { id: 31, title: "Installation-doc submit" },
  { id: 32, title: "Installation-doc PUT equipmentList (photos need multipart)" },
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

export async function runFidelityDeepenN10c(opts = {}) {
  const startedAt = new Date().toISOString();
  const syntax = [
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-client.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-map.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-modules.js"),
  ];
  if (!syntax.every((s) => s.ok)) {
    const report = { kind: DEEPEN_N10C_KIND, ok: false, startedAt, finishedAt: new Date().toISOString(), syntax };
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
      "/api/network/hardware-deployments",
      "/api/bundles",
      "/api/inventory",
      "/api/work-orders",
      "/api/incidents",
      "/api/plans",
      "/api/customers",
      "/api/installation-documentation",
      "/api/network/sectors",
      "/api/network/cpe",
    ],
    ...opts,
  });
  const mutate = await liveMutateTraceGoldens({ firebaseDemoLogin: true, applyHandlers: true, ...opts });

  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 23 inventory return + maintenance
  {
    const inv = await firstId(baseUrl, headers, "/api/inventory", ["items", "records"]);
    if (inv.id) {
      probes.push({
        pass: 23,
        maintenance: await probe("POST", baseUrl, headers, `/api/inventory/${inv.id}/maintenance`, {
          date: new Date().toISOString(),
          type: "inspection",
          notes: "chrysalis-inventory-maintenance",
          performedBy: "cwl-demo",
        }),
        return: await probe("POST", baseUrl, headers, `/api/inventory/${inv.id}/return`, {
          returnLocation: { type: "warehouse", name: "Main" },
          reason: "return",
          notes: "chrysalis-inventory-return",
        }),
      });
    } else probes.push({ pass: 23, action: "skip-empty" });
  }

  // 24 WO complete
  {
    const wo = await firstId(baseUrl, headers, "/api/work-orders", ["workOrders", "items"]);
    if (wo.id) {
      probes.push({
        pass: 24,
        ...(await probe("POST", baseUrl, headers, `/api/work-orders/${wo.id}/complete`, {
          resolution: "chrysalis-list-complete",
        })),
      });
    } else probes.push({ pass: 24, action: "skip-empty" });
  }

  // 25 convert-to-ticket — create fresh incident first
  {
    const created = await probe("POST", baseUrl, headers, "/api/incidents", {
      title: `CWL Convert ${Date.now()}`,
      description: "chrysalis-convert",
      incidentType: "other",
      source: "other",
      incidentNumber: `INC-CVT-${Date.now()}`,
      status: "new",
      severity: "medium",
      detectedAt: new Date().toISOString(),
    });
    const id = created.body?._id || created.body?.id;
    if (created.ok && id) {
      probes.push({
        pass: 25,
        ...(await probe("POST", baseUrl, headers, `/api/incidents/${id}/convert-to-ticket`, {
          priority: "medium",
          title: "Converted from incident",
        })),
      });
    } else probes.push({ pass: 25, action: "skip-create-failed", create: created });
  }

  // 26 plan features
  {
    const plan = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
    if (plan.id) {
      probes.push({
        pass: 26,
        ...(await probe("POST", baseUrl, headers, `/api/plans/${plan.id}/features`, {
          featureType: "site",
          geometry: { type: "Point", coordinates: [-104.99, 39.74] },
          properties: { name: `CWL Feature ${Date.now()}` },
          status: "draft",
        })),
      });
    } else probes.push({ pass: 26, action: "skip-empty" });
  }

  // 27 hardware-deployments
  {
    const hd = await firstId(baseUrl, headers, "/api/network/hardware-deployments", [
      "deployments",
      "items",
      "hardwareDeployments",
    ]);
    let put = { action: "skip-empty" };
    if (hd.id) {
      put = await probe("PUT", baseUrl, headers, `/api/network/hardware-deployments/${hd.id}`, {
        notes: `chrysalis-hd-${Date.now()}`,
      });
    }
    probes.push({ pass: 27, listStatus: hd.status, count: hd.rows.length, put });
  }

  // 28 bundle items
  {
    const b = await firstId(baseUrl, headers, "/api/bundles", ["bundles", "items"]);
    if (b.id) {
      probes.push({
        pass: 28,
        ...(await probe("POST", baseUrl, headers, `/api/bundles/${b.id}/items`, {
          name: "CWL Bundle Item",
          quantity: 1,
          category: "Radio Equipment",
          equipmentType: "Radio",
          notes: "chrysalis-bundle-item",
        })),
      });
    } else probes.push({ pass: 28, action: "skip-empty" });
  }

  // 29 sector + cpe create
  {
    const site = await firstId(baseUrl, headers, "/api/network/sites", ["sites"]);
    const sector = site.id
      ? await probe("POST", baseUrl, headers, "/api/network/sectors", {
          siteId: site.id,
          name: `CWL Sector ${Date.now()}`,
          technology: "LTE",
          azimuth: 90,
          beamwidth: 65,
          status: "active",
          notes: "chrysalis-n10c-sector",
        })
      : { action: "skip-no-site" };
    const cpe = await probe("POST", baseUrl, headers, "/api/network/cpe", {
      name: `CWL CPE ${Date.now()}`,
      manufacturer: "Trace",
      model: "CPE",
      serialNumber: `CPE-N10C-${Date.now()}`,
      technology: "LTE",
      serviceType: "residential",
      status: "active",
      location: { latitude: 39.76, longitude: -104.97 },
      azimuth: 0,
      beamwidth: 60,
      siteId: site.id || undefined,
      notes: "chrysalis-n10c-cpe",
    });
    probes.push({ pass: 29, sector, cpe });
  }

  // 30 create-subscriber
  {
    const cust = await firstId(baseUrl, headers, "/api/customers", ["customers", "items"]);
    if (cust.id) {
      probes.push({
        pass: 30,
        ...(await probe("POST", baseUrl, headers, `/api/customers/${cust.id}/create-subscriber`, {
          imsi: `00101${String(Date.now()).slice(-10)}`,
          msisdn: cust.row?.primaryPhone || "5550100",
        })),
      });
    } else probes.push({ pass: 30, action: "skip-empty" });
  }

  // 31–32 install doc PUT + submit (submit may 400 without photos — honest)
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
      const put = await probe("PUT", baseUrl, headers, `/api/installation-documentation/${id}`, {
        documentation: {
          equipmentList: [{ name: "CWL Radio", quantity: 1 }],
          notes: "chrysalis-install-equip",
        },
      });
      const submit = await probe("POST", baseUrl, headers, `/api/installation-documentation/${id}/submit`, {});
      probes.push({
        pass: 31,
        submit,
        note: submit.ok ? "submitted" : "honest-incomplete-photos-or-schema",
      });
      probes.push({
        pass: 32,
        put,
        note: "photos endpoint is multipart — PUT equipmentList instead of inventing binary upload",
      });
    } else {
      probes.push({ pass: 31, action: "skip-no-doc" });
      probes.push({ pass: 32, action: "skip-no-doc" });
    }
  }

  let applied = null;
  try {
    applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });
  } catch (e) {
    applied = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const report = {
    kind: DEEPEN_N10C_KIND,
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
    note: "Deepen passes 23–32 — no invented APIs (D6442)",
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
          maintenance: p.maintenance?.ok,
          return: p.return?.ok,
          sector: p.sector?.ok,
          cpe: p.cpe?.ok,
          submit: p.submit?.ok ?? p.submit?.status,
          put: p.put?.ok ?? p.put?.action,
          note: p.note,
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
  await runFidelityDeepenN10c();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10c")) main();
