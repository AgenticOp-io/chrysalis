#!/usr/bin/env node
/**
 * Capture live mutate (POST) responses for priority network routes when HSS accepts demo writes.
 * Also records honest skip for platform-admin GETs that remain 403 under demo bearer.
 *
 * Usage: node scripts/lib/live-mutate-trace-goldens.mjs [--firebase-demo-login]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { goldenFileName } from "./cwl-api-oracle-contract.mjs";
import { applyWispApiGoldenHandlers } from "../wisp-cwl-apply-api-golden-handlers.mjs";
import { firebaseDemoIdToken } from "./live-refresh-api-goldens.mjs";

export const LIVE_MUTATE_TRACE_KIND = "chrysalis.wisp.live-mutate-trace-goldens";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const goldensDir = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-goldens");
const reportPath = join(scriptRoot, "reports/wisp/live-mutate-trace-goldens.json");

const ADMIN_GETS = ["/api/users", "/admin/tenants", "/api/tenants"];

const MUTATE_PROBES = [
  {
    method: "POST",
    path: "/api/network/sites",
    body: {
      name: `CWL Trace Site ${Date.now()}`,
      type: ["tower"],
      location: { latitude: 39.74, longitude: -104.99 },
      status: "active",
      notes: "chrysalis-live-mutate-trace",
    },
  },
  {
    method: "POST",
    path: "/api/network/sectors",
    needsSiteId: true,
    body: {
      name: `CWL Trace Sector ${Date.now()}`,
      technology: "LTE",
      azimuth: 90,
      beamwidth: 65,
      status: "active",
      notes: "chrysalis-live-mutate-trace",
    },
  },
  {
    method: "POST",
    path: "/api/network/cpe",
    needsSiteId: true,
    body: {
      name: `CWL Trace CPE ${Date.now()}`,
      manufacturer: "Trace",
      model: "CWL",
      serialNumber: `CPE-${Date.now()}`,
      technology: "LTE",
      serviceType: "residential",
      status: "active",
      location: { latitude: 39.75, longitude: -104.98 },
      azimuth: 0,
      beamwidth: 60,
      notes: "chrysalis-live-mutate-trace",
    },
  },
  {
    method: "POST",
    path: "/api/work-orders",
    body: {
      title: `CWL WO ${Date.now()}`,
      type: "installation",
      ticketCategory: "customer-facing",
      priority: "medium",
      status: "open",
      description: "chrysalis-live-mutate-trace",
      ticketNumber: `TKT-CWL-${Date.now()}`,
    },
  },
  {
    method: "POST",
    path: "/api/inventory",
    body: {
      serialNumber: `INV${Date.now()}`,
      manufacturer: "Trace",
      model: "M1",
      equipmentType: "Radio",
      category: "Radio Equipment",
      status: "available",
      currentLocation: { type: "warehouse", name: "Main" },
    },
  },
  {
    method: "POST",
    path: "/api/plans",
    body: {
      name: `CWL Plan ${Date.now()}`,
      status: "draft",
      description: "chrysalis-live-mutate-trace",
    },
  },
  {
    method: "POST",
    path: "/api/bundles",
    body: {
      name: `CWL Bundle ${Date.now()}`,
      status: "active",
      bundleType: "standard",
    },
  },
  {
    method: "POST",
    path: "/api/incidents",
    body: {
      title: `CWL Trace Incident ${Date.now()}`,
      description: "chrysalis-live-mutate-trace",
      incidentType: "other",
      source: "other",
      incidentNumber: `INC-CWL-${Date.now()}`,
      status: "new",
      severity: "medium",
      detectedAt: new Date().toISOString(),
    },
  },
  {
    method: "POST",
    path: "/api/customers",
    body: {
      firstName: "CWL",
      lastName: `Trace${Date.now()}`,
      primaryPhone: "555-0100",
      email: `cwl-trace-${Date.now()}@example.com`,
      serviceStatus: "active",
      notes: "chrysalis-live-mutate-trace",
    },
  },
];

/**
 * @param {object} [opts]
 */
