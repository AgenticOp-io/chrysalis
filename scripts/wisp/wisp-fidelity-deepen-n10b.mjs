#!/usr/bin/env node
/**
 * Deepen passes 13–22 (next 10 after deepen-n10) — D6442.
 * Usage: node scripts/wisp/wisp-fidelity-deepen-n10b.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firebaseDemoIdToken, liveRefreshWispApiGoldens } from "../lib/live-refresh-api-goldens.mjs";
import { liveMutateTraceGoldens } from "../lib/live-mutate-trace-goldens.mjs";
import { applyWispApiGoldenHandlers } from "../wisp-cwl-apply-api-golden-handlers.mjs";
import {
  wispPlatformAdminEmail,
  wispPlatformAdminPassword,
} from "../lib/wisp-demo-credentials.mjs";

export const DEEPEN_N10B_KIND = "chrysalis.wisp.fidelity-deepen-n10b";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen-n10b.json");

const PASSES = [
  { id: 13, title: "WO assign / complete / log" },
  { id: 14, title: "Incident notes / resolve / convert-to-ticket" },
  { id: 15, title: "Plan reject / authorize POSTs" },
  { id: 16, title: "Customer service-history + complaints" },
  { id: 17, title: "Inventory deploy" },
  { id: 18, title: "Hardware equipment create when empty" },
  { id: 19, title: "Subcontractors + equipment-pricing list surfaces" },
  { id: 20, title: "Installation-documentation list + mutate" },
  { id: 21, title: "Admin tenants display polish" },
  { id: 22, title: "Map equipment create from menu" },
];

function syntaxCheck(rel) {
  const file = join(scriptRoot, rel);
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  return { file: rel, ok: r.status === 0, stderr: (r.stderr || "").trim().slice(0, 400) };
}

async function firstId(baseUrl, headers, listPath, keys) {
  const r = await fetch(`${baseUrl}${listPath}`, { headers, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) return { status: r.status, id: "", row: null };
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
      signal: AbortSignal.timeout(20_000),
    });
    const text = await r.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 200) };
    }
    return {
      path,
      method,
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      body: parsed,
    };
  } catch (e) {
    return { path, method, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function runFidelityDeepenN10b(opts = {}) {
  const startedAt = new Date().toISOString();
  const syntax = [
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-client.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-map.js"),
    syntaxCheck("fixtures/hub-wisp-management/wisp-cwl-modules.js"),
  ];
  if (!syntax.every((s) => s.ok)) {
    const report = { kind: DEEPEN_N10B_KIND, ok: false, startedAt, finishedAt: new Date().toISOString(), syntax };
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
      "/api/equipment-pricing",
      "/api/subcontractors",
      "/api/installation-documentation",
      "/admin/tenants",
      "/api/network/equipment",
      "/api/work-orders",
      "/api/incidents",
      "/api/customers",
      "/api/inventory",
      "/api/plans",
    ],
    ...opts,
  });
  const mutate = await liveMutateTraceGoldens({ firebaseDemoLogin: true, applyHandlers: true, ...opts });

  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 18 — create equipment (so PUT has a row)
  {
    const created = await probe("POST", baseUrl, headers, "/api/network/equipment", {
      name: `CWL Equip ${Date.now()}`,
      type: "backhaul",
      manufacturer: "Trace",
      model: "N10b",
      serialNumber: `EQ-N10B-${Date.now()}`,
      status: "active",
      location: { latitude: 39.74, longitude: -104.99 },
      notes: "chrysalis-deepen-n10b",
      createdBy: "demo@wisptools.io",
    });
    probes.push({ pass: 18, ...created });
  }

  // 22 — map-style equipment create (same API)
  {
    const created = await probe("POST", baseUrl, headers, "/api/network/equipment", {
      name: `CWL Map Equip ${Date.now()}`,
      type: "backhaul",
      manufacturer: "Trace",
      model: "Map",
      serialNumber: `EQ-MAP-${Date.now()}`,
      status: "active",
      location: { latitude: 39.75, longitude: -104.98 },
      notes: "chrysalis-map-equipment-create",
      createdBy: "demo@wisptools.io",
    });
    probes.push({ pass: 22, ...created });
  }

  // 13 — WO assign + log
  {
    const wo = await firstId(baseUrl, headers, "/api/work-orders", ["workOrders", "items"]);
    if (wo.id) {
      probes.push({
        pass: 13,
        assign: await probe("POST", baseUrl, headers, `/api/work-orders/${wo.id}/assign`, {
          userId: "cwl-demo",
          userName: "CWL Demo",
        }),
        log: await probe("POST", baseUrl, headers, `/api/work-orders/${wo.id}/log`, {
          note: "chrysalis-work-log",
          hours: 0.5,
        }),
      });
    } else probes.push({ pass: 13, action: "skip-empty-wo" });
  }

  // 14 — incident notes (+ convert optional)
  {
    const inc = await firstId(baseUrl, headers, "/api/incidents", ["incidents", "items"]);
    if (inc.id) {
      probes.push({
        pass: 14,
        notes: await probe("POST", baseUrl, headers, `/api/incidents/${inc.id}/notes`, {
          note: "chrysalis-incident-note",
          userId: "cwl",
          userName: "CWL Demo",
        }),
      });
    } else probes.push({ pass: 14, action: "skip-empty-incidents" });
  }

  // 15 — plan reject (need ready/approved) + authorize (need approved)
  {
    const plan = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
    if (plan.id) {
      await probe("PUT", baseUrl, headers, `/api/plans/${plan.id}`, { status: "ready" });
      const reject = await probe("POST", baseUrl, headers, `/api/plans/${plan.id}/reject`, {
        reason: "chrysalis-reject",
        notes: "chrysalis-plan-reject",
      });
      // authorize needs approved — create path: ready → approve → authorize on another plan if possible
      let authorize = { action: "skipped-after-reject" };
      const plan2 = await firstId(baseUrl, headers, "/api/plans", ["plans", "projects", "items"]);
      if (plan2.id && plan2.id !== plan.id) {
        await probe("PUT", baseUrl, headers, `/api/plans/${plan2.id}`, { status: "ready" });
        await probe("POST", baseUrl, headers, `/api/plans/${plan2.id}/approve`, {
          notes: "chrysalis-n10b-approve",
        });
        authorize = await probe("POST", baseUrl, headers, `/api/plans/${plan2.id}/authorize`, {
          notes: "chrysalis-plan-authorize",
        });
      } else if (plan2.id) {
        await probe("PUT", baseUrl, headers, `/api/plans/${plan2.id}`, { status: "ready" });
        await probe("POST", baseUrl, headers, `/api/plans/${plan2.id}/approve`, {
          notes: "chrysalis-n10b-approve",
        });
        authorize = await probe("POST", baseUrl, headers, `/api/plans/${plan2.id}/authorize`, {
          notes: "chrysalis-plan-authorize",
        });
      }
      probes.push({ pass: 15, reject, authorize });
    } else probes.push({ pass: 15, action: "skip-empty-plans" });
  }

  // 16 — customer service-history + complaints
  {
    const cust = await firstId(baseUrl, headers, "/api/customers", ["customers", "items"]);
    if (cust.id) {
      probes.push({
        pass: 16,
        history: await probe("POST", baseUrl, headers, `/api/customers/${cust.id}/service-history`, {
          type: "note",
          description: "chrysalis-service-history",
          status: "completed",
        }),
        complaint: await probe("POST", baseUrl, headers, `/api/customers/${cust.id}/complaints`, {
          subject: "CWL complaint",
          description: "chrysalis-complaint",
          status: "open",
        }),
      });
    } else probes.push({ pass: 16, action: "skip-empty-customers" });
  }

  // 17 — inventory deploy
  {
    const inv = await firstId(baseUrl, headers, "/api/inventory", ["items", "records"]);
    if (inv.id) {
      probes.push({
        pass: 17,
        ...(await probe("POST", baseUrl, headers, `/api/inventory/${inv.id}/deploy`, {
          location: { type: "tower", name: "Deploy" },
          notes: "chrysalis-inventory-deploy",
        })),
      });
    } else probes.push({ pass: 17, action: "skip-empty-inventory" });
  }

  // 19 — pricing create + subcontractors GET
  {
    const pricing = await probe("POST", baseUrl, headers, "/api/equipment-pricing", {
      category: "Radio Equipment",
      equipmentType: "Radio",
      manufacturer: "Trace",
      model: `CWL-${Date.now()}`,
      basePrice: 99,
      currency: "USD",
      notes: "chrysalis-pricing",
    });
    const subs = await firstId(baseUrl, headers, "/api/subcontractors", ["subcontractors", "items"]);
    probes.push({
      pass: 19,
      pricing,
      subcontractorsList: { status: subs.status, count: subs.rows?.length || (subs.id ? 1 : 0) },
    });
  }

  // 20 — installation docs GET + POST if site available
  {
    const docs = await firstId(baseUrl, headers, "/api/installation-documentation", [
      "items",
      "docs",
      "results",
    ]);
    const site = await firstId(baseUrl, headers, "/api/network/sites", ["sites"]);
    let created = { action: "skip-no-site" };
    if (site.id) {
      created = await probe("POST", baseUrl, headers, "/api/installation-documentation", {
        installationType: "cpe",
        siteId: site.id,
        siteName: site.row?.name || "Site",
        installationDate: new Date().toISOString(),
        notes: "chrysalis-install-doc",
      });
    }
    probes.push({
      pass: 20,
      listStatus: docs.status,
      listCount: docs.rows?.length || (docs.id ? 1 : 0),
      create: created,
    });
  }

  // 21 — admin tenants GET (platform admin optional)
  {
    const adminPassword = wispPlatformAdminPassword({ required: false });
    const adminLogin = adminPassword
      ? await firebaseDemoIdToken({
          email: wispPlatformAdminEmail(),
          password: adminPassword,
        })
      : { ok: false, skip: "missing-CHRYSALIS_WISP_PLATFORM_ADMIN_PASSWORD" };
    if (adminLogin.ok && adminLogin.idToken) {
      const adminHeaders = {
        ...headers,
        Authorization: `Bearer ${adminLogin.idToken}`,
      };
      const tenants = await firstId(baseUrl, adminHeaders, "/admin/tenants", ["tenants", "items"]);
      probes.push({
        pass: 21,
        status: tenants.status,
        count: tenants.rows?.length || (tenants.id ? 1 : 0),
        sampleKeys: tenants.row ? Object.keys(tenants.row).slice(0, 12) : [],
      });
    } else {
      probes.push({ pass: 21, action: "skip-admin-login", skip: adminLogin.skip });
    }
  }

  let applied = null;
  try {
    applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });
  } catch (e) {
    applied = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const report = {
    kind: DEEPEN_N10B_KIND,
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
    note: "Deepen passes 13–22 — no invented APIs (D6442)",
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
          ok: p.ok,
          status: p.status,
          action: p.action,
          assign: p.assign?.ok,
          log: p.log?.ok,
          notes: p.notes?.ok,
          reject: p.reject?.ok,
          authorize: p.authorize?.ok,
          history: p.history?.ok,
          complaint: p.complaint?.ok,
          pricing: p.pricing?.ok,
          create: p.create?.ok ?? p.create?.action,
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
  await runFidelityDeepenN10b();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10b")) main();
