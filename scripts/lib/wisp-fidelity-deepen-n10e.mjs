#!/usr/bin/env node
/**
 * Deepen passes 43–52 (next 10 after n10d) — D6442.
 * Usage: node scripts/lib/wisp-fidelity-deepen-n10e.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firebaseDemoIdToken, liveRefreshWispApiGoldens } from "./live-refresh-api-goldens.mjs";
import { liveMutateTraceGoldens } from "./live-mutate-trace-goldens.mjs";
import { applyWispApiGoldenHandlers } from "../wisp-cwl-apply-api-golden-handlers.mjs";

export const DEEPEN_N10E_KIND = "chrysalis.wisp.fidelity-deepen-n10e";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen-n10e.json");

const PASSES = [
  { id: 43, title: "Inventory bulk-import" },
  { id: 44, title: "Map reverse-geocode" },
  { id: 45, title: "Bundle item DELETE" },
  { id: 46, title: "Bundle use / consume" },
  { id: 47, title: "Plan purchase-order" },
  { id: 48, title: "Plan feature PATCH/DELETE" },
  { id: 49, title: "Plan requirement DELETE" },
  { id: 50, title: "Site hardware deploy + HD PUT/DELETE" },
  { id: 51, title: "Notifications unread count" },
  { id: 52, title: "Equipment bulk-import" },
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

export async function runFidelityDeepenN10e(opts = {}) {
  const startedAt = new Date().toISOString();
  const syntax = [
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-client.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-map.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-modules.js"),
  ];
  if (!syntax.every((s) => s.ok)) {
    const report = { kind: DEEPEN_N10E_KIND, ok: false, startedAt, finishedAt: new Date().toISOString(), syntax };
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
      "/api/bundles",
      "/api/plans",
      "/api/network/sites",
      "/api/network/hardware-deployments",
      "/api/network/equipment",
      "/api/notifications",
    ],
    ...opts,
  });
  const mutate = await liveMutateTraceGoldens({ firebaseDemoLogin: true, applyHandlers: true, ...opts });

  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 43 inventory bulk-import
  {
    const stamp = Date.now();
    probes.push({
      pass: 43,
      ...(await probe("POST", baseUrl, headers, "/api/inventory/bulk-import", {
        items: [
          {
            category: "Radio Equipment",
            equipmentType: "Radio",
            manufacturer: "Trace",
            model: "CWL-Bulk",
            serialNumber: `INV-BULK-${stamp}`,
            status: "available",
            currentLocation: { type: "warehouse", name: "Main" },
            notes: "chrysalis-inventory-bulk-import",
          },
        ],
      })),
    });
  }

  // 44 reverse-geocode
  {
    probes.push({
      pass: 44,
      ...(await probe("POST", baseUrl, headers, "/api/network/reverse-geocode", {
        latitude: 39.7392,
        longitude: -104.9903,
      })),
    });
  }

  // 45–46 bundle item DELETE + use
  {
    const b = await firstId(baseUrl, headers, "/api/bundles", ["bundles", "items"]);
    if (b.id) {
      let itemId = "";
      const items = Array.isArray(b.row?.items) ? b.row.items : [];
      if (items[0]) itemId = String(items[0]._id || items[0].id || "");
      if (!itemId) {
        const added = await probe("POST", baseUrl, headers, `/api/bundles/${b.id}/items`, {
          name: "CWL Bundle Item N10e",
          quantity: 1,
          category: "Radio Equipment",
          equipmentType: "Radio",
          notes: "chrysalis-bundle-item-n10e",
        });
        itemId = String(added.body?._id || added.body?.id || added.body?.item?._id || "");
        if (!itemId) {
          const refreshed = await firstId(baseUrl, headers, "/api/bundles", ["bundles", "items"]);
          const match = refreshed.rows.find((r) => String(r._id || r.id) === b.id) || refreshed.row;
          const its = Array.isArray(match?.items) ? match.items : [];
          if (its.length) itemId = String(its[its.length - 1]._id || its[its.length - 1].id || "");
        }
      }
      if (itemId) {
        probes.push({
          pass: 45,
          ...(await probe("DELETE", baseUrl, headers, `/api/bundles/${b.id}/items/${itemId}`)),
        });
      } else probes.push({ pass: 45, action: "skip-no-item" });
      probes.push({
        pass: 46,
        ...(await probe("POST", baseUrl, headers, `/api/bundles/${b.id}/use`, {})),
      });
    } else {
      probes.push({ pass: 45, action: "skip-empty" });
      probes.push({ pass: 46, action: "skip-empty" });
    }
  }

  // 47 purchase-order (may 400 if no missing hardware — honest)
  {
    const plan = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
    if (plan.id) {
      const po = await probe("POST", baseUrl, headers, `/api/plans/${plan.id}/purchase-order`, {});
      probes.push({
        pass: 47,
        ...po,
        note: po.ok
          ? "purchase-order"
          : po.status === 400
            ? "honest-no-missing-hardware"
            : "failed",
      });
    } else probes.push({ pass: 47, action: "skip-empty" });
  }

  // 48 feature PATCH + DELETE
  {
    const plan = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
    if (plan.id) {
      const created = await probe("POST", baseUrl, headers, `/api/plans/${plan.id}/features`, {
        featureType: "site",
        geometry: { type: "Point", coordinates: [-104.99, 39.74] },
        properties: { name: `CWL Feature N10e ${Date.now()}` },
        status: "draft",
      });
      let fid =
        created.body?._id ||
        created.body?.id ||
        created.body?.feature?._id ||
        created.body?.feature?.id ||
        "";
      if (!fid && Array.isArray(created.body?.features) && created.body.features.length) {
        const last = created.body.features[created.body.features.length - 1];
        fid = last._id || last.id || "";
      }
      if (!fid) {
        const refreshed = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
        const match = refreshed.rows.find((r) => String(r._id || r.id) === plan.id) || refreshed.row;
        const feats = Array.isArray(match?.features) ? match.features : [];
        if (feats.length) fid = feats[feats.length - 1]._id || feats[feats.length - 1].id || "";
      }
      let patch = { action: "skip-no-feature" };
      let del = { action: "skip-no-feature" };
      if (fid) {
        patch = await probe("PATCH", baseUrl, headers, `/api/plans/${plan.id}/features/${fid}`, {
          notes: "chrysalis-feature-patch",
        });
        del = await probe("DELETE", baseUrl, headers, `/api/plans/${plan.id}/features/${fid}`);
      }
      probes.push({ pass: 48, create: created, patch, del });
    } else probes.push({ pass: 48, action: "skip-empty" });
  }

  // 49 requirement DELETE index 0 (after ensuring one exists)
  {
    const plan = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
    if (plan.id) {
      await probe("POST", baseUrl, headers, `/api/plans/${plan.id}/requirements`, {
        category: "Radio",
        equipmentType: "Radio",
        quantity: 1,
        notes: "chrysalis-req-for-delete",
      });
      probes.push({
        pass: 49,
        ...(await probe("DELETE", baseUrl, headers, `/api/plans/${plan.id}/requirements/0`)),
      });
    } else probes.push({ pass: 49, action: "skip-empty" });
  }

  // 50 site hardware + HD put/delete
  {
    const site = await firstId(baseUrl, headers, "/api/network/sites", ["sites"]);
    let created = { action: "skip-no-site" };
    if (site.id) {
      created = await probe("POST", baseUrl, headers, `/api/network/sites/${site.id}/hardware`, {
        hardware_type: "router",
        name: `CWL Site HW ${Date.now()}`,
        config: { notes: "chrysalis-site-hardware" },
      });
    }
    const hdId = created.body?._id || created.body?.id;
    let put = { action: "skip-no-hd" };
    let del = { action: "skip-no-hd" };
    if (created.ok && hdId) {
      put = await probe("PUT", baseUrl, headers, `/api/network/hardware-deployments/${hdId}`, {
        notes: `chrysalis-hd-${Date.now()}`,
      });
      del = await probe("DELETE", baseUrl, headers, `/api/network/hardware-deployments/${hdId}`);
    }
    probes.push({ pass: 50, create: created, put, del });
  }

  // 51 notifications count
  {
    probes.push({
      pass: 51,
      ...(await probe("GET", baseUrl, headers, "/api/notifications/count")),
    });
  }

  // 52 equipment bulk-import
  {
    const stamp = Date.now();
    probes.push({
      pass: 52,
      ...(await probe("POST", baseUrl, headers, "/api/network/equipment/bulk-import", {
        equipment: [
          {
            name: `CWL Equip Bulk ${stamp}`,
            type: "backhaul",
            manufacturer: "Trace",
            model: "Bulk",
            serialNumber: `EQ-BULK-${stamp}`,
            status: "active",
            location: { latitude: 39.74, longitude: -104.99 },
            notes: "chrysalis-equipment-bulk-import",
            createdBy: "demo@wisptools.io",
          },
        ],
      })),
    });
  }

  let applied = null;
  try {
    applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });
  } catch (e) {
    applied = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const report = {
    kind: DEEPEN_N10E_KIND,
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
    note: "Deepen passes 43–52 — no invented APIs (D6442); ACS import skipped (no HSS mount)",
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
          create: p.create?.ok ?? p.create?.status,
          patch: p.patch?.ok ?? p.patch?.action,
          del: p.del?.ok ?? p.del?.action,
          put: p.put?.ok ?? p.put?.action,
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
  await runFidelityDeepenN10e();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10e")) main();