export async function liveMutateTraceGoldens(opts = {}) {
  const baseUrl = (opts.baseUrl ?? "https://hss.wisptools.io").replace(/\/$/, "");
  let bearer = (opts.bearer || process.env.CHRYSALIS_HSS_BEARER || "").trim();
  const tenantId =
    (opts.tenantId || process.env.CHRYSALIS_HSS_TENANT_ID || "").trim() ||
    "6a166eb07089304417ec967a";
  /** @type {Record<string, unknown>} */
  let auth = { bearer: Boolean(bearer) };
  if ((opts.firebaseDemoLogin === true || !bearer) && !bearer) {
    const login = await firebaseDemoIdToken();
    auth = { firebaseDemoLogin: login.ok === true, skip: login.skip, email: login.email };
    if (login.ok && login.idToken) bearer = login.idToken;
  }

  /** @type {Record<string, string>} */
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (tenantId) headers["X-Tenant-ID"] = tenantId;

  mkdirSync(goldensDir, { recursive: true });
  mkdirSync(dirname(reportPath), { recursive: true });

  /** @type {Array<Record<string, unknown>>} */
  const adminSkips = [];
  for (const path of ADMIN_GETS) {
    try {
      const r = await fetch(`${baseUrl}${path}`, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
      const text = await r.text();
      adminSkips.push({
        path,
        status: r.status,
        action:
          r.status === 200
            ? "would-write"
            : r.status === 401 || r.status === 403
              ? "skip-admin-required"
              : "skip-non-ok",
        detail: text.slice(0, 160),
      });
      if (r.status === 200) {
        try {
          const body = JSON.parse(text);
          writeFileSync(
            join(goldensDir, goldenFileName("GET", path)),
            `${JSON.stringify(body, null, 2)}\n`,
            "utf8",
          );
          adminSkips[adminSkips.length - 1].action = "wrote";
        } catch {
          adminSkips[adminSkips.length - 1].action = "skip-not-json";
        }
      }
    } catch (e) {
      adminSkips.push({
        path,
        action: "skip-error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /** @type {Array<Record<string, unknown>>} */
  const mutates = [];
  let written = 0;

  let siteId = "";
  try {
    const sitesRes = await fetch(`${baseUrl}/api/network/sites`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (sitesRes.ok) {
      const sitesBody = await sitesRes.json();
      const sites = Array.isArray(sitesBody) ? sitesBody : sitesBody.sites || [];
      siteId = String(sites[0]?._id || sites[0]?.id || "");
    }
  } catch {
    /* optional */
  }

  for (const probe of MUTATE_PROBES) {
    try {
      const bodyPayload = { ...probe.body };
      if (probe.needsSiteId && siteId) {
        bodyPayload.siteId = siteId;
        if (!bodyPayload.location) {
          bodyPayload.location = { latitude: 39.74, longitude: -104.99 };
        }
      }
      const r = await fetch(`${baseUrl}${probe.path}`, {
        method: probe.method,
        headers,
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(20_000),
      });
      const text = await r.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text.slice(0, 400), status: r.status };
      }
      const name = goldenFileName(probe.method, probe.path);
      if (r.status >= 200 && r.status < 300) {
        writeFileSync(join(goldensDir, name), `${JSON.stringify(body, null, 2)}\n`, "utf8");
        written += 1;
        mutates.push({
          method: probe.method,
          path: probe.path,
          status: r.status,
          action: "wrote",
          golden: `wisp-api-goldens/${name}`,
        });
      } else {
        const envelope = {
          ok: false,
          seeded: "live-mutate-rejected",
          status: r.status,
          path: probe.path,
          body,
          capturedAt: new Date().toISOString(),
        };
        writeFileSync(join(goldensDir, name), `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
        written += 1;
        mutates.push({
          method: probe.method,
          path: probe.path,
          status: r.status,
          action: "wrote-rejected-envelope",
          golden: `wisp-api-goldens/${name}`,
        });
      }
    } catch (e) {
      mutates.push({
        method: probe.method,
        path: probe.path,
        action: "skip-error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /** PUT depth — update first live row per collection (deepen2). */
  const putTargets = [
    {
      listPath: "/api/inventory",
      idKeys: ["_id", "id"],
      body: { notes: `chrysalis-live-mutate-put-${Date.now()}`, status: "available" },
    },
    {
      listPath: "/api/work-orders",
      idKeys: ["_id", "id"],
      body: { notes: `chrysalis-live-mutate-put-${Date.now()}`, priority: "medium" },
    },
    {
      listPath: "/api/incidents",
      idKeys: ["_id", "id"],
      body: { notes: `chrysalis-live-mutate-put-${Date.now()}`, severity: "medium" },
    },
    {
      listPath: "/api/bundles",
      idKeys: ["_id", "id"],
      body: { notes: `chrysalis-live-mutate-put-${Date.now()}` },
    },
    {
      listPath: "/api/network/sectors",
      idKeys: ["_id", "id"],
      body: { notes: `chrysalis-live-mutate-put-${Date.now()}` },
    },
    {
      listPath: "/api/network/cpe",
      idKeys: ["_id", "id"],
      body: { notes: `chrysalis-live-mutate-put-${Date.now()}` },
    },
  ];

  for (const target of putTargets) {
    try {
      const listRes = await fetch(`${baseUrl}${target.listPath}`, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
      if (!listRes.ok) {
        mutates.push({
          method: "PUT",
          path: target.listPath,
          action: "skip-list-non-ok",
          status: listRes.status,
        });
        continue;
      }
      const listBody = await listRes.json();
      const rows = Array.isArray(listBody)
        ? listBody
        : listBody.items ||
          listBody.workOrders ||
          listBody.incidents ||
          listBody.bundles ||
          listBody.sectors ||
          listBody.cpe ||
          listBody.records ||
          [];
      const row = rows[0];
      if (!row) {
        mutates.push({ method: "PUT", path: target.listPath, action: "skip-empty-list" });
        continue;
      }
      let id = "";
      for (const k of target.idKeys) {
        if (row[k]) {
          id = String(row[k]);
          break;
        }
      }
      if (!id) {
        mutates.push({ method: "PUT", path: target.listPath, action: "skip-no-id" });
        continue;
      }
      const putPath = `${target.listPath}/${encodeURIComponent(id)}`;
      const r = await fetch(`${baseUrl}${putPath}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(target.body),
        signal: AbortSignal.timeout(20_000),
      });
      const text = await r.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text.slice(0, 400), status: r.status };
      }
      const name = goldenFileName("PUT", putPath.replace(/\/[^/]+$/, "/:id"));
      if (r.status >= 200 && r.status < 300) {
        writeFileSync(join(goldensDir, name), `${JSON.stringify(body, null, 2)}\n`, "utf8");
        written += 1;
        mutates.push({
          method: "PUT",
          path: putPath,
          status: r.status,
          action: "wrote",
          golden: `wisp-api-goldens/${name}`,
        });
      } else {
        mutates.push({
          method: "PUT",
          path: putPath,
          status: r.status,
          action: "put-rejected",
          detail: typeof body === "object" ? body : text.slice(0, 160),
        });
      }
    } catch (e) {
      mutates.push({
        method: "PUT",
        path: target.listPath,
        action: "skip-error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Tenant-settings PUT (no :id).
  try {
    const r = await fetch(`${baseUrl}/api/tenant-settings`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        companyInfo: {
          name: "CWL Trace Co",
          phone: "555-0199",
          email: `cwl-settings-${Date.now()}@example.com`,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await r.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 400), status: r.status };
    }
    const name = goldenFileName("PUT", "/api/tenant-settings");
    if (r.status >= 200 && r.status < 300) {
      writeFileSync(join(goldensDir, name), `${JSON.stringify(body, null, 2)}\n`, "utf8");
      written += 1;
      mutates.push({
        method: "PUT",
        path: "/api/tenant-settings",
        status: r.status,
        action: "wrote",
        golden: `wisp-api-goldens/${name}`,
      });
    } else {
      mutates.push({
        method: "PUT",
        path: "/api/tenant-settings",
        status: r.status,
        action: "put-rejected",
        detail: body,
      });
    }
  } catch (e) {
    mutates.push({
      method: "PUT",
      path: "/api/tenant-settings",
      action: "skip-error",
      error: e instanceof Error ? e.message : String(e),
    });
  }

  let applied = null;
  if (written > 0) applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });

  const report = {
    kind: LIVE_MUTATE_TRACE_KIND,
    schemaVersion: 1,
    ok: true,
    baseUrl,
    auth,
    adminSkips,
    mutates,
    written,
    applied,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function main() {
  let firebaseDemoLogin = true;
  let bearer = "";
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--no-firebase-demo-login") firebaseDemoLogin = false;
    else if (process.argv[i] === "--bearer" && process.argv[i + 1]) bearer = process.argv[++i];
  }
  const r = await liveMutateTraceGoldens({
    firebaseDemoLogin,
    bearer: bearer || undefined,
  });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1]?.includes("live-mutate-trace-goldens")) main();
